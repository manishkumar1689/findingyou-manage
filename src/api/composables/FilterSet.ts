import {
  degAsDms,
  degAsDm,
  decPlaces,
  percDec,
  longDate,
  degDec,
  camelToTitle,
  toGrahaObj,
  yesNo,
  toCommas,
  fileSize,
  toCharCode,
  zeroPad,
  mediumDate,
  snakeToWords,
  capitalize,
} from "../converters";
import { toWords } from "../helpers";
import { isNumeric, notEmptyString } from "../validators";
import genderOptions from "@/api/mappings/gender-options";

export const FilterSet = {
  toDMS(value: any) {
    return degAsDms(value);
  },
  toDMSLatMid(value: any) {
    return degAsDms(value, "mlat", -1, true);
  },
  toDMSLngMid(value: any) {
    return degAsDms(value, "mlng", -1, true);
  },
  toDMSLat(value: any) {
    return degAsDms(value, "lat");
  },
  toDMSLng(value: any) {
    return degAsDms(value, "lng");
  },
  toDMS0(value: any) {
    return degAsDms(value, "raw", 0);
  },
  toDM(value: any) {
    return degAsDm(value);
  },
  toDeg(value: any) {
    return degAsDm(value, "deg");
  },
  toDMSpeed(value: any) {
    if (isNumeric(value)) {
      return [degAsDm(value, "prefix", true), value >= 0 ? "D" : "R"].join(" ");
    }
  },
  asDMSString(value: any) {
    let str = "";
    if (value instanceof Object) {
      const { lat, lng, alt } = value;
      const altV = isNumeric(alt) ? alt : 0;
      str = `${degAsDms(lat, "lat")}, ${degAsDms(lng, "lng")}, alt. ${altV}m`;
    }
    return str;
  },
  asDecString(value: any) {
    let str = "";
    if (value instanceof Object) {
      const { lat, lng, alt } = value;
      const altV = isNumeric(alt) ? alt : 0;
      str = `${decPlaces(lat, 4)}, ${decPlaces(lng, 4)}, alt. ${altV}m`;
    }
    return str;
  },
  toAltStr(value) {
    return `alt. ${value}m.`;
  },
  dec2(value: any) {
    return decPlaces(value, 2);
  },
  dec3(value: any) {
    return decPlaces(value, 3);
  },
  dec4(value: any) {
    return decPlaces(value, 4);
  },
  dec5(value: any) {
    return decPlaces(value, 5);
  },
  dec6(value: any) {
    return decPlaces(value, 6);
  },
  degDec3(value: any) {
    return degDec(value, 3);
  },
  degDec4(value: any) {
    return degDec(value, 4);
  },
  percDec2(value: any) {
    return percDec(value, 2);
  },
  percDec3(value: any) {
    return percDec(value, 3);
  },
  longDate(value: any) {
    return longDate(value);
  },
  mediumDate(value: any) {
    return mediumDate(value);
  },
  toWords(value: any, cast = "lower") {
    let str = value;
    if (notEmptyString(str, 5)) {
      str = camelToTitle(value);
      switch (cast) {
        case "lower":
          str = str.replace(/_+/g, " ").toLowerCase().trim();
          break;
      }
    }
    return str;
  },
  expandRelType(value: any) {
    return toWords(value);
  },
  toGrahaIcon(ref: any): string {
    const obj = toGrahaObj(ref);
    return obj.icon;
  },
  toGrahaClass(ref: any): string {
    const key = typeof ref === "string" ? ref : "";
    let mk = key;
    switch (key) {
      case "md":
      case "mn":
        mk = "mandi";
        break;
      case "gu":
      case "gk":
        mk = "gulika";
        break;
    }
    return ["icon", mk].join("-");
  },
  toSignClass(ref: any) {
    let str = "";
    if (isNumeric(ref)) {
      str = ["icon-sign", ref].join("-");
    }
    return str;
  },
  toGrahaName(ref: any): string {
    const obj = toGrahaObj(ref);
    return obj.name;
  },
  yesNo(ref: any): string {
    return yesNo(ref);
  },
  toCommas(ref: any): string {
    return toCommas(ref);
  },
  fileSize(ref: any): string {
    let str = "";
    if (isNumeric(ref)) {
      ref = parseInt(ref);
      str = fileSize(ref);
    }
    return str;
  },
  fileInfo(file) {
    let str = "";
    if (file instanceof Object) {
      const { saved } = file;
      if (saved) {
        str = mediumDate(saved);
        let size = 0;
        if (file.fileSize) {
          size = file.fileSize;
        } else if (file.size) {
          size = file.fileSize;
        }
        if (isNumeric(size) && size > 0) {
          str += ", " + fileSize(size);
        }
      }
    }
    return str;
  },
  charCode(ref: any): string {
    return typeof ref === "string" ? toCharCode(ref) : "";
  },
  zeroPad2(ref: any): string {
    return isNumeric(ref) ? zeroPad(ref, 2) : "";
  },
  toCurrency(payment: any) {
    let str = "";
    if (payment instanceof Object) {
      const { amount, curr } = payment;
      str = `${amount} ${curr}`;
    }
    return str;
  },
  asWords(str: any) {
    if (notEmptyString(str)) {
      if (str.indexOf("_") >= 0) {
        return snakeToWords(str);
      } else {
        return camelToTitle(str);
      }
    }
    return str;
  },
  capitalize(str: any) {
    return capitalize(str);
  },
  genderName(key: string): string {
    const opt = genderOptions.find((op) => op.key === key);
    return opt instanceof Object ? opt.name : key;
  },
};
