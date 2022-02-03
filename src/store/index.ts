import Vue from "vue";
import Vuex, { StoreOptions } from "vuex";
import { RootState } from "./types";
import { userRecord } from "./userRecord";
import { lexemeSet } from "./lexemeSet";
import { chartFormData } from "./chartFormData";
import { settingData } from "./settings";

Vue.use(Vuex);

const store: StoreOptions<RootState> = {
  state: {
    version: 0.6,
  },
  modules: {
    user: userRecord,
    dictionary: lexemeSet,
    chartForms: chartFormData,
    settings: settingData,
  },
};

export default new Vuex.Store<RootState>(store);
