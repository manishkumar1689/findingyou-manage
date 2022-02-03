<template>
  <div class="main-view" :class="wrapperClasses">
    <div v-if="hasSubDir" class="folder-up action-button right">
      <b-icon icon="arrow-up-bold-box" @click.native="upLevel" size="is-large" type="is-info" />
    </div>
    <b-table
      v-if="hasFiles"
      :data="files"
      :row-class="(row, index) => assignRowClasses(index)"
      :sticky-header="true"
    >
      <template slot-scope="props">
        <b-table-column
          class="name"
          :class="props.row.fileName"
          field="fileName"
          label="File name"
          >{{ props.row.file }}</b-table-column
        >
        <b-table-column class="size" field="size" label="Size">{{
          props.row.size | fileSize
        }}</b-table-column>
        <b-table-column class="modified" field="modified" label="Last edited">{{
          props.row.modified | longDate
        }}</b-table-column>
        <b-table-column
          class="preview"
          field="copyLine"
          label="Preview / Files"
        >
          <template v-if="props.row.isDir">
            <ul class="files vertical">
              <li
                v-for="(file, fi) in props.row.children"
                :key="['file', file.fileName, fi].join('-')"
              >
                <span class="name">{{ file.fileName }}</span>
                <span class="size">{{ file.size | fileSize }}</span>
              </li>
            </ul>
          </template>
          <template v-else>
            <b-tooltip :label="props.row.copyLine" :multilined="true">
              {{ props.row.info }}
            </b-tooltip>
          </template>
        </b-table-column>
        <b-table-column
          class="year-range"
          :class="props.row.updateYear"
          field="yearRange"
          label="years"
          >{{ props.row.yearRange.join(" to ") }}</b-table-column
        >
        <b-table-column
          class="year"
          :class="props.row.updateYear"
          field="updateYear"
          label="updated"
          >
          {{ props.row.updateYear }}
        </b-table-column>
        <b-table-column
          class="edit"
          field="update"
          label="Remove"
          >
            <b-icon v-if="props.row.mayDelete && !props.row.isDir" icon="trash-can-outline" type="is-danger" @click.native="handleRemove(props.row)" />
            
        </b-table-column>
        <b-table-column
          class="edit"
          field="update"
          label="Replace"
          >
            <b-icon v-if="props.row.isDir" icon="folder"  @click.native="intoFolder(props.row)" type="is-info" />
            <b-icon v-if="!props.row.isBackup && !props.row.isDir" icon="square-edit-outline"  @click.native="handleSelected(props.row)" />
        </b-table-column>
      </template>
    </b-table>
    <div class="add-new action-button fixed">
      <b-icon size="is-large" type="is-success" icon="plus-circle" @click.native="showNewUpload" />
    </div>
    <div class="editing-overlay upload-overlay" v-if="hasSelectedFile">
      <div class="inner-panel">
        <b-icon class="close" icon="close" @click.native="close" />
      <DataFileUpload :fileRef="selectedFile" :files="files" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { State, Action, Getter } from "vuex-class";
import { deleteSwissEpheFile, fetchSwissephFileList } from "../api/methods";
import { smartCastFloat, camelToTitle } from "../api/converters";
import { isNumeric, notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import { FileInfo } from "../api/models/FileInfo";
import { UserState } from "../store/types";
import DataFileUpload from "./DataFileUpload.vue";
import { bus } from "@/main";

@Component({
  filters: FilterSet,
  components: {
    DataFileUpload
  }
})
export default class FileListView extends Vue {
  @State("user") user: UserState;
  private result: any = null;

  private subDir = '';

  private selectedFile: FileInfo = null;

  created() {
    this.matchRoute()
    setTimeout(this.loadData, 250);
    bus.$on("escape", this.close)
    bus.$on("toast", ({message, duration}) => {
      this.toast(message, duration);
    });
    
    bus.$on("uploaded", valid => {
      this.close();
      if (valid) {
        this.loadData();
      }
    })
  }

  matchRoute() {
    const {path} = this.$route;
    const parts = path.substring(1).split("/");
    if (parts.length > 2) {
      this.subDir = parts[2];
    }
  }

  async loadData() {
    const data = await fetchSwissephFileList(this.subDir).then((result) => {
      this.result = result;
    });
  }

  loadDataAndPath() {
    this.loadData();
    const { path } = this.$route;
    const parts = ["tech","files"];
    if (this.hasSubDir) {
      parts.push(this.subDir);
    }
    const targetPath = "/" + parts.join("/");
    if (path !== targetPath) {
      this.$router.push(targetPath);
    }
  }

  get hasFiles(): boolean {
    return this.files.length > 0;
  }

  get files(): Array<FileInfo> {
    let items: Array<FileInfo> = [];
    if (this.result instanceof Object) {
      const { files } = this.result;
      if (files instanceof Array) {
        items = files.map((file) => new FileInfo(file));
      }
    }
    return items;
  }

  get hasSelectedFile() {
    return this.selectedFile instanceof FileInfo && (notEmptyString(this.selectedFile.file, 5) || this.selectedFile.file === "__new");
  }

  get hasSubDir() {
    return notEmptyString(this.subDir, 2);
  }

  handleSelected(row = null) {
    if (row instanceof FileInfo) {
      this.selectedFile = row;
    }
  }

  showNewUpload() {
    const file = new FileInfo({file: "__new"});
    this.handleSelected(file);
  }

  handleRemove(row = null) {
    if (row instanceof FileInfo) {
      const typeName = row.isBackup? 'backup' : 'data';
      this.$buefy.dialog.confirm({
        message: `Are you sure you wish to delete this ${typeName} file "${row.file}"`,
        cancelText: "Keep",
        confirmText: "Delete",
        type: "is-danger",
        onConfirm: () => this.remove(row),
      });
    } 
  }

  intoFolder(row: FileInfo) {
    if (row.isDir) {
      this.subDir = row.file;
      this.loadDataAndPath();
    }
  }

  upLevel() {
    this.subDir = '';
    this.loadDataAndPath();
  }

  toast(message: string, duration = 3000) {
    this.$buefy.toast.open({
      duration,
      message,
      position: "is-bottom",
      type: "is-success"
    });
  }

  remove(row: FileInfo) {
    deleteSwissEpheFile(this.user._id, row.file, this.subDir).then(result => {
      if (result.deleted) {
        this.loadData();
        const message = `${row.file} deleted`;
        this.toast(message);
      }
    });
  }

  close() {
    this.selectedFile = null;
  }

  

  get wrapperClasses() {
    return [this.hasSelectedFile? 'show-editing-overlay' : 'hide-editing-overlay'];
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["file", index].join("-")];
  }
}
</script>
