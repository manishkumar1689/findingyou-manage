<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">
      <span class="text-label">{{ title }}</span>
      <em class="total rounded-box">{{ total }}</em>
    </h1>
    <form class="filter-form row">
      <b-field label="Search by name" class="row">
        <b-input v-model="search" type="text" :has-counter="false" 
        icon-right="magnify"
        size="64"
        class="search-string" style="min-width: 24em; max-width: 80%" @keydown.native="manageKeydown"/>
        <b-icon class="clear" icon="close-octagon-outline" @click.native="reset" />
        <b-select v-model="reason">
            <option v-for="(row, ri) in reasonOpts" :key="['reason-item', row.key, ri].join('-')" :value="row.key">{{row.name}}</option>
          </b-select>
        <b-button @click="loadData">Update</b-button>
      </b-field>
      <b-field label="Sort by" class="row horizontal">
        <b-select v-model="sortKey">
          <option v-for="(row, ri) in sortOpts" :key="['reason-item', row.key, ri].join('-')" :value="row.key">{{row.name}}</option>
        </b-select>
      </b-field>
    </form>
    <b-table
      v-if="hasItems"
      :data="items"
      :paginated="true"
      backend-pagination
      :current-page="page"
      :per-page="perPage"
      :total="total"
      @page-change="onPageChange"
      :detailed="true"
      detail-key="user"
      :opened-detailed="openIds"
      :show-detail-icon="true"
      @details-open="openDetailRow"
      @details-close="closeDetailRow"
      class="listing-table"
    >
      <template slot-scope="props">
        <b-table-column class="name" field="fullName" label="Name">
          <router-link :to="targetLink(props.row.user)">{{props.row.shortInfo}}</router-link>
        </b-table-column>
        <b-table-column class="email" field="email" label="Email">
          <a :href="mailTo(props.row.identifier)">{{ props.row.identifier }}</a>
        </b-table-column>
        <b-table-column class="login date" field="login" label="Latest">
          <b-tooltip :label="props.row.loginInfo">{{ props.row.latestReportDate | mediumDate }}</b-tooltip>
        </b-table-column>
        <b-table-column class="roles" field="roles" label="Roles">
          {{ renderRoles(props.row.roles) }}
        </b-table-column>
        <b-table-column class="reports" field="reports" label="# Reports / Reporters">
            <b-button @click="toggle(props.row)" :icon-right="expandIcon(props.row)">{{props.row.numSummary}}</b-button>
        </b-table-column>
        <b-table-column class="reasons" field="resons" label="# Reasons">
            {{props.row.reasons}}
        </b-table-column>
      </template>
      <template #detail="props">
        <b-table :data="props.row.reports" class="sub-table">
           <template slot-scope="subs">
              <b-table-column class="info" field="info" label="Info">
                  <router-link :to="targetLink(subs.row.user)" class="name info">{{subs.row.shortInfo}}</router-link>
              </b-table-column>
              <b-table-column class="email" field="identifier" label="Email">
                  <a :href="mailTo(subs.row.identifier)" target="_blank">{{ subs.row.identifier }}</a>
              </b-table-column>
               <b-table-column class="reason" field="reason" label="Reason">
                  {{ subs.row.reason }}
              </b-table-column>
              <b-table-column class="text" field="text" label="Message">
                  {{ subs.row.text }}
              </b-table-column>
              <b-table-column class="time" field="time" label="Time">
                  {{ subs.row.modifiedAt | mediumDate }}
              </b-table-column>
            </template>
          </b-table>
      </template>
    </b-table>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { State } from "vuex-class";
import { fetchReportReasons, getReportedUsers } from "../api/methods";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { ReportedUser } from "../api/models/ReportedUser";
import { renderRolesFromKeys } from "@/api/converters";
import { notEmptyString } from "@/api/validators";
import { KeyName } from "@/api/interfaces";

@Component({
  components: {},
  filters: FilterSet,
})
export default class ReportedListView extends Vue {
  @State("user") user: UserState;

  title = "Reported Users";

  items: ReportedUser[] = [];

