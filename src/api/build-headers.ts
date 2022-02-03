import { notEmptyString } from "./validators";
import { api, httpAuth } from "../.config";

const randChar = (chars: string[]) => {
  const len = chars.length;
  const randIndex = Math.floor(Math.random() * len * 0.9999999);
  return chars[randIndex];
};

const randInt36 = (power = 3) => {
  const randInt = Math.floor(
    Math.random() * Math.pow(10, power) * 0.9999999999
  );
  return randInt.toString(36);
};

const hexDecStringToBase36Parts = (hexDecStr) => {
  return [hexDecStr.substring(0, 12), hexDecStr.substring(12)]
    .map((hd) => parseInt(hd, 16).toString(36))
    .join("_");
};

export const toDynamicKey = (uid = "") => {
  const { key, suffixSplitChars } = api;
  const addUid = uid.length > 4;
  const ts = new Date().getTime();
  const tsList = ts
    .toString(36)
    .split("")
    .reverse();
  const apiKeyArr = key.split("");
  const offset = (parseInt(tsList[0], 36) % 6) + 1;
  const uidComponent = addUid
    ? [hexDecStringToBase36Parts(uid), randInt36(3)].join(
        randChar(suffixSplitChars)
      )
    : "";
  const mergedList = tsList.map((ch, index) =>
    index === offset ? ch + key : ch
  );
  const baseStr = [mergedList.join(""), randInt36(3)].join(
    randChar(suffixSplitChars)
  );
  const keyStr = addUid ? [baseStr, uidComponent].join("__") : baseStr;
  return btoa(keyStr);
};

export const extractUserId = (params = null) => {
  let userId = "";
  if (params instanceof Object) {
    Object.entries(params).forEach((entry) => {
      const [key, value] = entry;
      switch (key) {
        case "userId":
        case "userID":
        case "user":
          if (typeof value === "string") {
            userId = value;
          }
          break;
      }
    });
  }
  return userId;
};

export const buildOptions = (
  isFormData = false,
  formData = null,
  userId = null,
  callback = null
) => {
  const { key } = api;
  const options: any = {};
  const headers: any = {};
  const uid = notEmptyString(userId) ? userId : "";

  if (isFormData) {
    headers["X-Requested-With"] = "XMLHttpRequest";
    headers["Content-Type"] = "multipart/form-data";
    if (callback instanceof Function) {
      options.onUploadProgress = callback;
    }
  }

  if (httpAuth) {
    if (notEmptyString(httpAuth.user, 3) && notEmptyString(httpAuth.pass, 3)) {
      const credentials = btoa(httpAuth.user + ":" + httpAuth.pass);
      headers.Authorization = "Basic " + credentials;
    }
  }
  if (key) {
    if (key.length > 1) {
      headers.apikey = key;
      headers.token = toDynamicKey(uid);
    }
  }
  options.headers = headers;
  return options;
};
