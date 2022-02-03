<template>
  <form class="edit-form snippet-version-form">
    <div class="inner">
      <div class="close" @click="close">
        <b-icon icon="close" size="is-large" />
      </div>
      <fieldset class="vertical">
        <template v-for="(version, vi) in values">
          <b-field
            :key="[version.lang, vi].join('-')"
            class="row version"
            :class="{ hide: showLang(version) }"
          >
            <b-select v-model="values[vi].langCode">
              <option
                v-for="opt in langOptions"
                :value="opt.key"
                :key="['translation', vi, opt.key].join('-')"
                >{{ opt.key.toUpperCase() }}</option
              >
            </b-select>
            <b-input
              size="2"
              maxlength="2"
              pattern="[A-Z][A-Z]"
              type="text"
              class="code"
              title="Locale code, e.g. US, MX, IN, BR etc."
              v-model="values[vi].locale"
              :has-counter="false"
            />
            <b-input
              type="textarea"
              class="text"
              :rows="2"
              v-model="values[vi].text"
            />
            <b-button
              icon-left="plus"
              v-if="isLastValue(vi)"
              @click="addVersion()"
            ></b-button>
          </b-field>
        </template>
        <details v-if="options.length > 0" class="options">
          <summary>
            <strong>Options</strong>
            <em class="num">{{options.length}}</em>
          </summary>
          <div
            class="option-set"
            v-for="(opt, oi) in options"
            :key="[category, subkey, opt.key, oi].join('-')"
          >
            <template v-for="(version, ovi) in opt.values">
              <b-field
                v-if="showLang(version)"
                :key="['opt-version', version.lang, oi, ovi].join('-')"
                class="row version"
              >
                <b-select v-model="options[oi].values[ovi].langCode">
                  <option
                    v-for="opt in langOptions"
                    :value="opt.key"
                    :key="['translation', oi, ovi, opt.key].join('-')"
                    >{{ opt.key.toUpperCase() }}</option
                  >
                </b-select>
                <b-input
                  size="2"
                  maxlength="2"
                  pattern="[A-Z][A-Z]"
                  type="text"
                  class="code"
                  title="Locale code, e.g. US, MX, IN, BR etc."
                  v-model="options[oi].values[ovi].locale"
                  :has-counter="false"
                />
                <b-input
                  type="text"
                  class="text"
                  v-model="options[oi].values[ovi].text"
                  :has-counter="false"
                />
                <b-button
                  icon-left="plus"
                  v-if="isLastOptionValue(oi, ovi)"
                  @click="addOptionVersion(oi)"
                ></b-button>
              </b-field>
            </template>
          </div>
        </details>
      </fieldset>
      <b-button @click="submit" type="is-success" size="is-medium"
        >Save</b-button
      >
    </div>
  </form>
</template>
<script lang="ts">
import { State } from "vuex-class";
import { fetchLanguages, fetchSnippet, saveSnippet } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { notEmptyString } from "../../api/validators";
import { bus } from "../../main";
import { UserState } from "../../store/types";
import { LanguageItem, Snippet, Version } from "@/api/interfaces";
import langOptions from "@/api/mappings/lang-options";

const emptyVersion = {
  lang: "en",
  langCode: "en",
  locale: "",
  text: "",
  active: true,
  approved: false,
};

@Component
export default class SnippetVersionForm extends Vue {
  @Prop({ default: "" }) readonly category: string;
  @Prop({ default: "" }) readonly subkey: string;
  @Prop({ default: "" }) readonly defaultText: string;
  @Prop({ default: () => [] }) readonly optionKeys: string[];
  @Prop({ default: () => [] }) readonly optionNames: string[];

  @State("user") user: UserState;

  private values: Array<Version> = [];

  private langOpts: Array<LanguageItem> = [];

  private options: Array<Snippet> = [];

  created() {
    this.loadLangOpts();
    this.matchSnippet();
  }

  matchSnippet() {
    this.setEmptyValues();
    if (notEmptyString(this.subkey, 2)) {
      this.options = this.optionKeys.map((ok) => {
        const newVersion = Object.assign({}, emptyVersion);
        newVersion.text = this.matchOptionName(ok);
        return {
          key: ok,
          values: [newVersion],
          published: true,
        };
      });
      fetchSnippet(this.category, this.subkey).then((data) => {
        if (data instanceof Object) {
          const keys = Object.keys(data);
          if (
            keys.includes("valid") &&
            keys.includes("snippet") &&
            data.snippet instanceof Object
          ) {
            const { values } = data.snippet;
            if (values instanceof Array && values.length > 0) {
              this.values = values
                .filter((v) => v instanceof Object)
                .map(this.extractVersion);
            }
            const { options } = data;
            if (options instanceof Array && options.length > 0) {
              const trOpts = options.map((opt) => {
                if (opt.values instanceof Array) {
                  opt.values = opt.values.map(this.extractVersion);
                }
                const key = opt.key.split("_option_").pop();
                return { ...opt, key };
              });

              this.options.forEach((opt, oi) => {
                const tOpt = trOpts.find((to) => to.key === opt.key);
                if (tOpt) {
                  this.options[oi] = tOpt;
                }
              });
            }
          }
        }
      });
    }
  }

