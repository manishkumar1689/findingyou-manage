<template>
  <form class="edit-form snippet-form">
    <div class="close" @click="close">
      <b-icon icon="close" size="is-large" />
    </div>
    <b-field label="category" class="horizontal row">
      <b-select v-if="categoryOptions.length > 0" v-model="category">
        <option
          v-for="opt in allCategoryOptions"
          :value="opt.key"
          :key="opt.key"
          >{{ opt.label }}</option
        >
      </b-select>
    </b-field>
    <b-field v-if="showNewCategory" label="New category" class="horizontal row">
      <b-input
        type="category"
        maxlength="32"
        size="8"
        v-model="newCategory"
        :has-counter="false"
      />
    </b-field>
    <b-field label="Key" class="horizontal row">
      <b-input
        type="text"
        maxlength="64"
        v-model="subkey"
        :has-counter="false"
        pattern="[a-z0-9_]+"
      />
    </b-field>
    <b-field label="Notes" class="horizontal row">
      <b-input
        maxlength="256"
        cols="64"
        rows="2"
        class="notes"
        type="textarea"
        v-model="notes"
        :has-counter="false"
      />
    </b-field>
    <b-field class="actions">
      <b-switch v-model="published">Published</b-switch>
      <b-button @click.prevent="assignStatusAll" :title="approvedStatusHint">{{approvedStatusLabel}}</b-button>
      <b-button type="is-success" @click="submit" icon-left="content-save-outline" class="save"
      >Save</b-button>
      <b-tooltip :label="autoTranslateInfo" :multilined="true">
        <b-checkbox type="is-info" v-model="autoTranslate" class="auto-translate last">Auto-translate</b-checkbox>
       </b-tooltip>
    </b-field>
    <b-field class="vertical" label="Versions">
      <b-table
        :data="values"
        :draggable="true"
        @dragstart="dragstart"
        @drop="drop"
        @dragover="dragover"
        @dragleave="dragleave"
        class="draggable-rows"
        :row-class="(row, ri) => rowClassNames(row, ri)"
      >
        <template slot-scope="props">
          <b-table-column
            class="lang with-locale drag-handle"
            field="lang"
            label="Lang"
          >
            <b-icon icon="drag-variant" />
            <b-select v-model="props.row.langCode">
              <option
                v-for="opt in langOptions"
                :value="opt.key"
                :key="['translation', props.index, opt.key].join('-')"
                >{{ opt.name }}</option
              >
            </b-select>
            <b-input
              size="2"
              maxlength="2"
              pattern="[A-Z][A-Z]"
              type="text"
              class="code"
              title="Locale code, e.g. US, MX, IN, BR etc."
              v-model="props.row.locale"
              :has-counter="false"
            />
          </b-table-column>
          <b-table-column class="text" field="text" label="Text">
            <b-input
              rows="3"
              cols="64"
              type="textarea"
              class="text"
              v-model="props.row.text"
              :has-counter="false"
            />
          </b-table-column>
          <b-table-column
            class="column-cell narrow"
            field="approved"
            label="Status"
          >
            <b-checkbox v-model="props.row.approved">Approved</b-checkbox>
            <b-checkbox v-model="props.row.active">Active</b-checkbox>
          </b-table-column>
          <b-table-column class="edit" field="edit" label="#">
            <template v-if="mayRemoveTranslation(props.row, props.index)">
              <b-button
                icon-right="minus"
                size="is-small"
                type="is-danger"
                @click="removeTranslation(props.index)"
                title="Remove translation"
              ></b-button>
            </template>
            <template v-if="isLastTranslationIndex(props.index)">
              <b-button
                icon-right="plus"
                size="is-small"
                type="is-success"
                @click="addTranslation"
                title="Add new version"
              ></b-button>
            </template>
          </b-table-column>
        </template>
      </b-table>
    </b-field>
    <ol v-if="hasErrors" class="errors">
      <li v-for="(error, ei) in errors" :key="['error', ei].join('-')">
        {{ error }}
      </li>
    </ol>
    <b-button type="is-success" @click="submit" icon-left="content-save-outline"
      >Save</b-button>
  </form>
</template>

<script lang="ts">
//import { Action } from "vuex-class";
import { saveSnippet, fetchLanguages } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { KeyLabel, Version, Snippet, LanguageItem } from "../../api/interfaces";
import { SnippetSchema } from "../../api/schemas";
import { notEmptyString  } from "../../api/validators";
import langOptions from "../../api/mappings/lang-options";
import { bus } from "../../main";
import { cleanString } from "../../api/converters";

const emptyVersion: Version = {
  lang: "en",
  langCode: "en",
  text: "",
  active: false,
  approved: false,
  modifiedAt: new Date(),
  createdAt: new Date(),
};

