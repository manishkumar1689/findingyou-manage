<template>
  <form class="edit-form lexeme-form">
    <b-field label="category">
      <b-select v-if="categoryOptions.length > 0" v-model="category">
        <option v-for="opt in allCategoryOptions" :value="opt.key" :key="opt.key">{{ opt.label }}</option>
      </b-select>
    </b-field>
    <b-field v-if="showNewCategory" label="New category">
      <b-input type="category" maxlength="32" size="8" v-model="newCategory" :has-counter="false" />
    </b-field>
    <b-field label="Key">
      <b-input
        type="text"
        maxlength="64"
        v-model="subkey"
        :has-counter="false"
        pattern="[a-z0-9_]+"
      />
    </b-field>
    <b-field label="Term">
      <b-input
        maxlength="256"
        size="48"
        minlength="1"
        class="term"
        type="text"
        v-model="name"
        :has-counter="false"
      />
    </b-field>
    <b-field label="Original">
      <b-input
        maxlength="256"
        size="48"
        type="text"
        class="term"
        width="100%"
        v-model="original"
        :has-counter="false"
      />
    </b-field>
    <b-field label="Unicode">
      <b-input
        type="text"
        maxlength="2"
        size="2"
        class="unicode"
        v-model="unicode"
        :has-counter="false"
      />
      <span class="code">{{ charCode }}</span>
      <em>(if available)</em>
    </b-field>
    <b-field v-if="langOptions.length > 0" label="Source language">
      <b-select v-model="lang">
        <option v-for="opt in langOptions" :value="opt.key" :key="opt.key">
          {{
          opt.name
          }}
        </option>
      </b-select>
    </b-field>
    <b-field class="vertical" label="Translations">
      <b-table
        :data="translations"
        :draggable="true"
        @dragstart="dragstart"
        @drop="drop"
        @dragover="dragover"
        @dragleave="dragleave"
        class="draggable-rows"
      >
        <template slot-scope="props">
          <b-table-column class="lang drag-handle" field="lang" label="Lang">
            <b-icon icon="drag-variant" />
            <b-select v-model="props.row.lang">
              <option
                v-for="opt in langOptions"
                :value="opt.key"
                :key="['translation', props.index, opt.key].join('-')"
              >{{ opt.name }}</option>
            </b-select>
          </b-table-column>
          <b-table-column class="text" field="text" label="Text">
            <b-input
              maxlength="256"
              size="48"
              type="text"
              class="text"
              v-model="props.row.text"
              :has-counter="false"
            />
          </b-table-column>
          <b-table-column class="type" field="type" label="Type">
            <b-select v-model="props.row.type">
              <option
                v-for="opt in translationTypeOptions"
                :value="opt.key"
                :key="['translation', props.index, opt.key].join('-')"
              >{{ opt.label }}</option>
            </b-select>
          </b-table-column>
          <b-table-column class="alpha" field="alpha" label="Script">
            <b-select v-model="props.row.alpha">
              <option
                v-for="opt in alphaOptions"
                :value="opt.key"
                :key="['alpha', props.index, opt.key].join('-')"
              >{{ opt.label }}</option>
            </b-select>
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
                title="Add new translation"
              ></b-button>
            </template>
          </b-table-column>
        </template>
      </b-table>
    </b-field>
    <ol v-if="hasErrors" class="errors">
      <li v-for="(error, ei) in errors" :key="['error', ei].join('-')">{{ error }}</li>
    </ol>
    <b-button type="is-success" @click="submit" icon-left="content-save-outline">Save</b-button>
  </form>
</template>

<script lang="ts">
//import { Action } from "vuex-class";
import { saveLexeme, fetchSetting, fetchLanguages } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { Translation, Lexeme, KeyLabel } from "../../api/interfaces";
import { LexemeSchema } from "../../api/schemas";
import { notEmptyString } from "../../api/validators";
import langOptions from "../../api/mappings/lang-options";
import translationTypes from "../../api/mappings/translation-types";
import { bus } from "../../main";
import { toCharCode } from "../../api/converters";

const emptyTranslation: Translation = {
  lang: "-",
  text: "",
  type: "standard",
  alpha: "lt",
};

@Component({
  components: {},
  filters: {},
})
export default class LexemeForm extends Vue {
  @Prop({ default: () => new LexemeSchema() }) readonly lexeme: Lexeme;
  @Prop({ default: () => [] }) readonly categoryOptions: Array<KeyLabel>;
  @Prop({ default: "-" }) readonly listCategory: string;
  private category = "-";
  private newCategory = "";
  private subkey = "";
  private name = "";
  private original = "";
  private lang = "";
  private unicode = "";
  private langOpts = langOptions;
  private translations: Array<Translation> = [emptyTranslation];
  private isNew = false;
  private extraTranslations = 1;
  private errors: Array<string> = [];
  private draggingIndex = -1;
  private draggingRow: any = null;

  created() {
    this.sync();
  }

