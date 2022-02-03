<template>
  <div class="main-view">
    <ol class="horizontal plain compact centred" :class="itemClassName">
      <li
        v-for="(plKey, plIndex) in planets"
        :key="['planet-opt', plKey, plIndex].join('-')"
      >
        <b-checkbox v-model="planetsEnabled[plKey]" @change.native="refilter"
          ><i
            class="icon"
            :class="plKey | toGrahaClass"
            @dblclick.stop.prevent="(e) => selectOnePlanet(e, plKey)"
          ></i
        ></b-checkbox>
      </li>
    </ol>
    <b-slider
      v-model="yearRange"
      :min="startYear"
      :max="endYear"
      :step="1"
      :ticks="true"
    >
      <template v-for="val in displayYears">
        <b-slider-tick :value="val" :key="['slider-tick', val].join('-')">{{
          majorTick(val)
        }}</b-slider-tick>
      </template>
    </b-slider>
    <b-field class="horizontal data-range-actions">
      <b-numberinput
        v-model="startYear"
        size="is-small"
        :min="minYear"
        :max="maxYear - 10"
        :step="10"
      ></b-numberinput>
      <b-slider
        v-model="yearSpan"
        :min="10"
        :max="maxSpan"
        :step="5"
        :ticks="true"
      >
        <template v-for="val in spanYears">
          <b-slider-tick :value="val" :key="['slider-tick', val].join('-')">{{
            majorTick(val)
          }}</b-slider-tick>
        </template>
      </b-slider>
      <b-button @click="loadData">Reload</b-button>
    </b-field>

    <b-table
      v-if="hasRows"
      :data="rows"
      :row-class="(row, index) => assignRowClasses(index)"
    >
      <template slot-scope="props">
        <b-table-column
          class="key"
          :class="props.row.key"
          field="key"
          label="Planet"
          ><i class="icon" :class="props.row.key | toGrahaClass"></i
        ></b-table-column>
        <b-table-column class="size" field="size" label="Degree">
          <SignDegree :deg="props.row.lng" :seconds="true" />
        </b-table-column>
        <b-table-column class="modified" field="modified" label="Speed">{{
          props.row.speed | dec4
        }}</b-table-column>
        <b-table-column
          class="acceleration"
          field="acceleration"
          label="Acceleration"
          >{{ props.row.acceleration | dec4 }}</b-table-column
        >
        <b-table-column
          class="station"
          :class="props.row.station"
          field="yearRange"
          label="years"
          >{{ props.row.station | stationName }}</b-table-column
        >
        <b-table-column
          class="year"
          :class="props.row.updateYear"
          field="updateYear"
          label="updated"
          >{{ props.row.longDate }}</b-table-column
        >
      </template>
    </b-table>
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { planetaryStations } from "../../api/methods";
import { isNumeric } from "../../api/validators";
import { FilterSet } from "../../api/composables/FilterSet";
import { UserState } from "../../store/types";
import { TransitionInfo } from "../../api/models/TransitionInfo";
import SignDegree from "../widgets/SignDegree.vue";
import { bus } from "@/main";
import { capitalize } from "@/api/converters";

@Component({
  filters: {
    ...FilterSet,
    stationName(val) {
      switch (val) {
        case "retro-peak":
          return "Retrograde peak";
        case "retro-start":
          return "Retrograde start";
        case "retro-end":
          return "Retrograde end";
        default:
          return capitalize(val.replace(/-/g, " "));
      }
    },
  },
  components: {
    SignDegree,
  },
})
export default class PlanetaryStationsTable  extends Vue {
  @State("user") user: UserState;
  private result: any = null;
  private minYear = 1900;
  private yearSpan = 20;
  private startYear = 2010;
  private maxYear = 2030;

  private yearRange = [2010, 2030];

  private planets = {
    2: "me",
    3: "ve",
    4: "ma",
    5: "ju",
    6: "sa",
    /* 7: "ur",
    8: "ne",
    9: "pl", */
  };

  private planetsEnabled: any = {};

  private changing = false;

  created() {
    bus.$on("change-tech-data-tab", (tabKey) => {
      if (tabKey === "transitions") {
        this.loadData();
      }
    });
    Object.values(this.planets).forEach((plKey) => {
      this.planetsEnabled[plKey] = true;
    });
  }

  async loadData() {
    if (!this.changing) {
      this.changing = true;
      const key = ["planetary-stations", this.startYear, this.endYear].join(
        "-"
      );
      const resultSet = this.$ls.get(key);
      const valid =
        resultSet instanceof Object &&
        Object.keys(resultSet).includes("values") &&
        resultSet.valid === true;
      if (!valid) {
        await planetaryStations(0, this.startYear, this.endYear).then(
          (result) => {
            this.result = result;
            if (result instanceof Object) {
              this.$ls.set(key, result, 366 * 24 * 3600 * 1000);
            }
            setTimeout(() => {
              this.changing = false;
            }, 1000);
          }
        );
      } else {
        this.result = resultSet;
        setTimeout(() => {
          this.changing = false;
        }, 750);
      }
    }
  }

  refilter() {
    setTimeout(this.loadData, 500);
  }

  majorTick(val) {
    let str = "";
    if (isNumeric(val)) {
      str = val % this.sliderInterval === 0 ? val.toString() : "";
    }
    return str;
  }

  get hasRows(): boolean {
    return this.rows.length > 0;
  }

  get sliderInterval() {
    const span = this.endYear - this.startYear;
    return span > 40 ? 10 : 5;
  }

  get endYear() {
    return this.startYear + this.yearSpan;
  }

  get displayYears() {
    const years = [];
    for (let i = this.yearRange[0]; i <= this.yearRange[1]; i++) {
      years.push(i);
    }
    return years;
  }

  get maxSpan() {
    const diff = this.maxYear - this.startYear;
    return diff > 50 ? 50 : diff;
  }

  get spanYears() {
    const years = [];
    for (let i = 10; i <= this.maxSpan; i++) {
      years.push(i);
    }
    return years;
  }

  get rows(): Array<TransitionInfo> {
    let items: Array<TransitionInfo> = [];
    if (this.result instanceof Object) {
      const { values } = this.result;
      if (values instanceof Array) {
        items = values
          .filter(this.matchPlanetNum)
          .map((item) => new TransitionInfo(item))
          .filter(this.filterYears);
      }
    }
    return items;
  }

  get itemClassName() {
    return ["items", Object.keys(this.planets).length].join("-");
  }

  matchPlanetNum(item) {
    const { num } = item;
    const key = this.planets[num.toString()];
    return Object.entries(this.planetsEnabled).some((entry) => {
      const [k, v] = entry;
      return k === key && v === true;
    });
  }

  filterYears(item: TransitionInfo) {
    return item.year >= this.yearRange[0] && item.year <= this.yearRange[1];
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["file", index].join("-")];
  }

  selectOnePlanet(e, key) {
    e.stopPropagation();
    Object.entries(this.planetsEnabled).forEach((entry) => {
      const [k, v] = entry;
      this.planetsEnabled[k] = k === key;
    });
  }

  updateStartEndRange() {
    if (this.startYear < this.minYear) {
      this.startYear = this.minYear;
    }
    const startInRange = this.startYear < this.yearRange[1];
    if (startInRange) {
      this.yearRange[0] = this.startYear;
    }
  }

  @Watch("yearRange")
  changeYearRange() {
    this.loadData();
  }

  @Watch("startYear")
  changeStartYear() {
    this.updateStartEndRange();
  }
}
</script>
