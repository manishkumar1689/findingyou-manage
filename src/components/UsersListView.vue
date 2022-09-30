<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">
      <span class="text-label">{{ title }}</span>
      <em v-if="showSubtotal" class="total rounded-box">{{ subtotal }}</em>
      <em class="total rounded-box">{{ total }}</em>
    </h1>
    <form class="search-form">
      <b-input
        icon-right="magnify"
        v-model="searchString"
        size="64"
        class="search-string"
        @keydown.native="manageKeydown"
      />
      <b-button icon-left="magnify" @click="searchUsers" />
      <b-field label="Type">
        <b-radio-button
          v-model="listMode"
          native-value="members"
          type="is-info is-light is-outlined"
        >
          <b-icon icon="account-multiple"></b-icon>
          <span>Members</span>
        </b-radio-button>

        <b-radio-button
          v-model="listMode"
          native-value="admin"
          type="is-success is-light is-outlined"
        >
          <b-icon icon="account-supervisor-circle"></b-icon>
          <span>Admin</span>
        </b-radio-button>
      </b-field>
      <b-field label="Active only">
        <b-switch v-model="activeOnly" />
      </b-field>
      <b-button icon-right="plus" @click="showAddForm">Add new</b-button>
    </form>
    <UserEdit
      v-if="hasSelected"
      :current="selectedUser"
      :preferenceOptions="preferenceOptions"
      :roleOpts="roles"
    />
    <b-table
      v-if="hasUsers"
      :data="users"
      :row-class="(row, index) => assignRowClasses(index)"
      :paginated="true"
      backend-pagination
      :current-page="page"
      :per-page="perPage"
      :total="total"
      @page-change="onPageChange"
      class="listing-table users-list-table"
    >
      <template slot-scope="props">
        <b-table-column class="name" field="fileName" label="Name">{{
          props.row.fullName
        }}</b-table-column>
        <b-table-column class="identifier" field="identifier" label="Email">
          {{ props.row.identifier }}
        </b-table-column>
        <b-table-column
          class="placenames"
          field="placenames"
          label="Placenames"
        >
          <span
            class="text-label"
            @click="selectRow(props.index)"
            title="Click to toggle selection"
            >{{ renderPlacenames(props.row.placenames) }}</span
          >
        </b-table-column>
        <b-table-column class="roles" field="roles" label="Roles">
          {{ renderRoles(props.row.roles) }}
        </b-table-column>
        <b-table-column class="gender" field="gender" label="Gender">
          {{ props.row.gender }}
        </b-table-column>
        <b-table-column class="payments" field="payments" label="Payments">
          <span
            v-if="hasPayments(props.row)"
            :title="matchLastPaymentDate(props.row) | mediumDate"
            >{{ matchLastPayment(props.row) | toCurrency }}</span
          >
        </b-table-column>
        <b-table-column class="test" field="test" label="Test">
          <b-checkbox v-model="testStatusMap[props.row._id]" />
        </b-table-column>
        <b-table-column class="modified" field="modified" label="Last edited">
          {{ props.row.modifiedAt | longDate }}
        </b-table-column>
        <b-table-column class="edit" field="edit" label="Edit">
          <span @click="edit(props.row)" class="edit">
            <b-icon icon="square-edit-outline" size="is-small" />
          </span>
        </b-table-column>
      </template>
    </b-table>
    <div v-if="!showForm" class="actions bottom fixed row">
      <b-field label="Change location" class="row">
        <b-select v-if="hasCustomLocations" v-model="customLocation">
          <option
            v-for="item in customLocationOptions"
            :key="item.itemKey"
            :value="item.value"
          >
            {{ item.name }}
          </option>
        </b-select>
      </b-field>

      <b-button
        @click="saveStatus()"
        class="save"
        type="is-success"
        size="is-medium"
        >{{ saveButtonLabel }}</b-button
      >
      <b-button
        v-if="showRevert"
        @click="revert()"
        class="save"
        type="is-info"
        size="is-medium"
        >Revert</b-button
      >
      <b-icon
        v-if="showSelectAll"
        @click.native="selectAll()"
        class="select-toggle"
        icon="checkbox-multiple-marked"
        size="is-large"
        title="Select all"
      />
      <b-icon
        v-if="showSelectNone"
        @click.native="selectNone()"
        class="select-toggle"
        icon="checkbox-multiple-blank"
        size="is-large"
        title="Select none"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import {
  listUsers,
  fetchPreferenceOptions,
  fetchRoleOptions,
  saveUserTestStatus,
  fetchUser,
  fetchCustomLocations,
  saveUserCustomLocation,
} from "../api/methods";
import { renderRolesFromKeys, smartCastInt } from "../api/converters";
import { emptyString, notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { User, defaultUser, Placename } from "../api/interfaces/users";
import UserEdit from "./UsersEdit.vue";
import {
  hasPayments,
  matchLastPayment,
  matchLastPaymentDate,
} from "../api/mappers";
import { extractCorePlacenames } from "../api/helpers";
import { bus } from "../main";
import {
  PreferenceOption,
  Role,
  SimpleLocation,
  StringBool,
} from "../api/interfaces";
import { buildCustomLocOptions } from "@/api/mappings/custom-locations";

@Component({
  components: {
    UserEdit,
  },
  filters: FilterSet,
})
export default class UsersListView extends Vue {
  @State("user") user: UserState;
  result: any = null;

  users: Array<User> = [];

  total = 0;

  subtotal = 0;

  criteria = new Map<string, string | number | boolean>();

  searchString = "";

  selectedUser = null;

  showForm = false;

  preferenceOptions: Array<PreferenceOption> = [];

  roles: Array<Role> = [];

  listMode = "members";

  activeOnly = true;

  perPage = 100;

  page = 1;

  testStatusMap: StringBool = {};

  evaluated = false;

  selectedRowIndices = [];

  customLocations: SimpleLocation[] = [];

  customLocation = "--";

  created() {
    const { query } = this.$route;
    const currPageint = query.page ? smartCastInt(query.page) : -1;
    if (currPageint > 0) {
      this.page = currPageint;
    }
    this.loadData();
    bus.$on("escape", this.dismiss);
    bus.$on("update-user-list", (ok) => {
      if (ok) {
        this.loadData();
      }
    });
    const { path } = this.$route;
    const pathParts = path.substring(1).split("/");
    if (pathParts.length > 1) {
      switch (pathParts[1]) {
        case "members":
        case "member":
          this.criteria.set("type", "members");
          break;
        case "admins":
        case "admin":
          this.criteria.set("type", "admin");
          break;
      }
    }
    this.fetchLocations();
    bus.$on("remove-media-item", ({ user, index, mediaRef }) => {
      const item = this.users.find((u) => u._id === user);
      if (item instanceof Object) {
        if (
          Object.keys(item).includes("profiles") &&
          item.profiles.length > 0
        ) {
          if (index >= 0 && index < item.profiles.length) {
            const pr = item.profiles[index];
            if (pr instanceof Object && Object.keys(pr).includes("mediaRef")) {
              const mediaIndex = item.profiles[index].mediaItems.findIndex(
                (mi) => mi.filename === mediaRef
              );
              if (mediaRef >= 0) {
                item.profiles[index].mediaItems.splice(mediaIndex, 1);
              }
            }
          }
        }
      }
    });
    bus.$on("update-user-record", (id, edited) => {
      const item = this.users.find((u) => u._id === id);
      if (item instanceof Object && edited instanceof Object) {
          Object.entries(edited).forEach(([k, v]) => {
            item[k] = v;
          });
      }
    });
  }

  async loadData() {
    this.criteria.set("totals", 1);

    const filter = Object.fromEntries(this.criteria);
    const hasUsearch = this.criteria.has("usearch")
      ? notEmptyString(filter.usearch)
      : false;
    if (hasUsearch) {
      filter.admin = 1;
    }
    const startIndex = (this.page - 1) * this.perPage;
    await listUsers(startIndex, this.perPage, filter).then((result) => {
      if (result.valid) {
        this.users = result.items.map((user) => {
          const fullName = notEmptyString(user.fullName)
            ? user.fullName
            : user.nickName;
          return { ...user, fullName };
        });

        this.subtotal = result.total;
        if (result.grandTotal) {
          this.total = result.grandTotal;
        }
        this.buildUserStatusMap();
      }
      fetchPreferenceOptions().then((data) => {
        if (data.items instanceof Array) {
          this.preferenceOptions = data.items;
          this.openUserForm();
        }
      });
      fetchRoleOptions().then((data) => {
        if (data instanceof Array) {
          this.roles = data;
        }
      });
    });
  }

  loadUser(userId = "") {
    if (notEmptyString(userId, 12) && /^[a-f0-9]+$/i.test(userId)) {
      fetchUser(userId).then((result) => {
        if (result.valid && result.user instanceof Object) {
          this.edit(result.user);
        }
      });
    }
  }

  buildUserStatusMap() {
    this.evaluated = false;
    this.testStatusMap = {};
    this.users.forEach((user) => {
      this.testStatusMap[user._id] = user.test === true;
    });
    setTimeout(() => {
      this.evaluated = true;
    }, 125);
  }

  openUserForm() {
    const { path } = this.$route;
    const parts = path.substring(1).split("/");
    if (parts.length > 2) {
      const userId = parts[2];
      if (notEmptyString(userId)) {
        const user = this.users.find((u) => u._id === userId);
        if (user instanceof Object) {
          this.edit(user);
        } else {
          this.loadUser(userId);
        }
      }
    }
  }

  get hasUsers(): boolean {
    return this.users.length > 0;
  }

  get showSubtotal(): boolean {
    return this.subtotal > 0 && this.subtotal !== this.total;
  }

  edit(user: User) {
    this.selectedUser = user;
    this.showForm = true;
  }

  showAddForm() {
    this.selectedUser = Object.assign({}, defaultUser);
    this.showForm = true;
    const { path } = this.$route;
    const newPath = ["/users", "new"].join("/");
    if (newPath !== path) {
      this.$router.push(newPath);
    }
  }

  renderPlacenames(placenames: Placename[]) {
    return extractCorePlacenames(placenames);
  }

  dismiss() {
    this.selectedUser = null;
    this.showForm = false;
  }

  renderRoles(roles = []) {
    return renderRolesFromKeys(roles);
  }

  hasSelected() {
    let valid = false;
    if (this.selectedUser instanceof Object) {
      const keys = Object.keys(this.selectedUser);
      valid = keys.includes("fullName");
    }
    return valid;
  }

  hasPayments(user: User) {
    return hasPayments(user);
  }

  matchLastPayment(user: User) {
    return matchLastPayment(user);
  }

  matchLastPaymentDate(user: User) {
    return matchLastPaymentDate(user);
  }

  updateList() {
    if (notEmptyString(this.searchString)) {
      this.searchUsers();
    } else {
      this.criteria.set("usearch", "");
      this.loadData();
    }
  }

  updateLookup(e) {
    if (emptyString(this.searchString)) {
      e.preventDefault();
      this.updateList();
    }
  }

  manageKeydown(e) {
    switch (e.which) {
      case 13:
        e.preventDefault();
        this.updateList();
        break;
      case 8:
        this.updateLookup(e);
        break;
    }
  }

  get customLocationEditMode() {
    return (
      notEmptyString(this.customLocation, 9) &&
      this.customLocation.endsWith("}") &&
      this.selectedRowIndices.length > 0
    );
  }

  get saveButtonLabel() {
    if (this.customLocationEditMode) {
      return "Save custom location of selected rows";
    } else {
      return "Save test statuses";
    }
  }

  saveStatus() {
    if (this.customLocationEditMode) {
      const ids = this.selectedRowIndices
        .map((index) => {
          if (index < this.users.length) {
            return this.users[index]._id;
          } else {
            return "";
          }
        })
        .filter(notEmptyString);
      const loc = JSON.parse(this.customLocation);
      saveUserCustomLocation(this.user._id, ids, loc).then((result) => {
        if (result.ids.length > 0 && result.geo instanceof Object) {
          this.selectedRowIndices = [];
          ids.forEach((id) => {
            const item = this.users.find((user) => user._id === id);
            item.geo = result.geo;
            item.placenames = result.placenames;
          });
        }
      });
    } else {
      const values = Object.entries(this.testStatusMap)
        .map(([id, value]) => {
          return { id, value };
        })
        .filter(
          (item) =>
            notEmptyString(item.id, 6) && typeof item.value === "boolean"
        );
      this.evaluated = false;
      saveUserTestStatus(this.user._id, values).then((result: any) => {
        if (result) {
          this.toast("Test statuses saved");
          this.evaluated = true;
        }
      });
    }
  }

  fetchLocations() {
    fetchCustomLocations().then((locs: SimpleLocation[]) => {
      this.customLocations = locs;
    });
  }

  get customLocationOptions() {
    return buildCustomLocOptions(this.customLocations);
  }

  get hasCustomLocations() {
    return this.customLocations.length > 1;
  }

  get wrapperClasses() {
    const cls = [];
    if (this.showForm) {
      cls.push("show-form");
    }
    return cls;
  }

  get title() {
    const { path } = this.$route;
    const pathParts = path.substring(1).split("/");
    if (pathParts.length > 1) {
      switch (pathParts[1]) {
        case "members":
        case "member":
          return "Members";
        case "admins":
        case "admin":
          return "Administrators";
        case "new":
          return "New User";
        default:
          if (/^[0-9a-f]{16.32}$/.test(pathParts[1])) {
            return "Edit User";
          }
      }
    }
    return "Members and Admins";
  }

  assignRowClasses(index: number) {
    const cls = [["index", index].join("-"), ["user", index].join("-")];
    if (this.selectedRowIndices.includes(index)) {
      cls.push("selected");
    }
    return cls;
  }

  searchUsers() {
    if (notEmptyString(this.searchString)) {
      this.criteria.set("usearch", this.searchString);
    } else {
      this.criteria.delete("usearch");
    }
    this.loadData();
  }

  onPageChange(page = 0) {
    this.page = page;
    this.loadData();
  }

  selectToggle(newVal = true) {
    this.testStatusMap = {};
    for (const user of this.users) {
      this.testStatusMap[user._id] = newVal;
    }
  }

  revert() {
    this.buildUserStatusMap();
  }

  calcPropSelected() {
    const entries =
      this.testStatusMap instanceof Object
        ? Object.entries(this.testStatusMap)
        : [];
    const numEntries = entries.length;
    return numEntries > 0
      ? entries.filter((entry) => entry[1]).length / numEntries
      : 0;
  }

  get showSelectAll() {
    return (
      this.evaluated &&
      this.calcPropSelected() < 1 &&
      !this.customLocationEditMode
    );
  }

  get showRevert() {
    return !this.customLocationEditMode;
  }

  get showSelectNone() {
    return (
      this.evaluated &&
      this.calcPropSelected() > 0.05 &&
      !this.customLocationEditMode
    );
  }

  selectAll() {
    return this.selectToggle(true);
  }

  selectNone() {
    return this.selectToggle(false);
  }

  toast(message = "") {
    this.$buefy.toast.open({
      duration: 3000,
      message,
      position: "is-bottom",
      type: "is-success",
    });
  }

  selectRow(index = -1) {
    if (index >= 0) {
      const selIndex = this.selectedRowIndices.indexOf(index);
      if (selIndex < 0) {
        this.selectedRowIndices.push(index);
      } else {
        this.selectedRowIndices.splice(selIndex, 1);
      }
    }
  }

  @Watch("selectedUser")
  changeSelectedUser(newVal) {
    const { path } = this.$route;
    const currParts = path.substring(1).split("/");
    const currSub = currParts.length > 1 ? currParts[1] : "";
    const pathParts = ["/users"];
    if (newVal instanceof Object) {
      const { _id } = newVal;
      if (notEmptyString(_id, 10)) {
        pathParts.push("edit", _id);
      }
    }
    const newPath = pathParts.join("/");
    if (newPath !== path && currSub !== "new") {
      this.$router.push(newPath);
    }
  }

  @Watch("listMode")
  changeListmode(newVal) {
    const { path } = this.$route;
    const newPath = ["/users", newVal].join("/");
    if (newPath !== path) {
      this.$router.push(newPath);
      this.criteria.set("type", newVal);
      this.loadData();
    }
  }

  @Watch("activeOnly")
  changeActiveOnly(newVal, prevVal) {
    if (newVal !== prevVal) {
      this.criteria.set("admin", newVal ? 1 : 0);
      this.loadData();
    }
  }

  @Watch("page")
  changePage(newVal) {
    if (newVal) {
      const { path, query } = this.$route;
      const prevPageParam = query.page ? query.page : "-1";
      const newPage = this.page.toString();
      if (newPage !== prevPageParam) {
        const params = { ...query, page: newPage };
        this.$router.push({ path, query: params });
      }
    }
  }
}
</script>