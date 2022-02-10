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
        label="Show all snippets if not filtered by category or search string."
      >
        <!-- <b-switch v-model="showAll">Show all</b-switch> -->
      </b-tooltip>
      <b-button @click="addNew" type="is-primary" icon-right="plus" class="add-new">Add new snippet</b-button>
      <b-button v-if="showBulkDelete" type="is-danger" class="delete-all" icon-left="delete-variant" @click="handleBulkDelete">Delete all</b-button>
    </div>
    <b-table
      class="listing-table snippets-table"
      v-if="hasSnippets"
      :data="displaySnippets"
      :row-class="(row, index) => assignRowClasses(row, index)"
    >
      <template slot-scope="props">
        <b-table-column class="key" field="key" label="Key / edit">
          <b-tooltip @click.native="selectItem(props.row.key)" class="edit-trigger" title="Edit" :label="props.row.notes"> {{
          filterKey(props.row.key)
          }}</b-tooltip>
        </b-table-column>
        <b-table-column class="versions" field="values" label="Versions">
          <ul class="versions vertical" :class="isExpandedClass(props.index)" @click="toggleExpand(props.index)">
            <li
              v-for="(version, vi) in props.row.values"
              :key="['version', props.row.key, vi].join('-')"
            >
              <span class="text">{{ version.text }}</span>
              <span class="lang">{{ version | langType }}</span>
              <em v-if="showTranslationInfo(props.row, vi)" class="translation-info">{{ translationInfo(props.row) }}</em>
            </li>
          </ul>
        </b-table-column>
        <b-table-column class="edit" field="delete" label="Edit">
            <b-icon v-if="mayDelete(props.row)" @click.native="handleDelete(props.row.key)" icon="trash-can-outline" class="remove" />
            <b-switch v-model="props.row.published" @change.native="togglePublished(props.row)">Published</b-switch>
            <b-icon @click.native="selectItem(props.row.key)" icon="square-edit-outline" class="edit" />
        </b-table-column>
      </template>
    </b-table>
    <SnippetForm
      :snippet="selectedSnippet"
      :categoryOptions="categoryOptions"
      :listCategory="category"
    />
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import {
  deleteSnippet,
  fetchSnippets,
  fetchSnippetCategories,
  saveSnippet,
} from "../api/methods";
import {
  smartSortNumPad,
} from "../api/converters";
import { notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import SnippetForm from "./forms/SnippetForm.vue";
import { UserState } from "../store/types";
import {
  KeyLabel,
} from "../api/interfaces";
import { SnippetSchema } from "../api/schemas";
import { toWords } from "../api/helpers";
import { bus } from "../main";

@Component({
  components: {
    SnippetForm,
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
export default class SnippetList extends Vue {
  @State("user") user: UserState;
  snippets: Array<SnippetSchema> = [];
  categories: Array<string> = [];
  category = "-";
  selectedSnippet = new SnippetSchema();
  loaded = false;
  filter = "";
  showAll = false;
  expandedIndices: number[] = [];

  created() {
    this.loadData();
    this.loadCategories();
    bus.$on("snippet_update", (data) => {
      if (data instanceof Object) {
        if (data.snippet) {
          const li = this.snippets.findIndex(
            (sn) => sn.key === data.snippet.key
          );
          const snippet = new SnippetSchema(data.snippet);
          if (li >= 0) {
            this.snippets[li] = snippet;
          } else {
            this.snippets.push(snippet);
          }
          const category = snippet.category;
          if (!this.categories.some((ct) => ct === category)) {
            this.categories.push(category);
          this.categories.sort();
            this.category = category;
          }
          if (snippet.values.length > 0) {
            const message = `The snippet "${snippet.values[0].text}" has been saved`;
            this.toast(message);
          }
          this.sortSnippets();
          if (data.close) {
            setTimeout(this.close, 500);
          }
        }
      }
    });
    bus.$on("escape", this.close);
    bus.$on('snippet-close', this.close);
    bus.$on('remove-snippet', snippetKey => {
      if (notEmptyString(snippetKey, 5)) {
        const si = this.snippets.findIndex(sn => sn.key === snippetKey);
        if (si >= 0) {
          this.snippets.splice(si, 1);
        }
      }
    })
  }

  async loadData() {
    const strCat = this.hasCategory ? this.category : "";
    await fetchSnippets("all").then((data) => {
      if (data.valid) {
        this.snippets = data.items.map((row) => new SnippetSchema(row)).filter(sn => !this.hasCategory || sn.category === strCat);
        this.sortSnippets();
        setTimeout(() => {
          this.loaded = true;
          this.updateByRoute();
        });
      }
    });
  }

  async loadCategories() {
    await fetchSnippetCategories().then((data) => {
      if (data.valid) {
        this.categories = data.categories;
        this.categories.sort();
      }
    });
  }

  hasSnippets(): boolean {
    return this.snippets.length > 0;
  }

  sortSnippets() {
    this.snippets.sort((a, b) =>
      smartSortNumPad(a.key) > smartSortNumPad(b.key) ? 1 : -1
    );
  }

  updateByRoute() {
    const { params } = this.$route;
    const { category, key } = params;
    const matchedCat = notEmptyString(category, 2)
      ? category
      : this.categories.length > 0
      ? this.categories[0]
      : "";
    if (notEmptyString(matchedCat, 3)) {
      this.category = matchedCat;
    }
    if (notEmptyString(key, 4)) {
      this.selectItem(key, false);
    } else {
      this.selectedSnippet = new SnippetSchema();
    }
  }

  assignRowClasses(row = null, index: number) {
    const pubClass = row instanceof Object ? row.published ? 'published' : 'unpublished' : 'empty';
    return [["index", index].join("-"), pubClass];
  }

  selectItem(key: string, updatePath = true) {
    const item = this.snippets.find((lx) => lx.key === key);
    this.selectedSnippet = new SnippetSchema(item);
    if (updatePath) {
      this.updatePath();
    }
  }

  close() {
    this.selectedSnippet = new SnippetSchema();
    this.updatePath();
  }

  addNew() {
    this.selectedSnippet = new SnippetSchema({ key: "_new", lang: "-" });
  }

  filterKey(key: string): string {
    const parts = key.split("__").map(part => part.replace(/_+/g, " ").trim());
    if (this.hasCategory) {
      parts.shift();
    }
    return parts.join(": ");
  }

  isExpanded(index = 0) {
    return this.expandedIndices.indexOf(index) >= 0;
  }

  isExpandedClass(index = 0) {
    const row = index >= 0 && index < this.snippets.length?  this.snippets[index] : null;
    const hasTranslations = row instanceof SnippetSchema ? row.hasTranslations : false;
    const cls = [];
    if (hasTranslations) {
      const expandedClass = this.isExpanded(index)? 'expanded' : 'collapsed';
      cls.push('collapsible', expandedClass);
    }
    return cls;
  }

  showTranslationInfo(row: SnippetSchema, index = -1) {
    return index === 0 && row.hasTranslations;
  }

  translationInfo(row: SnippetSchema) {
    return row.translationInfo;
  }

  toggleExpand(index = 0) {
    const currIndex = this.expandedIndices.indexOf(index);
    if (currIndex < 0) {
      this.expandedIndices.push(index);
    } else {
      this.expandedIndices.splice(currIndex, 1);
    }
  }

  updatePath() {
    const parts = ["snippets"];
    if (this.category.length > 2) {
      parts.push(this.category);
    } else {
      parts.push("-");
    }
    if (this.hasSelected) {
      parts.push(this.selectedSnippet.key);
    }
    const { path } = this.$route;
    const np = "/" + parts.join("/");
    const trimmedPath = path.replace(/\/$/, '')
    if (trimmedPath !== np && path.indexOf("snippets") === 1) {
      this.$router.push(np);
    }
  }

  mayDelete(row: SnippetSchema) {
    return row.published === false;
  }

  handleDelete(key: string) {
    const snippet = this.snippets.find((sn) => sn.key === key);
    if (snippet) {
      this.$buefy.dialog.confirm({
        message: `Are you sure you wish to delete "${snippet.notes}" (key: ${snippet.key})`,
        cancelText: "Keep",
        confirmText: "Delete",
        type: "is-danger",
        onConfirm: () => this.delete(key),
      });
    }
  }

  toast(message = "", duration = 3000, typeKey = "success") {
    const type = ["is", typeKey].join("-");
    this.$buefy.toast.open({
        duration,
        message,
        position: "is-bottom",
        type,
      });
  }

  async delete(key: string) {
    const { _id, roles } = this.user;
    if (roles instanceof Array) {
      const override = roles.includes('superadmin');
      const response = await deleteSnippet(key, _id, false, override);
      let msg = '';
      if (response.valid) {
        const { lexeme } = response;
        const keyName = this.filterKey(lexeme.key);
        msg = `the snippet (${keyName}) was deleted`;
        const lxi = this.snippets.findIndex((lx) => lx.key === key);
        if (lxi >= 0) {
          this.snippets.splice(lxi, 1);
          const numLx = this.snippets.length;
          if (numLx < 1) {
            this.category = "-";
          }
        }
      } else {
        msg = response.message;
      }
      this.toast(msg);
    }
  }

  get displaySnippets(): Array<SnippetSchema> {
    const filterBySub = notEmptyString(this.filter, 1);
    if (filterBySub || this.hasCategory) {
      const prefix =
        this.hasCategory && this.category !== "_new"
          ? this.category + "__"
          : "";
      const startRgx = this.hasCategory ? "^" + prefix : "(\\w+_)*";
      const rgx = new RegExp(startRgx + this.filter, "i");
      const nameRgx = new RegExp("^" + this.filter, "i");
      return this.snippets.filter(
        (sn) =>
          rgx.test(sn.key) &&
          (nameRgx.test(sn.notes) ||
            sn.values.some((vs) => nameRgx.test(vs.text)))
      );
    } else if (this.showAll) {
      return this.snippets;
    } else {
      return [];
    }
  }

  get hasCategory(): boolean {
    return this.category.length > 1;
  }

  get hasSelected(): boolean {
    const { key } = this.selectedSnippet;
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

  get showBulkDelete() {
    return notEmptyString(this.category, 2) && /[a-z0-9]/.test(this.category) && this.snippets.length > 0 && !this.hasSelected;
  }

  handleBulkDelete() {
    const numItems = this.snippets.length;
    const itemList = numItems > 5 ? this.snippets.slice(0, 5) : this.snippets;
    const maxItemsDisplayed = 5;
    if (numItems > maxItemsDisplayed && notEmptyString(this.category, 2)) {
      const lastRow = Object.assign({}, itemList[(maxItemsDisplayed - 1)]);
      const diff = numItems - maxItemsDisplayed;
      lastRow.values[0].text = `... and ${diff} more`;
      lastRow.values.splice(1, lastRow.values.length);
    }
    const itemsInner = itemList.filter(sn => sn.values.length > 0).map(sn => sn.values[0].text);
    const strItems = ['<ul><li>',itemsInner.join('</li><li>'),'</li></ul>'].join('');
    this.$buefy.dialog.confirm({
      message: `<p>Are you sure you wish to delete all snippets in the "${this.category}"</p>${strItems}`,
      cancelText: "Keep",
      confirmText: "Delete all",
      type: "is-danger",
      onConfirm: () => this.bulkDelete(),
    });
  }

  bulkDelete() {
    deleteSnippet(this.category, this.user._id, true).then(data => {
      if (data instanceof Object) {
        const {items } = data;
        if (items instanceof Array) {
          const deleted = items.length;
          let strItems = '';
          if (deleted > 0) {
            const itemList = data.items.map(sn => sn.key.split('__').pop().replace(/_+/g, ' '))
            strItems = ['<ul><li>',itemList.join('</li><li>'),'</li></ul>'].join('');
          }
          const prefix = data.prefix + '__';
          this.snippets = this.snippets.filter(sn => sn.key.startsWith(prefix) === false);
          this.category = '-';
          this.categories = this.categories.filter(ctKey => ctKey !== data.prefix);
          this.toast(`<p>${deleted} items deleted</p>${strItems}`);
          setTimeout(() => {
            this.$router.push('/snippets');
          }, 500)
        }
      }
    })
  }

  togglePublished(row) {
    if (row instanceof Object) {
      saveSnippet(row);
    }
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
<style lang="scss">

#main {
  .controls {
    .delete-all {
      margin-left: 6em;
      opacity: 0.25;
      &:hover {
        opacity: 1;
        transition: opacity 0.333s ease-in-out;
      }
    }
  }
  .snippets-table {
    tbody {
      td {
        &.edit {
          min-width: 8em;
        }
        .icon.edit {
          margin-left: 1em;
        }
      }
    }
  }
}

</style>