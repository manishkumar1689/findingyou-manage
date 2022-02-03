<template>
  <div class="main-view" :class="wrapperClasses">
    <b-table :data="items" :row-class="(row, index) => assignRowClasses(index)">
      <template slot-scope="props">
        <b-table-column
          class="key"
          :class="props.row.key"
          field="key"
          label="Collection Name"
          >{{ props.row.name }}</b-table-column
        >
        <b-table-column
          class="size"
          field="size"
          label="Size"
          >{{ sizeLabel(props.row)}}</b-table-column
        >
        <b-table-column
          class="updated"
          field="updated"
          label="Updated"
          >{{ updatedLabel(props.row) }}</b-table-column
        >
        <b-table-column class="edit" field="id">
            <b-icon icon="cloud-download-outline" size="is-medium" @click.native="downloadLink(props.row)" />
          
          <b-tooltip class="edit"  label="Click to update">
            <b-icon icon="autorenew" size="is-medium" @click.native="generate(props.row)" />
          </b-tooltip>
        </b-table-column>
      </template>
    </b-table>
    <form class="ip-list">
      <h3>Enable direct API access</h3>
      <template v-if="hasIpAddresses">
        <b-field v-for="(ip, ipi) in ipList" :key="['ip', ipi].join('-')" class="row horizontal">
          <b-input type="text" v-model="ipList[ipi]" :has-counter="false" size="16" pattern="[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?" />
          <b-icon class="remove" icon="minus-circle" @click.native="removeIpAddress(ipi)" size="is-medium" type="is-danger" />
        </b-field>
      </template>
      <div class="actions row horizontal">
        <b-icon class="add-new" icon="plus-circle" @click.native="addIpAddress" size="is-large" type="is-success" />
        <b-button @click="saveIpAddresses" icon-left="content-save">Save IP address overrides</b-button>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { UserState } from "../../store/types";
import { listFiles, generateExport, downloadResource, getIpWhitelist, saveIpWhitelist } from "../../api/methods";
import { FilterSet } from "../../api/composables/FilterSet";
import { fileSize, longDate } from "@/api/converters";
import { notEmptyString } from "@/api/validators";
import { bus } from "@/main";

interface Export {
  key: string;
  name: string;
  size: string;
  saved?: Date;
  fileSize?: number;
  exists?: boolean;
}

@Component({
  filters: FilterSet,
})
export default class ExportList extends Vue {
  @State("user") user: UserState;

  private items: Array<Export> = [
    {
      key: "charts",
      name: "Chart Data",
      size: "xlarge",
    },
    {
      key: "pairedcharts",
      name: "Paired Charts",
      size: "xlarge",
    },
    {
      key: "lexemes",
      name: "Dictionary terms (lexemes)",
      size: "medium",
    },

    {
      key: "snippets",
      name: "Snippets",
      size: "medium",
    },
    {
      key: "settings",
      name: "Settings",
      size: "medium",
    },
    { key: "users", name: "Users", size: "xlarge", saved: null, exists: false },
    /* {
      key: "bodyspeeds",
      name: "Planet Transitions",
      size: "xlarge",
    }, */
  ];

  private files = [];

  private customKey = "";

  private matched = 0;

  private ipList: string[] = [];

  created() {
    this.processItems();
    setTimeout(this.sync, 500);
  }

  get wrapperClasses() {
    return ["export-listing"];
  }

  processItems() {
    this.items = this.items.map((item) => {
      const keys = Object.keys(item);
      if (!keys.includes("saved")) {
        item.saved = null;
      }
      if (!keys.includes("exists")) {
        item.exists = false;
      }
      if (!keys.includes("fileSize")) {
        item.fileSize = 0;
      }
      return item;
    });
  }

  sync() {
    const { _id } = this.user;
    listFiles("backups", _id).then((data) => {
      this.matched = 0;
      if (data.valid && data.files.length > 0) {
        data.files.forEach((file) => {
          const itemIndex = this.items.findIndex(
            (item) => [item.key, "json"].join(".") === file.name
          );
          if (itemIndex >= 0) {
            this.items[itemIndex].saved = new Date(file.mtime);
            this.items[itemIndex].exists = true;
            this.items[itemIndex].fileSize = file.size;
            this.matched++;
          }
        });
      }
    });
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

  removeIpAddress(index = 0) {
    if (index >= 0 && index <= this.ipList.length) {
      this.ipList.splice(index, 1);
    }
  }

  saveIpAddresses() {
    const ipRgx = /^\d+\.\d+\.\d+\.\d+$/;
    const ips = this.ipList.filter(ip => ipRgx.test(ip) && ip !== '0.0.0.0');
    saveIpWhitelist(this.user._id, ips).then((ips: any) => {
      if (ips instanceof Array) {
        const message = "IP address overrides updated";
        const duration = 4000;
        const type = "success";
        this.ipList = ips;
        bus.$emit("toast", {message, duration, type });
        
      }
    })
  }

  generate(item: Export) {
    generateExport(this.user._id, item.key).then((data) => {
      if (data.valid) {
        setTimeout(this.sync, 1000);
      }
    });
  }

  downloadLink(item: Export) {
    const fn = [item.key, "json"].join(".");
    downloadResource(this.user._id, fn, "backups").then(response => {
      const {data} = response;
      const content = data instanceof Object ? JSON.stringify(data) : data;
      const downloadUrl = window.URL.createObjectURL(new Blob([content]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fn); //any other extension
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    })
  }

  fileLabel(item: Export) {
    const parts = [];
    const updated = this.updatedLabel(item);
    if (notEmptyString(updated)) {
      parts.push(`Saved ${this.updatedLabel(item)}`);
    }
    const size = this.sizeLabel(item);
    if (notEmptyString(size)) {
      parts.push(`size: ${this.sizeLabel(item)}`);
    }
    return parts.join(", ");
  }

  updatedLabel(item: Export) {
    return (item.saved instanceof Date)? longDate(item.saved) : '';
  }

  sizeLabel(item: Export) {
    return item.fileSize > 0? fileSize(item.fileSize) : '';
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["custom-setting", index].join("-")];
  }
}
</script>
