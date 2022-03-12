import { validDateString, notEmptyString } from "../validators";
import { Translation, Version } from "../interfaces";
import { toDateTime } from "../converters";
import { toWords } from "../helpers";

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
      obj.text = text.replace(/\s+(Lorem)\b/, "\n$1");
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

export class Message {
  _id: string;
  key: string;
  langCode?: string;
  lang: string;
  active = true;
  locale?: string;
  subject: string;
  body: string;
  fromName?: string;
  fromMail?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  constructor(data = null) {
    if (data instanceof Object) {
      Object.entries(data).forEach(([k, v]) => {
        if (
          typeof v === "string" &&
          ["_id", "key", "subject", "body", "fromName", "fromMail"].includes(k)
        ) {
          this[k] = v;
        } else if (["createdAt", "modifiedAt"].includes(k)) {
          if (typeof v === "string") {
            this[k] = new Date(v);
          } else if (v instanceof Date) {
            this[k] = v;
          }
        } else if (typeof v === "string" && k === "lang") {
          this.assignLang(v);
        } else if (typeof v === "boolean" && k === "active") {
          this.active = v;
        }
      });
    }
  }

  assignLang(lang = "") {
    const parts = lang.split("-");
    this.lang = lang;
    this.langCode = parts[0];
    this.locale = parts.length > 1 ? parts[1] : "";
    return this;
  }

  updateLang(code = "", locale = "") {
    const parts = notEmptyString(code) ? [code.split("-").shift()] : [];
    if (notEmptyString(locale)) {
      parts.push(locale);
    }
    this.lang = parts.join("-");
    return this;
  }

  get hasLocale() {
    return notEmptyString(this.locale);
  }
}

export class MessageSet {
  key = "";
  items: Array<Message> = [];

  constructor(data = null) {
    if (data instanceof Object) {
      const keys = Object.keys(data);
      if (keys.includes("key")) {
        const { key } = data;
        if (notEmptyString(key)) {
          this.key = key;
        }
      }
      if (keys.includes("items") && data.items instanceof Array) {
        this.items = data.items.map((row) => new Message(row));
      } else if (keys.includes("rows") && data.rows instanceof Array) {
        this.items = data.rows.map((row) => new Message(row));
      }
    }
  }

  get activeItems() {
    return this.items.filter((item) => item.active);
  }

  get subject() {
    let subj = toWords(this.key);
    if (this.items.length > 0) {
      subj = this.items[0].subject;
    }
    return subj;
  }

  get numTranslations(): number {
    return this.items.length;
  }

  get hasTranslations(): boolean {
    return this.items.length > 1;
  }

  toSaveValues() {
    return this.items.map((row) => {
      const { key, langCode, locale, subject, body, fromName, fromMail } = row;
      const lang = [langCode, locale]
        .filter((p) => notEmptyString(p))
        .join("-");
      return { key, lang, subject, body, fromName, fromMail };
    });
  }
}
