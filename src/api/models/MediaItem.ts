import { imageSizes, mediaPath } from "@/.config";
import { notEmptyString } from "../validators";

export const imageSizeSuffix = (sizeKey = "thumb") => {
  const keys = Object.keys(imageSizes);
  if (keys.includes(sizeKey)) {
    const { mode, width, height } = imageSizes[sizeKey];
    return [mode, width, height].join("-");
  } else {
    return "";
  }
};

export class MediaItem {
  filename = "";
  mime = "";
  source = "local";
  size = 0;
  attributes: any = {};
  type = "image";
  title = "";
  variants?: string[] = [];

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([key, val]) => {
        switch (key) {
          case "mime":
          case "type":
          case "source":
          case "filename":
          case "title":
            if (typeof val === "string") {
              this[key] = val;
            }
            break;
          case "size":
            if (typeof val === "number") {
              this[key] = val;
            }
            break;
          case "variants":
            if (val instanceof Array) {
              this[key] = val;
            }
            break;
        }
      });
    }
  }

  renderWithSuffix(suffix = "") {
    const parts = this.path.split(".");
    const extension = parts.pop();
    return [[parts.join("."), suffix].join("-"), extension].join(".");
  }

  get path() {
    if (this.source === "local") {
      return mediaPath + this.filename;
    } else {
      return this.filename;
    }
  }

  get thumbnail() {
    if (this.source === "local") {
      let suffix = imageSizeSuffix("thumb");
      if (this.variants.includes(suffix) === false) {
        suffix = imageSizeSuffix("half");
        if (this.variants.includes(suffix) === false) {
          suffix = "";
        }
      }
      if (suffix.length > 3) {
        return this.renderWithSuffix(suffix);
      }
    }
    return this.path;
  }

  get ref() {
    return notEmptyString(this.title) ? this.title : this.filename;
  }

  get medium() {
    if (this.source === "local") {
      let suffix = imageSizeSuffix("thumb");
      suffix = imageSizeSuffix("half");
      if (this.variants.includes(suffix) === false) {
        suffix = "";
      }
      if (suffix.length > 3) {
        return this.renderWithSuffix(suffix);
      }
    }
    return this.path;
  }

  get large() {
    return this.path;
  }

  get isImage() {
    return this.type === "image";
  }
}
