<template>
  <form class="edit-form tag-option-list" :class="wrapperClasses">
    <b-table :data="items" :sticky-header="true">
      <template slot-scope="props">
        <b-table-column class="name-column" field="name" label="Name">
          <b-input
            maxlength="64"
            size="48"
            type="name"
            class="text"
            v-model="props.row.name"
            :has-counter="false"
            @blur="checkKey(props.index)"
          />
        </b-table-column>
        <b-table-column class="key-column" field="key" label="Key / Depends on">
          <b-input
            maxlength="64"
            size="48"
            type="name"
            class="text"
            pattern="[a-z0-9_]+"
            placeholder="key"
            :disabled="setKeyIsDisabled(props.row.key)"
            v-model="props.row.key"
            :has-counter="false"
          />
          <b-field label="Filter by options in:">
            <b-select v-model="props.row.parent">
              <option v-for="setOpt in matchedParentSetOpts(props.row)" :key="setOpt.itemKey" :value="setOpt.key">{{setOpt.name}}</option>
            </b-select>
          </b-field>
        </b-table-column>
        <b-table-column class="options-column" field="options" label="Options">
          <div v-if="rowHasOptions(props.row)" class="options" :rel="['row',props.index].join('-')">
            <b-field v-for="(tagOpt, ti) in props.row.options" :key="['tag-opt', tagOpt.slug, ti].join('-')" :label="tagLabel(tagOpt)" class="column vertical" :class="slugClasses(props.index, ti)">
              <b-input
                maxlength="32"
                size="48"
                type="text"
                class="slug"
                v-if="mayEditTagSlug(props.index, ti)"
                pattern="[a-z0-9_]+"
                v-model="tagOpt.slug"
                :has-counter="false"
                :disabled="tagSlugIsDisabled(props.row.key, tagOpt.slug)"
              />
              <b-input
                maxlength="32"
                size="48"
                type="text"
                class="name"
                v-model="tagOpt.name"
                :has-counter="false"
                @blur="checkSlug(props.index, ti)"
              />
              <template v-if="mayEditTagParents(props.row, props.index, ti)">
                <b-select v-model="tagOpt.parents" :multiple="true" native-size="3">
                  <option v-for="parentOpt in matchedRowOptions(props.row)" :key="parentOpt.itemKey" :value="parentOpt.slug">{{parentOpt.name}}</option>
                </b-select>
              </template>
              <b-icon icon="drag" class="top-item handle" />
              <b-icon v-if="mayDelete(props.row.key, tagOpt.slug)" icon="trash-can-outline" @click.native="handleRemoveTagOpt(props.index, ti)" class="top-item remove-item" />
              <b-icon icon="pencil-outline" @click.native="setEditableSlug(props.index, ti)" class="top-item toggle-edit-expand" title="Edit slug and parents" />
              <b-tooltip :label="matchStatLabel(props.row.key, tagOpt.slug)" class="organise-trigger" :multilined="true">
                <p class="count" @click="enableReassignForm(tagOpt, props.row.key)">{{matchStat(props.row.key, tagOpt.slug)}}</p>
              </b-tooltip>
            </b-field>
          </div>
          <b-button icon-right="plus" size="is-medium" type="is-info" @click="addTag(props.index)" class="add-item">Add option</b-button>
        </b-table-column>
      </template>
    </b-table>
    <fieldset class="row actions">
      <b-button icon-right="plus" size="is-medium" type="is-info" @click.prevent.stop="addVocab" class="add-category">Add category</b-button>
      <b-button type="is-success" @click="submit" size="is-medium" icon-left="content-save-outline">Save</b-button>
    </fieldset>
    <div class="editing-overlay reassign-overlay" v-if="hasSelectedTag">
      <div class="inner-panel">
        <b-icon class="close" icon="close" @click.native="close" />
        <ReassignTagForm :sourceTag="selectedTag" :tagOptionSets="items" :count="matchStat(selectedTag.vocab, selectedTag.slug)" />
      </div>
    </div>
  </form>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { fetchPairedTagOptions, fetchPairedTagStats, saveSetting } from "../../api/methods";
