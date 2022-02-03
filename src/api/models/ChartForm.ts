import { Chart } from "./Chart";
import { notEmptyString } from "../validators";
import { toDateTime } from "../converters";
import { SlugName } from "../interfaces";

export interface ChartInput {
  user: string;
  lat: number;
  lng: number;
  alt?: number;
  datetime: Date | string;
  name?: string;
  type: string;
  isDefaultBirthChart: boolean;
  gender?: string;
  eventType: string;
  roddenValue?: number;
  roddenScale?: string;
  tzOverride?: boolean;
  tzOffset?: number;
  tz?: string;
  parent?: string;
  dateDisplay?: string;
  label?: string;
  jd?: number;
  _id?: string;
}

export interface PairedInput {
  _id?: string;
  user: string;
  c1: string;
  c2: string;
  midMode?: string;
  notes?: string;
  relType?: string;
  startYear?: number;
  span?: number;
  tags?: SlugName[];
}

export class ChartForm {
  _id?: string;
  active: boolean;
  index = 0;
  lat: number;
  lng: number;
  alt: number;
  isDefaultBirthChart = true;
  datetime: Date;
  name = "";
  type = "person";
  gender = "-";
  eventType = "birth";
  roddenValue?: number;
  roddenScale?: string;
  tzOverride = false;
  tzOffset?: number;
  chart = new Chart();

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "lat":
          case "lng":
          case "alt":
          case "tzOffset":
          case "roddenValue":
            if (typeof v === "number") {
              this[k] = v;
            }
            break;
          case "_id":
          case "name":
          case "type":
          case "eventType":
          case "gender":
          case "roddenScale":
          case "tz":
          case "shortTz":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
          case "datetime":
            if (typeof v === "string") {
              this[k] = toDateTime(v);
            } else if (v instanceof Date) {
              this[k] = v;
            }
            break;
          case "isDefaultBirthChart":
            if (typeof v === "boolean") {
              this[k] = v;
            }
            break;
          case "chart":
          case "result":
          case "charts":
            this.chart = new Chart(v);
            break;
        }
      });
    }
  }

  loadResults(result: any = null) {
    this.chart = result instanceof Chart ? result : new Chart(result);
    this.lat = this.chart.geo.lat;
    this.lng = this.chart.geo.lng;
    this.name = this.chart.subject.name;
    this.gender = this.chart.subject.gender;
    this.type = this.chart.subject.type;
    this.eventType = this.chart.subject.eventType;
    this.roddenValue = this.chart.subject.roddenValue;
  }

  get id() {
    return notEmptyString(this.chart._id, 8)
      ? this.chart._id
      : ["new__", this.index].join("-");
  }
  get hasId() {
    return this.id.length > 8;
  }
}
