<template>
  <div class="main-view" :class="wrapperClasses">
    <div class="controls">
      <b-select v-if="categories.length > 0" placeholder="Categories" v-model="category">
        <option v-for="opt in categoryOptions" :value="opt.key" :key="opt.key">{{ opt.label }}</option>
      </b-select>
      <b-input
        type="text"
        v-model="filter"
        maxlength="16"
        size="16"
        placeholder="Filter by keys or names"
        class="filter"
        :has-counter="false"
      />

      <b-tooltip
        class="show-all"
        label="Show all terms if not filtered by category or search string."
      >
        <b-switch v-model="showAll">Show all</b-switch>
      </b-tooltip>
      <b-button @click="addNew" type="is-primary" icon-right="plus" class="add-new">Add new term</b-button>
    </div>
    <b-table
      class="listing-table"
      v-if="hasLexemes"
      :data="displayLexemes"
      :sticky-header="true"
      :row-class="(row, index) => assignRowClasses(index)"
    >
      <template slot-scope="props">
        <b-table-column class="key" field="key" label="Key">
          {{
          filterKey(props.row.key)
          }}
        </b-table-column>
        <b-table-column class="lang" field="lang" label="Lang">{{ props.row.lang }}</b-table-column>
        <b-table-column class="name" field="name" label="Term">{{ props.row.name }}</b-table-column>
        <b-table-column class="original" field="original" label="Original">{{ props.row.original }}</b-table-column>
        <b-table-column class="translations" field="translations" label="Translations">
          <ul class="translations vertical">
            <li
              v-for="(translation, ti) in props.row.translations"
              :key="['translation', props.row.key, ti].join('-')"
            >
              <span class="text">{{ translation.text }}</span>
              <span class="lang">{{ translation | langType }}</span>
            </li>
          </ul>
        </b-table-column>
        <b-table-column class="edit" field="delete" label="Delete">
          <span class="delete" v-on:click="handleDelete(props.row.key)">
            <b-icon icon="trash-can-outline" />
          </span>
        </b-table-column>
        <b-table-column class="edit" field="edit" label="Edit">
          <span class="edit" v-on:click="selectItem(props.row.key)">
            <b-icon icon="square-edit-outline" />
          </span>
        </b-table-column>
      </template>
    </b-table>
    <LexemeForm
      :lexeme="selectedLexeme"
      :categoryOptions="categoryOptions"
      :listCategory="category"
    />
  </div>
