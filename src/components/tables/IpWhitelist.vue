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
      <div class="actions row horizontal actions-bottom">
        <b-icon
          class="add-new"
          icon="plus-circle"
          @click.native="addIpAddress"
          size="is-large"
          type="is-success"
        />
        <b-button @click="saveIpAddresses" icon-left="content-save"  type="is-success">Save IP address overrides</b-button>
        <b-button v-if="showAddIp" @click="addCurrent" icon-left="plus" type="is-info">
          <span class="text-label">Add current IP address</span>
          <em class="small">{{currIp}}</em>
        </b-button>
      </div>
      <p class="info-row" v-if="hasIp"><em>Your IP address</em><strong>{{currIp}}</strong></p>
      <p class="info-row" v-if="hasUserAgent"><em>User agent</em><strong>{{userAgent}}</strong></p>
    </form>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { UserState } from "../../store/types";
import { getIpWhitelist, saveIpWhitelist, fetchIp } from "../../api/methods";
import { bus } from "../../main";
import { notEmptyString } from "@/api/validators";

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

  currIp = "x.x.x.x";

  userAgent = "";

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
    });
    setTimeout(() => {
      fetchIp().then(data => {
        const {ip, userAgent, valid} = data;
        if (valid) {
            if (notEmptyString(ip)) {
            this.currIp = ip;
          }
          if (notEmptyString(userAgent)) {
            this.userAgent = userAgent;
          }
        }
      })
    }, 1500)
  }

  get hasIpAddresses() {
    return this.ipList.length > 0;
  }

  addIpAddress() {
    this.ipList.push('0.0.0.0');
  }

  inputClass(index = 0) {
    const addr = index >=0 && index < this.ipList.length? this.ipList[index] : '';
    const cls = addr === '0.0.0.0'? ['new-address'] : this.validIpAddress(addr)? ['valid'] : ['invalid'];
    if (addr === this.currIp) {
      cls.push('current');
    }
    return cls;
  }

  removeIpAddress(index = 0) {
    if (index >= 0 && index <= this.ipList.length) {
      this.ipList.splice(index, 1);
    }
  }

  validIpAddress(addr = '') {
    return /^\d+\.\d+\.\d+\.\d+$/.test(addr) && addr !== '0.0.0.0';
  }

  get hasUserAgent() {
    return notEmptyString(this.userAgent, 10);
  }

  get hasIp() {
    return notEmptyString(this.currIp, 6) && /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(this.currIp);
  }

  get showAddIp() {
    return this.hasIp && !this.currentIpInList;
  }

  get currentIpInList() {
    return this.ipList.includes(this.currIp);
  }

  addCurrent() {
    if (this.hasIp) {
      this.ipList.push(this.currIp);
      this.saveIpAddresses();
    }
  }

  saveIpAddresses() {
    const ips = this.ipList.filter(this.validIpAddress);
    saveIpWhitelist(this.user._id, ips).then((ips: any) => {
      if (ips instanceof Array) {
        this.ipList = ips;
        const message = "IP address overrides updated";
        const duration = 4000;
        this.$buefy.toast.open({
          duration,
          message,
          position: "is-bottom",
          type:  "is-success",
        });
      }
    })
  }
}
</script>
