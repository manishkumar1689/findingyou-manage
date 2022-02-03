<template>
  <fieldset class="subject-details">
    <b-field class="horizontal" Title="Name">
      <b-input
        size="40"
        class="name"
        v-model="name"
        type="text"
        placeholder="Name"
      />
    </b-field>
    <b-select placeholder="Gender" v-model="gender">
      <option v-for="opt in genderOptions" :value="opt.key" :key="opt.key">{{
        opt.name
      }}</option>
    </b-select>
    <b-field class="horizontal datetime" title="Date">
      <b-input type="date" class="date" v-model="date" size="10" />
      <b-input type="time" class="time" v-model="time" :step="1" />
    </b-field>
    <geolocation-input :geo="geo" :shortLabels="true" />
    <b-select placeholder="Rodden Scale" v-model="roddenValue">
      <option v-for="opt in roddenOptions" :value="opt.key" :key="opt.key">{{
        opt.name
      }}</option>
    </b-select>
  </fieldset>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { notEmptyString } from "../../api/validators";
import { bus } from "../../main";
import { DictionaryState } from "../../store/types";
import { FilterSet } from "../../api/composables/FilterSet";
import { Chart } from "../../api/models/Chart";
import { julToISODate } from "@/api/converters";
import { editChart, fetchRoddenValues } from "@/api/methods";
import { genderOptions, transformKeyNameOptions } from "@/api/mappers";
import GeolocationInput from "../widgets/GeolocationInput.vue";
import { GeoLoc } from "@/api/models/GeoLoc";

@Component({
  filters: FilterSet,
  components: {
    GeolocationInput,
  },
})
export default class ChartDetailsForm extends Vue {
  @Prop({ default: () => new Chart() }) chart: Chart;
  @Prop({ default: false }) showRodden: boolean;
  @State("dictionary") dictionary: DictionaryState;

  /* startYear = 0; //approx. start year, fractions for approx. month where known, will be added to start year as a dec. fraction
  startYearMonth = -1; // approx. month where known
  span = 0; // approx. duration in years, fractions for approx. months where known
  spanMonths = -1; // approx. months where known, will be added to span year as a dec. fraction */
  name = "";
  gender = "";
  date = "";
  time = "";
  tz = "";
  tzOffset = 0;
  geo: GeoLoc = new GeoLoc(null);
  notes = "";
  roddenValues = [];
  roddenValue = -1;

  created() {
    this.sync();
    bus.$on("save-chart-meta", () => {
      this.save();
    });
  }

  sync() {
    fetchRoddenValues().then((items) => {
      this.roddenValues = items;
    });
    const isoDateParts = julToISODate(this.chart.jd, this.chart.tzOffset).split(
      "T"
    );
    this.name = this.subject.name;
    this.gender = this.subject.gender;
    this.date = isoDateParts.shift();
    this.time = isoDateParts
      .pop()
      .split(".")
      .shift();
    this.geo = this.chart.geo;
    this.roddenValue = this.subject.roddenValue;
  }

  save() {
    const geo = this.geo.toJson();
    const { user, _id, subject } = this.chart;
    const type = notEmptyString(subject.type) ? subject.type : "person";
    const eventType = notEmptyString(subject.type) ? subject.eventType : "birth";
    const inData = {
      user, 
      datetime: this.datetime,
      ...geo,
      name: this.name,
      gender: this.gender,
      roddenValue: this.roddenValue,
      type,
      eventType
    };
    editChart(_id, inData).then((data) => {
      if (data.valid) {
        bus.$emit("chart-edited", data.chart);
      }
    });
  }

  get subject() {
    return this.chart.subject;
  }

  get datetime() {
    return [this.date, this.time].join("T");
  }

  get roddenOptions() {
    return transformKeyNameOptions(this.roddenValues, "", 24);
  }

  get genderOptions() {
    return genderOptions(this.dictionary);
  }

  @Watch("chart")
  changeChart() {
    this.sync();
  }
}
</script>
