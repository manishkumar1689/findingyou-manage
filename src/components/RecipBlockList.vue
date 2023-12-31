<template>
  <div class="main-view" :class="wrapperClasses">
      <h3 class="sub-title">Members blocked by other users</h3>
      <b-field label="Search" class="horizontal row">
        <b-input v-model="search" type="text" :has-counter="false" 
        icon-right="magnify"
        size="64"
        class="search-string"
        style="min-width: 24em; max-width: 80%"
        @keydown.native="manageKeydown"/>
      </b-field>
    <b-table
      :data="items"
       :paginated="true"
      backend-pagination
      :current-page="page"
      :per-page="perPage"
      :total="subtotal"
      @page-change="onPageChange"
    >
      <template slot-scope="props">
        <b-table-column class="size" field="from" label="Initiator">
          <b-tooltip :label="props.row.fromEmail" :multilined="true">{{props.row.bestName('from')}} ({{props.row.fromInfo}})</b-tooltip>
        </b-table-column>
        <b-table-column class="edit" field="edit1" label="View / wdit">
          <b-icon icon="eye-outline" @click.native="editRelUser(props.row.user)" />
        </b-table-column>
        <b-table-column class="created" field="to" label="Target">
          <b-tooltip :label="props.row.toEmail" :multilined="true">{{props.row.bestName('to')}} ({{props.row.toInfo}})</b-tooltip>
        </b-table-column>
        <b-table-column class="edit" field="edit2" label="Blocked by">
          <b-button icon-left="pencil-outline" @click.native="editRelUser(props.row.targetUser)">{{props.row.targetTotal}}</b-button>
        </b-table-column>
        <b-table-column class="created" field="createdAt" label="Date/time">{{
          props.row.createdAt | mediumDate
        }}</b-table-column>
        <b-table-column class="edit" field="unblock" label="Unblock">
          <b-icon icon="lock-open-outline" @click.native="handleUnBlock(props.row)" />
        </b-table-column>
      </template>
    </b-table>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { State} from "vuex-class";
import { UserState } from "../store/types";
import { fetchBlockList, unBlockUserPair } from "../api/methods";

import { notEmptyString } from "@/api/validators";
import { FilterSet } from "@/api/composables/FilterSet";

class BlockPair {
  user = "";
  targetUser = "";
  createdAt = new Date();
  fromName = "";
  fromNickName = "";
  fromGender = "";
  fromoDob = new Date();
  fromEmail = "";
  fromActive = false;
  fromRoles: string[] = [];
  toName = "";
  toNickName = "";
  toGender = "";
  toDob = new Date();
  toEmail = "";
  toActive = false;
  toRoles: string[] = [];
  targetTotal = 0;
  toAge = -1;
  fromAge = -1;

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([key, val]) => {
        if (typeof val === "string") {
          switch (key) {
            case "createdAt":
            case "fromDob":
            case "toDob":
              this[key] = new Date(val);
              break;
            case "user":
            case "fromName":
            case "fromNickName":
            case "fromGender":
            case "fromEmail":
            case "targetUser":
            case "toName":
            case "toNickName":
            case "toGender":
            case "toEmail":
              this[key] = val;
              break;
          }
        } else if (typeof val === "boolean") {
          switch (key) {
            case "toActive":
            case "fromActive":
              this[key] = val;
              break;
          }
        } else if (typeof val === "number") {
          switch (key) {
            case "targetTotal":
            case "fromAge":
            case "toAge":
              this[key] = val;
              break;
          }
        } else if (val instanceof Array) {
          switch (key) {
            case "fromRoles":
            case "toRoles":
              this[key] = val;
              break;
          }
        }
      })
    }
  }

  bestName(mode = 'from') {
    const fn = mode === 'to' ? this.toName : this.fromName;
    const nn = mode === 'to' ? this.toNickName: this.fromNickName;
    return notEmptyString(fn) ? fn : nn;
  }

  translateRoles(roles: string[], active: boolean) {
    const words = active ? [] : ["blocked"];
    const roleKeys = roles.map(key => {
      switch (key) {
        case 'active':
          return 'member';
        default:
          return key;
      }
    }).filter(key => key !== 'blocked');
    return [...words, ...roleKeys].join(', ');
  }

  getInfo(mode = 'to') {
    const fields = mode === 'to' ? [this.toGender, this.toAge, this.translateRoles(this.toRoles, this.toActive)] : [this.fromGender, this.fromAge, this.translateRoles(this.fromRoles, this.fromActive)];
    if (fields[1] < 0) {
      fields.splice(1, 1);
    }
    return fields.join(' / ');
  }

  get fromInfo() {
    return this.getInfo('from');
  }

  get toInfo() {
    return this.getInfo('to');
  }

}

@Component({
  components: {
  },
  filters: FilterSet,
})
export default class UserBlockList extends Vue {
  @State("user") user: UserState;

  search = "";

  start = 0;

  items: BlockPair[] = [];

  messages: any[] = [];

  subtotal = 0;

  total = 0;

  perPage = 100;

  created() {
    setTimeout(this.sync, 500);
  }

  mounted() {
    setTimeout(this.sync, 200);
  }

  syncing = false;

  get wrapperClasses() {
    return ["block-list"];
  }

  get hasItems() {
    return this.items.length > 0;
  }

  get page() {
    return Math.floor(this.start  / this.perPage) + 1;
  }

  handleUnBlock(row: BlockPair) {
    if (row instanceof Object) {
    const uName = row.bestName('from')
    const otherUName = row.bestName('to');
    const genitive = /s$/i.test(uName)? "'" : "'s";
    this.$buefy.dialog.confirm({
      message: `Are you sure you wish to remove the ${uName}${genitive} block of ${otherUName}`,
      cancelText: "Keep",
      confirmText: "Delete",
      type: "is-danger",
      onConfirm: () => this.unBlock(row),
    });
    } 
  }

  unBlock(row: BlockPair) {
    const { user, targetUser } = row;
    unBlockUserPair(user, targetUser, "to").then(result => {
      if (result) {
        const index = this.items.findIndex(item => item.user === user && item.targetUser === targetUser);
        if (index >= 0) {
          this.items.splice(index, 1);
        }
      }
    })
  }

  editRelUser(uid: string) {
    const newPath = ['/users', 'edit', uid].join('/');
    const { query } = this.$route;
    this.$router.push({
      path: newPath,
      query 
    });
  }

  onPageChange(page = 0) {
    if (typeof page === 'number') {
      this.start = (page - 1) * this.perPage;
      this.sync();
    }
  }

  manageKeydown(e: any = null) {
    if (e instanceof Object && e.code) {
      switch (e.code) {
        case 'enter':
        case 'Enter':
          setTimeout(this.sync, 100);
          break;
      }
    }
  }

  sync() {
    if (!this.syncing) {
      this.syncing = true;
      fetchBlockList(this.start, this.search).then(data => {
        const { items, start, total, grandTotal } = data;
        if (items instanceof Array) {
          this.items = items.filter(item => item instanceof Object).map(item => {
            return new BlockPair(item);
          });
          this.subtotal = total;
          this.total = grandTotal;
          this.start = start;
        }
        setTimeout(() => {
          this.syncing = false;
        }, 250)
      });
    }
  }

}
</script>