</template>
<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import {
  fetchLexemes,
  fetchLexemeCategories,
  deleteLexeme,
} from "../api/methods";
import {
  smartSortNumPad,
} from "../api/converters";
import { notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import LexemeForm from "./forms/LexemeForm.vue";
import { UserState } from "../store/types";
import { Lexeme, KeyLabel } from "../api/interfaces";
import { LexemeSchema } from "../api/schemas";
import { toWords } from "../api/helpers";
import { bus } from "../main";

@Component({
  components: {
    LexemeForm,
  },
  filters: {
    ...FilterSet,
    langType(ref: any) {
      let str = "";
      if (ref instanceof Object) {
        const { lang, type, alpha } = ref;
        str = [lang, type, alpha].filter((s) => notEmptyString(s, 1)).join(":");
      }
      return str;
    },
  },
})
export default class LexemeView extends Vue {
  @State("user") user: UserState;
  lexemes: Array<Lexeme> = [];
  categories: Array<string> = [];
  category = "-";
  selectedLexeme: Lexeme = new LexemeSchema();
  loaded = false;
  filter = "";
  showAll = false;

  created() {
    this.loadData();
    this.loadCategories();
    bus.$on("lexeme_update", (data) => {
      if (data instanceof Object) {
        if (data.lexeme) {
          const li = this.lexemes.findIndex((lx) => lx.key === data.lexeme.key);
          const lx = new LexemeSchema(data.lexeme);
          if (li >= 0) {
            this.lexemes[li] = lx;
          } else {
            this.lexemes.push(lx);
            const category = lx.key.split("__").shift();
            if (!this.categories.some((ct) => ct === category)) {
              this.categories.push(category);
              this.categories.sort();
              this.category = category;
            }
          }
          this.sortLexemes();
          this.close();
        }
      }
    });
    bus.$on("escape", this.close);
  }

  async loadData() {
    const strCat = this.hasCategory ? this.category : "";
    await fetchLexemes(strCat).then((data) => {
      if (data.valid) {
        this.lexemes = data.items;
        this.sortLexemes();
        setTimeout(() => {
          this.loaded = true;
          this.updateByRoute();
        });
      }
    });
  }

  async loadCategories(save = false) {
    const data = await fetchLexemeCategories().then((data) => {
      if (data.valid) {
        this.categories = data.categories;
        this.categories.sort();
      }
    });
  }

  hasLexemes(): boolean {
    return this.lexemes.length > 0;
  }

  sortLexemes() {
    this.lexemes.sort((a, b) =>
      smartSortNumPad(a.key) > smartSortNumPad(b.key) ? 1 : -1
    );
  }

  updateByRoute() {
    const { params } = this.$route;
    const { category, key } = params;
    if (notEmptyString(category, 3)) {
      this.category = category;
    }
    if (notEmptyString(key, 4)) {
      this.selectItem(key, false);
    } else {
      this.selectedLexeme = new LexemeSchema();
    }
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["file", index].join("-")];
  }

  selectItem(key: string, updatePath = true) {
    const item = this.lexemes.find((lx) => lx.key === key);
    this.selectedLexeme = new LexemeSchema(item);
    if (updatePath) {
      this.updatePath();
    }
  }

  close() {
    this.selectedLexeme = new LexemeSchema();
    this.updatePath();
  }

  addNew() {
    this.selectedLexeme = new LexemeSchema({ key: "_new", lang: "-" });
  }

  filterKey(key: string): string {
    const parts = key.split("__");
    if (this.hasCategory) {
      parts.shift();
    }
    return parts.join(": ");
  }

  updatePath() {
    const parts = ["dictionary"];
    if (this.category.length > 2) {
      parts.push(this.category);
    } else {
      parts.push("-");
    }
    if (this.hasSelected) {
      parts.push(this.selectedLexeme.key);
    }
    const { path } = this.$route;
    const np = "/" + parts.join("/");
    if (path !== np && path.indexOf("dictionary") === 1) {
      this.$router.push(np);
    }
  }

  handleDelete(key: string) {
    const lexeme = this.lexemes.find((lx) => lx.key === key);
    if (lexeme) {
      this.$buefy.dialog.confirm({
        message: `Are you sure you wish to delete "${lexeme.name}" (key: ${lexeme.key})`,
        cancelText: "Keep",
        confirmText: "Delete",
        type: "is-danger",
        onConfirm: () => this.delete(key),
      });
      const lxi = this.lexemes.findIndex((lx) => lx.key === lexeme.key);
      if (lxi >= 0) {
        this.lexemes.splice(lxi, 1);
        const numLx = this.lexemes.length;
        if (numLx < 1) {
          this.category = "-";
        }
      }
    }
  }

  async delete(key: string) {
    const { _id } = this.user;
    const response = await deleteLexeme(key, _id);
    if (response.valid) {
      const { lexeme, message } = response;
      this.$buefy.toast.open({
        duration: 3000,
        message: `the term "${lexeme.name}" (key: ${lexeme.key}) was deleted`,
        position: "is-bottom",
        type: "is-success",
      });
    }
  }

  get displayLexemes(): Array<Lexeme> {
    const filterBySub = notEmptyString(this.filter, 1);
    if (filterBySub || this.hasCategory) {
      const prefix =
        this.hasCategory && this.category !== "_new"
          ? this.category + "__"
          : "";
      const startRgx = this.hasCategory ? "^" + prefix : "(\\w+_)*";
      const rgx = new RegExp(startRgx + this.filter, "i");
      const nameRgx = new RegExp("^" + this.filter, "i");
      return this.lexemes.filter(
        (lx) =>
          rgx.test(lx.key) ||
          nameRgx.test(lx.name) ||
          nameRgx.test(lx.original) ||
          lx.translations.some((tr) => nameRgx.test(tr.text))
      );
    } else if (this.showAll) {
      return this.lexemes;
    } else {
      return [];
    }
  }

  get hasCategory(): boolean {
    return this.category.length > 1;
  }

  get hasSelected(): boolean {
    const { key } = this.selectedLexeme;
    return key.length > 5 || key === "_new";
  }

  get wrapperClasses(): Array<string> {
    const cls = [];
    if (this.hasCategory) {
      cls.push("category-" + this.category);
    }
    if (this.hasSelected) {
      cls.push("show-form");
    }
    return cls;
  }

  get categoryOptions(): Array<KeyLabel> {
    const catOpts = this.categories.map((c) => {
      return {
        key: c,
        label: toWords(c),
      };
    });
    return [{ key: "-", label: "----" }, ...catOpts];
  }

  @Watch("category")
  changeCategory() {
    this.loadData();
    if (this.loaded) {
      this.updatePath();
    }
  }
  @Watch("$route")
  changeRoute() {
    this.updateByRoute();
  }
}
</script>
