<template>
  <div class="survey-wrapper" :class="wrapperClasses">
    <form class="edit-form pref-opts-form">
      <b-field class="title" label="Title">
        <b-input
          type="text"
          class="key"
          maxlength="48"
          size="24"
          v-model="surveyName"
          :has-counter="false"
        />
      </b-field>
      <b-field class="multiscales" label="Type / Scales">
        <b-select v-model="surveyType">
          <option
            v-for="(opt, ri) in surveyTypes"
            :value="opt.key"
            :key="['survey-type', opt.key, ri].join('-')"
          >
            {{ opt.name }}
          </option>
        </b-select>
        <b-select v-if="showMultiscale" v-model="multiscales">
          <option
            v-for="(opt, ri) in multipleKeyScaleList"
            :value="opt.key"
            :key="['multiscales', opt.key, ri].join('-')"
          >
            {{ opt.name }}
          </option>
        </b-select>
        <b-switch v-model="surveyEnabled">enabled</b-switch>
      </b-field>
      <div class="questions">
        <fieldset
          class="question"
          v-for="(prefOpt, ri) in editedPrefOpts"
          :key="[prefOpt, ri].join('-')"
          :class="expandClasses(ri)"
        >
          <div class="handle item-control" title="Drag to re-sort">
            <b-icon icon="cursor-move" />
          </div>
          <div
            class="expand item-control"
            @click="toggleExpandIndex(ri)"
            :title="expandHint(ri)"
          >
            <b-icon :icon="expandIcon(ri)" />
          </div>
          <div
            class="translate item-control"
            @click="toggleTranslate(ri)"
            :title="translateHint(ri)"
          >
            <b-icon icon="translate" />
          </div>
          <em class="question-type">{{ matchType(editedPrefOpts[ri]) }}</em>
          <b-field label="Prompt">
            <b-input
              type="textarea"
              minlength="3"
              maxlength="512"
              :rows="2"
              placeholder="Question / prompt"
              v-model="editedPrefOpts[ri].prompt"
              @keyup.native="updateKey(editedPrefOpts[ri])"
            ></b-input>
          </b-field>
          <b-field class="key-field when-expanded" label="Key">
            <b-input
              type="text"
              class="key"
              maxlength="48"
              size="16"
              v-model="editedPrefOpts[ri].key"
              :has-counter="false"
            />
          </b-field>
          <b-field label="Type" class="type when-expanded">
            <b-select
              v-if="types.length > 0"
              v-model="editedPrefOpts[ri].type"
              @change.native="updateRuleOpts(prefOpt)"
            >
              <option
                v-for="opt in questionTypes"
                :value="opt.key"
                :key="[opt.key, ri].join('-')"
              >
                {{ opt.name }}
              </option>
            </b-select>
          </b-field>
          <b-field
            v-if="showOptions(prefOpt)"
            label="Options"
            class="options when-expanded"
             :class="prefOptsClasses(prefOpt)"
          >
            <b-field
              v-if="editedPrefOpts[ri].options.length > 0"
              class="vertical"
            >
              <template v-if="prefOpt.type === 'key_scale'">
                <div
                  class="horizontal key-scale-group"
                  v-for="(opt, oi) in editedPrefOpts[ri].options"
                  :key="['option', ri, oi].join('-')"
                  pattern="[a-z0-9_]+"
                >
                  <b-input
                    v-model="editedPrefOpts[ri].options[oi].key"
                    :has-counter="false"
                    :title="
                      extractFirstVersionText(editedPrefOpts[ri], opt.key)
                    "
                    max="100"
                  ></b-input>
                  <b-input
                    type="number"
                    v-model="editedPrefOpts[ri].options[oi].value"
                    size="2"
                    min="0"
                    :has-counter="false"
                  ></b-input>
                </div>
              </template>
              <template v-if="prefOpt.type === 'multiple_key_scale'">
                <div
                  class="horizontal key-scale-group"
                  v-for="(opt, oi) in editedPrefOpts[ri].options"
                  :key="['multi-option', ri, oi].join('-')"
                >
                  <b-input
                    v-model="editedPrefOpts[ri].options[oi].key"
                    :has-counter="false"
                    pattern="[a-z0-9_]+"
                    :disabled="hasOptionKeyIndex(opt.key)"
                    maxlength="48"
                    :title="
                      extractFirstVersionText(editedPrefOpts[ri], opt.key)
                    "
                  ></b-input>
                  <p v-if="hasOptionKeyIndex(opt.key)">{{extractFirstVersionText(editedPrefOpts[ri], opt.key)}}</p>
                  <div class="vertical">
                    <b-field
                      v-for="(subOpt, subOptIndex) in editedPrefOpts[ri]
                        .options[oi].valueOpts"
                      :key="['sub', ri, oi, subOptIndex].join('-')"
                      :label="subOpt.name"
                      class="multi-option-group horizontal"
                    >
                      <b-select
                        v-if="types.length > 0"
                        v-model="
                          editedPrefOpts[ri].options[oi].valueOpts[subOptIndex]
                            .value
                        "
                      >
                        <option
                          v-for="(opt, soi) in matchValueOpts(
                            editedPrefOpts[ri],
                            subOpt.options
                          )"
                          :value="opt.value"
                          :key="
                            [
                              subOpt.key,
                              opt.value,
                              ri,
                              oi,
                              subOptIndex,
                              soi,
                            ].join('-')
                          "
                        >
                          {{ opt.name }}
                        </option>
                      </b-select>
                    </b-field>
                  </div>
                  <b-button
                    v-if="oi > 0"
                    icon-left="minus"
                    @click="removeOption(prefOpt, oi)"
                    class="minus option"
                  ></b-button>
                </div>
              </template>
              <template v-if="isScalarOption(prefOpt.type)">
                <div
                  v-for="(opt, oi) in editedPrefOpts[ri].options"
                  :key="['opt', ri, oi].join('-')"
                  class="horizontal"
                >
                  <b-input
                    v-model="editedPrefOpts[ri].options[oi]"
                    pattern="[a-z0-9_]+"
                    class="option key"
                    :title="extractFirstVersionText(editedPrefOpts[ri], opt)"
                    :has-counter="false"
                  ></b-input>
                  <b-button
                    class="minus option"
                    v-if="oi > 0"
                    icon-left="minus"
                    @click="removeOption(prefOpt, oi)"
                    >Remove option</b-button
                  >
                </div>
              </template>
            </b-field>
            <b-button
              icon-left="plus"
              class="plus option"
              @click="addOption(prefOpt)"
            ></b-button>
          </b-field>
          <b-field v-if="showPresetOptions(prefOpt)" class="domain-info left">
            <div v-html="presetOptionsContent(prefOpt)" @click="editScaleOpts" title="Edit option text" class="option-text-edit-link"></div>
          </b-field>
          <b-field v-if="isFaceted(prefOpt)" class="domain-options row">
            <b-select v-model="editedPrefOpts[ri].domain">
              <option
                v-for="(opt, ri) in domains"
                :value="opt.key"
                :key="['facet-domains', opt.key, ri].join('-')"
              >
                {{ opt.name }}
              </option>
            </b-select>
            <b-select v-if="useFacetDropdown" v-model="editedPrefOpts[ri].subdomain">
              <option
                v-for="(opt, ri) in subDomains"
                :value="opt.key"
                :key="['sub-domains', opt.key, ri].join('-')"
              >
                {{ opt.name }}
              </option>
            </b-select>
            <b-input v-if="useQuestionNumbers" type="number" :min="1" v-model="editedPrefOpts[ri].subdomain" class="question-number" title="Question number" />
            <b-switch v-model="editedPrefOpts[ri].inverted">Invert</b-switch>
          </b-field>
          <b-field
            v-if="hasRuleOpts(prefOpt)"
            label="Rules"
            class="rules when-expanded"
          >
            <div class="vertical rule-options" v-if="hasRules(editedPrefOpts[ri])">
              <template v-for="(ruleOpt, roi) in ruleOpts">
                <b-field
                  v-if="showRuleOpt(ruleOpt.key, prefOpt)"
                  :label="ruleOpt.title"
                  :key="['rule', ri, roi].join('-')"
                  class="horizontal"
                >
                  <template v-if="ruleOpt.input === 'checkbox'">
                    <b-checkbox
                      v-model="
                        editedPrefOpts[ri].rules[
                          matchRuleOptIndex(ruleOpt.key, prefOpt)
                        ].value
                      "
                    />
                  </template>
                  <template v-else-if="ruleOpt.input === 'range'">
                    <b-input
                      type="number"
                      size="5"
                      v-model="
                        editedPrefOpts[ri].rules[
                          matchRuleOptIndex(ruleOpt.key, prefOpt)
                        ].value[0]
                      "
                    />
                    <b-input
                      size="5"
                      type="number"
                      v-model="
                        editedPrefOpts[ri].rules[
                          matchRuleOptIndex(ruleOpt.key, prefOpt)
                        ].value[1]
                      "
                    />
                  </template>
                  <template v-else>
                    <b-input
                      :type="ruleOpt.input"
                      v-model="
                        editedPrefOpts[ri].rules[
                          matchRuleOptIndex(ruleOpt.key, prefOpt)
                        ].value
                      "
                    />
                  </template>
                </b-field>
              </template>
            </div>
          </b-field>
          <div class="controls">
            <b-button
              v-if="mayDelete(prefOpt.key)"
              class="minus question"
              icon-left="minus"
              @click="removePreference(prefOpt.key)"
              >Remove question</b-button
            >
          </div>
        </fieldset>
      </div>
      <div v-if="surveyValid" class="actions bottom horizontal">
        <b-button
          type="is-success"
          size="is-large"
          icon-left="content-save"
          @click="submit"
          >Save</b-button
        >
        <b-button icon-left="plus" class="plus question" @click="addPreference"
          >Add new {{ surveyTypeName }}</b-button
        >
      </div>
    </form>
    <snippet-version-form
      :category="survey"
      :subkey="translateSubkey"
      :defaultText="translateText"
      :optionKeys="translateOptionKeys"
      :optionNames="translateOptionNames"
    ></snippet-version-form>
  </div>
