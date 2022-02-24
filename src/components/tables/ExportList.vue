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
    <div class="actions other-actions">
      <router-link to="/ip-whitelist" :active="true">IP Whitelist</router-link>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { UserState } from "../../store/types";
import { listFiles, generateExport, downloadResource } from "../../api/methods";
import { FilterSet } from "../../api/composables/FilterSet";
import { fileSize, longDate } from "@/api/converters";
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
  filters: FilterSet,
})
export default class ExportList extends Vue {
  @State("user") user: UserState;

  items: Array<Export> = [
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

  
  files = [];

  customKey = "";

  matched = 0;

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
