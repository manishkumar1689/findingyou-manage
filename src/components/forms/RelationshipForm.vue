<template>
  <fragment>
    <form class="relations edit-form collapsible" :class="wrapperClasses">
      <h3 class="form-title" @click="toggleCollapse">
        <template v-if="tooltip">
          <b-tooltip :label="pairInfo1" :multilined="true" @click.native="openSingle(1)">{{ label1 }}</b-tooltip>
          {{labelSeparator}}
          <b-tooltip v-if="hasSecondChart" :label="pairInfo2" :multilined="true" @click.native="openSingle(2)">{{ label2 }}</b-tooltip>
        </template>
        <span class="text" v-else>{{ label }}</span>
      </h3>
      <fieldset v-if="initialised" class="inner">
        <b-field class="horizontal full" label="Relationship" @mouseleave.native="checkChanged">
          <b-icon icon="refresh" @click.native="refreshTypes" class="refresh-types" />
          <b-taginput
            v-model="types"
            :autocomplete="true"
            :allow-new="false"
            placeholder="Tag(s)"
            :data="filteredTypes"
            field="name"
            @typing="getFilteredTypes"
          />
        </b-field>
        <b-field
          class="horizontal twin"
          label="Year span"
          title="e.g. 1991 and 2001 or 1994/06 and 1995/09"
          @mouseleave.native="checkChanged"
        >
          <b-input
            type="text"
            class="start year"
            v-model="startDate"
            :pattern="flexiYearPattern"
          />
          <span class="range-separator">to</span>
          <b-input
            type="text"
            class="end year"
            v-model="endDate"
            :pattern="flexiYearPattern"
          />
        </b-field>
        <b-field class="horizontal full" label="Duration" @mouseleave.native="checkChanged">
          <b-input
            type="text"
            class="duration year"
            v-model="duration"
            :pattern="durationPattern"
          />
        </b-field>
        <b-field class="horizontal full quality" label="Quality" @mouseleave.native="checkChanged">
          <b-taginput
            v-model="quality"
            :autocomplete="true"
            :allow-new="false"
            placeholder="Tag(s)"
            :data="filteredQualityTags"
            field="name"
            @typing="getFilteredQualityTags"
          />
        </b-field>
        <b-field
          class="horizontal full"
          label="How did it end?"
          @mouseleave.native="checkChanged"
        >
          <b-select
            class="dropdown"
            v-model="endHow"
          >
            <option
              v-for="(opt, oi) in endHowOptions"
              :value="opt.slug"
              :key="['end-how', opt.slug, oi].join('-')"
              >{{ opt.name }}</option
            >
          </b-select>
        </b-field>
         <b-field
          class="horizontal full"
          label="Who ended it?"
          @mouseleave.native="checkChanged"
        >
          <b-select
            class="dropdown"
            v-model="endWho"
          >
            <option
              v-for="(opt, oi) in endWhoOptions"
              :value="opt.slug"
              :key="['end-who', opt.slug, oi].join('-')"
              >{{ opt.name }}</option
            >
          </b-select>
        </b-field>
        <b-field  class="horizontal full" label="Other traits">
          <b-taginput
            v-model="selectedTraitTags"
            :autocomplete="true"
            :allow-new="true"
            placeholder="Tag(s)"
            :data="filteredTraitTags"
            field="name"
            @typing="getFilteredTraits"
            @add="addTrait"
          />
        </b-field>
        <b-field  v-if="showNotes" class="horizontal full" label="Notes">
          <b-input
            v-model="notes"
            placeholder="Enter notes"
            type="text"
            cols="40"
            rows="3"
          />
        </b-field>
      </fieldset>
    </form>
    <slot v-if="initialised"></slot>
  </fragment>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { notEmptyString } from "../../api/validators";
import { bus } from "../../main";
import { FilterSet } from "../../api/composables/FilterSet";
import { Chart, PairedChart } from "../../api/models/Chart";
import {
  doubleYearToDateParts,
  matchYearDouble,
  parseStringDuration,
  sanitize,
  smartCastFloat,
  toStringDuration,
} from "@/api/converters";
import { fetchPairedTagOptions, fetchTraitTags } from "@/api/methods";
import { SlugName } from "@/api/interfaces";

