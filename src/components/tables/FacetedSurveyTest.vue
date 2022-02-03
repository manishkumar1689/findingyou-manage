<script lang="ts">
import { Component, Prop,Vue, Watch } from "vue-property-decorator";
import { decPlaces } from "@/api/converters";
import { testFacetedSurveyAnswers } from "@/api/methods";
import { bus } from "@/main";
import { KeyNumber, PreferenceOption } from "../../api/interfaces";
import { notEmptyString } from "@/api/validators";

@Component({
  components: {
  },
  filters: {},
})
export default class FacetedSurveyTest extends Vue {
  @Prop({ default: () => [] }) readonly preferenceOptions: Array<
    PreferenceOption
  >;
  @Prop({ default: () => [] }) readonly promptOptions: Array<any>;

  private answers: Array<KeyNumber> = [];

  private surveyType = 'faceted';

  private options: Array<KeyNumber> = [];

  private prefOpts: Array<PreferenceOption> = [];

  private analysisRows = [];

  private showAnalysis = false;

  created() {
    bus.$on('resync-preferences', () => {
      setTimeout(this.sync, 250);
    })
    bus.$on('escape',this.close);
  }

  mounted() {
    const sk = this.$ls.get('survey-type');
    if (notEmptyString(sk)) {
      this.surveyType = sk;
    }
    setTimeout(this.sync, 1000);
  }

  sync() {
    if (this.preferenceOptions instanceof Array) {
      //const optionText = this.promptOptions.map(sn => sn.values[0].text).join(', ');
      this.prefOpts = this.preferenceOptions.filter(po => po instanceof Object && Object.keys(po).includes('domain')).map((po) => {
        const { key, prompt, type, domain, subdomain, inverted } = po;
        return {
          key,
          prompt,
          type,
          domain,
          subdomain,
          inverted,
        };
      });
      const storedResponses = this.$ls.get(this.reponseCacheKey);
      const responses = storedResponses instanceof Array && storedResponses.length > 0? storedResponses : [];
      this.answers = this.prefOpts.map((pref, index) => {
        const { key } = pref;
        const response = responses.find(rs => rs.key === key);
        const value = response instanceof Object? response.value : 0;
        const num = value.toString();
        const format = [key, num, index].join('-');
        return { key, value, num, format }
      })
      const options = this.promptOptions.map((sn, si) => {
        const value = si + 1;
        const key = value.toString();
        const label = sn.values[0].text
        const num = value.toString()
        return { key, value, num, label }
      })
      this.options = [{ key: "0", num: "0", label: "---", value: 0}, ...options];
      const storedAnalysis = this.$ls.get(this.cacheKey);
      if (storedAnalysis instanceof Array && storedAnalysis.length > 0) {
        this.analysisRows = storedAnalysis;
      }
    }
  }

  hasFeedback2(row = null) {
    return row instanceof Object && Object.keys(row).includes("feedback2")
  }

  matchAnalsysFeedback(row = null, num = 1) {
    let str = '';
    if (row instanceof Object) {
      const suffix = num > 1 ? num.toString() : '';
      const fbKey = `feedback${suffix}`;
      const fb = row[fbKey];
      if (fb instanceof Array) {
        const item = fb.find(tr => tr.lang === 'en');
        if (item instanceof Object) {
          str = item.text;
        }
      }
    }
    return str;
  }

  get hasItems() {
    return this.prefOpts.length > 0;
  }

  get hasAnalysis() {
    return this.analysisRows.length > 3;
  }

  get isJungian() {
    return this.surveyType === 'jungian';
  }

  get jungianLetters() {
    if (this.isJungian && this.hasAnalysis) {
      return this.analysisRows.map(row => row.type).join('');
    } else {
      return '';
    }
  }

  get domainLabel() {
    return this.isJungian ? 'Polarity' : 'Domain';
  }

  get subdomainLabel() {
    return this.isJungian ? 'Sequence' : 'Facet';
  }

  get numAnswers() {
    return this.answers.length;
  }

  get overlayClasses() {
    const cls = [];
    if (this.showAnalysis) {
      cls.push('show');
    }
    return cls;
  }

  get cacheKey() {
    const cKeyPrefix = this.surveyType === 'jungian' ? 'jungian' : 'big5'
    return [cKeyPrefix, 'analysis'].join('-');
  }

