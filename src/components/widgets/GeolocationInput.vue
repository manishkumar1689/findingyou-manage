<template>
  <b-field name="geolocation" class="geoloc" :class="wrapperClasses">
    <b-field :label="labels.lat">
    <b-input
      type="text"
      v-model="latVal"
      :pattern="degPattern"
      maxlength="20"
      size="is-medium"
      class="coord lat"
      :has-counter="false"
    ></b-input>
    </b-field>
    <b-field :label="labels.lng">
    <b-input
      type="text"
      v-model="lngVal"
      :pattern="degPattern"
      maxlength="20"
      size="is-medium"
      :has-counter="false"
      class="coord lng"
    ></b-input>
    </b-field>
    <b-field :label="labels.alt">
    <b-input
      type="number"
      v-model="altVal"
      maxlength="6"
      size="is-medium"
      class="integer alt"
      :has-counter="false"
    ></b-input>
    </b-field>
    <b-field v-if="showDegModeSwitcher" class="deg-mode" :class="degMode">
      <b-radio-button
        v-model="degMode"
        native-value="dec"
        type="is-danger"
        size="is-medium"
        class="dec-button"
        title="Switch to decimal degree input"
      >
        <b-icon icon="decimal" />
      </b-radio-button>
      <b-radio-button
        v-model="degMode"
        native-value="dms"
        type="is-success"
        size="is-medium"
        class="dms-button"
        title="Switch to degrees, minutes and seconds input"
      >
        <b-icon icon="compass-outline" />
      </b-radio-button>
    </b-field>
    <slot></slot>
  </b-field>
</template>
<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { GeoLoc } from "../../api/models/GeoLoc";
import { degAsDms, dmsStringToDec } from "../../api/converters";
import { isNumeric } from "../../api/validators";

@Component
export default class GeolocationInput extends Vue {
  @Prop({ default: new GeoLoc([0, 0, 0]) }) geo: GeoLoc;
  @Prop({ default: "is-normal" }) type: string;
  @Prop({ default: false }) shortLabels: boolean;

  private latVal = "";
  private lngVal = "";
  private altVal = "";

  private degMode = "dms";

  private showDegModeSwitcher = false;

  created() {
    this.sync();
  }

  get isDec() {
    return this.degMode === "dec";
  }

  get isDms() {
    return this.degMode === "dms";
  }

  get wrapperClasses() {
    const cls = [this.degMode, this.type];
    if (this.showDegModeSwitcher) {
      cls.push("show-deg-mode-switcher");
    }
    return cls;
  }

  get labels() {
    const lat = this.shortLabels? 'Lat.': 'Latitude';
    const lng = this.shortLabels? 'Lng.': 'Longitude';
    const alt = this.shortLabels? 'Alt.': 'Altitude';
    return {lat,lng, alt};
  }

  sync() {
    (this.latVal = this.isDec
      ? this.geo.lat.toString()
      : degAsDms(this.geo.lat, "lat")),
      "lat";
    this.lngVal = this.isDec
      ? this.geo.lng.toString()
      : degAsDms(this.geo.lng, "lng");
    this.altVal = this.geo.alt.toString();
    const dg = this.$ls.get("degMode");
    if (dg) {
      this.degMode = dg;
    }
  }

  @Watch("latVal")
  latChanged(newVal: string) {
    this.geo.lat = this.castDegVal(newVal);
    this.$emit('onChange', this.geo);
  }

  @Watch("lngVal")
  lngChanged(newVal: string) {
    this.geo.lng = this.castDegVal(newVal);
    this.$emit('onChange', this.geo);
  }
  @Watch("altVal")
  altChanged(newVal: string) {
    this.geo.alt = parseFloat(newVal);
    this.$emit('onChange', this.geo);
  }

  @Watch("geo")
  geoChanged() {
    this.sync();
  }

  castDegVal(newVal) {
    if (this.isDms) {
      return dmsStringToDec(newVal);
    } else if (isNumeric(newVal) && typeof newVal === "string") {
      return parseFloat(newVal);
    }
  }

  @Watch("degMode")
  degModeChanged() {
    if (this.degMode === "dms") {
      this.latVal = degAsDms(this.latVal, "lat", 1);
      this.lngVal = degAsDms(this.lngVal, "lng", 1);
    } else {
      this.latVal = dmsStringToDec(this.latVal).toFixed(6);
      this.lngVal = dmsStringToDec(this.lngVal).toFixed(6);
    }
    this.$ls.set("degMode", this.degMode);
  }

  get degPattern(): string {
    const numPatt = "([0-9]+(\\.[0-9]+)?)";
    return this.degMode === "dec"
      ? "-?" + numPatt
      : "-?" +
          [numPatt, numPatt + "?", numPatt + '?\\s*"?'].join(`\\s*[º'" ]\\s*`) +
          "(\\s*[NSWE])?";
  }

  get degPlaceholder(): string {
    return this.degMode === "dec" ? "45" : "45º 34' 36\"";
  }
}
</script>
