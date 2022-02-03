import { validDateString, notEmptyString } from "../validators";
import { Translation, Version } from "../interfaces";
import { toDateTime } from "../converters";

export class UserSchema {
  _id: "";
  identifier = "";
  name = "";
  fullName = "";
  roles: Array<string> = [];
  active = false;
  lastLogin = new Date();
  created = new Date();
  modified = new Date();
  [key: string]: any;

  constructor(data = null) {
    if (data instanceof Object) {
      Object.entries(data).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "lastLogin":
          case "createdAt":
          case "modifiedAt":
            if (typeof v === "string" && validDateString(v, true)) {
              this[k] = toDateTime(v);
            }
            break;
          case "roles":
            if (v instanceof Array) {
              this.roles = v;
            }
            break;
          case "fullName":
            if (typeof v === "string") {
              this.name = v;
              this.fullName = v;
            }
            break;
          default:
            this[k] = v;
            break;
        }
      });
    }
  }

  isAdmin() {
    return this.roles.includes("admin") || this.roles.includes("superadmin");
  }
}

export class LexemeSchema {
  key = "";
  name = "";
  original = "";
  lang = "";
  unicode = "";
  translations: Array<Translation> = [];
  [key: string]: any;

  constructor(data = null) {
    if (data instanceof Object) {
      Object.entries(data).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "key":
          case "name":
          case "original":
          case "unicode":
          case "lang":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
          case "translations":
            if (v instanceof Array) {
              this.translations = v.map((tr) => {
                if (!tr.alpha) {
                  tr.alpha = "lt";
                }
                return tr;
              });
            }
            break;
        }
      });
    }
  }
}

export const mapToVersion = (row = null) => {
  const obj = {
    lang: "",
    langCode: "",
    locale: "",
    active: false,
    approved: false,
    text: "",
    modifiedAt: new Date(),
    createdAt: new Date(),
  };
  if (row instanceof Object) {
    const { lang, text, active, approved, modifiedAt, createdAt } = row;
    if (notEmptyString(lang)) {
      obj.lang = lang;
      const [cc, lc] = lang.split("-");
      if (cc) {
        obj.langCode = cc;
      }
      if (lc) {
        obj.locale = lc;
      }
    }
    if (notEmptyString(text)) {
      obj.text = text;
    }
    if (active) {
      obj.active = !!active;
    }
    if (approved) {
      obj.approved = !!approved;
    }
    if (notEmptyString(modifiedAt)) {
      obj.modifiedAt = new Date(modifiedAt);
    }
    if (notEmptyString(createdAt)) {
      obj.createdAt = new Date(createdAt);
    }
  }
  return obj;
};

export class SnippetSchema {
  key = "";
  published = false;
  format = "text";
  notes = "";
  values: Array<Version> = [];
  modifiedAt: Date;
  createdAt: Date;

  constructor(data = null) {
    if (data instanceof Object) {
      Object.entries(data).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "key":
          case "notes":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
          case "versions":
          case "values":
            if (v instanceof Array) {
              this.values = v
                .map(mapToVersion)
                .filter((v) => v.lang.length > 0);
            }
            break;
          case "published":
            this.published = !!v;
            break;
          case "modifiedAt":
          case "createdAt":
            if (typeof v === "string") {
              this[k] = new Date(v);
            }
            break;
        }
      });
    }
  }

  get category() {
    return this.parts.category;
  }

  get subkey() {
    return typeof this.parts.subkey === "string" ? this.parts.subkey : "";
  }

  get parts() {
    const [category, subkey] = this.key.split("__");
    return { category, subkey };
  }

  get numTranslations(): number {
    return this.values.filter((v) => notEmptyString(v.text)).length - 1;
  }

  get hasTranslations(): boolean {
    return this.numTranslations > 0;
  }

  get translationInfo() {
    let str = "";
    if (this.hasTranslations) {
      const num = this.numTranslations;
      const max = 5;
      const moreThanMax = num > max;
      const limit = moreThanMax ? max : num;
      const transList = this.values
        .filter((v) => notEmptyString(v.text))
        .slice(1, limit)
        .map((tr) => tr.lang)
        .join(", ");
      const dots = moreThanMax ? " ..." : "";
      str = `${num} translations: ${transList}${dots}`;
    }
    return str;
  }
}