@Component({
  components: {},
  filters: {},
})
export default class SnippetForm extends Vue {
  @Prop({ default: () => new SnippetSchema() }) readonly snippet: SnippetSchema;
  @Prop({ default: () => [] }) readonly categoryOptions: Array<KeyLabel>;
  @Prop({ default: "-" }) readonly listCategory: string;

  private category = "-";
  private newCategory = "";
  private subkey = "";
  private notes = "";
  private published = false;
  private format = "text";
  private values: Array<Version> = [emptyVersion];
  private isNew = false;
  private extraVersions = 1;
  private errors: Array<string> = [];
  private draggingIndex = -1;
  private draggingRow: any = null;
  private langOpts: Array<LanguageItem> = [];
  private autoTranslate = true;
  private saving = false;
  private overrideMode = 0;

  created() {
    this.sync();
  }

  sync() {
    const { key } = this.snippet;
    this.overrideMode = 0;
    this.extraVersions = 1;
    if (notEmptyString(key, 3)) {
      this.isNew = key === "_new";
      const hasValidKey =
        this.snippet.key.length > 5 && this.snippet.key.indexOf("__") > 1;
      if (hasValidKey || this.isNew) {
        const [category, subkey] = this.snippet.key.split("__");
        if (notEmptyString(subkey) || this.isNew) {
          this.subkey = this.isNew ? "" : subkey;
          this.category = this.isNew ? this.listCategory : category;
          this.notes = this.snippet.notes;
          this.published = this.snippet.published;
          const langCode = this.snippet.values.length > 0 ? "" : "en";
          const newVersion = {...emptyVersion, langCode};
          this.values = [...this.snippet.values, newVersion].map(
            (tr, weight) => {
              const show = this.langOptions
                .map((lo) => lo.key)
                .includes(tr.langCode);
              return { ...tr, weight, show };
            }
          );
        }
      }
    }
    this.loadLangOpts();
  }

  loadLangOpts() {
    const langs = this.$ls.get("languages");
    const mapLangOpts = (opt) => {
      const name = opt.name
        .split(",")
        .shift()
        .trim();
      return { ...opt, name };
    };
    if (langs instanceof Array && langs.length > 0) {
      this.langOpts = langs.map(mapLangOpts);
    } else {
      fetchLanguages("app").then((data) => {
        this.langOpts = data.languages.map(mapLangOpts);
      });
    }
  }

  addTranslation() {
    this.extraVersions++;
  }

  mayRemoveTranslation(row: Version, index: number) {
    const lastIndex = this.values.length - 1;
    return index > 0 && (index < lastIndex || row.text.trim().length < 0);
  }

  removeTranslation(index: number) {
    if (index > 0 && index < this.values.length) {
      this.values.splice(index, 1);
      if (this.extraVersions > 1) {
        this.extraVersions--;
      }
    }
  }

  get enabledKeys() {
    return this.langOptions.map((lg) => lg.key);
  }

  isLastTranslationIndex(index: number) {
    let lastIndex = 0;
    for (let i = this.values.length - 1; i >= 0; i--) {
      if (this.enabledKeys.includes(this.values[i].langCode)) {
        lastIndex = i;
        break;
      }
    }

    return lastIndex === index;
  }

  rowClassNames(row, index = 0) {
    const cls = [];
    if (!row.show && index > 0) {
      cls.push('hide')
    }
    return [];
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
    this.values[this.draggingIndex].weight =
      this.draggingIndex < droppedOnRowIndex
        ? droppedOnRowIndex + 0.5
        : droppedOnRowIndex - 0.5;

    this.values
      .sort((a, b) => a.weight - b.weight)
      .map((tr, index) => {
        tr.weight = index;
        return tr;
      });
  }

  get langOptions() {
    const storedEnabledLangs = this.$ls.get("enabled_langs");
    const enabledLangs =
      storedEnabledLangs instanceof Array ? storedEnabledLangs : [];
    const showAll = enabledLangs.length < 1;
    const langs =
      this.langOpts.length > 0
        ? this.langOpts.filter((lg) => showAll || enabledLangs.includes(lg.key))
        : langOptions;
    return [{ key: "-", label: "---" }, ...langs];
  }

  get allCategoryOptions(): Array<KeyLabel> {
    return [...this.categoryOptions, { key: "_new", label: "New category" }];
  }

