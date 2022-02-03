import { julToLongDate } from "../converters";
import grahaValues from "../mappings/graha-values";

export class TransitionInfo {
  jd = 0;
  datetime = new Date();
  num = 0;
  speed = 0;
  lng = 0;
  acceleration = 0;
  station = "sample";

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "jd":
          case "num":
          case "lng":
          case "speed":
          case "acceleration":
            if (typeof v === "number") {
              this[k] = v;
            }
            break;
          case "isDir":
            if (typeof v === "boolean") {
              this[k] = v;
            }
            break;
          case "datetime":
            if (typeof v === "string") {
              this[k] = new Date(v);
            }
            break;
          case "station":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
        }
      });
    }
  }

  get graha() {
    return grahaValues.find((gr) => gr.num === this.num);
  }

  get key() {
    return this.graha instanceof Object ? this.graha.key : "";
  }

  get longDate() {
    return julToLongDate(this.jd, 0);
  }

  get year() {
    return this.datetime.getFullYear();
  }
}
