<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">Charts Overview</h1>
    <form class="search-form full-page">
      <b-input
        icon-right="magnify"
        v-model="searchString"
        size="64"
        class="search-string"
         @keydown.native="manageKeydown"
      />
      <b-select v-model="status">
        <option v-for="opt in statusOptions" :key="opt.itemKey" :value="opt.key">{{opt.name}}</option>
      </b-select>
      <b-button icon-left="magnify" @click="searchCharts" type="is-success" />
      <b-button icon-right="plus-circle" @click="addNewSingleChart" type="is-info">New chart</b-button>
    </form>
    
    <b-table
      v-if="hasItems"
      :data="items"
      :row-class="(row, index) => assignRowClasses(index)"
      class="chart-list-table"
      :paginated="true"
      backend-pagination
      :current-page="page"
      :per-page="limit"
      :total="numCharts"
      @page-change="changePage"
    >
      <template slot-scope="props">
        <b-table-column class="long-name name" field="name" label="Name">
          <b-input type="text" v-model="props.row.name" />
        </b-table-column>
        <b-table-column class="nowrap row gender" field="gender" label="Gender">
          <b-input type="text" v-model="props.row.gender" size="3" />
        </b-table-column>
        <b-table-column class="nowrap datetime" field="datetime" label="Date/Time">
          <b-input type="date" v-model="props.row.date" class="date" />
          <b-input type="time" v-model="props.row.time" class="time" :step="1" />
          <b-input type="number" v-model="props.row.minOffset" class="minutes-offset" :maxlength="6" />
        </b-table-column>
        <b-table-column class="nowrap lat-lng" field="latLng" label="Lat/Lng">
          <b-input type="text" v-model="props.row.lat" />
          <b-input type="text" v-model="props.row.lng" />
        </b-table-column>
        <b-table-column class="nowrap rodden" field="roddenScale" label="Rodden">
          <b-select v-model="props.row.roddenScale">
            <option v-for="(row, ri) in roddenValues" :key="['row', props.row._id, ri].join('-')" :value="row.key">{{row.key}}</option>
          </b-select>
        </b-table-column>
        <b-table-column class="list-items" field="paired" label="Paired with">
          <ol v-if="props.row.paired.length > 0" class="relations">
            <li v-for="(partner,pi) in props.row.paired" :key="['paired', pi, props.row._id].join('-')">
              <span @click="fetchPaired(props.row._id, partner.chartId)">{{partner.name}}</span>
              <b-icon icon="trash-can" class="remove" @click.native="handleDeletePaired(partner, props.row)" />
            </li>
          </ol>
          <b-icon icon="plus-circle" class="add" @click.native="addPaired(props.row)" />
        </b-table-column>
        <b-table-column class="edit-remove-chart" field="edit" label="✎␡">
          <b-icon
              icon="square-edit-outline"
              type="is-success"
              @click.native="editRow(props.row)"
              title="Edit full details"
            />
          <b-icon v-if="props.row.paired.length < 1" icon="trash-can" class="remove" @click.native="handleDelete(props.row)" />
        </b-table-column>
      </template>
    </b-table>
    
    <div class="actions">
      <b-button @click="save" type="is-success" size="is-large" >Save</b-button>
    </div>
    <div class="editing-overlay relationship-overlay" :class="overlayClasses">

          
      <div class="inner-panel" v-if="showEditOverlay">
        <b-icon class="close" icon="close" @click.native="close" />
          <chart-info-form v-if="singleChartExpanded" :chart="selectedChart" :statusOptions="formStatusOptions" :pairedItems="currentPairedItems" />
          <relationship-form v-if="pairedExpanded"
                :paired="selectedPaired"
                :label="selectedLabel"
                :autosubmit="false"
                :showNotes="true"
                :tooltip="true"
                >
                <b-field v-if="showPairedNameSearch" class="horizontal partner-search" label="Partner">
                  <b-autocomplete
                :data="suggestedChartNames"
                placeholder="Name"
                field="name"
                v-model="matchedName"
                class="name"
                @typing="matchChartName"
                @select="selectChartName"
              ><template slot-scope="props">
                  <div class="row">
                    {{ props.option.name }}
                  </div>
                </template>
              </b-autocomplete>
                </b-field>
              <b-button class="save" @click="savePaired" icon-left="send" type="is-success">Save</b-button>
          </relationship-form>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { deletePairedChart, deleteUserChart, fetchChart, fetchChartList, fetchRoddenValues, getPairedByChart, getPairedItems, matchChartNamesByUser, saveChartsBulk, savePairedChart } from "../api/methods";
