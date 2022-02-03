import Vue from "vue";
import { GeoLoc } from "./GeoLoc";
import {
  KeyNumValue,
  AyanamshaItem,
  SurfaceTSData,
  DefaultAyanamshaItem,
  KeySet,
} from "../interfaces";
import {
  calcJdPeriodRange,
  calcSign,
  subtractSign,
  deepClone,
  midLng,
  extractCorePlacenames,
  toWords,
} from "../helpers";
import {
  subtractLng360,
  julToISODate,
  weekDayNum,
  relativeAngle,
  toDateTime,
  shortTzAbbr,
  hourMinTz,
  julToDateFormat,
  weekDayNumIso,
  julToISODateObj,
  mediumDate,
  smartCastFloat,
  degAsDms,
} from "../converters";
import { Graha } from "./Graha";
import { notEmptyString } from "../validators";
import { matchReference } from "../mappers";
import { julToDateParts } from "../julian-date";

export interface Subject {
  name: string;
  altNames?: string[];
  type: string;
  notes?: string;
  gender: string;
  eventType: string;
  roddenValue?: number;
  roddenScale?: string;
  sources?: string[];
}

const emptySubject: any = {
  name: "",
  type: "person",
  gender: "-",
  eventType: "birth",
  roddenScale: "XX",
  roddenValue: -1,
};

export interface GrahaTransition {
  type: string;
  jd: number;
  datetime: Date;
}

export interface Placename {
  name: string;
  fullName: string;
  type: string;
  geo: GeoLoc;
}

export interface LngLat {
  lng: number;
  lat: number;
}

export interface BaseGraha {
  key: string;
  num: number;
  lng: number;
  lat: number;
  topo: LngLat;
  lngSpeed: number;
  declination: number;
  variants: Variant[];
  transitions: Array<GrahaTransition>;
}

export interface HouseSystem {
  system: string;
  values: Array<number>;
}

export interface Variant {
  num: number; // ayanamsha ref number
  sign: number;
  house: number;
  nakshatra: number;
  relationship: string;
  charaKaraka?: string;
}

export interface ObjectMatch {
  key: string;
  type: string;
  value: string;
}

export interface ObjectMatchSet {
  num: number;
  items: Array<ObjectMatch>;
}

export interface VariantSet {
  num: number;
  items: KeyNumValue[];
}

interface IndianTime {
  year: number;
  dayNum: number;
  progress: number;
  dayLength: number;
  isDayTime: boolean;
  dayBefore: boolean;
  dayStart: number;
  muhurta: number;
  ghati: number;
  vighati: number;
  lipta: number;
}

interface Muhurta {
  num: number;
  quality: string;
  jd: number;
  dt: string;
  exDays: Array<number>;
  active: boolean;
}

export class Chart {
  _id?: string;
  user: string;
  parent: string;
  isDefaultBirthChart: boolean;
  status?: string;
  subject = emptySubject;
  datetime: Date;
  jd: number;
  geo = new GeoLoc([0, 0, 0]);
  placenames: Array<Placename> = [];
  tz: string;
  shortTz = "";
  tzOffset: number;
  ascendant: number;
  mc: number;
  vertex: number;
  grahas: Array<BaseGraha> = [];
  houses: Array<HouseSystem> = [];
  indianTime: IndianTime;
  ayanamshas: Array<KeyNumValue> = [];
  upagrahas: Array<KeyNumValue> = [];
  sphutas: Array<VariantSet> = [];
  keyValues: Array<KeyNumValue> = [];
  objects: Array<ObjectMatchSet> = [];
  createdAt?: Date;
  modifiedAt?: Date;
  ayanamshaItem?: AyanamshaItem;
  vargaNum = 1;
  surface: SurfaceTSData = {
    geo: { lat: 0, lng: 0 },
    ascendant: -90,
    tzOffset: 0,
  };
  [key: string]: any;