@Component({
  filters: FilterSet,
})
export default class RelationshipForm extends Vue {
  @Prop({ default: () => new PairedChart() }) paired: PairedChart;
  @Prop({ default: "Categories" }) label: string;
  @Prop({ default: true}) autosubmit: boolean;
  @Prop({ default: false}) showNotes: boolean;
  @Prop({ default: false}) tooltip: boolean;

  /* startYear = 0; //approx. start year, fractions for approx. month where known, will be added to start year as a dec. fraction
  startYearMonth = -1; // approx. month where known
  span = 0; // approx. duration in years, fractions for approx. months where known
  spanMonths = -1; // approx. months where known, will be added to span year as a dec. fraction */
  types: SlugName[] = [];
  filteredTypes: SlugName[] = [];
  tags: SlugName[] = []; // set of tags saved with a paired chart
  tagOptions = [];
  quality: SlugName[] = [];
  endHow = '';
  endWho = '';
  initialised = false;
  flexiYearPattern =
    "([1-2][0-9][0-9][0-9])([/.-][0-1]?[0-9])?([/.-][1-3]?[0-9])?";
  durationPattern = "[0-9]+\\.?[0-9]* *(years?|months?|m|y|weeks?|w)? *([0-9]+\\.?[0-9]* *(months?|m)? *)?";
  startDate = ""; // interpreted and converted to year as double
  endDate = ""; // interpreted and converted to year as double
  duration = ""; // interpreted and converted to years as double
  notes = "";
  expanded = true;
  traitTags: SlugName[] = [];
  filteredQualityTags: SlugName[] = [];
  filteredTraitTags: SlugName[] = [];
  selectedTraitTags: SlugName[] = [];
  private qualityChanged = false;
  private otherTagsValuesChanged = false;

  created() {
    setTimeout(this.sync, 500);
    bus.$on("refresh-paired-chart", (paired) => {
      if (paired instanceof Object) {
        const { _id } = paired;
        if (notEmptyString(_id) && _id !== this.paired._id) {
          this.initialised = false;
          this.sync();
        }
        this.paired = paired;
      }
    });
    bus.$on("save-paired-form", () => {
      this.saveSettings();
    });
  }

  syncPaired() {
    if (this.paired instanceof PairedChart) {
      this.startDate = "";
      this.endDate = "";
      const firstTypeOpt = this.paired.primaryRelationship;
      this.types = this.paired.relationshipTags;
      const startYear = smartCastFloat(this.paired.startYear);
      const knownEndYear = smartCastFloat(this.paired.endYear);
      const hasEndYear = knownEndYear > startYear && knownEndYear > 0;
      const endYear = hasEndYear
        ? knownEndYear
        : this.paired.startYear + this.paired.span;

      const startParts = doubleYearToDateParts(startYear);
      const endParts = doubleYearToDateParts(endYear);

      this.startDate = startYear > 100 ? startParts.display : "";
      this.endDate = endYear > startYear ? endParts.display : "";

      this.duration = toStringDuration(this.paired.span);
      this.quality = this.paired.qualityTags;
      this.endHow = this.paired.endHow;
      this.endWho = this.paired.endWho;
      this.selectedTraitTags = this.paired.traits;
      this.notes = this.paired.notes;
      setTimeout(() => {
        this.initialised = true;
      }, 2000);
    }
  }

  sync(syncPaired = true) {
    fetchPairedTagOptions().then(rows => {
      if (rows instanceof Array) {
        this.tagOptions = rows;
        if (syncPaired) {
          this.syncPaired();
        }
        fetchTraitTags().then(tags => {
          if (tags instanceof Array) {
            this.traitTags = tags;
          }
        });
      }
    })
  }

  refreshTypes() {
    this.sync(false);
  }

  attributeTagOpts(key = "") {
    let opts = [];
    const optSet = this.tagOptions.find(os => os.key === key);
    if (optSet instanceof Object) {
      const {options} = optSet;
      if (options instanceof Array) {
        opts = options.filter(os => os instanceof Object);
      }
    }
    return opts;
  }

  attributeOptions(key = "") {
    return this.attributeTagOpts(key).map(opt => {
      const {slug, name} = opt;
      return {
        slug,
        name
      }
    });
  }

