<template>
  <form class="edit-form misc-setting-form">
    <div class="close" @click="close">
      <b-icon icon="close" size="is-large" />
    </div>
    <b-field label="Key">
      <b-input
        v-if="isNew"
        name="settingKey"
        pattern="[a-z0-9_]+"
        v-model="newKey"
        placeholder="Machine name, e.g. varga__d60"
        :maxlength="128"
        :native-size="64"
        class="key-name"
        type="text"
        title="Please enter only lower case letters, numerals and underscores"
      />
      <h4 v-if="!isNew" class="key-name">{{ settingKey }}</h4>
      <b-switch size="is-small" v-model="treeMode">Tree mode</b-switch>
    </b-field>
    <v-jsoneditor
      v-if="showEditor"
      v-model="value"
      :options="options"
      :plus="false"
      height="calc(92vh - 12em)"
      @error="onError"
    />
    <b-field label="Notes" class="actions bottom">
      <b-input
        type="textarea"
        rows="3"
        v-model="notes"
        placeholder="Add notes here"
      />
      <b-button @click="save" type="is-primary">Save</b-button>
    </b-field>
  </form>
</template>
<script lang="ts">
import { State } from "vuex-class";
import { fetchSetting, saveSetting } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { notEmptyString } from "../../api/validators";
import { bus } from "../../main";
import VJsoneditor from "v-jsoneditor";
import { UserState } from "../../store/types";

@Component({
  components: {
    VJsoneditor,
  },
  filters: {},
})
export default class MiscSettings extends Vue {
  @Prop({ default: "" }) readonly settingKey: string;
  @State("user") user: UserState;

  private value: any = null;

  private newKey = "";

  private notes = "";

  private errorMsg = "";

  private treeMode = false;

  private switching = false;

  get hasValue() {
    return this.value instanceof Object || this.value instanceof Array;
  }

  get isNew() {
    return this.settingKey === "__new";
  }

  get options() {
    return {
      mode: this.treeMode ? "tree" : "text",
      search: true,
    };
  }

  get showEditor() {
    return (this.hasValue || this.isNew) && !this.switching;
  }

  created() {
    this.sync();
  }

  sync() {
    this.errorMsg = "";
    if (!this.isNew) {
      fetchSetting(this.settingKey).then((data) => {
        if (data.value) {
          if (data.value instanceof Object || data.value instanceof Array) {
            this.value = data.value;
            if (data.notes) {
              this.notes = data.notes;
            }
          }
        }
      });
    } else {
      this.value = {};
    }
  }

  onError(e) {
    this.errorMsg = "Bad format";
  }

  save() {
    if (this.value instanceof Object || this.value instanceof Array) {
      const valueObj = JSON.parse(JSON.stringify(this.value));
      const refKey = this.isNew ? this.newKey : this.settingKey;
      if (notEmptyString(refKey, 5)) {
        saveSetting(refKey, this.user._id, valueObj, this.notes, "custom").then(
          (result) => {
            if (result instanceof Object) {
              const { message, setting } = result;
              if (setting) {
                this.$buefy.toast.open({
                  duration: 3000,
                  message: `${message} : ${setting.key}`,
                  position: "is-bottom",
                  type: "is-success",
                });
                setTimeout(() => {
                  this.close();
                }, 500);
                bus.$emit("updateSetting", setting);
              }
            }
          }
        );
      }
    }
  }

  close() {
    const { customKey } = this.$parent.$data;
    if (customKey) {
      this.$set(this.$parent, "customKey", "");
    }
  }

  @Watch("treeMode")
  changeTreeMode() {
    this.switching = true;
    setTimeout(() => {
      this.switching = false;
    }, 500);
  }

  @Watch("settingKey")
  changeSettingKey(newVal) {
    this.sync();
  }
}
</script>
