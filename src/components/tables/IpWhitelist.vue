<template>
  <div class="main-view" :class="wrapperClasses">
    <h1 class="main-title">Enable direct API access</h1>
    <form class="ip-list">
      <p>Add the current IP address you use for Internet Access to bypass dynamic security keys for direct API access. This should only be used for development and debugging.</p>
      <template v-if="hasIpAddresses">
        <div class="ip-addresses grid grid-4">
          <b-field v-for="(ip, ipi) in ipList" :key="['ip', ipi].join('-')" class="row horizontal">
            <b-input
              type="text"
              v-model="ipList[ipi]"
              :has-counter="false"
              size="16"
              pattern="[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?"
              :class="inputClass(ipi)"
            />
            <b-icon
              class="remove"
              icon="minus-circle"
              @click.native="removeIpAddress(ipi)"
              size="is-medium"
              type="is-danger"
            />
          </b-field>
        </div>
      </template>
      <div class="actions row horizontal">
        <b-icon
          class="add-new"
          icon="plus-circle"
          @click.native="addIpAddress"
          size="is-large"
          type="is-success"
        />
        <b-button @click="saveIpAddresses" icon-left="content-save">Save IP address overrides</b-button>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { UserState } from "../../store/types";
import { getIpWhitelist, saveIpWhitelist } from "../../api/methods";
import { bus } from "../../main";

interface Export {
  key: string;
  name: string;
  size: string;
  saved?: Date;
  fileSize?: number;
  exists?: boolean;
}

@Component({
  components: {
  },
  filters: {},
})
export default class IpWhitelist extends Vue {
  @State("user") user: UserState;

  ipList: string[] = [];

  created() {
    setTimeout(this.sync, 500);
  }

  get wrapperClasses() {
    return ["ip-whitelist"];
  }

  sync() {
    getIpWhitelist(this.user._id).then(items => {
      if (items instanceof Array) {
        this.ipList = items;
      }
    })
  }

  get hasIpAddresses() {
    return this.ipList.length > 0;
  }

  addIpAddress() {
    this.ipList.push('0.0.0.0');
  }

  inputClass(index = 0) {
    const addr = index >=0 && index < this.ipList.length? this.ipList[index] : '';
    return addr === '0.0.0.0'? 'new-address' : this.validIpAddress(addr)? 'valid' : 'invalid';
  }

  removeIpAddress(index = 0) {
    if (index >= 0 && index <= this.ipList.length) {
      this.ipList.splice(index, 1);
    }
  }

  validIpAddress(addr = '') {
    return /^\d+\.\d+\.\d+\.\d+$/.test(addr) && addr !== '0.0.0.0';
  }

  saveIpAddresses() {
    const ips = this.ipList.filter(this.validIpAddress);
    saveIpWhitelist(this.user._id, ips).then((ips: any) => {
      if (ips instanceof Array) {
        const message = "IP address overrides updated";
        const duration = 4000;
        const type = "success";
        this.ipList = ips;
        bus.$emit("toast", { message, duration, type });

      }
    })
  }
}
</script>
