<template>
  <form class="edit-form lookup-form">
    <b-table
      :data="editedSet.items"
      :draggable="true"
      @dragstart="dragstart"
      @drop="drop"
      @dragover="dragover"
      @dragleave="dragleave"
      class="draggable-rows"
    >
      <template slot-scope="props">
        <b-table-column class="drag-handle weight" field="weight" label="#">
          <b-icon icon="drag-variant" />
        </b-table-column>
        <b-table-column class="key" field="key" label="Key">
          <b-input
            maxlength="256"
            size="48"
            type="text"
            class="text"
            v-model="props.row.key"
            :has-counter="false"
          />
        </b-table-column>
        <b-table-column class="value" field="value" label="Value">
          <b-input
            type="number"
            size="8"
            :min="0"
            :max="10000"
            class="number"
            :disabled="props.row.enabled"
            v-model="props.row.value"
            :has-counter="false"
          />
        </b-table-column>
        <b-table-column class="name" field="name" label="Name">
          <b-input
            maxlength="256"
            size="48"
            type="name"
            class="text"
            v-model="props.row.name"
            :has-counter="false"
          />
        </b-table-column>
        <b-table-column class="enabled" field="enabled" label="Enabled">
          <b-checkbox v-model="props.row.enabled" />
        </b-table-column>
      </template>
    </b-table>
    <b-button type="is-success" @click="submit" icon-left="content-save-outline"
      >Save</b-button
    >
  </form>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { saveLexeme, fetchSetting, saveSetting } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { LookupSet, LookupItem } from "../../api/models/LookupSet";
import { LexemeSchema } from "../../api/schemas";
import { notEmptyString } from "../../api/validators";
import { bus } from "../../main";
import { toCharCode } from "../../api/converters";
import { UserState } from "../../store/types";

@Component({
  components: {},
  filters: {},
})
export default class LookupSetForm extends Vue {
  @Prop({ default: "" }) readonly settingKey: string;
  @State("user") user: UserState;
  private editedSet = new LookupSet();
  private draggingIndex = -1;
  private draggingRow: any = null;
  private hasNumValues = false;

  created() {
    this.sync();
  }

  sync() {
    const dataKey = this.settingKey.replace(/-/g, "_");
    fetchSetting(dataKey).then((data) => {
      if (data instanceof Object) {
        if (data.value instanceof Array) {
          this.loadSetting(data.value, dataKey);
          this.hasNumValues = data.value
            .filter((item) => item instanceof Object)
            .some((item) => {
              const { value } = item;
              return value > 1;
            });
        }
      }
    });
  }

  loadSetting(items: Array<any> = [], key: string) {
    this.editedSet = new LookupSet(
      items.map((item, ii) => {
        item.weight = ii;
        return item;
      }),
      key
    );
  }

  submit() {
    const dataKey = this.settingKey.replace(/-/g, "_");
    const saveItems = this.editedSet.items.map((item) => {
      const { key, name, enabled, value } = item;
      return this.hasNumValues
        ? { key, name, enabled, value }
        : { key, name, enabled };
    });
    saveSetting(dataKey, this.user._id, saveItems).then((data) => {
      switch (dataKey) {
        case "rodden_scale_values":
          this.$ls.set("rodden-values", saveItems);
          break;
      }
      const { message } = data;
      if (notEmptyString(message)) {
        bus.$emit("toast", { message });
      }
    });
  }

  dragstart(payload) {
    this.draggingRow = payload.row;
    this.draggingIndex = payload.index;
    payload.event.dataTransfer.effectAllowed = "copy";
  }
  dragover(payload) {
    payload.event.dataTransfer.dropEffect = "copy";
    payload.event.target.closest("tr").classList.add("is-selected");
    payload.event.preventDefault();
  }
  dragleave(payload) {
    payload.event.target.closest("tr").classList.remove("is-selected");
    payload.event.preventDefault();
  }
  drop(payload) {
    payload.event.target.closest("tr").classList.remove("is-selected");

    const droppedOnRowIndex = payload.index;
    this.editedSet.items[this.draggingIndex].weight =
      this.draggingIndex < droppedOnRowIndex
        ? droppedOnRowIndex + 0.5
        : droppedOnRowIndex - 0.5;

    this.editedSet.items
      .sort((a, b) => a.weight - b.weight)
      .map((tr, index) => {
        tr.weight = index;
        return tr;
      });
  }

  get items() {
    return this.editedSet.items;
  }
}
</script>
