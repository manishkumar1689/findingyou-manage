import { validDateTimeString, validDateString } from "../validators";
import { KeyObject } from "../interfaces";

export class PlanetStation {
  station = "";
  num = 0;
  jd = 0;
  datetime = new Date();
  speed = 0;
  retro = false;
  acceleration = false;
  rising = false;
  switching = false;
  [key: string]: any;

  constructor(inData: any) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "datetime":
          case "dt":
            if (typeof v === "string") {
              if (validDateTimeString(v) || validDateString(v, false)) {
                this.datetime = new Date(v);
              }
            }
            break;
          case "spd":
            if (typeof v === "number") {
              this.speed = v;
            }
            break;
          default:
            this[k] = v;
            break;
        }
      });
    }
  }
}

export class PlanetStationSet {
  key = "";
  values: Array<PlanetStation> = [];
  [key: string]: any;

  constructor(inData: any) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "key":
            if (typeof v === "string") {
              this.key = v;
            }
            break;
          case "values":
            if (v instanceof Array) {
              this.values = v
                .map((p) => new PlanetStation(p))
                .filter((ps) => ps.jd > 0);
            }
            break;
        }
      });
    }
  }

  get columns(): Array<KeyObject> {
    const pObjs = this.values.map((ps, si) => {
      return {
        key: `st${si}`,
        value: ps,
      };
    });
    return [{ key: "key", value: this.key }, ...pObjs];
  }
}