  get relationshipOptions() {
    return this.attributeOptions("type");
  }

  getFilteredTypes(text = "") {
    const rgx = new RegExp('\\b' + text, 'i');
    this.filteredTypes = this.relationshipOptions.filter(tg => rgx.test(tg.slug) || rgx.test(tg.name));
  }

  getFilteredQualityTags(text = "") {
    const rgx = new RegExp('\\b' + text, 'i');
    this.filteredQualityTags = this.qualityTagOptions.filter(tg => rgx.test(tg.slug) || rgx.test(tg.name));
  }

   getFilteredTraits(text = "") {
    const rgx = new RegExp('\\b' + text, 'i');
    this.filteredTraitTags = this.traitTags.filter(tg => rgx.test(tg.slug) || rgx.test(tg.name));
  }

  addTrait(name = "") {
    if (notEmptyString(name, 2)) {
      this.selectedTraitTags = this.selectedTraitTags.filter(tg => tg instanceof Object);
      const slug = sanitize(name, "_");
      if (this.selectedTraitTags.filter(tg => tg.slug === slug).length < 1) {
        this.selectedTraitTags.push({
          slug,
          name,
          vocab: "trait"
        });
      }
    }
    
  }

  get firstTypeKey() {
    const relTag = this.types.find(tg => notEmptyString(tg.slug));
    if (relTag instanceof Object) {
      return relTag.slug;
    }
    return this.paired.relType;
  }

  get endHowOptions() {
    return this.attributeOptions("end_how");
  }

  get endWhoOptions() {
    const opts = this.attributeTagOpts("end_who");
    return opts.filter(opt => {
      let valid = false;
      const { parents } = opt;
      if (parents instanceof Array) {
        valid = parents.includes(this.endHow);
      }
      return valid;
    }).map(op => {
      const { slug, name } = op;
      return {
        slug,
        name,
      }
    })
  }

  get qualityTagOptions() {
    return this.attributeOptions("quality");
  }

  pairInfo(num = 1) {
    let str = "";
    if (this.paired instanceof PairedChart) {
      const refChart = num === 1? this.paired.c1 : this.paired.c2;
      if (refChart instanceof Chart && refChart.hasName) {
        str = refChart.info;
      }
    }
    return str;
  }

  get pairInfo1() {
    return this.pairInfo(1);
  }

  get pairInfo2() {
    return this.pairInfo(2);
  }

  get label1() {
    return this.label.split('&').shift().trim();
  }

  get label2() {
    const parts = this.label.split('&')
    return parts.length > 1? parts.pop().trim() : "[unknown]";
  }

  get labelSeparator() {
    return this.hasFirstChart? " & " : "";
  }

  get hasFirstChart() {
    return this.paired.c1 instanceof Chart && this.paired.c1.hasName;
  }

  get hasSecondChart() {
    return this.paired.c2 instanceof Chart && this.paired.c2.hasName;
  }

  getYear(key = "c1") {
    let y = 0;
    if (this.initialised) {
      switch (key) {
        case "c1":
        case "c2":
          y = this.paired[key].year;
          break;
      }
    }
    return y;
  }

  get minYear() {
    let my = 0;
    if (this.initialised) {
      const y1 = this.getYear("c1");
      const y2 = this.getYear();
      my = Math.max(...[y1, y2]);
    }
    return my;
  }

  get monthOpts() {
    return this.buildMonthOpts("year");
  }

  get monthSpanOpts() {
    return this.buildMonthOpts("span");
  }

  get wrapperClasses() {
    const openCls = this.expanded? 'open' : 'closed';
    const initCls = this.initialised? 'loaded' : 'loading';
    return [openCls, initCls];
  }

  get hasRelType() {
    return this.types.length > 0;
  }

  calcStartEndYear() {
    const startYear = matchYearDouble(this.startDate);
    const endYear = matchYearDouble(this.endDate)
    return { startYear, endYear };
  }

