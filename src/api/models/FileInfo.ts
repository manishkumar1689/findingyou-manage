import { smartCastInt } from "../converters";

export class FileInfo {
  path = "";
  file = "";
  isDir = false;
  parent = "";
  size = 0;
  modified = new Date();
  copyLine = "";
  info = "";
  yearRange: number[] = [];
  children: Array<FileInfo> = [];

  constructor(inData: any = null, parent = "") {
    if (inData instanceof Object) {
      Object.entries(inData).forEach((entry) => {
        const [k, v] = entry;
        switch (k) {
          case "size":
            if (typeof v === "number") {
              this[k] = v;
            }
            break;
          case "isDir":
            if (typeof v === "boolean") {
              this[k] = v;
            }
            break;
          case "modified":
            if (typeof v === "string") {
              this[k] = new Date(v);
            }
            break;
          case "path":
          case "file":
          case "info":
          case "copyLine":
            if (typeof v === "string") {
              this[k] = v;
            }
            break;
          case "yearRange":
            if (v instanceof Array && v.length === 2) {
              this[k] = v.map((y) => smartCastInt(y));
            }
            break;
          case "children":
            if (v instanceof Array) {
              const { path } = inData;
              if (path) {
                const par = path.split("/").pop()!;
                this[k] = v.map((item) => new FileInfo(item, par));
              }
            }
            break;
        }
      });
      if (parent.length > 0) {
        this.parent = parent;
      }
    }
  }

  get isBackup() {
    return /--\d{6,8}-\d{4,6}\b(\.\w*)?$/.test(this.file);
  }

  get mayDelete() {
    return this.isBackup || this.info.length < 2;
  }

  get updateYear() {
    const rgx = /\b((19|20)[9012][0-9])\b/;
    const m = this.copyLine.match(rgx);
    let uy = "";
    if (m) {
      uy = m[1];
    }
    return uy;
  }

  get fileName(): string {
    let str = "";
    if (typeof this.file === "string") {
      return this.file;
    } else if (typeof this.path === "string") {
      const parts = this.path.split("/");
      if (parts.length > 0) {
        str = parts.pop()!;
      }
    }
    return str;
  }
}
