<template>
  <div class="main-view" :class="wrapperClasses">
    <div class="blocked-by">
      <template v-if="hasToRows">
      <h3 class="sub-title">Has blocked: </h3>
        <b-table
          :data="hasBlockedUsers"
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
    </div>
    <div class="blocked-by">
      <template v-if="hasFromRows">
        <h3 class="sub-title">Blocked by: </h3>
        <b-table
          :data="isBlockedByUsers"
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
    </div>
    <div class="messages"><router-link :to="feedbackLink">
      <b-icon icon="message-text-outline" />
      <strong>{{this.numMessages}} freedback message(s)</strong>
      </router-link></div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { State} from "vuex-class";
import { UserState } from "../../store/types";
import { fetchUserBlocks, unBlockUserPair } from "../../api/methods";

import { notEmptyString } from "@/api/validators";
import { UserSchema } from "@/api/schemas";
import { FilterSet } from "@/api/composables/FilterSet";
import { mediumDate } from "@/api/converters";
import { defaultUser, User } from "@/api/interfaces/users";

interface UserBlockItem {
  user: string;
  mode: string;
  mutual: boolean;
  createdAt: string;
  info?: UserSchema;
}

@Component({
  components: {
  },
  filters: FilterSet,
})
export default class UserBlockList extends Vue {
  @Prop({ default: () => defaultUser }) readonly current: User;
  @State("user") user: UserState;

  items: UserBlockItem[] = [];

  messages: any[] = [];

  created() {
    setTimeout(this.sync, 500);
  }

  mounted() {
    setTimeout(this.sync, 200);
  }

  get refUserId(): string {
    return this.current._id;
  }

  get wrapperClasses() {
    return ["user-block-container", "grid", "grid-2"];
  }

  get feedbackLink() {
    return ['/messages', 'list', ['user', this.current._id].join('-')].join('/');
  }

  get hasItems() {
    return this.items.length > 0;
  }

  get hasToRows() {
    return this.hasBlockedUsers.length > 0;
  }

  get hasFromRows() {
    return this.isBlockedByUsers.length > 0;
  }

  get hasBlockedUsers(): UserBlockItem[] {
    return this.hasItems ? this.items.filter(item => item.mode === 'to') : [];
  }

  get isBlockedByUsers(): UserBlockItem[] {
    return this.hasItems ? this.items.filter(item => item.mode === 'from') : [];
  }

  get numMessages(): number {
    return this.messages.length;
  }

  get hasMessages(): boolean {
    return this.numMessages > 0;
  }


  buildInfo(other: UserBlockItem): string {
    const u = other.info;
    if (u instanceof UserSchema) {
      const dob = mediumDate(u.dob);
      return `nick name: ${u.nickName} (${u.gender}), email: ${u.identifier}, dob: ${dob}`
    } else {
      return '-';
    }
  }

  handleUnBlock(row: UserBlockItem) {
    if (row instanceof Object) {
    const matchName = (u: UserBlockItem) => notEmptyString(u.info.fullName) ? u.info.fullName : u.info.nickName;
    const uName = row.mode === 'to' ? this.current.fullName : matchName(row);
    const otherUName = row.mode === 'from' ? this.current.fullName : matchName(row);
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

  unBlock(row: UserBlockItem) {
    const { user, mode } = row;
    if (['to', 'from'].includes(mode )) {
      unBlockUserPair(this.refUserId, user, mode).then(result => {
        if (result) {
          const index = this.items.findIndex(item => item.user === user);
          if (index >= 0) {
            this.items.splice(index, 1);
          }
        }
      })
    }
  }

  editRelUser(uid: string) {
    const newPath = ['/users', 'edit', uid].join('/');
    const { query } = this.$route;
    this.$router.push({
      path: newPath,
      query 
    });
  }

  sync() {
    fetchUserBlocks(this.refUserId).then(data => {
      const { items, messages } = data;
      if (items instanceof Array) {
        this.items = items.filter(item => item instanceof Object).map(item => {
          const info = new UserSchema(item.info);
          return { ...item, info }
        });
      }
      if (messages instanceof Array) {
        this.messages = messages.filter(msg => msg instanceof Object);
      }
    });
  }


  @Watch('refUserId')
  changeRefUserId(newVal) {
    if (notEmptyString(newVal, 16)) {
      setTimeout(this.sync, 500);
    }
  }

}
</script>
