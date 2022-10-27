<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">
      <span class="text-label">{{ title }}</span>
      <em v-if="showSubtotal" class="total rounded-box">{{ subtotal }}</em>
      <em class="total rounded-box">{{ total }}</em>
    </h1>
    <form class="filter-form">
      <b-field label="Subject type" class="row">
        <b-select v-model="filterKey">
          <template v-if="hasTypeOptions">
            <option
              v-for="opt in typeOptions"
              :key="opt.itemKey"
              :value="opt.key"
              :selected="filterKey === opt.key"
            >
              {{ opt.name }}
            </option>
          </template>
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
          <span class="text-label">{{ renderKey(props.row.key) }}</span>
          <b-icon v-if="props.row.hasMediaItems" icon="image-outline"></b-icon>
        </b-table-column>
        <b-table-column class="roles" field="roles" label="Roles">
          {{ renderRoles(props.row.roles) }}
        </b-table-column>

        <b-table-column class="target" field="targetUser" label="Target user">
          <router-link v-if="props.row.hasTargetUser" :to="targetLink(props.row.targetUser)">
                <b-tooltip :label="props.row.targetInfo">{{props.row.fullName}}</b-tooltip>
              </router-link>
        </b-table-column>
        <b-table-column class="modified" field="modified" label="Edited">
          {{ props.row.modifiedAt | longDate }}
        </b-table-column>
      </template>
      <template #detail="props">
        <article class="row horizontal details">
          <div class="message column vertical">

            <div class="body" v-html="props.row.text"></div>
            <p v-if="props.row.hasDeviceDetails" class="deviceDetails">
            {{ props.row.deviceDetails }}
          </p>
          </div>
          <div v-if="props.row.hasMediaItems" class="images column vertical">
            <figure v-for="item in props.row.mediaItems" :key="item._id">
              <template v-if="isImage(item)">
                <img :src="fileLink(item)" :alt="item.title" />
              </template>
            </figure>
          </div>
          <div v-if="props.row.hasTargetUser" class="other-user column vertical">
            <p><a :href="mailTo(props.row.targetEmail)">{{props.row.targetFullName}}</a></p>
            <p><strong>Active</strong> <span>{{props.row.targetUser.active | yesNo}}</span></p>
            <p><strong>Gender / DOB</strong> <span>{{props.row.targetGender}}</span> <span>{{props.row.targetUser.dob | mediumDateOnly }}</span></p>
          </div>
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
import { api } from "@/.config";
import { MediaItem } from "@/api/interfaces/users";
import { KeyName } from "@/api/interfaces";

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

  typeOpts: KeyName[] = [];

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
        if (result.types instanceof Array) {
          this.typeOpts = result.types.map((tp, ti) => {
            const { key, title, num } = tp;
            const itemKey = ["fb-type", key, ti].join("-");
            return {
              key,
              name: `${title} (${num})`,
              itemKey,
            };
          });
        }
        this.total = result.total;
      }
    });
  }

  get hasTypeOptions() {
    return this.typeOpts.length > 0;
  }

  get typeOptions() {
    const emptyOpt = { key: "-", name: "All", itemKey: "fb-type-all" };
    return [emptyOpt, ...this.typeOpts];
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

  isImage(item: MediaItem) {
    return item.mime.includes("image");
  }

  fileLink(item: MediaItem) {
    return [
      api.base.replace(/\/$/, ""),
      "feedback",
      "view-file",
      item.filename,
      this.user._id,
    ].join("/");
  }

  targetLink(user = null) {
    const { path } = this.$route;
    if (user instanceof Object) {
      return ['/users', 'edit', user._id].join('/')
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

  @Watch("filterKey")
  changeFilterKey() {
    this.loadData();
  }
}
</script>