</template>

<script lang="ts">
import { sanitize } from "@/api/converters";
import { fetchMultipleKeyScales } from "@/api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { PreferenceOption } from "../../api/interfaces";
import { emptyString, isNumeric, notEmptyString } from "../../api/validators";
import { bus } from "../../main";
import sortableElement from "../../assets/scripts/sortable-list";
import SnippetVersionForm from "./SnippetVersionForm.vue";
import { big5DomainMap, filterMultiscaleOptions, jungianDomainMap, big5SubDomainNumbers } from "@/api/multiscale";

@Component({
  components: {
    SnippetVersionForm,
  },
  filters: {},
})
export default class PreferenceOptionsForm extends Vue {
  @Prop({ default: () => [] }) readonly preferenceOptions: Array<
    PreferenceOption
  >;
  @Prop({ default: () => [] }) readonly promptOptions: Array<any>;
  @Prop({ default: "preference_options" }) readonly survey: string;

  private surveyName = "";

  private multiscales = "";

  private surveyType = "faceted";

  private surveyEnabled = true;

  private surveyRange = [0, 0];

  private editedPrefOpts: Array<PreferenceOption> = [];

  private coreOpts = ["gender", "age_range"];

  private expandedIndex = -1;

  private translateIndex = -1;

  private types = [
    { key: "string", name: "multiple choice (text)", showOptions: true, presetOptions: false },
    { key: "text", name: "User-entered plain text", showOptions: false, presetOptions: false },
    { key: "uri", name: "URI, internet resource", showOptions: false, presetOptions: false },
    { key: "code", name: "Custom code", showOptions: false, presetOptions: false },
    { key: "integer", name: "integer", showOptions: false, presetOptions: false },
    { key: "scale", name: "scale (like/dislike, agree/disagree)", showOptions: false, presetOptions: false },
    {
      key: "key_scale",
      name: "Keyed custom scale (single scale)",
      showOptions: true,
      presetOptions: false
    },
    {
      key: "array_key_scale",
      name: "Set of scales identified by keys (multiple scale)",
      showOptions: true,
      presetOptions: false
    },
    { key: "float", name: "float", showOptions: false, presetOptions: false },
    { key: "boolean", name: "Yes/No", showOptions: false, presetOptions: false },
    {
      key: "array_string",
      name: "multiple answer (string)",
      showOptions: true,
      presetOptions: false
    },
    {
      key: "array_integer",
      name: "multiple choice (integer)",
      showOptions: true,
      presetOptions: false
    },
    { key: "range_number", name: "Numeric range", showOptions: false, presetOptions: false },
    { key: "array_float", name: "multiple choice (floats)", showOptions: true, presetOptions: false },
    {
      key: "faceted",
      name: "Big 5",
      showOptions: false,
      presetOptions: true
    },{
      key: "jungian",
      name: "Jungian",
      showOptions: false,
      presetOptions: true
    },
    {
      key: "multiple_key_scale",
      name: "multiple keys for psychometric tests",
      showOptions: true,
      presetOptions: false
    },
  ];

