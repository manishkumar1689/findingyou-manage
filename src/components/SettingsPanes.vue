<template>
  <div class="main-view" :class="wrapperClasses">
    <b-tabs v-model="activeTab" :multiline="true">
      <b-tab-item label="Roles">
        <RolesForm :roles="roles" :permissions="permissions" :limits="permissionLimits" />
      </b-tab-item>
      <b-tab-item label="Payment Options">
        <PaymentOptionsForm
          :roles="roles"
          :paymentOptions="paymentOptions"
          :countries="countries"
        />
      </b-tab-item>
      <b-tab-item label="Preference Options">
        <b-field class="survey-type top-control">
          <b-radio-button
            v-for="(survey, svi) in preferenceSelection"
            :key="[survey.value, svi].join('-')"
            v-model="surveyKey"
            :native-value="survey.value"
            >{{ survey.name }}</b-radio-button
          >
        </b-field>
        <PreferenceOptionsForm
          :preferenceOptions="preferenceOptions"
          :promptOptions="promptOptions"
          :survey="surveyKey"
        />
      </b-tab-item>
      <b-tab-item label="Survey Test">
        <FacetedSurveyTest :preferenceOptions="preferenceOptions" :promptOptions="promptOptions" />
      </b-tab-item>
      <b-tab-item label="Member Flags">
        <MemberFlagForm />
      </b-tab-item>
      <b-tab-item label="Rodden scale">
        <LookupSetForm settingKey="rodden_scale_values" />
      </b-tab-item>
      <b-tab-item label="Paired Attributes">
        <TagOptionForm />
      </b-tab-item>
      <b-tab-item label="Devices">
        <device-versions-form />
      </b-tab-item>
      <b-tab-item label="Languages">
        <LanguageForm />
      </b-tab-item>
      <b-tab-item label="Advanced">
        <SettingsList />
      </b-tab-item>
      <b-tab-item label="Export">
        <ExportList />
      </b-tab-item>
    </b-tabs>
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import {
  fetchCountries,
  fetchPermisions,
  fetchRoleOptions,
  fetchPreferenceOptions,
  fetchPaymentOptions,
  saveSetting,
  fetchSurveys,
} from "../api/methods";
import {
  sanitize,
} from "../api/converters";
import { notEmptyString } from "../api/validators";
import { FilterSet } from "../api/composables/FilterSet";
import RolesForm from "./forms/RolesForm.vue";
import PaymentOptionsForm from "./forms/PaymentOptionsForm.vue";
import PreferenceOptionsForm from "./forms/PreferenceOptionsForm.vue";
import LookupSetForm from "./forms/LookupSetForm.vue";
import MemberFlagForm from "./forms/MemberFlagForm.vue";
import LanguageForm from "./forms/LanguageForm.vue";
import TagOptionForm from "./forms/TagOptionForm.vue";
import DeviceVersionsForm from "./forms/DeviceVersionsForm.vue";
import SettingsList from "./tables/SettingsList.vue";
import FacetedSurveyTest from "./tables/FacetedSurveyTest.vue";
import ExportList from "./tables/ExportList.vue";
import { UserState } from "../store/types";
import {
  Setting,
  KeyName,
  CountryOption,
  Role,
  PaymentOption,
  PreferenceOption,
  KeyNumValue,
} from "../api/interfaces";
import { bus } from "../main";

@Component({
  components: {
    RolesForm,
    PaymentOptionsForm,
    PreferenceOptionsForm,
    LookupSetForm,
    TagOptionForm,
    LanguageForm,
    SettingsList,
    DeviceVersionsForm,
    ExportList,
    MemberFlagForm,
    FacetedSurveyTest
  },
  filters: {
    ...FilterSet,
  },
})
export default class SettingsPanes extends Vue {
  @State("user") user: UserState;
  permissions: Array<KeyName> = [];
  permissionLimits: Array<KeyNumValue> = [];
  settings: Array<Setting> = [];
  countries: Array<CountryOption> = [];
  roles: Array<Role> = [];
  paymentOptions: Array<PaymentOption> = [];
  preferenceOptions: Array<PreferenceOption> = [];
  surveyKey = "preference_options";
  _newSurveyKey = "";
  sectionKeys = [
    "roles",
    "payment-options",
    "preference-options",
    "survey-tests",
    "member-flags",
    "rodden-scale",
    "paired-option-tags",
    "devices",
    "languages",
    "advanced",
    "exports",
  ];
  preferenceTypes = [];
  activeTab = 0;
  private saving = false;
  promptOptions = [];
  showingToast = false;

