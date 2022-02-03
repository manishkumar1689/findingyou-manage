<template>
  <b-table
    v-if="hasPlanets"
    :data="planets"
    :row-class="(row, index) => assignRowClasses(index)"
    :key="keyName"
  >
    <template slot-scope="props">
      <b-table-column
        v-for="(item, itemIndex) in props.row"
        :class="item.key"
        :field="item.key"
        :label="itemIndex | columnLabel"
        :key="[item.key, itemIndex].join('-')"
      >
        <template v-if="item.key === 'key'">
          <strong
            class="symbol"
            :class="item.value.key | toGrahaClass"
          ></strong>
        </template>
        <template v-else>
          <p>{{ item.value.station | toLegend }}</p>
          <p>{{ item.value.datetime | longDate }}</p>
          <p>{{ item.value.speed | dec6 }}</p>
        </template>
      </b-table-column>
    </template>
  </b-table>
</template>
<script lang="ts">
import { Graha } from "../../api/models/Graha";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { FilterSet } from "../../api/composables/FilterSet";
import {
  PlanetStation,
  PlanetStationSet,
} from "../../api/models/PlanetStation";
import { fetchAllPlanetStations } from "../../api/methods";
import { asDateString, toPlanetStationLegend } from "../../api/converters";
import grahaValues from "../../api/mappings/graha-values";
import { KeyObject } from "../../api/interfaces";

@Component({
  filters: {
    ...FilterSet,
    toLegend(value) {
      return toPlanetStationLegend(value);
    },
    columnLabel(value) {
      if (value < 1) {
        return "Planet";
      } else {
        return `Station ${value}`;
      }
    },
  },
})
export default class PlanetStationsTable extends Vue {
  @Prop({ default: () => new Date() }) readonly datetime: Date;

  private planets: Array<Array<KeyObject>>;

  private loading = false;

  created() {
    this.loadStations();
  }

  loadStations() {
    const strDM = asDateString(this.datetime)
      .split("T")
      .shift()
      .split("-")
      .filter((d, i) => i < 2)
      .join("-");
    const cKey = ["apl-stations", strDM].join("-");
    const pData = this.$ls.get(cKey);
    if (pData instanceof Object) {
      if (pData.valid) {
        this.mapPlanetStations(pData);
      }
    } else {
      fetchAllPlanetStations(asDateString(this.datetime)).then((data) => {
        if (data.valid) {
          this.mapPlanetStations(data);
          this.$ls.set(cKey, data);
        }
      });
    }
  }

  mapPlanetStations(data: any) {
    this.planets = [];
    if (data instanceof Object) {
      if (data.results instanceof Object) {
        Object.entries(data.results).forEach((entry) => {
          const [key, values] = entry;
          const num = parseInt(key);
          const gr = grahaValues.find((g) => g.num === num);
          if (gr) {
            const ps = new PlanetStationSet({ key: gr.key, values });
            this.planets.push(ps.columns);
          }
        });
        setTimeout(this.$forceUpdate, 250);
      }
    }
  }

  get hasPlanets(): boolean {
    let valid = this.planets instanceof Array;
    if (valid && this.planets.length > 1) {
      valid = this.planets[1] instanceof Object;
    }
    return valid;
  }

  get keyName(): string {
    return (
      asDateString(this.datetime)
        .split("T")
        .shift() +
      "_" +
      this.planets.length
    );
  }

  assignRowClasses(index: number) {
    return [["index", index].join("-")];
  }

  @Watch("datetime")
  changeDatetime() {
    if (!this.loading) {
      this.loading = true;
      this.loadStations();
      setTimeout(() => {
        this.loading = false;
      }, 1000);
    }
  }
}
</script>