  private ruleOpts = [
    {
      key: "min",
      title: "Minimum",
      types: [
        "range_number",
        "integer",
        "float",
        "array_integer",
        "array_float",
      ],
      input: "number",
    },
    {
      key: "max",
      title: "Maximum",
      types: [
        "range_number",
        "integer",
        "float",
        "array_integer",
        "array_float",
      ],
      input: "number",
    },
    {
      key: "custom",
      title: "May add custom option",
      types: ["string", "array_string", "array_integer", "array_float"],
      input: "checkbox",
    },
    {
      key: "range",
      title: "Scale range",
      types: ["scale", "key_value_scale", "array_key_scale"],
      input: "range",
    },
  ];

  surveyTypes = [
    { key: "preferences", name: "Preferences" },
    { key: "faceted", name: "Big 5" },
    { key: "jungian", name: "Jungian" },
    { key: "psychometric", name: "Multiscalar psychometric survey" },
    { key: "feedback", name: "Feedback on other members" },
  ];

  multipleKeyScales = [];

  scaleSnippets = [];

  created() {
    this.sync();
    setTimeout(this.sync, 500);
    bus.$on("setting-saved", (result) => {
      const { key } = result;
      if (key === this.survey) {
        //this.sync();
        this.showMessage(`Saved questions`);
      }
    });
    bus.$on("resync-preferences", (ok) => {
      if (ok) {
        setTimeout(() => {
          this.sync();
        }, 500);
      }
    });
    bus.$on("close-snippet-version-form", () => {
      this.translateIndex = -1;
    });
    bus.$on("escape", () => {
      this.translateIndex = -1;
      this.expandedIndex = -1;
    });
    bus.$on("save-snippet-versions", () => {
      this.translateIndex = -1;
      this.expandedIndex = -1;
      this.showMessage("Localised text saved", 2000);
    });
  }

