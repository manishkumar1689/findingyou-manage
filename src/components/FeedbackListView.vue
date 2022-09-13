<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">
      <span class="text-label">{{ title }}</span>
      <em v-if="showSubtotal" class="total rounded-box">{{ subtotal }}</em>
      <em class="total rounded-box">{{ total }}</em>
    </h1>
    <form class="filter-form"></form>
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
      detail-key="_id"
      :show-detail-icon="true"
      @details-open="openDetailRow"
      @details-close="closeDetailRow"
      class="listing-table"
    >
      <template slot-scope="props">
        <b-table-column class="name" field="fullName" label="Name">{{
          props.row.bestName
        }}</b-table-column>
        <b-table-column class="email" field="email" label="Email">
          <a :href="mailTo(props.row.email)">{{ props.row.email }}</a>
        </b-table-column>
        <b-table-column class="key" field="key" label="Subject">
          {{ renderKey(props.row.key) }}
        </b-table-column>
        <b-table-column class="roles" field="roles" label="Roles">
          {{ renderRoles(props.row.roles) }}
        </b-table-column>
        <b-table-column class="modified" field="modified" label="Edited">
          {{ props.row.modifiedAt | longDate }}
        </b-table-column>
      </template>
      <template #detail="props">
        <article class="column vertical">
          <p v-if="props.row.hasDeviceDetails" class="deviceDetails">
            {{ props.row.deviceDetails }}
          </p>
          <div class="body" v-html="props.row.text"></div>
        </article>
      </template>
    </b-table>
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { getFeedback } from "../api/methods";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { FeedbackItem } from "../api/models/FeedbackItem";
import { bus } from "../main";
import { renderRolesFromKeys, snakeToWords } from "@/api/converters";
import { notEmptyString } from "@/api/validators";

@Component({
  components: {},
  filters: FilterSet,
})
export default class FeedbackListView extends Vue {
  @State("user") user: UserState;

  title = "Feedback Messages";

  items: FeedbackItem[] = [];

  total = 0;

  filterKey = "";

  showForm = false;

  activeOnly = true;

  perPage = 100;

  page = 1;

  evaluated = false;

  openId = "";

  created() {
    this.loadData();
    bus.$on("escape", this.dismiss);
  }

  async loadData() {
    await getFeedback(this.page, this.filterKey).then((result: any) => {
      if (result.valid) {
        this.items = result.items.map((item) => {
          return new FeedbackItem(item);
        });
        this.total = result.total;
      }
    });
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

  openDetailRow(row: FeedbackItem) {
    this.openId = row._id;
  }
  closeDetailRow() {
    this.openId = "";
  }

  renderRoles(roles = []) {
    return renderRolesFromKeys(roles);
  }

  renderKey(key = "") {
    return snakeToWords(key);
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
}
</script>