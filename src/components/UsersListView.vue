<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">Users</h1>
    <form class="search-form">
      <b-input
        icon-right="magnify"
        v-model="searchString"
        size="64"
        class="search-string"
        @keydown.native="manageKeydown"
      />
      <b-button icon-left="magnify" @click="searchUsers"/>
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
      class="listing-table"
    >
      <template slot-scope="props">
        <b-table-column class="name" field="fileName" label="Name">{{
          props.row.fullName
        }}</b-table-column>
        <b-table-column class="identifier" field="identifier" label="Email">
          {{ props.row.identifier }}
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
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { listUsers, fetchPreferenceOptions, fetchRoleOptions } from "../api/methods";
import { capitalize, snakeToWords } from "../api/converters";
import { emptyString, notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { User, defaultUser } from "../api/interfaces/users";
import UserEdit from "./UsersEdit.vue";
import {
  hasPayments,
  matchLastPayment,
  matchLastPaymentDate,
} from "../api/mappers";
import { bus } from "../main";
import { PreferenceOption, Role } from "../api/interfaces";

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

  criteria = new Map<string, string | number | boolean>();

  searchString = "";

  selectedUser = null;

  showForm = false;

  preferenceOptions: Array<PreferenceOption> = [];

  roles: Array<Role> = [];

  created() {
    this.loadData();
    bus.$on("escape", this.dismiss);
    bus.$on("update-user-list", ok  => {
      if (ok) {
        this.loadData();
      }
    })
    bus.$on("remove-media-item", ({user, index, mediaRef})  => {
      const item = this.users.find(u => u._id === user);
      if (item instanceof Object) {
        if (Object.keys(item).includes('profiles') && item.profiles.length > 0) {
          if (index >= 0 && index < item.profiles.length) {
            const pr = item.profiles[index];
            if (pr instanceof Object && Object.keys(pr).includes('mediaRef')) {
              const mediaIndex = item.profiles[index].mediaItems.findIndex(mi => mi.filename === mediaRef);
              if (mediaRef >= 0) {
                item.profiles[index].mediaItems.splice(mediaIndex, 1);
              }
            }
          }
        }
      }
    })
  }

  async loadData() {
    const filter = Object.fromEntries(this.criteria);
    await listUsers(0, 100, filter).then((result) => {
      if (result.valid) {
        this.users = result.items.map((user) => {
          const fullName = notEmptyString(user.fullName)? user.fullName : user.nickName;
          return { ...user, fullName }
        });
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
        const user = this.users.find(u => u._id === userId);
        if (user instanceof Object) {
          this.edit(user);
        }
      }
    }
  }

  get hasUsers() {
    return this.users.length > 0;
  }

  edit(user: User) {
    this.selectedUser = user;
    this.showForm = true;
  }

  showAddForm() {
    this.selectedUser = Object.assign({}, defaultUser);
    this.showForm = true;
  }

  dismiss() {
    this.selectedUser = null;
    this.showForm = false;
  }

  renderRoles(roles = []) {
    return roles.filter(notEmptyString).map(role => {
      return role === "active"? "Member" : capitalize(snakeToWords(role));
    }).join(", ");
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

  get wrapperClasses() {
    const cls = [];
    if (this.showForm) {
      cls.push("show-form");
    }
    return cls;
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["user", index].join("-")];
  }

  searchUsers() {
    if (notEmptyString(this.searchString)) {
      this.criteria.set('usearch', this.searchString);
    } else {
      this.criteria.delete('usearch');
    }
    this.loadData()
  }

  @Watch("selectedUser")
  changeSelectedUser(newVal) {
    const pathParts = ["/users"];
    if (newVal instanceof Object) {
      const { _id } = newVal;
      if (notEmptyString(_id, 10)) {
        pathParts.push("edit", _id);
      }
    }
    const newPath = pathParts.join("/");
    const { path } = this.$route;
    if (newPath !== path) {
      this.$router.push(newPath);
    }
  }
}
</script>