  sync() {
    this.initSurveyType();
    if (this.preferenceOptions instanceof Array) {
      this.editedPrefOpts = this.preferenceOptions.map((po) => {
        const { key, prompt, type, versions, domain, subdomain, inverted } = po;
        let { options, rules } = po;
        if (!(options instanceof Array)) {
          options = [];
        }
        if (!(rules instanceof Array)) {
          rules = [];
        }
        const typeKey =  notEmptyString(type)? type : this.surveyType;
        rules = this.matchRuleOpts(po);
        return {
          key,
          prompt,
          type: typeKey,
          options,
          domain,
          subdomain,
          inverted,
          rules,
          versions,
        };
      });
      setTimeout(() => {
        this.initSurveyType();
      }, 500);
      this.loadMultiscales();
      setTimeout(() => {
        const questionContainer = document.querySelector(
          ".pref-opts-form .questions"
        );
        if (questionContainer instanceof HTMLElement) {
          sortableElement(questionContainer, (data) => {
            const { oldIndex, newIndex } = data;
            if (
              oldIndex >= 0 &&
              newIndex < this.editedPrefOpts.length &&
              newIndex !== oldIndex
            ) {
              this.showMessage(`Element moved`, 1500);
            }
          });
        }
      }, 2000);
    }
  }