  constructor(result: any = null, surface = null) {
    if (result instanceof Object) {
      Object.entries(result).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "_id":
          case "user":
          case "tz":
          case "shortTz":
          case "status":
          case "parent":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
          case "subject":
            if (v instanceof Object) {
              this[k] = v as Subject;
            }
            break;
          case "indianTime":
            if (v instanceof Object) {
              this[k] = v as IndianTime;
            }
            break;
          case "geo":
            this.geo = new GeoLoc(v);
            break;
          //case "datetime":
          case "createdAt":
          case "modifiedAt":
            if (typeof v === "string") {
              this[k] = toDateTime(v, true);
            } else if (v instanceof Date) {
              this[k] = v;
            }
            break;
          case "jd":
          case "mc":
          case "ascendant":
          case "vertex":
          case "tzOffset":
            this[k] = smartCastFloat(v);
            break;
          case "grahas":
            if (v instanceof Array) {
              this.grahas = v.filter((g) => g instanceof Object);
            }
            break;
          case "placenames":
          case "sphutas":
          case "upagrahas":
          case "keyValues":
          case "objects":
          case "houses":
          case "ayanamshas":
            if (v instanceof Array) {
              this[k] = v;
            }
            break;
        }
      });
    }
    if (surface instanceof Object) {
      this.surface = surface;
    }
    if (this.jd) {
      this.datetime = julToISODateObj(this.jd, this.tzOffset, true);
    }
  }

  setVarga(num = 1) {
    this.vargaNum = num;
  }

  setAyanamshaItem(ayanamshaItem: AyanamshaItem) {
    const value = this.getAyanamshaValue(ayanamshaItem.key);
    const av = value >= 0 ? { ...ayanamshaItem, value } : ayanamshaItem;
    this.ayanamshaItem = Object.assign({}, av);
    return this.ayanamshaItem;
  }

  getAyanamshaValue(key: string): number {
    const item = this.ayanamshas.find((a) => a.key === key);
    if (item) {
      return item.value;
    } else {
      return -1;
    }
  }

  get ayanamshaOffset() {
    if (this.ayanamshaItem instanceof Object) {
      return this.ayanamshaItem.value;
    } else {
      return 0;
    }
  }

  get hasParent() {
    return notEmptyString(this.parent, 16);
  }

  get isBirthChart() {
    return this.subject.eventType === "birth";
  }

  get surfaceAscendantGraha() {
    let lng = 0;
    if (this.surface.ascendant >= 0) {
      lng = this.surface.ascendant;
    }
    return this.buildGraha("as", lng, 0);
  }

  get surfaceGeo() {
    return this.surface.geo;
  }

  get ayanamshaNum() {
    if (this.ayanamshaItem instanceof Object) {
      return this.ayanamshaItem.num;
    } else {
      return 0;
    }
  }

  // adjusted ascendant
  get lagna() {
    return subtractLng360(this.ascendant, this.ayanamshaOffset);
  }

  get firstHouseSignIndex() {
    return Math.floor(this.lagna / 30);
  }

  get firstHouseSign() {
    return this.firstHouseSignIndex + 1;
  }

  get firstHouseLng() {
    return this.firstHouseSignIndex * 30;
  }

  get houseSignMap(): Map<number, number> {
    const firstHouseIndex = this.firstHouseSign - 1;
    const mp: Map<number, number> = new Map();
    for (let i = 0; i < 12; i++) {
      const houseNum = i + 1;
      const sign = ((i + firstHouseIndex) % 12) + 1;
      mp.set(houseNum, sign);
    }
    return mp;
  }

  get signHouseMap(): Map<number, number> {
    const firstHouseIndex = this.firstHouseSign - 1;
    const mp: Map<number, number> = new Map();
    for (let i = 0; i < 12; i++) {
      const signNum = i + 1;
      const house = ((i - firstHouseIndex + 12) % 12) + 1;
      mp.set(signNum, house);
    }
    return mp;
  }

  get signIndexMap(): Map<string, number> {
    const mp: Map<string, number> = new Map();
    const keys = ["sa", "ju", "ma", "su", "ve", "me", "mo", "as", "ke", "ra"];
    for (const key of keys) {
      mp.set(key, this.graha(key).signIndex);
    }
    return mp;
  }

  get ascendantGraha(): Graha {
    return this.buildGraha("as", this.ascendant, 0);
  }

  get descendant() {
    return (this.ascendant + 180) % 360;
  }

  get descendantGraha(): Graha {
    return this.buildGraha("ds", this.descendant, 0);
  }

  get mandiGraha(): Graha {
    const mn = this.upagrahas.find((up) => up.key === "md");
    let lng = 0;
    if (mn) {
      lng = mn.value;
    }
    return this.buildGraha("md", lng);
  }

  get gulikaGraha(): Graha {
    const gu = this.upagrahas.find((u) => u.key === "gu");
    let lng = 0;
    if (gu) {
      lng = gu.value;
    }
    return this.buildGraha("gu", lng);
  }

  get ic() {
    return (this.mc + 180) % 360;
  }

  get mcGraha(): Graha {
    return this.buildGraha("mc", this.mc);
  }

  get icGraha(): Graha {
    return this.buildGraha("ic", this.ic);
  }

  get gender() {
    return this.subject instanceof Object ? this.subject.gender : "";
  }

  get isDayTime() {
    return this.indianTime instanceof Object
      ? this.indianTime.isDayTime
      : false;
  }

  buildGraha(key: string, lng: number, houseIndex = -1): Graha {
    const gr = matchReference(key, { lng });
    gr.setAyanamshaItem(this.ayanamshaItem);
    gr.setVarga(this.vargaNum);
    const hi =
      houseIndex < 0
        ? subtractSign(calcSign(gr.longitude), calcSign(this.lagna))
        : houseIndex;
    gr.variants = [
      {
        num: this.ayanamshaNum,
        house: hi + 1,
        sign: calcSign(this.longitude),
        nakshatra: Math.floor(gr.longitude / 27) + 1,
        relationship: "",
        charaKaraka: 0,
      },
    ];
    return gr;
  }

  get summary() {
    const { name, gender } = this.subject;
    const locality = extractCorePlacenames(this.placenames);
    const modified = this.modifiedAt;
    let lastEditInfo = "";
    if (modified) {
      lastEditInfo = "Last edited on " + mediumDate(modified);
    }
    const localDt = this.localDate("euro1", "m");
    return {
      id: this._id,
      name,
      gender,
      datetime: this.datetime,
      localDt,
      locality,
      modified,
      lastEditInfo,
    };
  }

  get hasId() {
    return notEmptyString(this._id, 12);
  }

  get name() {
    let str = "";
    if (this.subject instanceof Object) {
      const { name } = this.subject;
      if (notEmptyString(name)) {
        str = name;
      }
    }
    return str;
  }

  get julianDate() {
    return julToDateParts(this.jd, this.tzOffset);
  }

  get hasName() {
    return notEmptyString(this.subject.name);
  }

  get info() {
    let str = "";
    if (this.hasName) {
      str = `${this.name} (${this.gender}): ${this.julianDate.dmyDate}, ${this.latDms} ${this.lngDms}`;
    }
    return str;
  }

  get latDms() {
    return degAsDms(this.geo.lat, "lat");
  }

  get lngDms() {
    return degAsDms(this.geo.lng, "lng");
  }

  get year() {
    return this.julianDate.year;
  }

  get nameGender() {
    return `${this.name} (${this.gender})`;
  }

  get nameGenderYear() {
    return [this.nameGender, this.year].join(", ");
  }

  get shortName() {
    return this.shortenName(10);
  }

  get mediumName() {
    return this.shortenName(15);
  }

  shortenName(maxLength = 10) {
    let str = this.name.split(" ").shift();
    if (str.length > maxLength) {
      str = str.substring(0, maxLength);
    }
    return str;
  }

  get moonPhase(): number {
    const lng = (this.moon.longitude + 360 - this.sun.longitude) % 360;
    return Math.floor(lng / 90) + 1;
  }

  get moonWaxing(): boolean {
    return this.moonPhase <= 2;
  }

  get bodies(): Array<Graha> {
    return this.grahas.map((gr) => {
      const graha = new Graha(gr);
      graha.setAyanamshaItem(this.ayanamshaItem);
      graha.setVarga(this.vargaNum);
      return graha;
    });
  }

  get grahasAndAsc(): Array<Graha> {
    return [...this.bodies, this.ascendantGraha];
  }

  grahaRow(key: string) {
    return this.grahas.find((gr) => gr.key === key);
  }

  graha(key: string): Graha {
    let graha = new Graha(null);
    switch (key) {
      case "as":
        graha = this.ascendantGraha;
        break;
      case "ds":
        graha = this.descendantGraha;
        break;
      case "md":
        graha = this.mandiGraha;
        break;
      case "gu":
        graha = this.gulikaGraha;
        break;
      case "mc":
        graha = this.mcGraha;
        break;
      case "ic":
        graha = this.icGraha;
        break;
      default:
        graha = new Graha(this.grahaRow(key));
        break;
    }

    graha.setAyanamshaItem(this.ayanamshaItem);
    graha.setVarga(this.vargaNum);
    return graha;
  }

  get sunRow() {
    return this.grahaRow("su");
  }

  get sun(): Graha {
    return this.graha("su");
  }

  get moon(): Graha {
    return this.graha("mo");
  }

  get sunTransitions() {
    let transitions: Array<GrahaTransition> = [];
    if (this.sunRow) {
      transitions = this.sunRow.transitions;
    }
    return transitions;
  }

  sunTransition(key = "rise"): GrahaTransition {
    let transition = { type: "", jd: 0, datetime: null };
    if (this.sunRow) {
      const tr = this.sunRow.transitions.find((tr) => tr.type === key);
      if (tr instanceof Object) {
        transition = tr;
      }
    }
    return transition;
  }

  digBala(key: string) {
    const grLng = this.graha(key).longitude;
    let diff = 0;
    switch (key) {
      case "su":
      case "ma":
        diff = this.icGraha.longitude - grLng;
        break;
      case "me":
      case "ju":
        diff = this.descendantGraha.longitude - grLng;
        break;
      case "mo":
      case "ve":
        diff = this.mcGraha.longitude - grLng;
        break;
      case "sa":
        diff = this.ascendantGraha.longitude - grLng;
        break;
    }
    const absVal = Math.abs(diff);
    const dist = absVal > 180 ? 360 - absVal : absVal;
    return dist / 3;
  }

  get sunRise() {
    return this.sunTransition("rise");
  }

  get sunSet() {
    return this.sunTransition("set");
  }

  get sunPrevSet() {
    return this.sunTransition("prevSet");
  }

  get sunPrevRise() {
    return this.sunTransition("prevRise");
  }

  get sunNextRise() {
    return this.sunTransition("nextRise");
  }

  get sunMoonAngle() {
    return relativeAngle(this.sun.longitude, this.moon.longitude);
  }

  get hasIndianTime() {
    return this.indianTime instanceof Object;
  }

  localDate(fmt = "euro1", timePrecision = "s") {
    const opts = {
      time: ["h", "m", "s"].includes(timePrecision),
      seconds: timePrecision === "s",
    };
    return julToDateFormat(this.jd, this.tzOffset, fmt, opts);
  }

  localTime(timePrecision = "s") {
    const opts = {
      time: ["h", "m", "s"].includes(timePrecision),
      seconds: timePrecision === "s",
    };
    return julToDateFormat(this.jd, this.tzOffset, "-", opts);
  }

  getObjects(ayanamshaNum: number): Array<ObjectMatch> {
    let items: Array<ObjectMatch> = [];
    if (this.objects.length > 0) {
      const row = this.objects.find((set) => set.num === ayanamshaNum);
      if (row) {
        items = row.items;
      }
    }
    return items;
  }

  getSphutaValues(ayanamshaNum: number): Array<KeyNumValue> {
    let items: Array<KeyNumValue> = [];
    if (this.sphutas.length > 0) {
      const row = this.sphutas.find((set) => set.num === ayanamshaNum);
      if (row) {
        items = row.items;
      }
    }
    return items;
  }

  get sphutaValues(): Array<KeyNumValue> {
    return this.getSphutaValues(this.ayanamshaNum);
  }

  get hasVara() {
    return this.vara instanceof Object;
  }

  get hasHora() {
    return this.hora instanceof Object;
  }

  get ghatiVal() {
    return this.hasIndianTime ? this.indianTime.progress * 60 : 0;
  }

  get progress() {
    return this.hasIndianTime ? this.indianTime.progress : 0;
  }

  get hasKalam() {
    return this.kalam instanceof Object;
  }

  get gmtOffset(): number {
    return this.tzOffset / 3600;
  }

  get tzAbbr() {
    return /^[a-z]+$/i.test(this.shortTz)
      ? this.shortTz
      : shortTzAbbr(this.datetime, this.tz, -2);
  }

  get tzText(): string {
    const abbr = this.tzAbbr;
    let hoursOffset = "";
    if (/[A-Z]+/.test(abbr)) {
      hoursOffset = hourMinTz(this.tzOffset);
    }
    return [abbr, hoursOffset].join(" ").trim();
  }

  get corePlacenames() {
    const detailTypes = ["PSCD", "STRT"];
    return this.placenames.length > 0
      ? this.placenames
          .filter((pl) => detailTypes.includes(pl.type) === false)
          .map((pl) => pl.name)
          .reverse()
          .join(", ")
      : "";
  }

  matchLng(key: any, retVal = -1) {
    const graha = this.graha(key);
    if (graha) {
      return graha.longitude;
    }
    return retVal;
  }

  addBodyLngs(keys: Array<any>) {
    return (
      keys.map((k) => this.matchLng(k, 0)).reduce((a, b) => a + b, 0) % 360
    );
  }

  calcYogiSphuta() {
    const deg = this.addBodyLngs(["su", "mo"]);
    const supplement = 93 + 1 / 3; /// 93 1/3
    return (deg + supplement) % 360;
  }

  calcBijaSphuta() {
    return this.addBodyLngs(["su", "ve", "ju"]);
  }

  calcKsetraSphuta() {
    return this.addBodyLngs(["mo", "ma", "ju"]);
  }
}

