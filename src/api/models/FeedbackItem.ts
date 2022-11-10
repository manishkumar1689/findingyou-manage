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
  reason = "";
  roles: string[] = [];
  mediaItems: MediaItem[] = [];
  targetUser: { [key: string]: any } = { _id: "" };
  hasTargetUser = false;

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
            case "reason":
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
            case "hasTargetUser":
              this[key] = val;
              break;
          }
        }

        if (key === "targetUser" && val instanceof Object) {
          this.targetUser = val;
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

  get hasMediaItems(): boolean {
    return this.mediaItems instanceof Array && this.mediaItems.length > 0;
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

  hasTargetUserKey(key = "") {
    return this.hasTargetUser
      ? Object.keys(this.targetUser).includes(key)
      : false;
  }

  get hasReason() {
    return notEmptyString(this.reason, 1);
  }

  get targetNickName() {
    return this.hasTargetUser && this.hasTargetUserKey("nickName")
      ? this.targetUser.nickName
      : "";
  }

  get targetFullName() {
    return this.hasTargetUser && this.hasTargetUserKey("fullName")
      ? this.targetUser.fullName
      : "";
  }

  get targetGender() {
    return this.hasTargetUser && this.hasTargetUserKey("gender")
      ? this.targetUser.gender
      : "";
  }

  get targetEmail() {
    return this.hasTargetUser && this.hasTargetUserKey("identifier")
      ? this.targetUser.identifier
      : "";
  }

  get targetInfo() {
    return this.hasTargetUser
      ? `${this.targetNickName} (${this.targetGender}): ${this.targetEmail}`
      : "";
  }
}
