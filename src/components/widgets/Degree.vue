<template>
  <b-tooltip
    class="degrees-dms"
    :class="classNames"
    :label="degDisplay"
    :active="tooltip"
    position="is-bottom"
  >
    <span class="degrees" :title="fullDegValue"
      >{{ negator }}{{ degrees }}º</span
    >
    <slot></slot>
    <span class="minutes">{{ minutes }}'</span>
    <span v-if="showSeconds" class="seconds">{{ seconds }}"</span>
    <span v-if="hasLetter" class="direction">{{ letter }}</span>
  </b-tooltip>
</template>
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  decDegToDms,
  addDegreeLetter,
  DegreesMinutesSeconds,
  zeroPad,
  decPlaces,
} from "../../api/converters";

@Component
export default class Degree extends Vue {
  @Prop({ default: 0 }) deg: number;
  @Prop({ default: 0 }) fullDeg: number;
  @Prop({ default: 0 }) readonly precision: number;
  @Prop({ default: "raw" }) readonly mode: string;
  @Prop({ default: -1 }) readonly decimals: number;
  @Prop({ default: null }) readonly classes: any;
  @Prop({ default: true }) readonly zeropad: boolean;
  @Prop({ default: true }) readonly tooltip: boolean;

  get classNames(): Array<string> {
    const cls = [];
    if (this.classes instanceof Array) {
      this.classes.forEach((c) => {
        cls.push(c);
      });
    } else if (typeof this.classes === "string") {
      cls.push(this.classes);
    }
    if (this.showSeconds) {
      cls.push(["dec", this.precision].join("-"));
      cls.push("show-seconds");
    } else {
      cls.push("hide-seconds");
    }
    return cls;
  }

  get degDisplay(): string {
    return this.deg.toFixed(this.degPrecision) + "º";
  }

  get degPrecision(): number {
    return this.decimals >= 0
      ? this.decimals
      : this.precision < 1
      ? 4
      : this.precision + 3;
  }

  get showSeconds(): boolean {
    return this.precision >= 0;
  }

  get letter(): string {
    return addDegreeLetter(this.deg, this.mode);
  }

  get hasLetter(): boolean {
    return this.letter.length > 0;
  }

  get isNeg(): boolean {
    return this.deg < 0;
  }

  get dms(): DegreesMinutesSeconds {
    return decDegToDms(this.deg);
  }

  get degrees(): string {
    return this.zeropad ? zeroPad(this.degs) : this.degs.toString();
  }

  get minutes(): string {
    return this.zeropad ? zeroPad(this.mins) : this.mins.toString();
  }

  get seconds(): string {
    return this.zeropad ? zeroPad(this.secs) : this.secs;
  }

  get degs(): number {
    return Math.abs(this.dms.deg);
  }

  get mins(): number {
    const mins =
      this.secsFl >= 60 && this.secsFl < 60.1 ? this.dms.min + 1 : this.dms.min;
    return mins;
  }

  get secPlaces(): number {
    return this.precision >= 0 ? this.precision : 0;
  }

  get secsFl(): number {
    return parseFloat(this.dms.sec.toFixed(this.secPlaces));
  }

  get secs(): string {
    return (this.secsFl % 60)
      .toFixed(this.secPlaces)
      .replace(/\.(\d+?)0+$/, ".$1")
      .replace(/\.0*$/, "");
  }

  get negator(): string {
    return !this.hasLetter && this.isNeg ? "-" : "";
  }

  get fullDegValue() {
    return decPlaces(this.fullDeg, 5);
  }
}
</script>
