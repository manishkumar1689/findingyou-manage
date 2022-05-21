<template>
  <form class="edit-form device-option-list">
    <div v-if="hasDevices">
      <fieldset class="row horizontal device" v-for="(device, di) in items" :key="['device', di].join('-')">
        <legend>{{renderName(device)}}</legend>
        
        <b-field label="version #" class="row">
          <b-input pattern="[0-9]*[0-9.]*[0-9]+" v-model="device.version" :has-counter="false" size="10" />
        </b-field>
        <b-field class="row switch">
          <b-switch v-model="device.forceUpdate">Force update</b-switch>
        </b-field>
        <b-field label="Admin name" class="row">
          <b-input pattern=".*?\w+.*" v-model="device.name" :has-counter="false" size="32" />
        </b-field>
        <b-field label="Key" class="row" v-if="editableKey(device)">
          <b-input pattern="[a-z0-9][a-z0-9]*[a-z0-9_]*[a-z0-9][a-z0-9]+" v-model="device.key" :has-counter="false" size="12" />
        </b-field>
        <b-icon icon="trash" v-if="editableKey(device)" @click.native="deleteItem(di)" />
      </fieldset>
    </div>
    <fieldset class="row actions">
      <b-button type="is-success" @click="submit" size="is-medium" icon-left="content-save-outline">Save</b-button>
      <b-button @click="addDeviceType" icon-left="plus" size="is-small" type="is-info">Add new device type</b-button>
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

  addDeviceType() {
    this.items.push({...defaultDeviceVersion});
  }

  editableKey(device: DeviceVersion) {
    return ['mobile__ios', 'mobile__android'].includes(device.key) === false;
  }

  renderName(device: DeviceVersion) {
    return notEmptyString(device.name)? device.name : notEmptyString(device.key, 3)? 'No name' : 'New device type';
  }

  deleteItem(index: number) {
    if (index > 1) {
      this.items.splice(index, 1);
    }
  }

  submit() {
    if (this.items.length > 1) {
      const filteredItems = this.items.filter(dv => notEmptyString(dv.key, 5));
      if (filteredItems.length >= 2) {
         saveDeviceVersions(this.user._id, filteredItems).then(result => {
          if (result instanceof Object) {
            bus.$emit('toast', { message: 'Saved device update settings'})
            this.items = filteredItems;
          }
        })
      }
    }
  }

}
</script>
<style lang="scss">
form.device-option-list {
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
  .actions {
    justify-content: flex-start;
    align-items: flex-start;
    min-height: 4em;
  }
}

</style>