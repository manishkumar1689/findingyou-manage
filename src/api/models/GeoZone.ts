import { smartCastFloat } from "../converters";

export class Toponym {
  name = "";
  fullName = "";
  type = "";
  lat = 0;
  lng = 0;

  constructor(inval: any = null) {
    if (inval instanceof Object) {
      Object.entries(inval).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case "lng":
          case "lat":
            this[k] = smartCastFloat(v);
            break;
          case "name":
          case "fullName":
          case "type":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
        }
      });
    }
  }
}

export class GeoZone {
  lat = 0;
  lng = 0;
  tz = "";
  offset = 0;
  cc = "";
  countryName = "";
  toponyms: Array<Toponym> = [];
  [key: string]: any;

  constructor(inval: any = null) {
    if (inval instanceof Object) {
      Object.entries(inval).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case "lng":
          case "lat":
            this[k] = smartCastFloat(v);
            break;
          case "timezoneId":
          case "timezone":
          case "tz":
            if (typeof v === "string") {
              this.tz = v;
            }
            break;
          case "countryName":
          case "cc":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
          case "offset":
            if (typeof v === "number") {
              this[k] = v;
            }
            break;
          case "toponyms":
            if (v instanceof Array) {
              this.toponyms = v.map(row => new Toponym(row));
            }
            break;
        }
      });
    }
  }

  placeNames(): string {
    const nt = this.toponyms.length;
    const places = this.toponyms
      .filter(row => ["CONT", "ADM2"].includes(row.type) === false)
      .map(t => t.name);
    places.reverse();
    if (places.length < 2) {
      let addCountry = false;
      if (this.toponyms.length > 0) {
        addCountry = this.toponyms[0].type === "SEA";
      }
      if (addCountry && this.countryName.length > 1) {
        places.push(this.countryName);
      }
    }
    return places.join(", ");
  }

  gmtOffsetHrs(): number {
    return this.offset / 3600;
  }
}