  extractFirstVersionText(item: PreferenceOption, key = "") {
    const versions = this.extractVersions(item, key);
    const keyIndex = this.optionKeyIndex(key);
    const keyName = keyIndex >= 0? this.translateOptionNames[keyIndex] : key;
    let str = keyName;
    if (versions.length > 0) {
      if (versions[0] instanceof Object) {
        if (Object.keys(versions[0]).includes("text")) {
          str = versions[0].text;
        }
      }
    }
    return str;
  }

  optionKeyIndex(key = ""): number {
    const keyIndex = this.optionKeys.indexOf(key);
    return keyIndex >= 0 && keyIndex < this.translateOptionNames.length ? keyIndex : -1;
  }

  hasOptionKeyIndex(key = "") {
    return this.optionKeyIndex(key) >= 0;
  }

  initSurveyType() {
    if (this.surveyList.length > 0) {
      const sKey = this.survey.split("_option").shift();
      if (sKey === "_new") {
        this.surveyName = "";
        this.surveyEnabled = false;
      } else {
        const surveyItem = this.surveyList.find(
          (item) => item.key === sKey
        );
        if (surveyItem) {
          this.surveyName = surveyItem.name;
          if (notEmptyString(surveyItem.multiscales, 2)) {
            this.multiscales = surveyItem.multiscales;
          }
          this.surveyType = surveyItem.type;
          this.surveyEnabled = surveyItem.enabled;
          if (surveyItem.range instanceof Array && surveyItem.range.length > 0) {
            this.surveyRange = surveyItem.range;
          } else {
            const row = this.multipleKeyScaleList.find(item => item.key === this.multiscales);
            if (row instanceof Object) {
              if (row.range instanceof Array) {
                this.surveyRange = row.range;
              }
            }
          }     
        }
        if (emptyString(this.surveyType, 2)) {
          this.surveyType = "preferences";
        }
      }
    }
  }

  extractVersions(item: PreferenceOption, key = "") {
    const { versions } = item;

    if (versions instanceof Object) {
      const { prompt, options } = versions;
      if (notEmptyString(key) && options instanceof Object) {
        const optKeys = Object.keys(options);
        if (optKeys.includes(key) && options[key] instanceof Array) {
          return options[key];
        }
      } else {
        if (prompt instanceof Array) {
          return prompt;
        }
      }
    }
    return [];
  }

  showMessage(message: string, duration = 2000) {
    bus.$emit("toast", {message, duration});
  }

  async loadMultiscales() {
    const key = "multiscale_survey_options";
    const stored = this.$ls.get(key);
    if (stored instanceof Array && stored.length > 0) {
      this.multipleKeyScales = stored;
    } else {
      const data = await fetchMultipleKeyScales();
      if (data instanceof Array) {
        this.multipleKeyScales = data;
        this.$ls.set(key, data);
      }
    }
  }

  get domains() {
    const psychometricDomainMap = this.surveyType === 'jungian' ? jungianDomainMap : big5DomainMap;
    return Object.entries(psychometricDomainMap).map(([key, name]) => { return { key, name} });
  }

  get useFacetDropdown() {
    return this.surveyType === 'faceted';
  }

  get useQuestionNumbers() {
    return this.surveyType !== 'faceted';
  }

  get subDomains() {
    return big5SubDomainNumbers.map(key => { return { key, name: key.toString() } });
  }

  get surveyValid() {
    let valid = notEmptyString(this.surveyType, 3) && notEmptyString(this.surveyName, 2);
    switch (this.surveyType) {
      case 'psychometric':
        valid = notEmptyString(this.multiscales, 3);
        break;
    }
    return valid;
  }

  get multipleKeyScaleList() {
    return [{ key: "", name: "None" }, ...this.multipleKeyScales];
  }

  get showMultiscale() {
    return this.surveyType === "psychometric";
  }

  get surveyList() {
    const { preferenceTypes } = this.$parent.$parent.$parent.$data;
    return preferenceTypes instanceof Array ? preferenceTypes : [];
  }