  total = 0;

  search = "";

  showForm = false;

  activeOnly = true;

  perPage = 100;

  page = 1;

  evaluated = false;

  openIds = [];

  reason = '-';

  reasons: KeyName[] = [];

  sortKey = 'modified';

  sortOpts = [{
    key: 'modified',
    name: 'Latest'
  }, {
    key: 'num',
    name: '# reports'
  }, {
    key: 'reporters',
    name: '# reporters'
  }];

  created() {
    this.loadOptions();
    setTimeout(this.loadData, 250);
  }

  async loadOptions() {
    await fetchReportReasons().then(rows => {
      if (rows instanceof Array && rows.length > 0) {
        this.reasons = rows.map(r => {
          r.name = `${r.name} (${r.value})`;
          return r;
        });
      }
    })
  }

  get reasonOpts(): KeyName[] {
    return [{ key: "-", name: `Any`, value: -1 }, ...this.reasons]
  }

  async loadData() {
    

    await getReportedUsers(this.page, this.search, this.reason, this.sortKey).then((result: any) => {
      if (result.valid) {
        this.items = result.items.map((item) => {
          return new ReportedUser(item);
        });
        this.total = result.total;
      }
    });
  }

  get filterByReason(): boolean {
    return notEmptyString(this.reason, 3);
  }

/*   initFromUrl() {
    const { path } = this.$route;
    const parts = path.substring(1).split('/')
     if (parts.length > 2 && notEmptyString(parts[2], 3)) {
      if (/user-[a-f0-9]{12,30}/.test(parts[2])) {
        this.userId = parts[2].split('-').pop();
      } else {
        this.filterKey = parts[2];
      }
    }
  } */

  manageKeydown(e: any = null) {
    if (e instanceof Object && e.code) {
      switch (e.code) {
        case 'enter':
        case 'Enter':
          e.preventDefault();
          setTimeout(this.loadData, 100);
          break;
      }
    }
  }

  get hasItems(): boolean {
    return this.items.length > 0;
  }

  get subtotal() {
    return this.items.length;
  }

  get showSubtotal() {
    return this.subtotal > 0 && this.subtotal < this.total;
  }

  get wrapperClasses(): string[] {
    const cls = ["feedback-item-list"];
    return cls;
  }

  toggle(row: ReportedUser) {
    const openIndex = this.openIds.indexOf(row.user);
    if (openIndex < 0) {
      this.openIds.push(row.user);
    } else {
      this.openIds.splice(openIndex, 1);
    }
  }

  expandIcon(row: ReportedUser): string {
    const openIndex = this.openIds.indexOf(row.user);
    return openIndex < 0 ? 'chevron-down' : 'chevron-up';
  }

  openDetailRow(row: ReportedUser) {
    if (this.openIds.indexOf(row.user) < 0) {
      this.openIds.push(row.user);
    }
  }
  closeDetailRow(row: ReportedUser) {
    const openIndex = this.openIds.indexOf(row.user);
    if (openIndex >= 0) {
      this.openIds.splice(openIndex, 1);
    }
  }

  renderRoles(roles = []) {
    return renderRolesFromKeys(roles);
  }

  targetLink(userId = "") {
    const { path } = this.$route;
    if (notEmptyString(userId, 16)) {
      return ['/users', 'edit', userId].join('/')
    } else {
      return path;
    }
  }

  mailTo(email = "") {
    if (notEmptyString(email) && email.includes("@")) {
      return ["mailto", email].join(":");
    } else {
      return "#";
    }
  }

  dismiss() {
    this.showForm = false;
  }

  onPageChange(page = 0) {
    this.page = page;
    this.loadData();
  }

  reset() {
    this.search = '';
    this.page = 1;
    this.loadData();
  }

  submit() {
    this.loadData();
  }

  @Watch('reason')
  changeReason(newVal) {
    this.page = 1;
    if (newVal) {
      this.loadData();
    }
  }

  @Watch('sort')
  changeSort(newVal) {
    this.page = 1;
    if (newVal) {
      this.loadData();
    }
  }

}
</script>