  created() {
    this.loadData();
    this.loadSurveyTypes();
    this.updateByRoute();
    bus.$on("save-setting", (payload) => {
      if (payload instanceof Object) {
        const { key, value, type } = payload;
        if (notEmptyString(key)) {
          const sType = notEmptyString(type) ? payload.type : "";
          this.saveSettingData(key, value, sType);
        }
      }
    });
    bus.$on('survey-key', sk => {
      this.surveyKey = sk;
    })
    bus.$on("save-survey-type", (payload) => {
      if (payload instanceof Object) {
        this.saveSurveyType(payload);
      }
    });
    bus.$on("toast", data => {
      const {message, duration, type } = data;
      const messageTxt = notEmptyString(message)? message : "";
      const durationInt = typeof duration === "number"? duration : 3000;
      const typeKey = notEmptyString(type)? type : "is-success";
      if (!this.showingToast) {
        this.showingToast = true;
        this.$buefy.toast.open({
          duration: durationInt,
          message: messageTxt,
          position: "is-bottom",
          type: typeKey,
        });
        setTimeout(() => {
          this.showingToast = false;
        }, durationInt + 2000);
      }
    })
  }

  mounted() {
    const {path} = this.$route;
    const prefix = '/settings/preference-options';
    if (path.startsWith(prefix)) {
      const subsec = prefix.split('/').pop();
      const lastPart = path.split('/').pop();
      if (lastPart !== subsec) {
        const sk = lastPart.split('-').join('_');
        this.surveyKey = sk;
      }
    } else if (path.includes('survey-tests')) {
      this.surveyKey = 'faceted_personality_options';
    }
  }

  async loadSurveyTypes() {
    const key = "survey_type_list";
    const stored = this.$ls.get(key);
    if (stored instanceof Array) {
      this.preferenceTypes = stored;
    } else {
      const items = await fetchSurveys();
      if (items instanceof Array) {
        this.preferenceTypes = items;
        this.$ls.set(key, items);
      }
    }
  }

  get preferenceSelection() {
    const pts = this.preferenceTypes.map((item) => {
      return {
        value: [item.key, "options"].join("_"),
        name: item.name,
      };
    });
    pts.push({
      value: "_new",
      name: "+",
    });
    return pts;
  }

  async loadData() {
    this.loadPermissions();
    this.loadCountries();
    this.loadRoles();
    this.loadPaymentOptions();
    this.loadPreferenceOptions();
  }

  async loadPermissions() {
    const items = this.$ls.get("permissions");
    const limits = this.$ls.get("permission-limits");
    
    if (items instanceof Array && limits instanceof Array && limits.length > 0) {
      this.permissions = items;
      this.permissionLimits = limits;
    } else {
      fetchPermisions().then((data) => {
        if (data.items instanceof Array) {
          this.permissions = data.items;
          this.$ls.set("permissions", data.items);
        }
        if (data.limits instanceof Array) {
          this.permissionLimits = data.limits;
          this.$ls.set("permission-limits", data.limits);
        }
      });
    }
  }

  async loadCountries() {
    const items = this.$ls.get("countries");
    if (items instanceof Array) {
      this.countries = items;
    } else {
      fetchCountries().then((data) => {
        if (data.valid) {
          if (data.items instanceof Array) {
            this.countries = data.items;
            this.$ls.set("countries", data.items);
          }
        }
      });
    }
  }

  async loadRoles() {
    fetchRoleOptions().then((data) => {
      if (data instanceof Array) {
        this.roles = data;
      }
    });
  }

  async loadPaymentOptions() {
    fetchPaymentOptions().then((data) => {
      if (data instanceof Array) {
        this.paymentOptions = data;
      }
    });
  }

  async loadPreferenceOptions(resync = false) {
    if (this.surveyKey === "_new") {
      this.preferenceOptions = [];
      if (resync) {
        bus.$emit("resync-preferences", true);
      }
    } else {
      fetchPreferenceOptions(this.surveyKey, true).then((data) => {
        if (data.items instanceof Array) {
          this.preferenceOptions = data.items;
          if (data.options instanceof Array) {
            this.promptOptions = data.options;
          }
          if (resync) {
            bus.$emit("resync-preferences", true);
          }
        }
      });
    }
  }

