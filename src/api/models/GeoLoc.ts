import { isNumeric, notEmptyString } from "../validators";
import { smartCastFloat } from "../converters";

export class GeoLoc {
  lat = 0;
  lng = 0;
  alt = 0;

  constructor(inval: any) {
    if (notEmptyString(inval, 3) && inval.index(",") >= 0) {
      const arrVals = inval
        .split(",")
        .filter(isNumeric)
        .map(parseFloat);
      this.mapArray(arrVals);
    } else if (inval instanceof Array) {
      this.mapArray(inval);
    } else if (inval instanceof Object) {
      Object.entries(inval).forEach((entry) => {
        const [k, v] = entry;
        if (isNumeric(v)) {
          switch (k) {
            case "lat":
            case "latitude":
              this.lat = smartCastFloat(v);
              break;
            case "lng":
            case "lon":
            case "longitude":
              this.lng = smartCastFloat(v);
              break;
            case "alt":
            case "altitude":
              this.alt = smartCastFloat(v);
              break;
          }
        }
      });
    }
  }

  mapArray(inval: Array<any>) {
    if (inval.length > 1) {
      const [lat, lng, alt] = inval;
      if (isNumeric(lat)) {
        this.lat = parseFloat(lat);
      }
      if (isNumeric(lng)) {
        this.lng = parseFloat(lng);
      }
      if (isNumeric(alt)) {
        this.alt = parseFloat(alt);
      }
    }
  }

  toString(): string {
    const parts = [this.lat, this.lng];
    if (this.alt > 0 || this.alt > 0) {
      parts.push(this.alt);
    }
    return parts.map((p) => p.toString()).join(",");
  }

  toJson() {
    return {
      lat: this.lat,
      lng: this.lng,
      alt: this.alt,
    };
  }
}
