<template>
  <form class="edit-form language-list">
    <b-table :data="items" :sticky-header="true">
      <template slot-scope="props">
        <b-table-column class="key" field="key" label="Key">{{props.row.key}}</b-table-column>
        <b-table-column class="name" field="name" label="Name">
          <b-input
            maxlength="256"
            size="48"
            type="name"
            class="text"
            v-model="props.row.name"
            :has-counter="false"
          />
        </b-table-column>
        <b-table-column class="native" field="native" label="Native name">
          <b-input
            maxlength="256"
            size="48"
            type="name"
            class="text"
            v-model="props.row.native"
            :has-counter="false"
          />
        </b-table-column>
        <b-table-column
          class="enabled app"
          :class="priorityClasses(props.row, 'app')"
          field="inApp"
          label="In App"
        >
          <b-checkbox v-model="props.row.inApp" />
        </b-table-column>
        <b-table-column
          class="priority app"
          :class="priorityClasses(props.row, 'app')"
          field="appWeight"
          label="#1"
        >
          <b-input
            v-if="showWeight(props.row.appWeight)"
            type="number"
            class="number short"
            :min="-1"
            :max="20"
            :maxlength="2"
            v-model="props.row.appWeight"
            :has-counter="false"
          />

          <div
            v-if="showWeightOpts(props.row,'app')"
            class="alpha-num"
            :title="alphaNumHint(props.row.appWeight)"
            @click="toggleAlphaNum(props.row,'app')"
          >
            <b-icon :icon="alphaNumIcon(props.row.appWeight)" size="is-small" />
          </div>
        </b-table-column>
        <b-table-column
          class="enabled dict"
          :class="priorityClasses(props.row, 'dict')"
          field="inDict"
          label="In dictionary"
        >
          <b-checkbox v-model="props.row.inDict" />
        </b-table-column>
        <b-table-column
          class="priority"
          :class="priorityClasses(props.row, 'dict')"
          field="dictWeight"
          label="#2"
        >
          <b-input
            v-if="showWeight(props.row.dictWeight)"
            type="number"
            class="number short"
            :min="-1"
            :max="20"
            :maxlength="2"
            v-model="props.row.dictWeight"
            :has-counter="false"
          />
          <div
            v-if="showWeightOpts(props.row, 'dict')"
            class="alpha-num"
            :title="alphaNumHint(props.row.dictWeight)"
            @click="toggleAlphaNum(props.row,'dict')"
          >
            <b-icon :icon="alphaNumIcon(props.row.dictWeight)" size="is-small" />
          </div>
        </b-table-column>
      </template>
    </b-table>
    <b-button type="is-success" @click="submit" icon-left="content-save-outline">Save</b-button>
  </form>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { fetchLanguages, saveSetting } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { bus } from "../../main";
import { UserState } from "../../store/types";
import { LanguageItem } from "@/api/interfaces";
import { notEmptyString } from "@/api/validators";

const validWeight = (num: number) => num > 0 && num < 2000;

@Component
export default class LanguageForm extends Vue {
  @State("user") user: UserState;
  private items: Array<LanguageItem> = [];

  created() {
    this.sync();
    this.submit(false);
  }

  sync() {
    const { _id } = this.user;
    fetchLanguages("all", _id).then((data) => {
      if (data instanceof Object) {
        if (data.languages instanceof Array) {
          this.items = data.languages.map((row) => {
            const dictWeight = validWeight(row.dictWeight)
              ? row.dictWeight
              : -1;
            const appWeight = validWeight(row.appWeight) ? row.appWeight : -1;
            return { ...row, appWeight, dictWeight };
          });
        }
      }
    });
  }

  alphaNumIcon(num) {
    return validWeight(num) ? "numeric" : "alpha";
  }

  alphaNumHint(num) {
    const listType = this.showWeight(num) ? "alphabetical" : "numeric priority";
    return `Switch to ${listType} listing`;
  }

  showWeight(num) {
    return validWeight(num);
  }

  showWeightOpts(row: LanguageItem, mode = "app") {
    return mode === "dict" ? row.inDict : row.inApp;
  }

  priorityClasses(row: LanguageItem, mode = "app") {
    const cls = [];
    const isPriority =
      mode === "dict"
        ? row.inDict && validWeight(row.dictWeight)
        : row.inApp && validWeight(row.appWeight);
    const selected = mode === "dict" ? row.inDict : row.inApp;
    if (selected) {
      cls.push("selected");
    }
    if (isPriority) {
      cls.push("highlighted");
    }
    return cls;
  }

  toggleAlphaNum(row: LanguageItem, mode = "app") {
    const { dictWeight, appWeight } = row;
    if (mode === "dict") {
      row.dictWeight = validWeight(dictWeight)
        ? -1
        : this.items
            .filter((r) => r.inDict && r.dictWeight > 0)
            .map((r) => r.dictWeight)
            .reduce((a, b) => (b > a ? b : a), 0) + 1;
    } else {
      row.appWeight = validWeight(appWeight)
        ? -1
        : this.items
            .filter((r) => r.inApp && r.appWeight > 0)
            .map((r) => r.appWeight)
            .reduce((a, b) => (b > a ? b : a), 0) + 1;
    }
  }

  submit(showToast = true) {
    const appFiltered = this.items
      .filter((row) => row.inApp)
      .map((row) => {
        const weight = row.appWeight > 0 ? row.appWeight : 9999;
        return {
          key: row.key,
          name: row.name,
          native: row.native,
          weight,
        };
      });
    const dictFiltered = this.items
      .filter((row) => row.inDict)
      .map((row) => {
        const weight = row.dictWeight > 0 ? row.dictWeight : 9999;
        return {
          key: row.key,
          name: row.name,
          native: row.native,
          weight,
        };
      });
    const sortVal = (row) =>
      row.weight * 1000 + (row.key.toLowerCase().charCodeAt(0) - 96);
    appFiltered.sort((a, b) => (sortVal(a) > sortVal(b) ? 1 : -1));
    dictFiltered.sort((a, b) => (sortVal(a) > sortVal(b) ? 1 : -1));
    if (showToast || appFiltered.length > 2) {
      saveSetting("languages", this.user._id, appFiltered, "", "languages").then((data) => {
          this.$ls.set("languages", appFiltered);
          if (showToast) {
            const { message } = data;
            if (notEmptyString(message)) {
              bus.$emit("toast", {message});
            }
          }
        }
      );
    }
    if (showToast) {
      setTimeout(() => {
        saveSetting(
          "dictlangs",
          this.user._id,
          dictFiltered,
          "",
          "languages"
        ).then((data) => {
          if (data) {
            this.$ls.set("dictlangs", dictFiltered);
          }
        });
      }, 1000);
    }
  }

  get hasItems() {
    return this.items.length > 0;
  }
}
</script>