import { Component, Vue } from "vue-property-decorator";
import { UserState } from "../../store/types";
import { defaultPairedTag, KeyNumValue, SlugName, TagOptionSet } from "@/api/interfaces";
import { emptyString, notEmptyString } from "@/api/validators";
import sortableElement from "../../assets/scripts/sortable-list";
import { sanitize } from "@/api/converters";
import { bus } from "@/main";
import { toWords } from "@/api/helpers";
import ReassignTagForm from "./ReassignTagForm.vue";

@Component({ components: {
  ReassignTagForm
}})
export default class TagOptionForm extends Vue {
  @State("user") user: UserState;
  private items: Array<TagOptionSet> = [];

  private editableSlug = [-1, -1];

  private stats: Map<string, KeyNumValue> = new Map();

  private statsChecked = false;

  private selectedTag: SlugName = Object.assign({}, defaultPairedTag);

  private coreTagSets = [
    'type',
    'quality',
    'end_how',
    'end_who',
    'trait',
  ];

  created() {
    this.sync();
    bus.$on("escape", this.close);
  }

  sync() {
    fetchPairedTagStats().then(data => {
      if (data instanceof Map) {
        this.stats = data;
        this.statsChecked = true;
        this.syncTags();
      }
    });
    
  }

  get hasSelectedTag() {
    return this.selectedTag.slug.length > 1;
  }

  get wrapperClasses() {
    return [this.hasSelectedTag? 'show-editing-overlay' : 'hide-editing-overlay'];
  }

  syncTags() {
    fetchPairedTagOptions().then(rows => {
      if (rows instanceof Array) {
        this.items = rows.filter(row => row instanceof Object).map(row => {
          const { parent, key, options } = row;
          const parentKey = notEmptyString(parent)? parent : this.matchParent(key);
          const opts = options instanceof Array? options.filter(this.filterTagOpt).map(this.mapTagOpt) : [];
          return {...row, options: opts, parent: parentKey };
        });
        this.addTraits();
        setTimeout(this.makeSortable, 750);
      }
    });
  }

  addTraits() {
    const traits = this.stats.get('trait');
    if (traits instanceof Array) {
      const traitSet = { 
        key: "trait",
        name: "Miscellaneous Traits",
        options: traits.filter(row => row instanceof Object).map(row => {
          const {key} = row;
          return {
            slug: key,
            name: toWords(key),
            parents: []
          }
        })
      }
      this.items.push(traitSet);
    }
  }

  setEditableSlug(setIndex = 0, tagIndex = 0) {
    if (!this.mayEditTagSlug(setIndex, tagIndex)) {
      if (setIndex >= 0 && setIndex < this.items.length) {
        const { options } = this.items[setIndex];
        if (options instanceof Array) {
          this.editableSlug = [setIndex, tagIndex];
        }
      }
    } else {
      this.editableSlug = [-1, -1];
    }
  }

  mayEditTagSlug(setIndex = 0, tagIndex = 0) {
    const [si, ti] = this.editableSlug;
    return setIndex === si && tagIndex === ti;
  }

  slugClasses(setIndex = 0, tagIndex = 0) {
    const openClass = this.mayEditTagSlug(setIndex, tagIndex)? 'open' : 'closed';
    return [['row', setIndex].join('-'),['tag', tagIndex].join('-'), openClass];
  }

  mayEditTagParents(row: TagOptionSet, setIndex = 0, tagIndex = 0) {
    return this.rowHasParent(row)? this.mayEditTagSlug(setIndex, tagIndex) : false;
  }

  matchedRowOptions(row: TagOptionSet) {
    let opts = [];
    const optSet = notEmptyString(row.parent)? this.items.find(op => op.key === row.parent) : null;
    if (optSet instanceof Object) {
      const {options} = optSet;
      if (options instanceof Array) {
        opts = options.filter(op => op instanceof Object).map((op, oi) => {
          const { slug } = op;
          const itemKey = [slug, oi].join('-');
          return {...op, itemKey }
        });
      }
    }
    return opts;
  }

