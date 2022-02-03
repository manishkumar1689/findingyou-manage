import { Module, GetterTree, ActionTree, MutationTree } from "vuex";
import { ChartFormSetState, RootState } from "./types";
import { ChartForm } from "@/api/models/ChartForm";
import { KeyName } from "@/api/interfaces";
import { longDateOnly } from "@/api/converters";

export const state: ChartFormSetState = {
  forms: [new ChartForm()],
};

const actions: ActionTree<ChartFormSetState, RootState> = {
  addForm({ commit }, chartForm: ChartForm) {
    commit("addForm", chartForm);
  },
  appendForm({ commit }, chartForm: ChartForm) {
    commit("appendForm", chartForm);
  },
  removeForm({ commit }, chartID: string) {
    commit("removeForm", chartID);
  },
};

const getters: GetterTree<ChartFormSetState, RootState> = {
  getForms(state): Array<ChartForm> {
    return state.forms;
  },
  getChartOptions(state): Array<KeyName> {
    return state.forms
      .filter((cf) => {
        const { chart } = cf;
        let valid = chart instanceof Object;
        if (valid) {
          valid = chart.subject instanceof Object && chart.grahas.length > 0;
        }
        return valid;
      })
      .map((cf) => {
        const { chart } = cf;
        const key = chart._id;
        const name =
          chart.subject.name + " " + longDateOnly(cf.datetime, cf.tzOffset);
        return {
          key,
          name,
        };
      });
  },
};

const mutations: MutationTree<ChartFormSetState> = {
  addForm(state, payload: ChartForm) {
    let isNewIndex = -1;
    if (state.forms.length > 0) {
      isNewIndex = state.forms.findIndex((f) => f.id.startsWith("new__"));
    }
    const index =
      isNewIndex < 0
        ? state.forms.findIndex((f) => f.id === payload.id)
        : isNewIndex;
    if (index < 0) {
      state.forms.unshift(payload);
    } else {
      state.forms[index] = payload;
    }
  },
  appendForm(state, payload: ChartForm) {
    if (payload instanceof Object) {
      state.forms.push(payload);
    }
  },
  removeForm(state, payload: string) {
    const formIndex = state.forms.findIndex((f) => f.id === payload);
    if (formIndex >= 0) {
      state.forms.splice(formIndex, 1);
    }
  },
};

const namespaced = true;

export const chartFormData: Module<ChartFormSetState, RootState> = {
  namespaced,
  state,
  getters,
  actions,
  mutations,
};
