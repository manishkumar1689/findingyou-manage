import { notEmptyString } from "../validators";
import { LookupRow } from "../interfaces";

export class LookupItem {
  key: string;
  name: string;
  enabled = true;
  weight = 0;
  value? = -1;

  constructor(obj: any) {
    if (obj instanceof Object) {
      Object.entries(obj).forEach((entry) => {
        const [key, value] = entry;
        switch (key) {
          case "key":
          case "name":
            if (typeof value === "string") {
              this[key] = value;
            }
            break;
          case "weight":
          case "value":
            if (typeof value === "number") {
              this[key] = value;
            }
            break;
          case "enabled":
            if (typeof value === "boolean") {
              this[key] = value;
            }
            break;
        }
      });
    }
  }
}

export class LookupSet {
  key = "";
  items: Array<LookupItem> = [];

  constructor(items: Array<LookupRow> = [], key = "") {
    if (items instanceof Array) {
      items.forEach((item) => {
        if (item instanceof Object) {
          this.items.push(new LookupItem(item));
        }
      });
    }
    if (notEmptyString(key, 2)) {
      this.key = key;
    }
  }
}