  get reponseCacheKey() {
    const cKeyPrefix = this.surveyType === 'jungian' ? 'jungian' : 'big5'
    return [cKeyPrefix, 'responses'].join('-');
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["prompt-row", index].join("-")];
  }

  randomise() {
    this.analysisRows = [];
    this.answers = this.answers.map(ans => {
      const randInt = Math.floor(Math.random() * 5 * 0.999999) + 1;
      return { ...ans, value: randInt, num: randInt.toString() };
    })
  }

  submit() {
    const responses = this.answers.map(ans => {
      const { key, num } = ans;
      return { key, value: parseInt(num, 10) };
    }).filter(item => item.value > 0);
    if (responses.length > 0 && responses.length === this.numAnswers) {
      this.analysisRows = [];
      this.$ls.set(this.reponseCacheKey, responses);
      testFacetedSurveyAnswers(this.surveyType, responses).then(result => {
        if (result.valid) {
          if (result.analysis instanceof Object) {
            this.analysisRows = Object.entries(result.analysis).map(([key, row]) => {
              const entries = row instanceof Object ? Object.entries(row) : [];
              const rowMap = new Map(entries)
              if (row instanceof Object && rowMap.has('facets')) {
                const facets = rowMap.get('facets');
                if (facets instanceof Array) {
                  const facetRows = facets.map(fc => {
                  if (fc instanceof Object) {
                      return {
                        key: fc.num.toString(),
                        num: parseInt(fc.num, 10),
                        ...fc
                      }
                    }
                  });
                  return {
                    key,
                    ...row,
                    facets: facetRows,
                    valid: facetRows.length > 0,
                    hasSubdomains: true
                  }
                }
              } else if (row instanceof Object && rowMap.has('subtotal') && rowMap.has('result')) {
                const result = rowMap.get('result');
                const [letter, rangeType, percStr] = result.split('_');
                const polarity = parseFloat(percStr);
                const mediumKey = rangeType === 'mid' ? 'medium' : 'high';
                return {
                  key,
                  ...row,
                  result: [letter, mediumKey, polarity + '%'].join(' '),
                  polarity,
                  rangeType,
                  type: letter,
                  valid: !isNaN(polarity),
                  hasSubdomains: false
                }
              }
              return { valid: false }
            });
            this.$ls.set(this.cacheKey, this.analysisRows);
            this.showAnalysis = true;
          }
        }
      })
    }
    
  }

  formatScore(row = null) {
    let str = '';
    if (row instanceof Object) {
      const { score, count } = row;
      const max = count * 5;
      str = [score, max].join(' / ');
    }
    return str;
  }

  formatPc(pc = 0) {
    return decPlaces(pc, 2);
  }

  close() {
    this.showAnalysis = false;
  }

  @Watch('surveyType')
  changeSurveyType(newVal) {
    this.$ls.set('survey-type', newVal);
    const sk = newVal === 'jungian' ? 'jungian_options' : 'faceted_personality_options';
    bus.$emit('survey-key', sk);
  }
  
}
</script>
<template>
  <div class="survey-test-wrapper">
    <nav class="row horizontal">
      <b-radio-button v-model="surveyType" native-value="faceted">Big 5</b-radio-button>
      <b-radio-button v-model="surveyType" native-value="jungian">Jungian</b-radio-button>
    </nav>
    <b-table
      v-if="hasItems"
      :data="prefOpts"
      :row-class="(row, index) => assignRowClasses(index)"
      :sticky-header="true"
    >
      <template slot-scope="props">
        <b-table-column
          class="prompt"
          field="prompt"
          label="Prompt"
          >{{ props.row.prompt }}</b-table-column
        >
        <b-table-column
          class="domain"
          field="domain"
          :label="domainLabel"
          >
          {{ props.row.domain }}
          
          </b-table-column>
        <b-table-column
          class="subdomain"
          field="domain"
          :label="subdomainLabel"
          >
          {{ props.row.subdomain }}
          </b-table-column>
          <b-table-column
          class="value value-1"
          field="domain"
          label="Value"
          >
          <b-select v-model="answers[props.index].num">
            <option v-for="(opt, oi) in options" :key="[opt.format, oi, props.index].join('-')" :value="opt.num">
              {{opt.label}}
            </option>
          </b-select>
          </b-table-column>
      </template>
    </b-table>
    <div class="actions">
      <b-button @click="randomise" type="is-info">Randomise</b-button>
      <b-button @click="submit" type="is-success">Check</b-button>
    </div>
    <div v-if="hasAnalysis" class="analysis" :class="overlayClasses">
      <b-icon icon="close" class="close" @click.native="close" />
      <h3 v-if="isJungian"><em class="type-key">Type</em><span class="value">{{jungianLetters}}</span></h3>
      <ul class="analysis-grid">
        <li v-for="(row, ri) in analysisRows" :key="['row', row.key, ri].join('-')">
          <h4>
            <strong class="text-label">{{row.title}}</strong>
            <span class="value score" :class="row.result">{{formatScore(row)}}</span>
            <span class="value percent">{{formatPc(row.pc)}}</span>
            <span class="value text">{{row.result}}</span>
          </h4>
          <p v-html="matchAnalsysFeedback(row)"></p>
          <p v-if="hasFeedback2(row)" v-html="matchAnalsysFeedback(row, 2)"></p>
          <ol v-if="row.hasSubdomains" class="facets">
            <li v-for="(fc, fi) in row.facets" :key="['row', row.key, ri, fc.num, fi].join('-')">
              <strong class="text-label">{{fc.title}}</strong>
              <span class="value score">{{formatScore(fc)}}</span>
              <span class="value percent">{{formatPc(fc.pc)}}</span>
              <span class="value result">{{fc.result}}</span>
              <p v-html="matchAnalsysFeedback(fc)"></p>
          </li>
          </ol>
        </li>
      </ul>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "@/styles/variables.scss";
.analysis-grid {
  display: flex;
  flex-flow: column nowrap;
  ol {
    margin-left: 2em;
  }
  li {
    > strong,
    > span {
      display: inline-block;
    }
  }
  li strong {
    &::after {
      content: ":";
    }
  }
  .percent {
    &::after {
      content: '%';
    }
  }
  .score {
    color: $green-label;
  }
  > li {
    > strong {
      margin-right: 1em;
    }
    > span {
      margin-right: 0.5em;
    }
    ol li {
      margin-right: 2em;
      strong {
        margin-right: 0.25em;
      }
    }
  }
}

.analysis {
  padding: 1em;
  background-color:white;
  border: solid 1px $light-grey;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: 5%;
  left: 12.25%;
  right: 12.25%;
  &.show {
    opacity: 1;
    pointer-events: all;
    z-index: 50;
  }
  .close {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
  }
  .score {
    &.low {
      color: $red-label;
    }
    &.neutral {
      color: $dark-grey;
    }

    &.high {
      color: $green-label;
    }
  }
  .type-key {
    position: relative;
    display: inline-block;
    margin-right: 0.75em;
    &::after {
      content: ":";
    }
  }
}



</style>