  private setEmptyValues() {
    const newVersion = Object.assign({}, emptyVersion);
    newVersion.text = this.defaultText;
    this.values = [newVersion];
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
        if (data.languages instanceof Array) {
          this.langOpts = data.languages.map(mapLangOpts);
        }
      });
    }
  }

  addVersion() {
    const newVersion = Object.assign({}, emptyVersion);
    newVersion.langCode = this.matchNextLangCode(this.values);
    this.values.push(newVersion);
  }

  matchOptionName(key: string) {
    const keyIndex = this.optionKeys.indexOf(key);
    return keyIndex >= 0 && keyIndex < this.optionNames.length ? this.optionNames[keyIndex] : key.replace(/_/g, " ");
  }

  matchNextLangCode(values: Array<Version>) {
    const codes = values.map((v) => v.langCode);
    const langCodeIndex = this.enabledKeys.findIndex(
      (k) => k.length > 1 && codes.includes(k) === false
    );
    return langCodeIndex >= 0 ? this.enabledKeys[langCodeIndex] : "";
  }

  addOptionVersion(optionIndex: number) {
    if (optionIndex >= 0 && optionIndex < this.options.length) {
      const opt = this.options[optionIndex];
      if (opt) {
        const hasEmpty = opt.values.some((v) => v.text.length < 1);
        if (!hasEmpty) {
          const newVersion = Object.assign({}, emptyVersion);
          newVersion.langCode = this.matchNextLangCode(opt.values);
          this.options[optionIndex].values.push(newVersion);
          this.$forceUpdate();
        }
      }
    }
  }

  showLang(item) {
    if (item instanceof Object) {
      return this.langOptions.map((lg) => lg.key).includes(item.langCode);
    } else {
      return false;
    }
  }

  get enabledKeys() {
    return this.langOptions.map((lg) => lg.key);
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

  close() {
    bus.$emit("close-snippet-version-form", true);
  }

  isLastValue(index: number) {
    return index === this.lastLangIndex(this.values);
  }

  lastLangIndex(values: Array<Version>) {
    let lastIndex = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      if (this.enabledKeys.includes(values[i].langCode)) {
        lastIndex = i;
        break;
      }
    }
    return lastIndex;
  }

  isLastOptionValue(optionIndex: number, valIndex: number) {
    let valid = false;
    if (optionIndex >= 0 && optionIndex < this.options.length) {
      const opt = this.options[optionIndex];
      if (opt) {
        const { values } = opt;
        if (values instanceof Array) {
          valid = valIndex === this.lastLangIndex(values);
        }
      }
    }
    return valid;
  }

  mapVersion(value: Version) {
    const { langCode, locale, text } = value;
    const lang = [langCode, locale]
      .filter((item) => notEmptyString(item, 1))
      .join("-");
    return {
      active: true,
      approved: true,
      lang,
      text,
    };
  }

  extractVersion(value) {
    if (value instanceof Object) {
      const { lang } = value;
      if (notEmptyString(lang)) {
        const [langCode, locale] = lang.split("-");
        return { ...value, langCode, locale };
      }
    }
    return value;
  }

  submit() {
    const values = this.values.map(this.mapVersion);
    const key = [this.category, this.subkey].join("__");
    const langData = this.$ls.get("languages");
    const langs = langData instanceof Array? langData.map(lg =>lg.key) : [];
    saveSnippet({
      key,
      values,
      published: true,
      format: "text",
    }, langs).then((data) => {
      if (data.valid) {
        if (langs.length > 0) {
          setTimeout(() => {
            bus.$emit("save-snippet-versions", true);
          }, 1000);
        }
      }
    });
    if (this.options.length > 0) {
      this.options.forEach((opt) => {
        const comboKey = [key, "option", opt.key].join("_");
        const optValues = opt.values.map(this.mapVersion);
        saveSnippet({
          key: comboKey,
          values: optValues,
          published: true,
          format: "text",
        }, langs);
      });
    }
  }

  @Watch("subkey")
  changeSubkey(newVal) {
    if (notEmptyString(newVal)) {
      this.matchSnippet();
    }
  }
}
</script>