  get showNewCategory(): boolean {
    return this.category === "_new";
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  @Watch("snippet")
  changesnippet() {
    this.sync();
  }

  @Watch("extraVersions")
  changeExtraVersions(newVal) {
    const numCurrentversions = this.snippet.values.length;
    const numEditableversions = this.values.length;
    const newTrs = numEditableversions - numCurrentversions;
    const extra = newVal - newTrs;
    if (extra > 0) {
      for (let i = 0; i < extra; i++) {
        this.values.push({...emptyVersion, langCode: ""});
      }
    }
  }

  assignStatusAll() {
    const newVal = this.mayDisableAll ? false : true;
    this.values = this.values.map(v => {
      if (notEmptyString(v.text)) {
        v.active = newVal;
        v.approved = newVal;
      }
      return v;
    });
    if (newVal) {
      this.published = true;
    }
    this.save(false);
  }

  close() {
    bus.$emit('snippet-close', true);
  }

  submit() {
    this.save(true);
  }

  get autoTranslateInfo() {
    const translatedLangKeys = this.values.filter(v => notEmptyString(v.text,2)).map(v => v.lang);
    const langList = this.langOpts.filter(lo => translatedLangKeys.indexOf(lo.key) < 1 && lo.key.startsWith('en') === false).map(lo => lo.name).join(', ');
    return `Automatically translate into: ${langList}`;
  }

  get someActive() {
    return this.values.filter(v => notEmptyString(v.text,1) && notEmptyString(v.langCode,1)).some(v => v.active);
  }

  get mayDisableAll() {
    return this.someActive && !this.published;
  }

  get approvedStatusLabel() {
    return this.mayDisableAll? `Disable all versions` : `Approve and activate all versions`;
  }

  get approvedStatusHint() {
    return this.mayDisableAll? `Unapprove and disable all versions` : `Approve and activate all versions`;
  }

  allowKeyOverride(num = 1, close = false) {
    this.overrideMode = num;
    this.save(close);
  }

  save(close = false) {
    this.errors = [];
    let overrideKey = '';
    const validKey = (key: string): boolean =>
      /^[a-z0-9_]+$/.test(key) && !/__+/.test(key);
    const isNewCategory = this.category === "_new";
    if (this.values.some((vl) => notEmptyString(vl.text, 1)) === false) {
      this.errors.push("Please enter at least one version");
    }
    if (this.subkey.trim().length < 1 || !validKey(this.subkey)) {
      this.errors.push(
        "Please add a key value with only letters, numerals or single underscore"
      );
    }
    if (this.category.trim().length < 1) {
      this.errors.push("Please select a category");
    }
    if (isNewCategory) {
      if (this.newCategory.trim().length < 3 || !validKey(cleanString(this.newCategory,"_"))) {
        this.errors.push(
          "Please enter a category key with at least 3 characters and only letters, numerals or single underscores"
        );
      }
    } else if (notEmptyString(this.snippet.key, 5) && this.snippet.key !== [this.category, this.subkey].join('__')) {
      overrideKey = this.snippet.key;
      if (this.overrideMode < 1) {
        const message = `Do you wish to rename this snippet key from '${this.snippet.key}' to '${this.subkey}'. This may be used in the mobile app.`;
        this.errors.push(
          message
        );
        this.$buefy.dialog.confirm({
          message,
          cancelText: "Keep both",
          confirmText: "Rename",
          type: "is-danger",
          onConfirm: () => this.allowKeyOverride(1, close),
          onCancel: () => this.allowKeyOverride(2, close),
        });
      }
    }
    if (!this.hasErrors && !this.saving) {
      const catKey = !isNewCategory
        ? this.category.trim()
        : cleanString(this.newCategory, "_");
      if (notEmptyString(catKey, 2)) {
        this.saving = true;
        const key = [catKey, this.subkey].join("__");
        const versions = this.values
          .filter((tr) => notEmptyString(tr.text))
          .map((vl) => {
            const { langCode, locale, text, active, approved } = vl;
            const lang = notEmptyString(locale)
              ? [langCode, locale].join("-")
              : langCode;
            return { lang, text, active, approved };
          });
        const saveData: Snippet = {
          key,
          format: this.format,
          published: this.published,
          notes: this.notes.trim(),
          values: versions,
        };
        const langKeys = this.autoTranslate? this.langOpts.map(lo => lo.key) : [];
        const overrideKeyVal = this.overrideMode === 1? overrideKey : '';
        saveSnippet(saveData, langKeys, overrideKeyVal).then((data) => {
          if (data.valid) {
            data.close = close;
            if (this.overrideMode === 1) {
              bus.$emit('remove-snippet', overrideKey)
            }
            bus.$emit("snippet_update", data);
            setTimeout(() => {
              this.overrideMode = 0;
            }, 500);
            setTimeout(() => {
              this.saving = false;
            }, 1500);
          }
        });
        
      }
    }
  }

  @Watch('subkey')
  changeSubkey(newVal) {
    if (notEmptyString(newVal,1)) {
      this.subkey = cleanString(newVal, '_');
    }
  }
    @Watch('newCategory')
    changeNewCategory(newVal) {
    if (notEmptyString(newVal,2)) {
      this.newCategory = cleanString(newVal, '_');
    }
  }
}
</script>
