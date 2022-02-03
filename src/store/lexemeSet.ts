import { Module, GetterTree, ActionTree, MutationTree } from "vuex";
import { DictionaryState, RootState } from "./types";
import { Dictionary, Lexeme } from "@/api/models/Lexeme";

export const state: DictionaryState = new Dictionary();

const actions: ActionTree<DictionaryState, RootState> = {
  assignItems({ commit }, items = []) {
    if (items instanceof Array) {
      commit("dictionaryLoaded", new Dictionary(items));
    }
  },
};

const getters: GetterTree<DictionaryState, RootState> = {
  getItems(state): Array<Lexeme> {
    return state.lexemes;
  },
};

const mutations: MutationTree<DictionaryState> = {
  dictionaryLoaded(state, payload: Dictionary) {
    if (payload instanceof Object) {
      Object.entries(payload).forEach((entry) => {
        const [key, val] = entry;
        state[key] = val;
      });
      if (payload.text) {
        state.text = payload.text;
      }
      if (payload.byCategory) {
        state.byCategory = payload.byCategory;
      }
      if (payload.lexeme) {
        state.lexeme = payload.lexeme;
      }
      if (payload.graha) {
        state.graha = payload.graha;
      }
    }
  },
};

const namespaced = true;

export const lexemeSet: Module<DictionaryState, RootState> = {
  namespaced,
  state,
  getters,
  actions,
  mutations,
};
