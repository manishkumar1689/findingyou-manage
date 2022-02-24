<template>
  <div class="main-view" :class="wrapperClasses">
    <MiscSettings v-if="hasCustomKey" :settingKey="customKey" />
    <b-button
      v-if="!hasCustomKey"
      icon-left="shape-square-plus"
      type="is-info"
      class="float-right"
      @click="addNew"
      >New</b-button
    >
    <b-table
      v-if="showTable"
      :data="items"
      :row-class="(row, index) => assignRowClasses(index)"
    >
      <template slot-scope="props">
        <b-table-column
          class="key"
          :class="props.row.key"
          field="key"
          label="Setting Key"
          >{{ props.row.key }}</b-table-column
        >
        <b-table-column class="size" field="size" label="Notes">{{
          props.row.notes
        }}</b-table-column>
        <b-table-column class="modified" field="modified" label="Last edited">{{
          props.row.modifiedAt | longDate
        }}</b-table-column>
        <b-table-column class="edit" field="id">
          <span class="remove" @click="remove(props.row)"
            ><b-icon icon="trash-can-outline" size="is-small"
          /></span>
          <a class="download" :href="downloadLink(props.row)" download
            ><b-icon icon="cloud-download-outline" size="is-small"
          /></a>
          <span class="edit" @click="select(props.row)"
            ><b-icon icon="puzzle-edit-outline" size="is-medium"
          /></span>
        </b-table-column>
      </template>
    </b-table>
    <b-button
      v-if="!hasCustomKey"
      icon-left="shape-square-plus"
      type="is-info"
      class="float-right"
      @click="addNew"
      >New</b-button
    >
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { UserState } from "../../store/types";
import { listCustomSettings, deleteSetting } from "../../api/methods";
import { FilterSet } from "../../api/composables/FilterSet";
import MiscSettings from "../forms/MiscSettings.vue";
import { bus } from "../../main";
import { notEmptyString } from "../../api/validators";
import { api } from "../../.config";

interface CustomSetting {
  _id?: string;
  key: string;
  notes?: string;
  value?: any;
  type: string;
  weight?: number;
  createdAt: Date;
  modifiedAt: Date;
}

@Component({
  components: {
    MiscSettings,
  },
  filters: FilterSet,
})
export default class SettingsList extends Vue {
  @State("user") user: UserState;

  items: Array<CustomSetting> = [];

  customKey = "";

  created() {
    this.loadData();
    bus.$on("escape", () => {
      this.customKey = "";
    });
    bus.$on("updateSetting", (setting) => {
      const rs = this.items.find((s) => s.key === setting.key);
      if (rs) {
        rs.notes = setting.notes;
        rs.modifiedAt = setting.modifiedAt;
      } else {
        const {
          _id,
          key,
          type,
          notes,
          weight,
          createdAt,
          modifiedAt,
        } = setting;
        this.items.push({
          _id,
          key,
          type,
          notes,
          weight,
          createdAt,
          modifiedAt,
        });
      }
    });
  }

  get hasCustomKey() {
    return this.customKey.length > 3;
  }

  get showTable() {
    return this.hasItems && !this.hasCustomKey;
  }

  get isNew() {
    return this.customKey === "__new";
  }

  get wrapperClasses() {
    const cls = [];
    if (this.hasCustomKey) {
      cls.push("show-form");
    }
    return cls;
  }

  async loadData() {
    listCustomSettings().then((items) => {
      if (items instanceof Array) {
        this.items = items;
      }
    });
  }

  get hasItems(): boolean {
    return this.items.length > 0;
  }

  select(setting) {
    this.customKey = setting.key;
  }

  downloadLink(setting) {
    const { base } = api;
    return [base, "setting/json-file/", setting.key].join("");
  }

  addNew() {
    this.customKey = "__new";
  }

  remove(setting) {
    if (setting instanceof Object) {
      const { _id, key } = setting;
      if (notEmptyString(_id) && notEmptyString(key)) {
        this.handleDeletion(_id, key);
      }
    }
  }

  handleDeletion(settingId: string, key: string) {
    this.$buefy.dialog.confirm({
      title: "Delete setting",
      message: `Are you sure you want to delete <em>${key}</em>?`,
      confirmText: "Delete",
      type: "is-danger",
      hasIcon: true,
      onConfirm: () => {
        deleteSetting(settingId, this.user._id).then((data) => {
          if (data.valid) {
            this.items = this.items.filter((s) => s._id !== data.setting);
            const message = "Setting deleted!";
            bus.$emit("toast", { message, duration: 2000 });
          }
        });
      },
    });
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["custom-setting", index].join("-")];
  }
}
</script>
