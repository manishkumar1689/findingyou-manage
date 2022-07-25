<template>
<fragment>
  <figure class="fy-logo"></figure>
  <div class="main-view">
    <h1 class="main-title">Welcome</h1>
    <nav class="welcome-nav">
        <ul class="menu">
          <li
            v-for="item in mainMenu"
            :key="item.key"
            :class="item.classNames"
          >
            <template v-if="item.reload">
              <a :href="item.to" class="reload">{{item.label}}</a>
            </template>
            <template v-else>
              <router-link :to="item.to">{{item.label}}</router-link>
            </template>
          </li>
        </ul>
      </nav>
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
</fragment>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { fetchLanguages } from "@/api/methods";
import { LanguageItem } from "@/api/interfaces";
import { saveEnabledLangsFromQueryString } from "@/store/local";
import { mainMenuItems } from "@/api/menu";

@Component({
  components: {},
  filters: {},
})
export default class MainView extends Vue {
  langOpts: Array<LanguageItem> = [];

  enabledLangOpts: any = {};

  defaultLang = "en";

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

  get mainMenu() {
    return mainMenuItems.filter(mi => mi.to.length > 2).map((mi) => {
      const baseClass = mi.to.substring(1).replace(/\//, '--');
      const classNames = [baseClass];
      const keys = Object.keys(mi);
      const reload = keys.includes('reload') ? mi.reload : false;
      const key = ['home','nav', mi.to.substring(1).split('/').join('_')].join('-');
      if (reload) {
        classNames.push("astro");
      }
      return { ...mi, key, classNames, reload };
    });
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
<style lang="scss">
@import "@/styles/variables.scss";
#app {
  .home {
    justify-content: flex-start;
    .main-view {
      margin-top: 3em;
    }
  }
  .welcome-nav {
    margin: 0 auto;
    max-width: 80em;
    ul {
      display: grid;
      justify-content: center;
      align-items: center;
      grid-template-columns: 1fr 1fr 1fr;
      column-gap: 2em;
      margin: 1em auto 3em auto;
      li {
        font-size: 1.25em;
        font-weight: bold;
        margin: 0.5em;
      }
    }
  }
  .fy-logo {
    position: absolute;
    top: 0.75em;
    pointer-events: none;
    left: 1em;
    width: 20em;
    max-width: 50%;
    height: 8em;
    background: transparent url(/img/drawings/fy-logo.svg) no-repeat top left;
    background-size: contain;
     @media (min-width: $max-mobile-width) {
      left: 1.25em;
    }
    @media (min-width: $min-medium-width) {
      left: 1em;
    }
    @media (min-width: $min-standard-width) {
      left: 0.75em;
    }
    @media (min-width: $min-mlarge-width) {
      left: 0.5em;
    }
    @media (min-width: $min-large-width) {
      left: 0.25em;
    }
  }
  
  #main.home h1 {
    @media (max-width: $min-medium-width) {
      font-size: 4vw;
      text-align: right;
      top: -1em;
    }
    @media (max-width: $max-mobile-width) {
      font-size: 4.5vw;
    }

    @media (max-width: $max-narrow-mobile-width) {
      font-size: 5vw;
    }
  }
}

</style>