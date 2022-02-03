import { toDateTime } from "../converters";

export class BodyTransition {
  readonly jd: number = 0;
  readonly datetime: Date = new Date();

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      const keys = Object.keys(inData);
      if (keys.includes("jd")) {
        this.jd = inData.jd;
      }
      if (keys.includes("datetime")) {
        this.datetime = toDateTime(inData.datetime);
      }
    }
  }
}