  get wrapperClasses() {
    const cls = [this.survey, this.surveyType];
    if (this.translateIndex >= 0) {
      cls.push("show-translation-overlay");
    }
    return cls;
  }

  matchType(prefOpt: PreferenceOption) {
    const { type, options } = prefOpt;
    let str = notEmptyString(type, 2) ? type.replace(/_/g, " ") : "";
    const tp = this.types.find((tp) => tp.key === type);
    if (tp) {
      str = tp.name;
    }
    if (options instanceof Array && options.length > 0) {
      str += " / " + options.length;
    }
    return str;
  }

  addOption(prefOpt: PreferenceOption) {
    const typeRow = this.types.find((tp) => tp.key === prefOpt.type);
    if (typeRow.showOptions) {
      switch (prefOpt.type) {
        case "array_key_scale":
          prefOpt.options.push({ key: "", value: -1 });
          break;
        case "multiple_key_scale":
          prefOpt.options.push({
            key: "",
            valueOpts: this.transformMultipleOpts(),
          });
          break;
        default:
          prefOpt.options.push("");
          break;
      }
    }
  }

  transformMultipleOpts() {
    const opts = [];
    this.multipleKeyScales.forEach((section) => {
      const { key, items, range } = section;
      if (
        items instanceof Array &&
        range instanceof Array &&
        range.length > 1 &&
        key === this.multiscales
      ) {
        const [min, max] = range;
        const ro = [];
        for (let n = 0; n <= max; n++) {
          ro.push({
            name: n.toString(),
            value: n,
          });
        }
        items.forEach((itemKey) => {
          const comboKey = [key, itemKey].join("_");
          opts.push({
            key: comboKey,
            category: key.split("_").join(" "),
            name: itemKey.split("_").join(" "),
            value: min,
            options: ro,
          });
        });
      }
    });
    return opts;
  }

  isScalarOption(key: string) {
    return ["multiple_key_scale", "key_scale"].includes(key) === false;
  }

  get questionTypes() {
    const psychometricIndex = this.types.findIndex(tp => tp.key === 'multiple_key_scale');
    const facetedIndex = this.types.findIndex(tp => tp.key === 'faceted');
    const jungianIndex = this.types.findIndex(tp => tp.key === 'jungian');
    if (this.surveyType === "psychometric" && psychometricIndex >= 0) {
      return [this.types[psychometricIndex]];
    } else if (this.surveyType === "faceted" && facetedIndex >= 0) {
      return [this.types[facetedIndex]];
    } else if (this.surveyType === "jungian" && jungianIndex >= 0) {
      return [this.types[jungianIndex]];
    } else {
      return this.types.filter((tp, ti) => tp instanceof Object && [psychometricIndex, facetedIndex].includes(ti) === false);
    }
  }

  removeOption(prefOpt: PreferenceOption, index = 0) {
    const typeRow = this.types.find((tp) => tp.key === prefOpt.type);
    if (typeRow.showOptions && index > 0) {
      if (index < prefOpt.options.length) {
        prefOpt.options.splice(index, 1);
      }
    }
  }

  matchMultiScaleOptions() {
    const numQs = this.editedPrefOpts.length;
    if (numQs > 0) {
      return this.editedPrefOpts[numQs - 1].options;
    } else if (this.multipleKeyScales.length > 0) {
      const rowIndex = this.multipleKeyScales.findIndex(item => item.key === this.multiscales);
      const typeIndex = rowIndex >= 0 ? rowIndex : 0;
      const row = this.multipleKeyScales[typeIndex];
      return row instanceof Object && Object.keys(row).includes("options")? row.options : [];
    } else {
      return [];
    }
  }

  matchOptionsByType() {
    switch (this.surveyType) {
        case 'psychometric':
        return this.matchMultiScaleOptions();
      default:
        return [];
    }
  }

  addPreference() {
    const defType =
      this.questionTypes.length > 0 ? this.questionTypes[0].key : "string";
    const options = this.matchOptionsByType();
    const po = {
      key: "_new",
      prompt: "",
      type: defType,
      options,
      rules: [],
    };
    po.rules = this.matchRuleOpts(po);
    this.editedPrefOpts.push(po);
    setTimeout(() => {
      this.expandedIndex = this.editedPrefOpts.length - 1;
    }, 500);
  }

