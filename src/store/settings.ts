import { Module, GetterTree, ActionTree, MutationTree } from "vuex";
import { SettingState, RootState } from "./types";
import { DefaultAyanamshaItem, AyanamshaItem } from "@/api/interfaces";

export const state: SettingState = {
  ayanamsha: DefaultAyanamshaItem,
  degMode: "dms",
};

const actions: ActionTree<SettingState, RootState> = {
  setAyanamsha({ commit }, item: AyanamshaItem) {
    commit("applySetting", {
      ayanamsha: item,
    });
  },
  setDegMode({ commit }, mode: string) {
    commit("applySetting", {
      degMode: mode,
    });
  },
};

const getters: GetterTree<SettingState, RootState> = {
  settings(state): SettingState {
    return state;
  },
};

const mutations: MutationTree<SettingState> = {
  applySetting(state, payload: SettingState) {
    if (payload instanceof Object) {
      Object.entries(payload).forEach((entry) => {
        const [key, value] = entry;
        switch (key) {
          case "ayanamsha":
            state.ayanamsha = value;
            break;
          case "degMode":
            state.degMode = value;
            break;
        }
      });
    }
  },
};

export const settingData: Module<SettingState, RootState> = {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
