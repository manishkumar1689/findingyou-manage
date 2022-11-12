<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">
      <span class="text-label">{{ title }}</span>
      <em class="total rounded-box">{{ total }}</em>
    </h1>
    <form class="filter-form">
      <b-field label="Search by name" class="row">
        <b-input v-model="search" type="text" :has-counter="false" 
        icon-right="magnify"
        size="64"
        class="search-string"
        style="min-width: 24em; max-width: 80%"
        @keydown.native="manageKeydown"/>
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
        <b-table-column class="reports" field="reports" label="Reports">
            <b-button @click="toggle(props.row)">{{props.row.numReports}}</b-button>
        </b-table-column>
      </template>
      <template #detail="props">
        <ol class="reports">
          <li v-for="(report, ri) in props.row.reports" :key="['user-report', props.row.user, report.user, ri].join('-')">
            <dl class="report twin-column">
              <dt>Reporter</dt>
              <dd>
                <router-link :to="targetLink(report.user)" class="name info">{{report.shortInfo}}</router-link>
                <a :href="mailTo(report.identifier)">{{ report.identifier }}</a>
              </dd>
              <dt>Reason</dt>
              <dd>
                <span class="subject">{{report.reason}}</span>
                <time>{{report.modifiedAt | mediumDate}}</time>
                <em v-if="report.hasContext">{{report.text}}</em>
              </dd>
              <dt v-if="report.hasText">Text</dt>
              <dd v-if="report.hasText">{{report.text}}</dd>
            </dl>
          </li>
        </ol>
      </template>
    </b-table>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { getReportedUsers } from "../api/methods";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { ReportedUser } from "../api/models/ReportedUser";
import { renderRolesFromKeys } from "@/api/converters";
import { notEmptyString } from "@/api/validators";

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

  created() {
    //this.initFromUrl();
    setTimeout(this.loadData, 250);
  }

  async loadData() {
    await getReportedUsers(this.page, this.search).then((result: any) => {
      if (result.valid) {
        this.items = result.items.map((item) => {
          return new ReportedUser(item);
        });
        this.total = result.total;
      }
    });
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
    e.preventDefault();
    if (e instanceof Object && e.code) {
      switch (e.code) {
        case 'enter':
        case 'Enter':
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


  submit() {
    this.loadData();
    /* const parts = ['/messages', 'list'];
    if (notEmptyString(newVal, 3)) {
      parts.push(newVal);
    }
    const newPath = parts.join('/')
    const { path } = this.$route;
    if (path !== newPath) {
      this.$router.push(newPath)
    } */
  }
}
</script>
