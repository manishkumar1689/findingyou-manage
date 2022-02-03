import { isNumeric } from "../validators";

export class Nakshatra {
  percent = 0;
  key = "";
  ruler = "";
  goal = "";
  sex = "";
  yoni = "";
  aksharas?: Array<string> = [];
  nadi = "";
  [key: string]: any;

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "aksharas":
            if (v instanceof Array) {
              this.aksharas = v;
            }
            break;
          default:
            this[k] = v;
            break;
        }
      });
    }
  }
  get num() {
    let out = -1;
    const end = this.key.split("_").pop();
    if (isNumeric(end)) {
      out = parseInt(end);
    }
    return out;
  }

  get pada(): number {
    return Math.floor(this.percent / 25) + 1;
  }
}
