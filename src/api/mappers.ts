import { Graha } from "./models/Graha";
import refValues from "./mappings/ref-values";
import grahaValues from "./mappings/graha-values";
import { KeyName, PreferenceOption, SuggestedPlace } from "./interfaces";
import { User, Preference } from "./interfaces/users";
import { capitalize, snakeToWords, truncate } from "./converters";
import { DictionaryState } from "@/store/types";
import { isNumeric, notEmptyString } from "./validators";
import { toWords } from "./helpers";

export const mapGraha = (row: any) => new Graha(row);

export const matchReference = (key: string, attrs: any): Graha => {
  let row: any = refValues.find((r) => r.key === key);
  if (row instanceof Object && attrs instanceof Object) {
    row = refValues.find((r) => r.key === key);
  } else {
    row = grahaValues.find((r) => r.key === key);
  }
  if (row instanceof Object) {
    row = { ...row, ...attrs };
  }
  return new Graha(row);
};
export const extractPayments = (user: User) => {
  const payItems = [];
  if (user.status instanceof Array) {
    user.status.forEach((status) => {
      if (status instanceof Object) {
        const { payments } = status;
        if (payments instanceof Array) {
          payments.forEach((pt) => {
            payItems.push(pt);
          });
        }
      }
    });
  }
  payItems.sort((a, b) => a.createdAt - b.createdAt);
  return payItems;
};

export const matchLastPayment = (user: User) => {
  const payments = extractPayments(user);
  if (payments.length > 0) {
    return payments.slice(-1)[0];
  }
};

export const matchLastPaymentDate = (user: User) => {
  const lp = matchLastPayment(user);
  if (lp instanceof Object) {
    return lp.createdAt;
  }
};

export const hasPayments = (user: User) => {
  return extractPayments(user).length > 0;
};

export const extractOptionKey = (
  option: PreferenceOption,
  preference: Preference
) => {
  let display = "";
  const opt = option.options.find((op) => op.value === preference.value);
  if (opt) {
    display = snakeToWords(opt.key);
  }
  return display;
};

export const extractKeyValueList = (preference: Preference) => {
  const str = preference.value.map((op) => `${op.key}: ${op.value}`).join(", ");
  return snakeToWords(str);
};

export const expandOrientationKey = (key = "") => {
  const firstLetter = notEmptyString(key)
    ? key.substring(0, 1).toLowerCase()
    : "-";
  switch (firstLetter) {
    case "s":
      return "Straight";
    case "g":
      return "Gay";
    case "b":
      return "Bisexual";
    case "o":
      return "Other";
    default:
      return "unknown";
  }
};

export const expandGenderKey = (key = "") => {
  const firstLetter = notEmptyString(key)
    ? key.substring(0, 1).toLowerCase()
    : "-";
  switch (firstLetter) {
    case "m":
      return "Male";
    case "f":
      return "Female";
    default:
      return "N/A";
  }
};

export const expandChartModeKey = (key = ""): string => {
  const max = notEmptyString(key) ? key.length : 1;
  const maxLen = max > 3 ? 3 : max;
  const firstLetters = notEmptyString(key)
    ? key.substring(0, maxLen).toLowerCase()
    : "-";
  switch (firstLetters) {
    case "sid":
      return "Sidereal";
    case "tro":
      return "Tropical";
    default:
      return "-";
  }
};

export const expandPrefOption = (prefKey = "", optKey = "") => {
  switch (prefKey) {
    case "orientation":
      return expandOrientationKey(optKey);
    case "genders":
    case "gender":
      return expandGenderKey(optKey);
    case "birth_chart_sign":
      return expandChartModeKey(optKey);
    default:
      return toWords(optKey);
  }
};

export const extractStringList = (preference: Preference, separator = ", ") => {
  let str = "";
  if (preference.value instanceof Array) {
    str = preference.value
      .map((val) => expandPrefOption(preference.key, val))
      .join(separator);
  }
  return snakeToWords(str);
};

export const matchPreference = (
  preference: Preference,
  preferenceOptions: Array<PreferenceOption>
) => {
  const option = preferenceOptions.find((po) => po.key === preference.key);
  const source = option instanceof Object ? option : {};
  let display: any = "";
  if (preference instanceof Object) {
    display = preference.value;
    switch (preference.type) {
      case "array_string":
        display = extractStringList(preference, ", ");
        break;
      case "range_number":
        display = extractStringList(preference, " to ");
        break;
      case "array_key_scale":
        if (preference.value instanceof Array) {
          display = extractKeyValueList(preference);
        }
        break;
      case "key_scale":
        display = extractOptionKey(option, preference);
        break;
      case "string":
        display = expandPrefOption(preference.key, preference.value);
        break;
      default:
        display =
          display instanceof Array
            ? display.join(", ")
            : display !== null
            ? display.toString()
            : "";
        break;
    }
  }
  return { ...source, ...preference, display };
};

export const toPreferenceDefault = (pref: PreferenceOption) => {
  switch (pref.type) {
    case "float":
    case "scale":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "text":
    case "string":
    case "code":
      return "";
    case "array_key_scale":
    case "array_string":
    case "key_scale":
      return [];
    case "range_number":
      switch (pref.key) {
        case "age_range":
          return [18, 40];
        default:
          return [0, 100];
      }
    default:
      return null;
  }
};

export const transformKeyNameOptions = (
  options: Array<KeyName>,
  firstLabel = "",
  maxNameLength = 0
) => {
  const name = notEmptyString(firstLabel) ? firstLabel : "please select...";
  const first = {
    key: -1,
    name,
  };
  return [
    first,
    ...options.map((rv) => {
      const name =
        maxNameLength > 8 ? truncate(rv.name, maxNameLength) : rv.name;
      return { key: rv.value, name: `${rv.key}: ${name}` };
    }),
  ];
};

export const genderOptions = (dictionary: DictionaryState) => {
  return ["-", "f", "m", "n"].map((key) => {
    let name = key;
    switch (key) {
      case "-":
        name = "Gender...";
        break;
      default:
        name = capitalize(
          dictionary.text("gender", key, {
            lang: "en",
            type: "standard",
          })
        );
        break;
    }
    return {
      key,
      name,
    };
  });
};

export const mapToSuggestedPlace = (item: any = null): SuggestedPlace => {
  const defVal = {
    lat: 0,
    lng: 0,
    name: "",
    land: "",
  };
  if (item instanceof Object) {
    const { lat, lng, country, region, name } = item;
    if (isNumeric(lat)) {
      defVal.lat = lat;
      defVal.lng = lng;
    }
    if (notEmptyString(name)) {
      defVal.name = name;
    }
    const hasCountry = notEmptyString(country);
    const hasRegion = notEmptyString(region);
    if (hasCountry && /\d+/.test(country) && hasRegion) {
      defVal.land = region;
    } else if (hasCountry) {
      defVal.land = country;
    }
  }
  return defVal;
};
