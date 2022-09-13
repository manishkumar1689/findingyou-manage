import { notEmptyString } from "../validators";
import { MediaItem } from "./MediaItem";

export class FeedbackItem {
  _id = "";
  key = "";
  text = "";
  active = false;
  deviceDetails = "";
  createdAt = new Date();
  modifiedAt = new Date();
  userId = "";
  email = "";
  fullName = "";
  nickName = "";
  roles: string[] = [];
  mediaItems: MediaItem[] = [];

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([key, val]) => {
        if (typeof val === "string") {
          switch (key) {
            case "_id":
            case "key":
            case "deviceDetails":
            case "email":
            case "fullName":
            case "nickName":
            case "userId":
            case "text":
              this[key] = val;
              break;
            case "modifiedAt":
            case "createdAt":
              this[key] = new Date(val);
              break;
          }
        }
        if (typeof val === "boolean") {
          switch (key) {
            case "active":
            case "userActive":
              this[key] = val;
              break;
          }
        }

        if (val instanceof Array) {
          switch (key) {
            case "roles":
              this.roles = val;
              break;
            case "mediaItems":
              this.mediaItems = val
                .filter((item) => item instanceof Object)
                .map((item) => new MediaItem(item));
              break;
          }
        }
      });
    }
  }

  get hasDeviceDetails() {
    return notEmptyString(this.deviceDetails, 2);
  }

  get bestName(): string {
    return notEmptyString(this.fullName, 2)
      ? this.fullName
      : notEmptyString(this.nickName)
      ? this.nickName
      : this.email.split("@").shift();
  }
}
