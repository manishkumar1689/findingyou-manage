import { Module, GetterTree, ActionTree, MutationTree } from "vuex";
import { UserState, RootState } from "./types";
import { UserSchema } from "@/api/schemas";

export const state: UserState = new UserSchema();

const actions: ActionTree<UserState, RootState> = {
  assignUser({ commit }, user) {
    commit("userLoaded", user);
  },
};

const getters: GetterTree<UserState, RootState> = {
  getUser(state): UserState {
    return state;
  },
};

const mutations: MutationTree<UserState> = {
  userLoaded(state, payload: UserState) {
    if (payload instanceof Object) {
      Object.entries(payload).forEach((entry) => {
        const [key, val] = entry;
        state[key] = val;
      });
    }
  },
};

const namespaced = true;

export const userRecord: Module<UserState, RootState> = {
  namespaced,
  state,
  getters,
  actions,
  mutations,
};
