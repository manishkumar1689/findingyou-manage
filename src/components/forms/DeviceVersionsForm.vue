<template>
  <form class="edit-form device-option-list">
    <div v-if="hasDevices">
      <fieldset class="row horizontal device" v-for="(device, di) in items" :key="['device', di].join('-')">
        <legend>{{device.name}}</legend>
        <b-field label="version #" class="row">
          <b-input pattern="[0-9]*[0-9.]*[0-9]+" v-model="device.version" :has-counter="false" size="10" />
        </b-field>
        <b-field class="row switch">
          <b-switch v-model="device.forceUpdate">Force update</b-switch>
        </b-field>
        <b-field label="Display admin" class="row">
          <b-input pattern=".*?\w+.*" v-model="device.name" :has-counter="false" size="32" />
        </b-field>
      </fieldset>
    </div>
    <fieldset class="row actions">
      <b-button type="is-success" @click="submit" size="is-medium" icon-left="content-save-outline">Save</b-button>
    </fieldset>
  </form>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { deviceVersions, saveDeviceVersions } from "../../api/methods";
import { Component, Vue } from "vue-property-decorator";
import { UserState } from "../../store/types";
import { defaultDeviceVersion, DeviceVersion } from "@/api/interfaces";
import { notEmptyString } from "@/api/validators";
import { bus } from "@/main";

@Component
export default class DeviceVersionsForm extends Vue {
  @State("user") user: UserState;
  items: Array<DeviceVersion> = [];

  created() {
    this.sync();
  }

  sync() {
    deviceVersions(this.user._id).then(result => {
      if (result instanceof Array) {
        this.items = result.filter(v => v instanceof Object && Object.keys(v).includes('version'));
      }
    })
  }

  get hasDevices() {
    return this.items.length > 0;
  }

  submit() {
    if (this.items.length > 1) {
      saveDeviceVersions(this.user._id, this.items).then(result => {
        if (result instanceof Object) {
          bus.$emit('toast', { message: 'Saved device update settings'})
        }
      })
    }
  }

}
</script>
<style lang="scss">

.device-option-list {
  fieldset {
    text-align: left;
    margin-bottom: 1em;
    legend {
      font-weight: bold;
      font-size:1.25em;
    }
    .field {
      margin: 0.5em 2em;
    }
  }
}

</style>