  saveSettings() {
    const { startYear, endYear } = this.calcStartEndYear();
    const duration = parseStringDuration(this.duration);
    const span = duration > 0 ? duration : -1;
    const relType = this.types.length > 0? this.types[0].slug : "";
    const mayAddNew = notEmptyString(relType, 2);
    const tags = this.types.filter(op => op instanceof Object).map(op => {
      return { ...op, vocab: "type" };
    });
    this.quality.forEach((opt) => {
      const {slug, name} = opt;
      const slugStr = notEmptyString(slug, 1)? slug : sanitize(name, "_");
      tags.push({ slug: slugStr, name, vocab: "quality" });
    });
    const endHow = this.endHowOptions.find(opt => opt.slug === this.endHow);
    const endWho = this.endWhoOptions.find(opt => opt.slug === this.endWho);
    if (endHow instanceof Object) {
      tags.push({...endHow, vocab: 'end_how'});
    }
    if (endWho instanceof Object) {
      tags.push({...endWho, vocab: 'end_who'});
    }
    if (this.selectedTraitTags.length > 0) {
      this.selectedTraitTags.forEach(tg => {
        if (tg instanceof Object) {
          const { slug, name } = tg;
          tags.push({slug, name, vocab: "trait"});
        }
      })
    }
    const { _id, c1, c2 } = this.paired;
    const maySave = mayAddNew;
    if (maySave) {
      bus.$emit("edited-paired-settings", {
        _id,
        c1: c1._id,
        c2: c2._id,
        startYear,
        endYear,
        span,
        relType,
        tags,
        notes: this.notes
      });
      this.qualityChanged = false;
    }
  }

  buildMonthOpts(mode = "span") {
    const name = mode === "span" ? "[months]" : "[month]";
    const opts = [{ num: -1, name }];
    const max = mode === "span" ? 11 : 12;
    const min = mode === "span" ? 0 : 1;
    for (let n = min; n <= max; n++) {
      opts.push({ num: n, name: n.toString() });
    }
    return opts;
  }

  trackChanged() {
    this.detectChanges(false);
  }

  checkChanged() {
    this.detectChanges(true);
  }

  detectChanges(submit = true) {
    let same = true;
    if (this.initialised && this.autosubmit) {
      same  = !this.qualityChanged && !this.otherTagsValuesChanged;
      if (same) {
        const startYear = matchYearDouble(this.startDate);
        const endYear = matchYearDouble(this.endDate);
        const duration = parseStringDuration(this.duration);
        const currentRelId = this.types.map(tg => tg.slug).join("__");
        const span = duration > 0 ? duration : -1;
        if (currentRelId !== this.paired.relIdString) {
          same = false;
        } else if (startYear !== this.paired.startYear && startYear > 0) {
          same = false;
        } else if (endYear !== this.paired.endYear && endYear > startYear) {
          same = false;
        } else if (this.firstTypeKey !== this.paired.relType && this.hasRelType) {
          same = false;
        } else if (span !== this.paired.span && span >= 0) {
          same = false;
        }
      }
    }
    if (submit && !same && this.initialised && this.hasRelType) {
      this.saveSettings();
    }
    return same;
  }

  toggleCollapse() {
    this.expanded = this.autosubmit? !this.expanded : true;
  }

  openSingle(num = 1) {
    const refChart = num === 1 ? this.paired.c1 : this.paired.c2;
    if (refChart instanceof Chart) {
      bus.$emit("load-chart-form", refChart);
    }
  }

  @Watch("quality")
  changeQuality() {
    if (this.initialised) {
      this.qualityChanged = true;
    }
  }

  @Watch("endHow")
  changeEndHow() {
    if (this.initialised) {
      this.otherTagsValuesChanged = true;
    }
  }

  @Watch("endWho")
  changeEndWho() {
    if (this.initialised) {
      this.otherTagsValuesChanged = true;
    }
  }

  @Watch("selectedTraitTags")
  changeSelectedTraitTags() {
    if (this.initialised) {
      this.otherTagsValuesChanged = true;
    }
  }

  @Watch("endDate")
  changeEndDate(newVal) {
    if (/\d/.test(newVal)) {
      const { startYear, endYear } = this.calcStartEndYear();
      const span = endYear > startYear ? endYear - startYear : -1;
      if (span > 0) {
        this.duration = toStringDuration(span);
      }
    }
  }
}
</script>
