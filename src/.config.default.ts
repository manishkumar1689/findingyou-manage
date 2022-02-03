import { ApiDetails, HttpAuth } from "./config.interfaces";

export const api: ApiDetails = {
  base: "/api/",
  key: "eKabd7G;bd",
  suffixSplitChars: ["%", ".", ","],
};

export const httpAuth: HttpAuth = {
  user: "",
  pass: "",
};

export const imageSizes = {
  thumb: {
    mode: 'resize',
    width: 640,
    height: 640,
    quality: 92,
  },
  half: {
    mode: 'resize',
    width: 1280,
    height: 1280,
    quality: 92,
  },
  large: {
    mode: 'resize',
    width: 2560,
    height: 2560,
    quality: 88,
  },
};

export const mediaPath = '/media/';