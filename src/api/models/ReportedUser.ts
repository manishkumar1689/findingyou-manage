import { getAge, mediumDate } from "../converters";
import { notEmptyString } from "../validators";
import { GeoLoc } from "./GeoLoc";

export class BaseUser {
  user = "";
  roles: string[] = [];
  dob = new Date(0);
  login = new Date(0);
  identifier = "";
  fullName = "";
  nickName = "";
  gender = "-";
  active = false;
  geo = new GeoLoc(null);
  modifiedAt = new Date(0);
  joined = new Date(0);
  reports: UserReport[] = [];

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([key, val]) => {
        if (typeof val === "string") {
          switch (key) {
            case "targetUser":
            case "user":
              this.user = val;
              break;
            case "identifier":
            case "fullName":
            case "nickName":
            case "gender":
              this[key] = val;
              break;
            case "modifiedAt":
            case "joined":
            case "login":
            case "dob":
              this[key] = new Date(val);
              break;
          }
        }
        if (typeof val === "boolean") {
          switch (key) {
            case "active":
              this[key] = val;
              break;
          }
        }
        if (val instanceof Array) {
          switch (key) {
            case "roles":
              this.roles = val;
              break;
          }
        }
      });
    }
  }

  get hasLOggedIn() {
    return this.login.getTime() > 1000000;
  }

  get age() {
    return getAge(this.dob);
  }

  get bestName() {
    return notEmptyString(this.fullName) ? this.fullName : this.nickName;
  }

  get shortInfo() {
    return `${this.bestName} (${this.gender}) ${this.age}`;
  }
}

export class UserReport extends BaseUser {
  key = "";
  reason = "";
  text = "";

  constructor(inData: any = null) {
    super(inData);
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([key, val]) => {
        if (typeof val === "string") {
          switch (key) {
            case "key":
            case "text":
            case "reason":
              this[key] = val;
              break;
          }
        }
      });
    }
  }

  get hasText() {
    return this.text.length > 1 && !this.hasContext;
  }

  get hasContext() {
    return /^\s*\[\w+\]\s*$/.test(this.text);
  }
}

export class ReportedUser extends BaseUser {
  targetUser = "";
  reports: UserReport[] = [];

  constructor(inData: any = null) {
    super(inData);
    if (inData instanceof Object) {
      const { reports, targetUser } = inData;
      if (notEmptyString(targetUser)) {
        this.targetUser = targetUser;
        this.user = targetUser;
      }
      if (reports instanceof Array) {
        this.reports = reports.map((item) => new UserReport(item));
      }
    }
  }

  get numReports() {
    return this.reports.length;
  }

  get latestReportDate() {
    if (this.reports.length > 0) {
      return this.reports[0].modifiedAt;
    } else {
      return new Date(0);
    }
  }

  get loginInfo() {
    const joinedDt = `joined: ${mediumDate(this.joined)}`;
    if (this.hasLOggedIn) {
      return `${joinedDt}, last logged in ${mediumDate(this.login)}`;
    } else {
      return joinedDt;
    }
  }
}
