<template>
  <div class="main-view" :class="wrapperClasses">

    <b-table
      class="listing-table message-table"
      v-if="hasMessages"
      :data="rows"
    >
      <template slot-scope="props">
        <b-table-column class="key" field="key" label="Key / edit">
          <b-tooltip @click.native="selectItem(props.row.key)" class="edit-trigger" title="Edit" :label="props.row.key"> {{
          props.row.subject
          }}</b-tooltip>
        </b-table-column>
        <b-table-column class="versions" field="values" label="Versions">
          <ul v-if="isNotUpdating(props.row.key)" class="versions text-preview vertical">
            <li
              v-for="(item, vi) in props.row.activeItems"
              :key="['version', props.row.key, vi].join('-')"
              class="row"
            >
              <div class="language circle">{{ item | langType }}</div>
              <div class="text small" v-html="formatBody(item.body)"></div>
            </li>
          </ul>
        </b-table-column>
        <b-table-column class="edit" field="delete" label="Edit">
            <b-icon @click.native="selectItem(props.row.key)" icon="square-edit-outline" class="edit" />
        </b-table-column>
      </template>
    </b-table>
    <MessageForm :messageSet="selectedMessage" />
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import {
  fetchMessages,
} from "../api/methods";
import { notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { Message, MessageSet } from "../api/schemas";
import MessageForm from "./forms/MessageForm.vue";
import { bus } from "../main";

@Component({
  components: {
    MessageForm
  },
  filters: {
    ...FilterSet,
    langType(ref: any) {
      let str = "";
      if (ref instanceof Object) {
        const { lang, type, alpha } = ref;
        str = [lang, type, alpha].filter((s) => notEmptyString(s, 1)).join(":");
      }
      return str;
    },
  },
})
export default class MessageList extends Vue {
  @State("user") user: UserState;
  rows: Array<MessageSet> = [];
  selectedMessage = new MessageSet();
  selectedIndex = -1;

  created() {
    this.loadData();
    bus.$on("escape", this.close);
    bus.$on('message-close', this.close);
    bus.$on('message-set-saved', data => {
      if (data instanceof Object) {
        const {items, key} = data;
        const rowIndex = this.rows.findIndex(row => row.key === key);
        if (items instanceof Array && rowIndex >= 0) {
          items.forEach(item => {
            const itemIndex = this.rows[rowIndex].items.findIndex(it => it.lang === item.lang);
            if (itemIndex >= 0) {
              this.rows[rowIndex].items[itemIndex] = new Message(item);
            } else {
              this.rows[rowIndex].items.push(new Message(item));
            }
          })
          this.toast("Message saved successfully", 3000);
        }
      }
    });
  }

  async loadData() {
    await fetchMessages().then((data) => {
      if (data.valid) {
        this.rows = data.rows.map(row => new MessageSet(row));
        setTimeout(this.updateByRoute, 500);
      }
    });
  }

  isNotUpdating(key = '') {
    return this.selectedMessage.key !== key;
  }

  hasMessage(): boolean {
    return this.rows.length > 0;
  }

  close() {
    this.selectItem("", true);
  }

  formatBody(body = "") {
    const rgx = /<\w+[^>]*?>\s*(<br[^>]*?>\s*)*\s*<\/\w+>/g;
    return body.replace(rgx, '');
  }

  get hasMessages() {
    return this.rows.length > 0;
  }

  toast(message = "", duration = 3000, typeKey = "success") {
    const type = ["is", typeKey].join("-");
    this.$buefy.toast.open({
        duration,
        message,
        position: "is-bottom",
        type,
      });
  }

  selectItem(key: string, updateRoute = true) {
    const index = this.rows.findIndex(r => r.key === key);
    const { path } = this.$route;
    let newPath = '/messages';
    if (index < 0) {
      this.selectedIndex = -1;
      this.selectedMessage = new MessageSet();
    } else {
      this.selectedIndex = index;
      this.selectedMessage = this.rows[index];
      
      newPath = '/messages/' + key;
    }
    if (updateRoute && path !== newPath) {
      this.$router.push(newPath);
    }
  }
  
  get hasSelected(): boolean {
    const { key } = this.selectedMessage;
    return key.length > 5 && this.selectedIndex >= 0;
  }

  get wrapperClasses(): Array<string> {
    const cls = [];
    if (this.hasSelected) {
      cls.push("show-form");
    }
    return cls;
  }

  updateByRoute() {
    const { path } = this.$route;
    const parts = path.substring(1).split('/');
    if (parts.length > 1) {
      const key = parts[1];
      if (notEmptyString(key, 3)) {
        this.selectItem(key, false);
      }
    }
  }
}
</script>