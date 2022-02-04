<template>
  <form class="edit-form file-upload-form" enctype="multipart/form-data">
    <p v-if="hasCurrent" class="field row">
      <span class="text-label">{{currFileLabel}}</span>
      <span class="filename">{{currFileName}}</span>
      <strong class="size">{{currFileSize|fileSize}}</strong>
      <time class="modified">{{currModified}}</time>
      <span class="info">{{currInfo}}</span>
    </p>
    <b-field class="row">
      <b-upload name="file" v-model="file">
        <a class="button is-primary">
          <b-icon icon="upload"></b-icon>
          <span>Choose file</span>
        </a>
      </b-upload>
      <b-input name="new_name" v-model="newName" size="64" class="medium" />
      <b-button v-if="showSubmit" @click="handleUpload">{{submitLabel}}</b-button>
    </b-field>
    <p v-if="valid" class="field row">
      <span class="filename">{{uploadFileName}}</span>
      <strong class="size">{{size|fileSize}}</strong>
      <em class="mime">{{mimetype}}</em>
    </p>
  </form>
</template>
<script lang="ts">
import { FilterSet } from "@/api/composables/FilterSet";
import { longDate } from "@/api/converters";
import { uploadToSwissEph } from "@/api/methods";
import { FileInfo } from "@/api/models/FileInfo";
import { emptyString, notEmptyString } from "@/api/validators";
import { bus } from "@/main";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { State  } from "vuex-class";
import { UserState } from "../store/types";

@Component({
  filters: FilterSet
})
export default class DataFileUpload extends Vue {
  @Prop({ default: new FileInfo() }) fileRef: FileInfo;
  @Prop({ default: [] }) files: FileInfo[];
  @State("user") user: UserState;

  file = null;

  newName = '';

  uploadFileName = '';

  mimetype = '';

  valid = false;

  setNewName() {
    this.newName = this.currFileName;
  }

  get hasCurrent() {
    return this.currFileSize > 0;
  }

  get size() {
    return this.file instanceof Object? this.file.size : -1;
  }

  get showSubmit() {
    return this.file instanceof Object;
  }

  get hasFileName() {
    return this.fileRef instanceof FileInfo && notEmptyString(this.fileRef.file, 5) && this.fileRef.file !== "__new";
  }

  get currFileName() {
    return this.refFileObj instanceof FileInfo? notEmptyString(this.refFileObj.file, 5)? this.refFileObj.file : "" : "";
  }
  get currFileSize() {
    return this.refFileObj instanceof FileInfo? this.refFileObj.size : 0;
  }

  get currFileLabel() {
    return this.otherFileSameName? "Existing file" : "Current file";
  }


  get currInfo() {
    return this.refFileObj instanceof FileInfo? this.refFileObj.info : "";
  }

  get refFileObj() {
    return this.otherFileSameName? this.otherFile : this.fileRef;
  }

  get otherFileSameName() {
    return !this.sameFile && notEmptyString(this.uploadFileName, 5) && this.files.some(fr => fr.file.toLowerCase() === this.uploadFileName.trim().toLowerCase());
  }

  get otherFile() {
    return this.files.find(fr => fr.file.toLowerCase() === this.uploadFileName.trim().toLowerCase());
  }

  get submitLabel() {
    const uploadAction = this.sameFile || this.otherFileSameName? 'Upload and replace' : 'Upload a new file';
    return this.valid? `${uploadAction}` : 'Test file';
  }

  get sameFile() {
    return this.fileRef.file.toLowerCase() === this.uploadFileName.trim().toLowerCase();
  }

  get currModified() {
    return this.refFileObj instanceof FileInfo? longDate(this.refFileObj.modified) : "";
  }

  handleUpload() {
    if (this.valid) {
      const mode = this.sameFile || this.otherFileSameName? 'replace' : 'add';
      uploadToSwissEph(this.file, this.user._id, this.newName, '', mode).then(result => {
        if (result instanceof Object) {
          const {message, valid } = result;
          bus.$emit("toast", { message});
          bus.$emit("uploaded", valid);
        }
      });
    } else {
      const { type, size, name } = this.file;
      this.uploadFileName = '';
      this.valid = false;
      if (size > 128) {
        this.mimetype = emptyString(type) ? 'application/octet-stream' : type;
        switch (this.mimetype) {
          case 'application/octet-stream':
          case 'text/plain':
          case 'text/csv':
              this.uploadFileName = name;
              break;
        }
        this.valid = notEmptyString(this.uploadFileName, 5);
        if (this.valid) {
          if (name !== this.fileRef.file) {
            this.newName = name;
          }
        }
      }
    }
  }

  @Watch('file')
  changeFile() {
    this.handleUpload();
  }

  @Watch('fileRef')
  changeFileRef() {
    this.setNewName();
  }
}
</script>