export const applyAyanamsha = (
  chart: Chart,
  grahas: Array<Graha>,
  item: AyanamshaItem
) => {
  const av = chart.setAyanamshaItem(item);
  grahas.forEach((gr) => {
    gr.setAyanamshaItem(av);
  });
};

export class Tag {
  slug = "";
  name = "";
  vocab = "descriptive";
  constructor(inData = null) {
    if (inData instanceof Object) {
      const { slug, name, vocab } = inData;
      if (typeof slug === "string") {
        this.slug = slug;
      }
      if (typeof name === "string") {
        this.name = name;
      }
      if (typeof vocab === "string") {
        this.vocab = vocab;
      }
    }
  }
}

export class PairedChart {
  _id?: string;
  user: string;
  c1: Chart;
  c2: Chart;
  timespace: Chart;
  surfaceGeo: GeoLoc;
  surfaceAscendant: number;
  surfaceTzOffset: number;
  midMode = "midpoint";
  relType = "";
  tags: Tag[];
  startYear = -1;
  endYear = -1;
  span = 0;
  notes = "";
  createdAt: Date;
  modifiedAt: Date;

  constructor(inData = null) {
    if (inData instanceof Object) {
      let timespace = null;
      Object.entries(inData).forEach((entry) => {
        const [key, val] = entry;

        if (val instanceof Array) {
          switch (key) {
            case "tags":
              this.tags = val.map((tg) => new Tag(tg));
              break;
          }
        } else if (val instanceof Object) {
          switch (key) {
            case "c1":
            case "c2":
              this[key] = new Chart(val);
              break;
            case "timespace":
              timespace = val;
              break;
            case "surfaceGeo":
              this[key] = new GeoLoc(val);
              break;
          }
        } else if (typeof val === "number") {
          switch (key) {
            case "surfaceAscendant":
            case "surfaceTzOffset":
            case "startYear":
            case "endYear":
            case "span":
              this[key] = val;
              break;
          }
        } else if (typeof val === "string") {
          switch (key) {
            case "notes":
            case "midMode":
            case "relType":
            case "_id":
              this[key] = val;
              break;
            case "createdAt":
            case "modifiedAt":
              this[key] = new Date(val);
              break;
          }
        }
      });
      if (timespace instanceof Object) {
        this.timespace = new Chart(timespace, this.surfaceGeo);
      }
    }
  }

