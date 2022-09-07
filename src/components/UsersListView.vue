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
      class="listing-table"
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
          {{ renderPlacenames(props.row.placenames) }}
        </b-table-column>
        <b-table-column class="roles" field="roles" label="Roles">
          {{ renderRoles(props.row.roles) }}
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
    <div v-if="!showForm" class="actions bottom fixed">
      <b-button
        @click="saveStatus()"
        class="save"
        type="is-success"
        size="is-large"
        >Save</b-button
      >
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
} from "../api/methods";
import { capitalize, snakeToWords } from "../api/converters";
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
import { PreferenceOption, Role, StringBool } from "../api/interfaces";

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

  created() {
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
        this.testStatusMap = {};
        this.users.forEach((user) => {
          this.testStatusMap[user._id] = user.test === true;
        });
        this.subtotal = result.total;
        if (result.grandTotal) {
          this.total = result.grandTotal;
        }
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

  openUserForm() {
    const { path } = this.$route;
    const parts = path.substring(1).split("/");
    if (parts.length > 2) {
      const userId = parts[2];
      if (notEmptyString(userId)) {
        const user = this.users.find((u) => u._id === userId);
        if (user instanceof Object) {
          this.edit(user);
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
    return roles
      .filter(notEmptyString)
      .map((role) => {
        return role === "active" ? "Member" : capitalize(snakeToWords(role));
      })
      .join(", ");
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

  saveStatus() {
    const values = Object.entries(this.testStatusMap)
      .map(([id, value]) => {
        return { id, value };
      })
      .filter(
        (item) => notEmptyString(item.id, 6) && typeof item.value === "boolean"
      );
    saveUserTestStatus(this.user._id, values).then((result: any) => {
      if (result) {
        this.toast("Test statuses saved");
      }
    });
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
    return [["index", index].join("-"), ["user", index].join("-")];
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

  toast(message = "") {
    this.$buefy.toast.open({
      duration: 3000,
      message,
      position: "is-bottom",
      type: "is-success",
    });
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
}
</script>