  mayDelete(key: string) {
    return this.coreOpts.includes(key) === false;
  }

  removePreference(key: string) {
    if (this.mayDelete(key)) {
      const poi = this.editedPrefOpts.findIndex((po) => po.key === key);
      if (poi >= 0) {
        this.editedPrefOpts.splice(poi, 1);
        this.showMessage(`Removed question. Save to confirm`);
      }
    }
  }

  matchRuleOpts(prefOpt: PreferenceOption) {
    const rules = this.ruleOpts.filter((ro) => ro.types.includes(prefOpt.type));
    let currRules = [];
    if (prefOpt.rules) {
      currRules = prefOpt.rules.filter((r) => notEmptyString(r.key));
    }
    const newRules = [];
    for (const rule of rules) {
      const cr = currRules.find((r) => r.key === rule.key);
      if (cr) {
        newRules.push(cr);
      } else {
        let defVal: any = '';
        switch (rule.key) {
          case "min":
            defVal = 0;
            break;
          case "max":
            defVal = -1;
            break;
          case "range":
            defVal = [-2, 2];
            break;
          case "custom":
            defVal = 0;
            break;
        }
        newRules.push({
          key: rule.key,
          value: defVal,
        });
      }
    }
    prefOpt.rules = newRules;
    return newRules;
  }

  submit() {
    const editedPrefOpts = this.editedPrefOpts
      .filter((po) => po.key.length > 1)
      .map((po) => {
        if (po.type === "multiple_key_scale") {
          po.options = filterMultiscaleOptions(po);
        }
        return po;
      });
    bus.$emit("save-setting", {
      key: this.survey,
      value: editedPrefOpts,
      type: "preferences",
    });
    bus.$emit("save-survey-type", {
      key: this.survey,
      name: this.surveyName,
      type: this.surveyType,
      multiscales: this.multiscales,
      enabled: this.surveyEnabled,
    });
  }

  showRuleOpt(ruleKey: string, option: PreferenceOption) {
    const ruleOpt = this.ruleOpts.find((ro) => ro.key === ruleKey);
    let valid = false;
    if (ruleOpt) {
      valid = ruleOpt.types.includes(option.type);
    }
    return valid;
  }

  hasRuleOpts(prefOpt: PreferenceOption) {
    return this.ruleOpts.some((ro) => ro.types.includes(prefOpt.type));
  }

  matchRuleOptIndex(ruleKey: string, prefOpt: PreferenceOption) {
    const mrIndex = prefOpt.rules.findIndex((r) => r.key === ruleKey);
    return mrIndex < 0 ? 0 : mrIndex;
  }

  updateRuleOpts(prefOpt: PreferenceOption) {
    this.matchRuleOpts(prefOpt);
  }

  matchSurveyType(prefOpt: PreferenceOption) {
    return this.types.find((tp) => tp.key === prefOpt.type);
  }

  showOptions(prefOpt: PreferenceOption) {
    const typeRow = this.matchSurveyType(prefOpt);
    return typeRow instanceof Object ? typeRow.showOptions === true : false;
  }

  showPresetOptions(prefOpt: PreferenceOption): boolean {
    const typeRow = this.matchSurveyType(prefOpt);
    return typeRow instanceof Object ? typeRow.presetOptions === true : false;
  }

  isFaceted(prefOpt: PreferenceOption): boolean {
    const typeRow = this.matchSurveyType(prefOpt);
    return typeRow instanceof Object ? ['faceted', 'jungian'].includes(typeRow.key)  : false;
  }

  presetOptionsContent(prefOpt: PreferenceOption) {
    const typeRow = this.matchSurveyType(prefOpt);
    const optionText = this.promptOptions.map(sn => sn.values[0].text).join(', ');
    if (typeRow instanceof Object) {
      switch (typeRow.key) {
        case 'faceted':
        case 'jungian':
          return `<p>5 standard options: (${optionText})</p>`;
      }
    }
    return '';
  }

  editScaleOpts() {
    this.$router.push('/snippets/faceted')
  }