  filterByVocab(key = "") {
    return this.tags.filter((tg) => tg.vocab === key);
  }

  filterOneByVocab(key = "") {
    return this.tags.find((tg) => tg.vocab === key);
  }

  filterOneSlugByVocab(key = "") {
    const tag = this.filterOneByVocab(key);
    return tag instanceof Object ? tag.slug : "";
  }

  get relationshipTags() {
    return this.filterByVocab("type");
  }

  get defaultRelType() {
    return {
      slug: this.relType,
      name: toWords(this.relType),
      vocab: "type",
    };
  }

  get primaryRelationship() {
    const firstRel =
      this.relationshipTags.length > 0 ? this.relationshipTags[0] : null;
    return firstRel instanceof Object ? firstRel : this.defaultRelType;
  }

  get typeKeys() {
    return this.relationshipTags.map((tg) => tg.slug);
  }

  get relIdString() {
    return this.typeKeys.join("__");
  }

  get qualityTags() {
    return this.filterByVocab("quality");
  }

  get endHow() {
    return this.filterOneSlugByVocab("end_how");
  }

  get endWho() {
    return this.filterOneSlugByVocab("end_who");
  }

  get traits() {
    return this.filterByVocab("trait");
  }
}

export class ChartWidgetData {
  chart = new Chart(null);
  ayanamsha: AyanamshaItem = DefaultAyanamshaItem;
  vargaNum = 1;
  position = "";
  type = "";
  index = 0;
  mode = "";
  midMode = "";
  timespaceMode = "";
  height = 0;
  width = 0;
  maxHeight = 0;
  maxWidth = 0;
  zoomLevel = 0;
  chalitBhava = false;
  hasComposite = false;
  isCurrent = false;
  openBodyRef: KeySet = { key: "", set: 0 };