  sync() {
    const { key } = this.lexeme;
    this.extraTranslations = 1;
    if (notEmptyString(key, 3)) {
      this.isNew = key === "_new";
      const hasValidKey =
        this.lexeme.key.length > 5 && this.lexeme.key.indexOf("__") > 1;
      if (hasValidKey || this.isNew) {
        const [category, subkey] = this.lexeme.key.split("__");
        if (notEmptyString(subkey) || this.isNew) {
          this.subkey = this.isNew ? "" : subkey;
          this.category = this.isNew ? this.listCategory : category;
          this.name = this.lexeme.name;
          this.lang = this.lexeme.lang;
          this.unicode = this.lexeme.unicode;
          this.original = this.lexeme.original;
          this.translations = [
            ...this.lexeme.translations,
            emptyTranslation,
          ].map((tr, weight) => {
            return { ...tr, weight };
          });
        }
      }
      const dictlangs = this.$ls.get("dictlangs");
      if (dictlangs instanceof Array && dictlangs.length > 1) {
        this.langOpts = dictlangs.map((lang) => {
          const name = lang.name.split(",").shift().trim();
          return {
            ...lang,
            name,
          };
        });
      } else {
        fetchLanguages("dict").then((data) => {
          if (data.valid) {
            const { languages } = data;
            if (languages instanceof Array && languages.length > 1) {
              this.langOpts = languages;
              this.$ls.set("dictlangs", languages);
            }
          }
        });
      }
    }
  }

  addTranslation() {
    this.extraTranslations++;
  }

  mayRemoveTranslation(row: Translation, index: number) {
    const lastIndex = this.translations.length - 1;
    return index > 0 && (index < lastIndex || row.text.trim().length < 0);
  }

  removeTranslation(index: number) {
    if (index > 0 && index < this.translations.length) {
      this.translations.splice(index, 1);
      if (this.extraTranslations > 1) {
        this.extraTranslations--;
      }
    }
  }

  isLastTranslationIndex(index: number) {
    return index === this.translations.length - 1;
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
    this.translations[this.draggingIndex].weight =
      this.draggingIndex < droppedOnRowIndex
        ? droppedOnRowIndex + 0.5
        : droppedOnRowIndex - 0.5;

    this.translations
      .sort((a, b) => a.weight - b.weight)
      .map((tr, index) => {
        tr.weight = index;
        return tr;
      });
  }

  get langOptions() {
    return [{ key: "-", name: "---" }, ...this.langOpts];
  }

  get allCategoryOptions(): Array<KeyLabel> {
    return [...this.categoryOptions, { key: "_new", label: "New category" }];
  }

  get alphaOptions(): Array<KeyLabel> {
    return [
      { key: "lt", label: "Latin" },
      { key: "dv", label: "Devanagari" },
    ];
  }

  get translationTypeOptions(): Array<KeyLabel> {
    return [{ key: "-", label: "---" }, ...translationTypes];
  }

  get showNewCategory(): boolean {
    return this.category === "_new";
  }
  get charCode(): string {
    return toCharCode(this.unicode);
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  @Watch("lexeme")
  changeLexeme() {
    this.sync();
  }

  @Watch("extraTranslations")
  changeExtraTranslations(newVal) {
    const numCurrentTranslations = this.lexeme.translations.length;
    const numEditableTranslations = this.translations.length;
    const newTrs = numEditableTranslations - numCurrentTranslations;
    const extra = newVal - newTrs;
    if (extra > 0) {
      for (let i = 0; i < extra; i++) {
        this.translations.push(Object.assign({}, emptyTranslation));
      }
    }
  }

  submit() {
    this.errors = [];
    const validKey = (key: string): boolean =>
      /^[a-z0-9_]+$/.test(key) && !/__+/.test(key);
    const isNewCategory = this.category === "_new";
    if (this.name.trim().length < 1) {
      this.errors.push("Please add a name");
    }
    if (this.subkey.trim().length < 1 || !validKey(this.subkey)) {
      this.errors.push(
        "Please add a key value with only letters, numerals or single underscore"
      );
    }
    if (this.category.trim().length < 1) {
      this.errors.push("Please select a category");
    }
    if (this.lang.trim().length < 2) {
      this.errors.push("Please select a source language");
    }
    if (isNewCategory) {
      if (this.newCategory.trim().length < 3 || !validKey(this.newCategory)) {
        this.errors.push(
          "Please enter a category key with at least 3 characters and only letters, numerals or single underscores"
        );
      }
    }
    if (!this.hasErrors) {
      const catKey = !isNewCategory
        ? this.category.trim()
        : this.newCategory
            .trim()
            .toLowerCase()
            .replace(/_+$/, "")
            .replace(/[ _-]+/g, "_");
      if (notEmptyString(catKey, 2)) {
        const key = [catKey, this.subkey].join("__");
        const translations = this.translations
          .filter((tr) => tr.lang.length === 2 && notEmptyString(tr.text))
          .map((tr) => {
            if (tr.type.length < 3) {
              tr.type = "standard";
            }
            return tr;
          });
        const saveData = {
          key,
          lang: this.lang,
          name: this.name.trim(),
          original: this.original,
          unicode: this.unicode,
          translations,
        };
        saveLexeme(saveData).then((data) => {
          if (data.valid) {
            bus.$emit("lexeme_update", data);
          }
        });
      }
    }
  }
}
</script>
