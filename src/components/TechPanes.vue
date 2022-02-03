<template>
  <div class="main-view" :class="wrapperClasses">
    <b-tabs v-model="activeTab" :multiline="true">
      <b-tab-item label="Swiss Ephemeris Files">
        <FileListView />
      </b-tab-item>
      <b-tab-item label="Historic Planetary Stations">
        <PlanetaryStationsTable  />
      </b-tab-item>
    </b-tabs>
  </div>
</template>
<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { FilterSet } from "../api/composables/FilterSet";
import FileListView from "./FileListView.vue";
import PlanetaryStationsTable  from "./tables/PlanetaryStationsTable.vue";
import { UserState } from "../store/types";
import { bus } from "@/main";

@Component({
  components: {
    FileListView,
    PlanetaryStationsTable,
  },
  filters: {
    ...FilterSet,
  },
})
export default class TechPanes extends Vue {
  @State("user") user: UserState;
  activeTab = 0;

  tabs = [
    { key: "files", className: "file-listing" },
    { key: "transitions", className: "lanetary-transitions-table" },
  ];

  created() {
    const { path } = this.$route;
    const parts = path.substring(1).split("/");
    if (parts.length > 1) {
      const subsec = parts.pop();
      const tabIndex = this.tabs.findIndex((tb) => tb.key === subsec);
      if (tabIndex > 0) {
        this.activeTab = tabIndex;
      }
    }
  }

  get wrapperClasses() {
    const cls = [];
    if (this.activeTab < this.tabs.length) {
      const row = this.tabs[this.activeTab];
      if (row) {
        cls.push(row.className);
      }
    }
    return cls;
  }

  @Watch("activeTab")
  changeActiveTab(newVal) {
    if (this.activeTab < this.tabs.length) {
      const row = this.tabs[this.activeTab];
      if (row) {
        bus.$emit("change-tech-data-tab", row.key);
        const newPath = "/" + ["tech", row.key].join("/");
        const { path } = this.$route;
        if (newPath !== path) {
          this.$router.push(newPath);
        }
      }
    }
  }
}
</script>
