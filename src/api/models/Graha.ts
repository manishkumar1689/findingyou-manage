import { Nakshatra } from "./Nakshatra";
import { LngLat, VariantValSet, AyanamshaItem } from "../interfaces";
import nakshatraValues from "../mappings/nakshatra-values";
import { zeroPad, subtractLng360 } from "../converters";
import grahaValues, { directionalStrengthMap } from "../mappings/graha-values";
import {
  calcVargaValue,
  nakshatra28Progress,
  withinNakshatra28,
  withinNakshatra27,
  nakshatra27,
  nakshatra28,
  degToSign,
} from "../helpers";
import { isNumeric } from "../validators";

export class Graha {
  num = 0;
  name = "";
  key = "";
  jyNum = 0;
  icon = "";
  bhuta = "";
  guna = "";
  caste = "";
  dhatu = "";
  dosha: Array<string> = [];
  lng = 0;
  lat = 0;
  topo: LngLat = {
    lng: 0,
    lat: 0,
  };
  lngSpeed = 0;
  declination = 0;
  friends = [];
  neutral = [];
  enemies = [];
  ayanamshaItem: AyanamshaItem = { num: 0, key: "", value: 0, name: "" };
  vargaNum = 1;
  ownHouses: Array<number> = [];
  variants: Array<VariantValSet>;
  [key: string]: any;

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "house":
          case "withinSign":
            break;
          case "lng":
          case "lat":
          case "declination":
          case "lngSpeed":
          case "num":
          case "jyNum":
            if (typeof v === "number") {
              this[k] = v;
            }
            break;
          case "variants":
            if (v instanceof Array) {
              this[k] = v;
            }
            break;
          default:
            this[k] = v;
            break;
        }
      });
    }
  }

  setAyanamshaItem(ayanamshaItem: AyanamshaItem) {
    this.ayanamshaItem = ayanamshaItem;
  }

  setVarga(num = 1) {
    this.vargaNum = num;
  }

  get withinSign() {
    return this.longitude % 30;
  }

  get signIndex() {
    return Math.floor(this.longitude / 30);
  }

  get sign() {
    return this.signIndex + 1;
  }

  get variant() {
    let variant = {
      num: 0,
      sign: 0,
      house: 0,
      nakshatra: 0,
      relationship: "",
      charaKaraka: 0,
    };
    if (this.variants instanceof Array) {
      const matched = this.variants.find((v) => v.num === this.ayanamshaNum);
      if (matched) {
        variant = matched;
      }
    }
    return variant;
  }

  get house() {
    let house = 0;
    if (this.variant.num >= 0) {
      house = this.variant.house;
    }
    return house;
  }

  get ownSigns() {
    return this.settings.ownSign;
  }

  get settings() {
    const matched = grahaValues.find((gr) => gr.key === this.key);
    const grahaRow = matched instanceof Object ? matched : grahaValues[0];
    return grahaRow;
  }

  get nakshatra(): Nakshatra {
    let nk = null;
    if (this.variant.num >= 0) {
      const nkNum = this.variant.nakshatra;

      const targetKey = "n27_" + zeroPad(nkNum, 2);
      nk = nakshatraValues.find((nak) => nak.key === targetKey);
      if (nk instanceof Object) {
        nk.percent = 100 * ((this.longitude / (360 / 27)) % 1);
      }
    }
    return new Nakshatra(nk);
  }

  get pada(): number {
    return Math.floor(this.nakshatra.percent / 25) + 1;
  }

  get longitude(): number {
    return calcVargaValue(
      subtractLng360(this.lng, this.ayanamshaValue),
      this.vargaNum
    );
  }

  get latitude(): number {
    return this.lat;
  }

  get nakshatraDegrees(): number {
    return this.longitude % (360 / 27);
  }

  get nakshatraPercent(): number {
    return (this.nakshatraDegrees / (360 / 27)) * 100;
  }

  get nakshatraRemainder(): number {
    return 100 - this.nakshatraPercent;
  }

  get padaIndex(): number {
    return Math.floor(this.nakshatraPercent / 25);
  }

  get padaNum(): number {
    return this.padaIndex + 1;
  }

  get relationship(): string {
    return this.variant.relationship;
  }

  get ruler(): string {
    let str = "";
    const rk = grahaValues.find((b) => b.ownSign.includes(this.sign));
    if (rk) {
      str = rk.key;
    }
    return str;
  }

  get akshara(): string {
    return this.nakshatra.aksharas.length > this.padaIndex
      ? this.nakshatra.aksharas[this.padaIndex]
      : "";
  }

  get charaKaraka(): number {
    return this.variant.num >= 0 ? this.variant.charaKaraka : 0;
  }

  get isExalted(): boolean {
    return this.settings.exalted === this.sign;
  }

  get vargottama(): boolean {
    const adjustedLng = subtractLng360(this.lng, this.ayanamshaValue);
    const lngD1 = calcVargaValue(adjustedLng, 1);
    const lngD9 = calcVargaValue(adjustedLng, 9);
    return degToSign(lngD1) === degToSign(lngD9);
  }

  get nakshatra27() {
    return nakshatra27(this.longitude);
  }

  get nakshatra28() {
    return nakshatra28(this.longitude);
  }

  get withinNakshatra27() {
    return withinNakshatra27(this.longitude);
  }

  get withinNakshatra28() {
    return withinNakshatra28(this.longitude);
  }

  get nakshatra28Progress() {
    return nakshatra28Progress(this.longitude);
  }

  get ayanamshaNum() {
    if (this.ayanamshaItem instanceof Object) {
      const { num } = this.ayanamshaItem;
      if (isNumeric(num)) {
        return num;
      }
    }
    return 1;
  }

  get ayanamshaValue() {
    if (this.ayanamshaItem instanceof Object) {
      const { value } = this.ayanamshaItem;
      if (isNumeric(value)) {
        return value;
      }
    }
    return 0;
  }

  get hasDirectionalStrength(): boolean {
    if (Object.keys(directionalStrengthMap).includes(this.key)) {
      return directionalStrengthMap[this.key] === this.variant.house;
    } else {
      return false;
    }
  }

  directionalStrengthSign(firstSignNum = 1): number {
    if (Object.keys(directionalStrengthMap).includes(this.key)) {
      const house = directionalStrengthMap[this.key];
      return house - 1 + ((firstSignNum - 1) % 12) + 1;
    } else {
      return 0;
    }
  }
}

export const mapSignToHouse = (sign: number, houses: Array<number>): number => {
  const numH = houses.length;
  let hn = 0;
  if (numH > 0) {
    const diff = houses[0] / 30;
    const hnr = (sign - diff) % numH;
    hn = hnr < 1 ? hnr + numH : hnr;
  }
  return hn;
};