import { julToLongDate } from "../api/converters";
import { emptyString, notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { bus } from "../main";
import { ChartItem, PairedRef } from "@/api/interfaces/users";
import { julToDateParts } from "@/api/julian-date";
import { KeyName } from "@/api/interfaces";
import RelationshipForm from "./forms/RelationshipForm.vue";
import ChartInfoForm from "./forms/ChartInfoForm.vue";
import { Chart, PairedChart } from "@/api/models/Chart";

@Component({
  components: {
    RelationshipForm,
    ChartInfoForm,
  },
  filters: FilterSet,
})
export default class ChartsListView extends Vue {
  @State("user") user: UserState;
  result: any = null;

  items: Array<ChartItem> = [];

  searchString = "";
  status = "reference";
  selectedIndex = -1;
  page = 1;

  limit = 25;

  roddenValues: Array<KeyName> = [];

  numCharts = 0;

  selectedPaired = new PairedChart();

  selectedChart = new Chart();

  matchedName = "";

  suggestedChartNames = [];

  newPairedMode = false;

  isFetching = false;

  currentPairedItems: PairedRef[] = [];
  
  showEditOverlay = false;

  created() {
    fetchRoddenValues().then((items) => {
      this.roddenValues = items.filter(row => row.enabled);
    });
    this.loadData();
    bus.$on("escape", this.dismiss);
    bus.$on("update-user-list", ok  => {
      if (ok) {
        this.loadData();
      }
    })
    bus.$on("edited-paired-settings", inData => {
      const user = this.user._id;
      savePairedChart({user,...inData}).then(result => {
        if (result.valid) {
          this.loadData();
        }
      })
    })
    bus.$on("reload-charts", ({id}) => {
      const hasId = this.items.findIndex(row => row._id.toString() === id.toString()) >= 0;
      if (hasId) {
        this.loadData();
      }
      this.close();
    })

    bus.$on("load-chart-form", (chartRef) => {
      if (chartRef instanceof Chart) {
        this.selectedChart = chartRef;
        this.selectedPaired = new PairedChart();
        this.currentPairedItems = [];

        getPairedItems(chartRef._id).then(items => {
          if (items instanceof Array) {
            this.currentPairedItems = items;
          }
        })
      }
    })
    bus.$on("open-paired-chart", ({fromChartId, toChartId}) => {
      this.fetchPaired(fromChartId, toChartId);
    });
  }

  async loadData() {
    fetchChartList(this.user._id, this.start, this.limit, this.searchString, this.status).then((data) => {
      if (data.items instanceof Array) {
        this.numCharts = 0;
        this.items = data.items.map(item => {
          const julDate = julToDateParts(item.jd, item.tzOffset)
          const date = julDate.ymdDate;
          const time = julDate.hms;
          const tzOffset = parseInt(item.tzOffset);
          const minOffset = Math.floor(tzOffset / 60 * 100) / 100;
          const row = this.roddenValues.find(r => r.value === item.roddenValue);
          const roddenScale = row instanceof Object? row.key : "";
          return {...item, tzOffset, date, time, minOffset, roddenScale };
        })
        this.numCharts = data.total;
      }
    });
  }

  dismiss() {
    this.selectedIndex = -1;
  }

  get statusOptions() {
    return [{
      key: "-",
      name: "All",
    },{
      key: "reference",
      name: "Reference",
    }, {
      key: "user",
      name: "User",
    }].map((ch, ci) => {
      const itemKey = ['chart-status', ch.key, ci].join('-');
      return {...ch, itemKey}
    });
  }

  get formStatusOptions() {
    return this.statusOptions.slice(1);
  }

  get singleChartExpanded() {
    return this.selectedChart instanceof Chart && this.selectedChart.hasId;
  }

  get pairedExpanded() {
    return this.selectedPaired instanceof PairedChart && notEmptyString(this.selectedPaired._id, 12);
  }

  get showPairedNameSearch() {
    return this.pairedExpanded && this.newPairedMode;
  }

  get selectedLabel() {
    let str = "";
    if (this.pairedExpanded) {
      const { c1, c2 } = this.selectedPaired;
      if (c1 instanceof Chart && c2 instanceof Chart ) {
        const second = notEmptyString(c2.subject.name)? c2.nameGender : '[unknown]';
        str = [c1.nameGender, second].join(" & ");
      }
    }
    return str;
  }

  get hasItems() {
    return this.items.length > 0;
  }

  get wrapperClasses() {
    const cls = [];
    if (this.selectedIndex >= 0) {
      cls.push("show-item");
    }
    if (this.showEditOverlay && (this.pairedExpanded || this.singleChartExpanded)) {
      cls.push("show-editing-overlay");
    }
    return cls;
  }
  
  get overlayClasses() {
    const cls = [];
    if (this.showPairedNameSearch) {
      cls.push("show-autocomplete");
    }
    return cls;
  }

  assignRowClasses(index: number) {
    const cls = [];
    if (index === this.selectedIndex) {
      cls.push("active");
    }
    return cls;
  }

  searchCharts() {
    this.page = 1;
    this.loadData();
  }

  toast(message: string, duration = 3000) {
    this.$buefy.toast.open({
      duration,
      message,
      position: "is-bottom",
      type: "is-success"
    });
  }

  editRow(row) {
    fetchChart(this.user._id, row._id).then(result => {
      if (result.chart) {
        this.selectedChart = new Chart(result.chart);
        this.currentPairedItems = row.paired;
        setTimeout(() => {
          this.showEditOverlay = true;
        }, 250);
      }
    });
  }

  handleDelete(row: ChartItem) {
    const tzOffset = row.minOffset * 60;
    const date = julToLongDate(row.jd, tzOffset);
    this.$buefy.dialog.confirm({
      message: `Are you sure you wish to delete "${row.name}" (key: ${row.gender}), ${date}`,
      cancelText: "Keep",
      confirmText: "Delete",
      type: "is-danger",
      onConfirm: () => this.delete(row),
    });
  }

  handleDeletePaired(partner, row: ChartItem) {
    this.$buefy.dialog.confirm({
      message: `Are you sure you wish to delete "${partner.name} / ${row.name}"`,
      cancelText: "Keep",
      confirmText: "Delete",
      type: "is-danger",
      onConfirm: () => this.deletePaired(partner, row),
    });
  }

  delete(row: ChartItem) {
    deleteUserChart(this.user._id, row._id).then(result => {
      if (result.valid) {
        if (result.id) {
          this.toast(`Chart deleted`);
          const index = this.items.findIndex(row => row._id === result.id);
          if (index >= 0) {
            this.items.splice(index, 1);
          }
        }
      }
    })
  }

  deletePaired(partner = null, row: ChartItem) {
    if (partner instanceof Object) {
      deletePairedChart(partner.id, this.user._id).then(result => {
        if (result) {
          this.selectedPaired = new PairedChart();
          const index = this.items.findIndex(row => row._id === row._id);
          row.paired = row.paired.filter(p => p.id !== partner.id);
          this.items.splice(index,1,row);    
        }
      });
    }
  }

  fetchPaired(fromChartId: string, toChartId = "") {
    this.newPairedMode = false;
    getPairedByChart(fromChartId).then(result => {
      if (result.valid && result.items instanceof Array) {
        const pc = result.items.find(item => {
          const { c1, c2} = item;
          if (c1 instanceof Object && c2 instanceof Object) {
            return c1._id === toChartId || c2._id === toChartId;
          } else {
            return false;
          }
        });
        if (pc instanceof Object) {
          this.selectedChart = new Chart();
          this.selectedPaired = new PairedChart(pc);
        }
      }
    })
  }

  addPaired(row: ChartItem) {
    fetchChart(this.user._id, row._id).then(result => {
      if (result.chart) {
        const c2 = new Chart(null);
        this.selectedPaired = new PairedChart({c1: result.chart, c2, tags: []});
        this.newPairedMode = true;
      }
    });
  }

  addNewSingleChart() {
    const nc = new Chart({_id: "_new"});
    this.selectedChart = nc;
    this.currentPairedItems = [];
  }

  changePage(page = 0) {
    if (page > 0) {
      this.page = page;
      setTimeout(() =>{
        this.loadData();
      }, 250);
    }
  }

  get start() {
    return (this.page - 1) * this.limit;
  }

  selectChartName(item) {
    if (
      item instanceof Object &&
      notEmptyString(item.id)
    ) {
      /* const inData = {
        user: this.user._id,
        c1: this.selectedPaired.c1._id,
        c2: item.id,
      }; */
      fetchChart(this.user._id, item.id).then(result => {
        if (result.chart instanceof Object) {
          if (this.selectedPaired instanceof PairedChart) {
            this.selectedPaired.c2 = new Chart(result.chart);
          }
        }
      });
      /* savePairedChart(inData).then((data) => {
        if (data.valid) {
          //
        }
      }); */
    }
  }

 async matchChartName(search = "") {
    if (notEmptyString(search, 1)) {
      if (!this.isFetching) {
        this.isFetching = true;
        await matchChartNamesByUser(this.user._id, search, true).then((items) => {
          if (items.length > 0) {
            this.suggestedChartNames = items;
          }
          setTimeout(() => {
            this.isFetching = false;
          }, 50);
        });
      }
      setTimeout(() => {
        this.isFetching = false;
      }, 1000);
    }
    setTimeout(() => {
      this.isFetching = false;
    }, 2000);
  }

  savePaired() {
    bus.$emit("save-paired-form", true);
    setTimeout(() => {
      this.close();
    }, 500);
  }

  updateLookup(e) {
    if (emptyString(this.searchString)) {
      e.preventDefault();
      this.loadData();
    }
  }

  manageKeydown(e) {
    switch (e.which) {
      case 13:
        this.page = 1;
        e.preventDefault();
        this.loadData();
        break;
      case 8:
        this.page = 1;
        this.updateLookup(e);
        break;
    }
  }

  close() {
    /* this.selectedPaired = new PairedChart();
    this.selectedChart = new Chart(); */
    this.showEditOverlay = false;
  }

  @Watch('status')
  changeStatus() {
    this.loadData();
  }

  save() {
    const saveItems = this.items.map(item => {
      const datetime = [item.date, item.time].join('T') + '.000Z';
      const roddenRow = this.roddenValues.find(r => r.key === item.roddenScale);
      const roddenValue = roddenRow instanceof Object? roddenRow.value : -1;
      const { _id, name, gender, lat, lng, minOffset } = item;
      const tzOffset = minOffset * 60;
      return { _id, isDefaultBirthChart: false, name, gender, lat, lng, tzOffset, datetime, roddenValue, eventType: 'birth', type: 'person', user: this.user._id };
    });
    saveChartsBulk(saveItems).then(result => {
      if (result) {
        this.toast("saved");
      }
    });
  }
}
</script>
