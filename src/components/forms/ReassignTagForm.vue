<template>
  <fieldset class="edit-form tag-option-list">
    <h4><strong>{{sourceTag.name}}</strong> in <em>{{vocabName}}</em></h4>
    <p class="usage">{{countMessage}}</p>
    <b-field class="row horizontal" label="Target tag">
      <b-autocomplete :data="filteredTags" field="name" @typing="filterTags" @select="selectTarget" placeholder="Target tag" class="target-tag long" />
    </b-field>
    <b-field class="row horizontal" label="Add to notes">
      <b-switch v-model="appendToNotes">Remove and append text to notes.</b-switch>
    </b-field>
    <b-field class="row horizontal year-span" label="Duration">
      <b-switch v-model="setYearSpan">Set default year span (if not already set)</b-switch>
      <b-input v-if="setYearSpan" type="number" v-model="years" :step="0.25" placeholder="> 0" class="years" />
    </b-field>
    <b-field class="row actions">
      <b-button type="is-success" @click="submit" size="is-medium" icon-left="content-save-outline">Reassign</b-button>
      <b-button type="is-danger" @click="remove" size="is-medium" icon-left="delete-variant">Remove</b-button>
    </b-field>
  </fieldset>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { reassignTags } from "../../api/methods";
import { Component, Prop, Vue } from "vue-property-decorator";
import { UserState } from "../../store/types";
import { defaultPairedTag, KeyName, SlugName, TagOptionSet } from "@/api/interfaces";
import { notEmptyString } from "@/api/validators";
import { bus } from "@/main";
import { smartCastInt } from "@/api/converters";

@Component
export default class ReassignTagForm extends Vue {
  @State("user") user: UserState;
  @Prop({ default: Object.assign({}, defaultPairedTag) }) sourceTag: SlugName;
  @Prop({ default: [] }) tagOptionSets: TagOptionSet[];
  @Prop({ default: 0 }) count: number;
  private targetKey = "";
  private filteredTags: KeyName[] = [];
  private setYearSpan = false;
  private years = 0;
  private appendToNotes = false;


  get tagList() {
    const keyNames: KeyName[] = [];
    this.tagOptionSets.forEach(optSet => {
      const {key, name, options} = optSet;
      if (options instanceof Array) {
        options.forEach(opt => {
          const optKey = [key, opt.slug].join("--");
          if (notEmptyString(opt.slug, 1) && notEmptyString(opt.name)) {
            const optName = [name, opt.name].join(": ");
            keyNames.push({ key: optKey, name: optName });
          }
        })
      }
    });
    return keyNames;
  }

  get vocabName() {
    const {vocab} = this.sourceTag;
    let str = "";
    if (notEmptyString(vocab)) {
      const optSet = this.tagOptionSets.find(os => os.key === vocab);
      str = optSet instanceof Object? optSet.name : vocab;
    }
    return str;
  }

  get countMessage() {
    const suffix = this.count === 1 ? "" : "s";
    return `Occurs in ${this.count} paired chart${suffix}`;
  }

  filterTags(text = "") {
    const rgx = new RegExp("\\b" + text , "i");
    this.filteredTags = this.tagList.filter(item => {
      const tagName = item.name.split(":").pop().trim();
      const slugKey = item.key.split("--").pop();
      return rgx.test(slugKey) || rgx.test(tagName);
    });
  }

  selectTarget(item: KeyName) {
    this.targetKey = item.key;
  }

  submit() {
    const targetKeyName = this.tagList.find(tg => tg.key === this.targetKey);
    let targetTag = null;
    if (targetKeyName instanceof Object) {
      const { key, name } = targetKeyName;
      const [vocab, slug] = key.split("--");
      targetTag = { slug, name, vocab };
    }
    const years = this.setYearSpan && this.years > 0? smartCastInt(this.years) : -1;
    reassignTags(this.sourceTag, targetTag, years, this.appendToNotes).then(this.handleReassignement)
  }

  remove() {
    reassignTags(this.sourceTag, null, -1, false, true).then(this.handleReassignement)
  }

  handleReassignement(data, mode = "reassign") {
    if (data instanceof Object) {
      const {ids, source, target, notes, years, valid} = data;
      if (ids instanceof Array && valid && source instanceof Object) {
        const num = data.length;
        const suffix = num === 1 ? "" : "s";
        const action = mode === "remove"? "removed" : "reassigned";
        const parts = [`${source.name} ${action}`];
        if (target instanceof Object) {
          if (notEmptyString(target.name)) {
            parts.push(`to ${target.name}`);
          }
        }
        if (notes) {
          parts.push(`and appended to the notes.`);
        }
        if (years > 0) {
          parts.push(`and year span set to ${years} by default.`);
        }
        parts.push(`\n${num} paired chart${suffix} updated`);
        const message = parts.join(" ");
        bus.$emit("toast", { message});
        this.removeTag(source);
      }
    }
  }

  removeTag(source: SlugName) {
    const optSet = this.tagOptionSets.find(os => os.key === source.vocab);
    if (optSet instanceof Object) {
      const index = optSet.options.findIndex(tg => tg.slug === source.slug);
      if (index >= 0) {
        optSet.options.splice(index, 1);
        //bus.$emit("escape", true);
      }
    }
  }

  handleRemoval(data) {
    return this.handleReassignement(data, "remove");
  }

}
</script>