  updateKey(item) {
    if (item instanceof Object) {
      const { prompt } = item;
      if (prompt) {
        if (prompt.length > 1) {
          const txt = sanitize(prompt, "_", 48);
          const ck = item.key;
          const exists = this.preferenceOptions.some(po => po.key === ck);
          if (!exists && (ck.length < 24 || ck === "_new")) {
            item.key = txt;
          }
        }
      }
    }
  }

  matchValueOpts(item, subOpts) {
    if (!(subOpts instanceof Array) && item instanceof Object) {
      if (this.surveyRange instanceof Array) {
        const [min, max] = this.surveyRange;
        subOpts = [];
        for (let n = min; n <= max; n++) {
          subOpts.push({
            value: n,
            name: n.toString(),
          });
        }
      }
    }
    return subOpts;
  }

  expandIcon(index: number) {
    return this.expandedIndex === index
      ? "arrow-collapse-vertical"
      : "arrow-expand-vertical";
  }

  toggleExpandIndex(index: number) {
    if (this.expandedIndex === index) {
      this.expandedIndex = -1;
    } else {
      this.expandedIndex = index;
      if (this.translateIndex !== this.expandedIndex) {
        this.translateIndex = -1;
      }
    }
  }

  expandClasses(index: number) {
    if (this.expandedIndex === index) {
      return ["expanded"];
    } else {
      return ["contracted"];
    }
  }

  prefOptsClasses(prefOpt: PreferenceOption) {
    return [prefOpt.type.split('_').join('-')];
  }

  toggleTranslate(index: number) {
    if (
      index >= 0 &&
      index < this.editedPrefOpts.length &&
      index !== this.translateIndex
    ) {
      this.translateIndex = index;
    } else {
      this.translateIndex = -1;
    }
  }

  expandHint(index: number) {
    return index === this.expandedIndex ? "Collapse" : "Expand";
  }

  translateHint(index: number) {
    return index === this.translateIndex
      ? "Hide translation options"
      : "Show translation options";
  }

  hasRules(prefOpt: PreferenceOption) {
    return prefOpt.rules.length > 0;
  }

  get surveyTypeName() {
    switch (this.surveyType) {
      case "preference":
      case "preferences":
        return "preference";
      default:
        return "question";
    }
  }

  get translateSubkey() {
    return this.translateIndex >= 0
      ? this.editedPrefOpts[this.translateIndex].key
      : "";
  }

  get translateText() {
    return this.translateIndex >= 0
      ? this.editedPrefOpts[this.translateIndex].prompt
      : "";
  }

  get translateOptionKeys() {
    return this.translateIndex >= 0 ? this.optionKeys : [];
  }

  get optionKeys() {
    let optKeys = [];
    const index = this.translateIndex >= 0? this.translateIndex : 0;
    const po = this.editedPrefOpts[index];
    if (po instanceof Object) {
      const { options } = po;
      if (options instanceof Array) {
        optKeys = options.map((op) => {
          if (typeof op === "string") {
            return op;
          } else {
            return op.key;
          }
        });
      }
    }
    return optKeys;
  }

  get translateOptionNames() {
    let optKeys = [];
    const index = this.translateIndex >= 0? this.translateIndex : 0;
    const po = this.editedPrefOpts[index];
    if (po instanceof Object) {
      const { options } = po;
      if (options instanceof Array) {
        optKeys = options.map((op) => {
          if (typeof op === "string") {
            return op;
          } else {
            const oKeys = Object.keys(op);
            return oKeys.includes("name") ? op.name : op.key;
          }
        });
      }
    }
    return optKeys;
  }

  @Watch("multiscales")
  changeMultiscales() {
    this.initSurveyType();
  }

  @Watch("survey")
  changeSurvey() {
    this.translateIndex = -1;
    this.expandedIndex = -1;
    const {path} = this.$route;
    const prefix = '/settings/preference-options';
    if (path.startsWith(prefix)) {
      const newPath = [prefix, this.survey.split('_').join('-')].join('/');
      if (newPath !== path) {
        this.$router.push(newPath);
      }
    }
  }
}
</script>
