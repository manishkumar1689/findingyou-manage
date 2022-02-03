<template>
  <div class="main-view">
    <h3>Welcome</h3>
    <form class="user-preference-form">
      <b-field class="grid-3">
        <b-checkbox
          v-for="lang in langOpts"
          :key="['enabled_lang', lang.key].join('-')"
          v-model="enabledLangOpts[lang.key]"
          >{{ lang.key }} | {{ lang.name }}
        </b-checkbox>
      </b-field>
      <div class="actions">
        <b-button
          size="is-small"
          :type="toggleButtonType"
          @click="toggleSelect()"
          >{{ toggleSelectMessage }}</b-button
        >
        <b-button size="is-small" type="is-light" @click="resetSelect()"
          >Revert</b-button
        >
        <b-button size="is-large" type="is-primary" @click="save"
          >Save</b-button
        >
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { fetchLanguages } from "@/api/methods";
import { LanguageItem } from "@/api/interfaces";
import { saveEnabledLangsFromQueryString } from "@/store/local";

@Component({
  components: {},
  filters: {},
})
export default class MainView extends Vue {
  private langOpts: Array<LanguageItem> = [];

  private enabledLangOpts: any = {};

  private defaultLang = "en";

  created() {
    saveEnabledLangsFromQueryString(this.$ls);
  }

  mounted() {
    this.loadLangOpts();
    setTimeout(() => {
      if (this.langOpts.length < 1) {
        this.loadLangOpts();
      }
    }, 3000);
  }

  loadLangOpts() {
    const langs = this.$ls.get("active_langs");

    const mapLangOpts = (opt) => {
      const name = opt.name.split(",").shift().trim();
      return { ...opt, name };
    };
    if (langs instanceof Array && langs.length > 0) {
      this.langOpts = langs.map(mapLangOpts);
      this.assignEnabledLangs();
    } else {
      fetchLanguages("both").then((data) => {
        this.langOpts = data.languages.map(mapLangOpts);
        this.assignEnabledLangs();
        this.$ls.set("active_langs", this.langOpts);
      });
    }
  }

  assignEnabledLangs() {
    const storedEnabledLangs = this.$ls.get("enabled_langs");
    const enabledLangs =
      storedEnabledLangs instanceof Array ? storedEnabledLangs : [];
    const showAll = enabledLangs.length < 1;
    const activeLangOpts: Map<string, boolean> = new Map();
    this.langOpts.forEach((lg) => {
      const show = showAll || enabledLangs.includes(lg.key);
      activeLangOpts.set(lg.key, show);
    });
    this.enabledLangOpts = Object.fromEntries(activeLangOpts.entries());
  }

  save() {
    const selected = Object.entries(this.enabledLangOpts)
      .filter((entry) => entry[1])
      .map((entry) => entry[0]);
    this.$ls.set("enabled_langs", selected);
    this.showMessage("Saved languages available for editing");
  }

  showMessage(message, duration = 2000) {
    this.$buefy.toast.open({
      duration,
      message,
      position: "is-bottom",
      type: "is-success",
    });
  }

  toggleSelect() {
    const selectAll = this.selectAllMode;
    Object.entries(this.enabledLangOpts).forEach((entry) => {
      const key = entry[0];
      this.enabledLangOpts[key] = selectAll || key === this.defaultLang;
    });
  }

  resetSelect() {
    this.loadLangOpts();
  }

  get selectAllMode() {
    return this.numSelected < this.langOpts.length / 3;
  }

  get numSelected() {
    return Object.entries(this.enabledLangOpts).filter((entry) => entry[1])
      .length;
  }

  get toggleSelectMessage() {
    return this.selectAllMode ? "Select all" : "Deselect all but default";
  }

  get toggleButtonType() {
    return this.selectAllMode ? "is-info" : "is-warning";
  }
}
</script>