  updateByRoute() {
    const { params } = this.$route;
    const { section } = params;
    if (notEmptyString(section, 3)) {
      this.activeTab = this.sectionKeys.indexOf(section);
    }
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-"), ["file", index].join("-")];
  }

  filterKey(key: string): string {
    const parts = key.split("__");
    if (this.hasSection) {
      parts.shift();
    }
    return parts.join(": ");
  }

  updatePath() {
    const parts = ["settings"];
    if (this.section.length > 2) {
      parts.push(this.section);
    } else {
      parts.push("-");
    }
    const { path } = this.$route;
    const np = "/" + parts.join("/");
    if (path !== np) {
      this.$router.push(np);
    }
  }

  saveSettingData(key: string, value, type = "") {
    const { _id } = this.user;
    if (!this.saving) {
      this.saving = true;
      saveSetting(key, _id, value, "", type).then((data) => {
        if (data) {
          const { setting } = data;
          if (setting instanceof Object) {
            const { value } = setting;
            if (value instanceof Array) {
              switch (key) {
                case "preference_options":
                  this.preferenceOptions = value;
                  break;
                case "roles":
                  this.roles = value;
                  break;
                case "payments":
                  this.paymentOptions = value;
                  break;
              }
            }
            setTimeout(() => {
              bus.$emit("setting-saved", { key, data });
              if (notEmptyString(this._newSurveyKey, 2)) {
                this.surveyKey = this._newSurveyKey;
                this._newSurveyKey = "";
              }
              this.saving = false;
            }, 250);
            if (key.includes('enforce_paid')) {
              const message = value === true ? 'Paid membership logic enforced' : 'All members treated the same in the search';
              bus.$emit('toast', {
                message
              })
            }
          }
        }
      });
    }
  }

  saveSurveyType(payload) {
    this._newSurveyKey = "";
    const { key, name, type, enabled, multiscales } = payload;
    const isNew = key === "_new";
    if (notEmptyString(key, 7) || isNew) {
      const subkey = key.split("_option").shift();
      if (subkey.length > 2) {
        const surveyTypeIndex = this.preferenceTypes.findIndex(
          (po) => po.key === subkey
        );
        let surveyType = {
          key: subkey,
          enabled: true,
          name: "",
          multiscales: "",
          type: "preferences",
        };
        if (surveyTypeIndex >= 0) {
          surveyType = this.preferenceTypes[surveyTypeIndex];
          this.preferenceTypes[surveyTypeIndex] = surveyType;
        } else if (isNew) {
          surveyType.key = sanitize(name, "_", 24);
          this.preferenceTypes.push(surveyType);
          this._newSurveyKey = surveyType.key;
        }
        surveyType.type = type;
        surveyType.enabled = enabled === true;
        surveyType.name = name;
        surveyType.multiscales = multiscales;
        const settingKey = "survey_list";
        this.saveSettingData(
          settingKey,
          this.preferenceTypes,
          "survey_list"
        );

        this.$ls.set(settingKey, this.preferenceTypes);
      }
    }
  }

  get hasSection(): boolean {
    return this.section.length > 1;
  }

  get section() {
    return this.activeTab < this.sectionKeys.length
      ? this.sectionKeys[this.activeTab]
      : "";
  }

  get wrapperClasses(): Array<string> {
    const cls = [];
    if (this.hasSection) {
      cls.push("section-" + this.section);
    }
    return cls;
  }

  @Watch("activeTab")
  changeActiveTab(newVal) {
    this.updatePath();
    if (newVal < this.sectionKeys.length) {
      const key = this.sectionKeys[newVal];
      if (key === 'survey-tests') {
        const facetedTestKeys = ['faceted_personality_options','jungian_options']
        if (!facetedTestKeys.includes(this.surveyKey)) {
          this.surveyKey = facetedTestKeys[0];
        }
        setTimeout(() => {
          this.loadPreferenceOptions(true);
        }, 500);
      }
    }
    
  }

  @Watch("surveyKey")
  changeSurveyKey(newVal) {
    if (notEmptyString(newVal, 3)) {
      this.loadPreferenceOptions(true);
      this.updatePath();
    }
  }

  @Watch("$route")
  changeRoute() {
    this.updateByRoute();
  }
}
</script>