  matchedParentSetOpts(row: TagOptionSet) {
    const parents = this.items.filter(item => item.key !== row.key).map((item, ri) => {
      const {key, name} = item;
      const itemKey = ["parent-set", row.key, key, ri].join('-');
      return { key, name, itemKey};
    });
    const first = { key: "", name: "[none]", itemKey: ["parent-set", row.key, "none"].join("-")};
    return [first, ...parents];
  }

  matchParent(key: string) {
    switch (key) {
      case 'end_who':
        return 'end_how';
      default:
        return "";
    }
  }

  matchStat(vocab = "", slug = "") {
    const typeSet = this.stats.get(vocab);
    let num = 0;
    if (typeSet instanceof Array) {
      const stat = typeSet.find(st => st.key === slug);
      if (stat instanceof Object) {
        num = stat.value;
      }
    }
    return num;
  }

  matchStatLabel(vocab = "", slug = "") {
    const num = this.matchStat(vocab, slug);
    const chartWordParts = ["chart"];
    if (num !== 1) {
      chartWordParts.push("s")
    }
    const chartWord = chartWordParts.join("");
    const str = `${num} paired ${chartWord} with this attribute. Click to reassign or remove.`;
    return str;
  }

  enableReassignForm(tagOpt: SlugName, vocab = "") {
    const {slug, name} = tagOpt;
    if (notEmptyString(slug) && notEmptyString(name)) {
      this.selectedTag = {slug, name, vocab};
    }
  }

  setKeyIsDisabled(key = "") {
    return this.coreTagSets.includes(key);
  }

  selectTag(tag: SlugName) {
    this.selectedTag = tag;
  }

  close() {
    this.selectedTag = Object.assign({}, defaultPairedTag);
  }

  makeSortable() {
    const optSetEls = document.querySelectorAll("td.options-column .options");
    if (optSetEls.length > 0) {
      optSetEls.forEach((optEl) => {
        if (optEl instanceof HTMLElement && optEl.classList.contains("sortable") === false) {
          this.addSortableOptSet(optEl);
        }
      });
    }
  }

  addSortableOptSet(optEl: HTMLElement) {
    optEl.classList.add("sortable");
    sortableElement(optEl, ({oldIndex, newIndex}) => {
      const rel = optEl.getAttribute("rel");
      if (notEmptyString(rel, 3) && /-\d+$/.test(rel)) {
        const optSetIndex = parseInt(rel.split('-').pop(), 10);
        if (optSetIndex >= 0 && optSetIndex < this.items.length) {
          const optSet = this.items[optSetIndex];  
          if (optSet instanceof Object) {
            const { options } = optSet;
            if (options instanceof Array) {
              const tagItem = optSet.options.splice(oldIndex, 1)[0];
              optSet.options.splice(newIndex, 0, tagItem);
            }
          }
        }
      }
    });
  }

  checkSlug(setIndex = 0, tagIndex = 0) {
    const tagOpt = this.matchTagOpt(setIndex, tagIndex);
    if (tagOpt instanceof Object) {
      const slugLen = notEmptyString(tagOpt.slug)? tagOpt.slug.length : 0;
      const nameLen = notEmptyString(tagOpt.name)? tagOpt.name.length : 0;
      if (slugLen < 3 && nameLen > 1) {
        tagOpt.slug = sanitize(tagOpt.name, "_", 32);
      }
    }
  }

  checkKey(setIndex = 0) {
    if (setIndex >= 0 && setIndex < this.items.length) {
      const setRow = this.items[setIndex];
      const keyLen = notEmptyString(setRow.key)? setRow.key.length : 0;
      const nameLen = notEmptyString(setRow.name)? setRow.name.length : 0;
      if (keyLen < 3 && nameLen > 1) {
        setRow.key = sanitize(setRow.name, "_", 32);
      }
    }
  }

