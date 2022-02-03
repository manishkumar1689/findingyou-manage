<template>
  <div class="rashi" :class="classNames" :title="degFormatted">
    <Degree :deg="degInSign" :fullDeg="deg" :precision="precision">
      <span class="symbol" :class="signClass" :title="signName"></span>
    </Degree>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Degree from "./Degree.vue";
import rashiValues from "../../api/mappings/rashi-values";
import { RashiObj } from "../../api/interfaces";
import { decPlaces, degAsDms } from "../../api/converters";
import { isNumeric } from "../../api/validators";
@Component({
  components: {
    Degree,
  },
})
export default class SignDegree extends Vue {
  @Prop({ default: 0 }) deg: number;
  @Prop({ default: false }) seconds: boolean;

  get classNames(): Array<string> {
    const cls = [
      ["sign", this.signNum].join("-"),
      ["rashi", this.key].join("-"),
    ];
    return cls;
  }

  get safeDeg() {
    return isNumeric(this.deg) && !isNaN(this.deg) ? this.deg : 0;
  }

  get precision() {
    return this.seconds ? 0 : -1;
  }

  get deg5(): string {
    return decPlaces(this.degInSign, 5);
  }

  get degInSign(): number {
    return this.safeDeg % 30;
  }

  get signIndex(): number {
    return Math.floor(this.safeDeg / 30);
  }

  get signNum(): number {
    return this.signIndex + 1;
  }

  get sign(): RashiObj {
    return rashiValues[(this.signIndex + 12) % 12];
  }

  get key(): string {
    return this.sign.key;
  }

  get signClass(): string {
    return ["icon-sign", this.signNum].join("-");
  }

  get signName(): string {
    return this.sign.en;
  }

  get degFormatted() {
    return degAsDms(this.deg);
  }
}
</script>