  constructor(
    chart: Chart,
    position = "inner",
    type = "c1",
    inData = null,
    ayanamsha: AyanamshaItem = DefaultAyanamshaItem
  ) {
    this.chart = chart;
    this.position = position;
    this.type = type;
    this.ayanamsha = ayanamsha;
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [key, val] = entry;
        switch (key) {
          case "mode":
          case "midMode":
          case "timespaceMode":
            if (typeof val === "string") {
              this[key] = val;
            }
            break;
          case "index":
          case "height":
          case "vargaNum":
          case "width":
          case "maxHeight":
          case "maxWidth":
          case "zoomLevel":
            if (typeof val === "number") {
              this[key] = val;
            }
            break;
          case "chalitBhava":
          case "hasComposite":
          case "isCurrent":
            if (typeof val === "boolean") {
              this[key] = val;
            }
            break;
          case "openBodyRef":
            if (val instanceof Object) {
              this[key] = val as KeySet;
            }
            break;
        }
      });
    }
  }
}

export const combineCharts = (
  c1: Chart,
  c2: Chart,
  ayanamsha: AyanamshaItem
) => {
  const grahas = c1.grahas.map((gr) => {
    const mb = c2.grahas.find((g2) => g2.key === gr.key);
    const midG = deepClone(gr);
    midG.lng = midLng(gr.lng, mb.lng);
    return midG;
  });

  const ascendant = midLng(c1.ascendant, c2.ascendant);
  const ayanamshas = c1.ayanamshas.map((ay1) => {
    const ay2 = c2.ayanamshas.find((a2) => a2.key === ay1.key);
    const aya = Object.assign({}, ay1);
    if (ay2) {
      aya.value = (ay1.value + ay2.value) / 2;
    }
    return aya;
  });
  const upagrahas = c1.upagrahas.map((up1) => {
    const up2 = c2.upagrahas.find((u2) => u2.key === up1.key);
    const upa = Object.assign({}, up1);
    if (up2) {
      upa.value = midLng(up1.value, up2.value);
    }
    return upa;
  });
  const sphutas = c1.sphutas.map((ss1) => {
    const ss2 = c2.sphutas.find((s1) => s1.num === ss1.num);
    const ss = {
      num: ss1.num,
      items: [],
    };
    if (ss2) {
      ss.items = ss1.items.map((sp1) => {
        const sp2 = ss2.items.find((s2) => s2.key === sp1.key);
        const sp = Object.assign({}, sp1);
        if (sp2) {
          sp.value = midLng(sp1.value, sp2.value);
        }
      });
    }
    return ss;
  });
  const jd = (c1.jd + c2.jd) / 2;
  const houses = c1.houses.map((hs) => {
    const house = Object.assign({}, hs);
    const hs2 = c2.houses.find((h) => h.system === hs.system);
    switch (hs.system) {
      case "P":
        house.values = hs.values.map((v, i) => {
          return midLng(v, hs2.values[i]);
        });
        break;
      case "W":
        house.values = [Math.floor(ascendant / 30) * 30];
        break;
    }
  });
  const chart = {
    jd,
    ascendant,
    houses,
    grahas,
    ayanamshas,
    upagrahas,
    sphutas,
  };
  const nc = new Chart(chart);
  applyAyanamsha(nc, nc.bodies, ayanamsha);
  return nc;
};

export const extractSurfaceData = (paired: any) => {
  let surface = null;
  if (paired instanceof Object) {
    const { surfaceGeo, surfaceAscendant, surfaceTzOffset } = paired;
    if (surfaceGeo instanceof Object) {
      const { lat, lng } = surfaceGeo;
      surface = {
        geo: { lng, lat },
        ascendant: surfaceAscendant,
        tzOffset: surfaceTzOffset,
      };
    }
  }
  return surface;
};

export const fetchCurrentTimespace = () => {
  const pc = Vue.ls.get("selected-pc");
  if (pc) {
    const { timespace } = pc;
    if (timespace instanceof Object) {
      const surface = extractSurfaceData(pc);
      return new Chart(timespace, surface);
    }
  }
  return new Chart();
};