  handleRemoveTagOpt(setIndex = 0, tagIndex = 0) {
    const tagOpt = this.matchTagOpt(setIndex, tagIndex);
    const hasOpt = tagOpt instanceof Object
    const name = hasOpt? tagOpt.name : "";
    const slug = hasOpt? tagOpt.slug : "";
    if (notEmptyString(name, 1) && notEmptyString(slug)) {
      this.$buefy.dialog.confirm({
        title: "Delete setting",
        message: `Are you sure you want to remove <em>${name}</em>?`,
        confirmText: "Delete",
        type: "is-danger",
        hasIcon: true,
        onConfirm: () => {
          this.removeTagOpt(setIndex, tagIndex);
        },
      });
    } else {
      this.removeTagOpt(setIndex, tagIndex);
    }
  }

  removeTagOpt(setIndex = 0, tagIndex = 0) {
    const tagOpt = this.matchTagOpt(setIndex, tagIndex);
    if (tagOpt instanceof Object) {
      this.items[setIndex].options.splice(tagIndex, 1);
    }
  }

  matchTagOpt(setIndex = 0, tagIndex = 0) {
    if (setIndex >= 0 && setIndex < this.items.length) {
      const {options} = this.items[setIndex];
      if (options instanceof Array) {
        if (tagIndex >= 0 && tagIndex < options.length) {
          return options[tagIndex];
        }
      }
    }
  }

  addTag(setIndex = 0) {
    if (setIndex >= 0 && setIndex < this.items.length) {
      const { options } = this.items[setIndex];
      if (options instanceof Array) {
        const num = options.length;
        options.push({ 
          slug: "_", name: "", parents: []
        });
      }
    }
  }

  addVocab() {
    const newSet = {
      name: "",
      key: "_",
      parent: "",
      options: []
    };
    if (this.items.filter(item => emptyString(item.key,1)).length < 1) {
      this.items.push(newSet);
    }
  }

  tagLabel(tag: SlugName) {
    const parts = [];
    if (tag instanceof Object) {
      const { slug, parents } = tag;
      if (notEmptyString(slug)) {
        parts.push(slug);
      }
      if (parents instanceof Array && parents.length > 0) {
        parts.push(["(", parents.join(", "), ")"].join(""));
      }
    }
    return parts.join(": ");
  }

  rowHasOptions(row: TagOptionSet) {
    const {options} = row;
    return options instanceof Array && options.length > 0;
  }

  rowHasParent(row: TagOptionSet) {
    const { parent } = row;
    return notEmptyString(parent);
  }

  filterTagOpt(item = null) {
    let valid = false;
    if (item instanceof Object) {
      const { slug, name} = item;
      valid = notEmptyString(slug) && notEmptyString(name);
    }
    return valid;
  }

  mapTagOpt(opt: SlugName) {
    const {parents} = opt;
    const parentKeys = parents instanceof Array? parents : [];
    return {...opt, parents: parentKeys };
  }

  mayDelete(setKey = "", slug = "") {
    return this.statsChecked && this.matchStat(setKey, slug) < 1;
  }

  tagSlugIsDisabled(setKey = "", slug = "") {
    return this.mayDelete(setKey, slug) === false;
  }

  submit() {
    const items = this.items.filter(item => item instanceof Object).filter(item => item.key !== "trait").map(item => {
      const {options} = item;
      const opts = options instanceof Array ? options.filter(this.filterTagOpt).map(this.mapTagOpt) : [];
      return {...item, options: opts};
    });
    saveSetting("paired_vocabs", this.user._id, items).then(data => {
      if (data instanceof Object) {
        const { setting } = data;
        if (setting instanceof Object) {
          const {value} = setting;
          if (value instanceof Array) {
            this.$ls.set('paired-tag-options', value);
            bus.$emit("toast", { message: "Paired tag options saved"});
          }
        }
      }
    })
  }

}
</script>
