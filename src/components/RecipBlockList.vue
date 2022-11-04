<template>
  <div class="main-view" :class="wrapperClasses">
      <h3 class="sub-title">Has blocked: </h3>
    <b-table
      :data="items"
    >
      <template slot-scope="props">
        <b-table-column class="size" field="nickName" label="Nick Name">
          <b-tooltip :label="buildInfo(props.row)" :multilined="true">{{props.row.info.fullName}}</b-tooltip>
        </b-table-column>
        <b-table-column class="created" field="mutual" label="Mutual">
          <b-icon v-if="props.row.mutual" icon="arrow-left-right-bold-outline" />
        </b-table-column>
        <b-table-column class="created" field="createdAt" label="Date">{{
          props.row.createdAt | mediumDate
        }}</b-table-column>
        <b-table-column class="edikt" field="unblock" label="Unblock">
          <b-icon icon="lock-open-outline" @click.native="handleUnBlock(props.row)" />
        </b-table-column>
        <b-table-column class="edikt" field="edit" label="Edit">
          <b-icon icon="pencil-outline" @click.native="editRelUser(props.row.user)" />
        </b-table-column>
      </template>
    </b-table>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { State} from "vuex-class";
import { UserState } from "../../store/types";
import { fetchBlockList, unBlockUserPair } from "../../api/methods";

import { notEmptyString } from "@/api/validators";
import { UserSchema } from "@/api/schemas";
import { FilterSet } from "@/api/composables/FilterSet";
import { mediumDate } from "@/api/converters";
import { defaultUser, User } from "@/api/interfaces/users";

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
    const fn = mode === 'to' ? this.fromName : this.toName;
    const nn = mode === 'to' ? this.fromNickName : this.toNickName;
    return notEmptyString(fn) ? fn : nn;
  }

}

@Component({
  components: {
  },
  filters: FilterSet,
})
export default class UserBlockList extends Vue {
  @Prop({ default: () => defaultUser }) readonly current: User;
  @State("user") user: UserState;

  search = "";

  start = 0;

  items: BlockPair[] = [];

  messages: any[] = [];

  created() {
    setTimeout(this.sync, 500);
  }

  get refUserId(): string {
    return this.current._id;
  }

  get wrapperClasses() {
    return ["block-list"];
  }

  get hasItems() {
    return this.items.length > 0;
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

  sync() {
    fetchBlockList(this.start, this.search).then(data => {
      const { items } = data;
      if (items instanceof Array) {
        this.items = items.filter(item => item instanceof Object).map(item => {
          return new BlockPair(item);
        });
      }
    });
  }

}
</script>
