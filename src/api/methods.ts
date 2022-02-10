import Vue from "vue";
import axios from "axios";
import { isNumeric, notEmptyString } from "./validators";
import { api } from "../.config";
import { GeoLoc } from "./models/GeoLoc";
import { KeyNumValue, Lexeme, SlugName, Snippet } from "./interfaces";
import { ChartInput, PairedInput } from "./models/ChartForm";
import { buildOptions, extractUserId } from "./build-headers";
import { julToISODate } from "./converters";
import { currentJulianDay } from "./julian-date";

const extractDataObj = (res: any) => {
  if (res instanceof Object) {
    const { data } = res;
    if (data instanceof Object || data instanceof Array) {
      return data;
    }
  }
};

const postData = async (
  path: string,
  params = null,
  callback: any = null,
  putMode = false
) => {
  let result: any = {};
  const isFormData = params instanceof FormData;
  const userId = extractUserId(params);
  const func = putMode !== true ? axios.post : axios.put;
  await func(
    `${api.base}${path}`,
    params,
    buildOptions(isFormData, params, userId, callback)
  )
    .then((res) => {
      result = res;
    })
    .catch((e) => {
      result.error = e;
    });
  return result;
};

const putData = async (path: string, params = null, callback: any = null) => {
  return postData(path, params, callback, true);
};

const fetchData = async (path: string, deleteMode = false, userId = "") => {
  let result: any = {};
  const func = deleteMode !== true ? axios.get : axios.delete;
  await func(`${api.base}${path}`, buildOptions(false, null, userId))
    .then((res) => {
      result = res;
    })
    .catch((e) => {
      result.error = e;
    });
  return result;
};

const deleteData = async (path: string, userId = "") => {
  return fetchData(path, true, userId);
};

const fetchContent = async (path = "", userId = "") => {
  return fetchData(path, false, userId);
};

const buildQueryString = (criteria = null, literal = false) => {
  let str = "";
  if (criteria instanceof Object) {
    const parts: Array<string> = [];
    Object.entries(criteria).forEach((entry) => {
      const [key, val] = entry;
      let paramVal = val;
      if (typeof val === "string") {
        paramVal = literal ? val : encodeURIComponent(val);
      } else if (typeof val === "number" || typeof val === "boolean") {
        paramVal = val.toString();
      } else if (val instanceof Array) {
        paramVal = val.join(",");
      }
      parts.push(key + "=" + paramVal);
    });
    if (parts.length > 0) {
      str = "?" + parts.join("&");
    }
  }
  return str;
};

export const getData = async (path: string) => {
  let data = { valid: false };
  await fetchContent(path).then((response) => {
    if (response.data) {
      data = response.data;
      data.valid = true;
    }
  });
  return data;
};
//bodies-in-houses/:loc/:dt/:system?
export const fetchDataSet = async (
  path: string,
  geo: GeoLoc,
  datetime: string,
  system = "W"
) => {
  let data: any = {
    valid: false,
  };

  await fetchContent(`${path}/${geo.toString()}/${datetime}/${system}`).then(
    (res) => {
      const result = extractDataObj(res);
      if (result instanceof Object) {
        data = result;
        data.valid = true;
      }
    }
  );

  return data;
};

export const fetchDataObject = async (path: string, userId = "") => {
  let data: any = { valid: false };
  await fetchContent(path, userId).then((res) => {
    const result = extractDataObj(res);
    if (result instanceof Object) {
      data = result;
    }
  });
  return data;
};

export const fetchBodiesInHouses = async (
  geo: GeoLoc,
  datetime: string,
  system = "W"
) => {
  return await fetchDataSet(
    "astrologic/bodies-in-houses",
    geo,
    datetime,
    system
  );
};

export const fetchAllByGeoDatetime = async (
  geo: GeoLoc,
  datetime: string,
  system = "W"
) => {
  return await fetchDataSet("astrologic/all", geo, datetime, system);
};

export const getTzData = async (geo: GeoLoc, dateStr = "") => {
  const parts = ["astrologic", "tzdata", [geo.lat, geo.lng].join(",")];
  if (notEmptyString(dateStr, 5)) {
    parts.push(dateStr);
  }
  const response = await fetchContent(parts.join("/"));
  const { data } = response;
  if (data instanceof Object) {
    return data;
  } else {
    return { valid: false, tzOffset: 0 };
  }
};

export const fetchUserCharts = async (
  userId: string,
  defaultOnly = false,
  params = null,
  max = 10
) => {
  let qStr = "";
  if (params instanceof Object) {
    const parts = [];
    Object.entries(params).forEach((entry) => {
      const [key, val] = entry;
      if (typeof val === "string") {
        switch (key) {
          case "id":
          case "name":
            parts.push([key, val].join("="));
            break;
        }
      }
    });
    if (parts.length > 0) {
      qStr = "?" + parts.join("&");
    }
  }
  const urlParts = ["astrologic/charts-by-user", userId, 0, max];
  if (defaultOnly) {
    urlParts.push(1);
  }
  const url = urlParts.join("/");
  const response = await fetchData(url + qStr);
  let result = { valid: false, items: [], message: "" };
  if (response) {
    const { data } = response;
    if (data) {
      result = data;
    }
  }
  return result;
};

export const fetchChartList = async (
  userId: string,
  start = 0,
  limit = 100,
  search = "",
  status = ""
) => {
  const criteria: any = {};
  if (notEmptyString(search, 1)) {
    criteria.search = search;
  }
  if (notEmptyString(status, 2)) {
    criteria.status = status;
  }
  const qStr = buildQueryString(criteria);
  const url = ["astrologic/chart-core-by-user", userId, start, limit].join("/");
  const response = await fetchData(url + qStr);
  let result = { valid: false, items: [], total: 0, message: "" };
  if (response) {
    const { data } = response;
    if (data) {
      result = data;
    }
  }
  return result;
};

export const fetchLifeCharts = async (chartId = "") => {
  const url = ["astrologic/life-events", chartId].join("/");
  const response = await fetchData(url);
  const result = { valid: false, items: [], total: 0 };
  if (response) {
    const { data } = response;
    if (data instanceof Object) {
      if (data.valid) {
        result.valid = true;
        result.items = data.items;
        result.total = data.num;
      }
    }
  }
  return result;
};

export const getPairedItems = async (chartId = "") => {
  const url = ["astrologic/get-paired-items", chartId].join("/");
  const response = await fetchData(url);
  let result = { valid: false, items: [], total: 0, message: "" };
  if (response) {
    const { data } = response;
    if (data) {
      result = data;
    }
  }
  return result;
};

export const fetchChartById = async (chartId: string) => {
  const response = await fetchData(["astrologic", "chart", chartId].join("/"));
  const { data } = response;
  const result = { valid: true, chart: null };
  if (data instanceof Object) {
    if (data.valid) {
      const { shortTz } = data;
      result.chart = { ...data.chart, shortTz };
      result.valid = true;
    }
  }
  return result;
};

export const fetchChart = async (userId: string, chartId: string) => {
  const params = { id: chartId };
  const result = await fetchUserCharts(userId, false, params, 1);
  const data = { valid: false, chart: null };
  if (result.valid) {
    if (result.items.length > 0) {
      const chart = result.items[0];
      if (chart instanceof Object) {
        data.chart = chart;
        data.valid = true;
      }
    }
  }
  return data;
};

export const fetchUserChart = async (userId: string) => {
  const result = await fetchUserCharts(userId, true);
  const data = {
    valid: false,
    chart: null,
  };
  if (result.valid) {
    if (result.items.length > 0) {
      data.chart = result.items.shift();
      data.valid = data.chart.jd > 0;
    }
  }
  return data;
};

export const matchChartNamesByUser = async (
  userId: string,
  search: string,
  longMode = false
) => {
  const parts = ["astrologic/chart-names-by-user", userId, search];
  if (longMode) {
    parts.push("long");
  }
  const url = parts.join("/");
  const response = await fetchContent(url);
  if (response instanceof Object && response.status === 200) {
    const { items } = response.data;
    if (items instanceof Array) {
      return items;
    }
  }
  return [];
};

export const fetchCoreByGeoDatetime = async (geo: GeoLoc, datetime: string) => {
  return await fetchDataSet("astrologic/compact", geo, datetime, "top");
};

export const fetchCurrentByGeoDatetime = async (
  geo: GeoLoc,
  datetime: string
) => {
  return await fetchDataSet("astrologic/current-chart", geo, datetime, "all");
};

export const saveUserChart = async (inputData: ChartInput) => {
  let result = { valid: false, message: "", chart: null };
  await postData("astrologic/save-user-chart", inputData).then((response) => {
    if (response instanceof Object) {
      const { data } = response;
      if (data instanceof Object) {
        const { shortTz } = data;
        if (notEmptyString(shortTz, 2) && data.chart instanceof Object) {
          data.chart.shortTz = shortTz;
        }
        result = data;
      }
    }
  });
  return result;
};

export const saveChartsBulk = async (items: ChartInput[]) => {
  let result = { valid: false, message: "", chart: null };
  await postData("astrologic/save-charts", { items }).then((response) => {
    if (response instanceof Object) {
      const { data } = response;
      if (data instanceof Object) {
        result = data;
      }
    }
  });
  return result;
};

export const editChart = async (chartId: string, inputData: any) => {
  let result = { valid: false, message: "", chart: null };
  if (notEmptyString(chartId, 12) && inputData instanceof Object) {
    await putData(["astrologic/edit-chart", chartId].join("/"), inputData).then(
      (response) => {
        if (response instanceof Object) {
          const { data } = response;
          if (data instanceof Object) {
            result = data;
          }
        }
      }
    );
  }
  return result;
};

export const removePaired = async (
  c1: string,
  c2: string,
  userId = "",
  removeCharts = false
) => {
  const removeInt = removeCharts ? 1 : 0;
  const response = await deleteData(
    ["astrologic", "delete-paired", c1, c2, userId, removeInt].join("/")
  );
  const { data } = response;
  return data;
};

export const findPairings = async (c1: string, c2: string) => {
  const response = await fetchContent(
    ["astrologic", "has-other-pairings", c1, c2].join("/")
  );
  const { data } = response;
  return data;
};

export const savePairedChart = async (
  inputData: PairedInput,
  newRelName = ""
) => {
  const result = { valid: false, message: "", paired: null };
  const queryString = notEmptyString(newRelName, 2)
    ? buildQueryString({ relName: newRelName })
    : "";
  await postData("astrologic/save-paired" + queryString, inputData).then(
    (response) => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Object) {
          const { paired, message } = data;
          if (paired instanceof Object) {
            result.paired = paired;
            result.message = message;
            result.valid = true;
          }
        }
      }
    }
  );
  return result;
};

export const deletePairedChart = async (pairedId: string, userId: string) => {
  let result = { valid: false, message: "", paired: null };
  await deleteData(`astrologic/delete-paired/${pairedId}/${userId}`).then(
    (response) => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Object) {
          result = data;
        }
      }
    }
  );
  return result;
};

export const getPaired = async (refId: string, type = "chart", max = 0) => {
  const data = { valid: false, items: [] };
  const method = type === "user" ? "paired" : "paired-by-chart";
  await fetchContent(["astrologic", method, refId, max].join("/")).then(
    (response) => {
      if (response.data) {
        const { items } = response.data;
        if (items instanceof Array) {
          data.items = items;
          data.valid = true;
        }
      }
    }
  );
  return data;
};

export const getPairedByChartIds = async (
  c1: string,
  c2: string,
  relType = ""
) => {
  const data = { valid: false, item: null };
  const pathParts = ["astrologic", "paired-by-charts", c1, c2];
  if (notEmptyString(relType, 2)) {
    pathParts.push(relType);
  }
  await fetchContent(pathParts.join("/")).then((response) => {
    if (response.data) {
      const { item } = response.data;
      if (item instanceof Object) {
        data.item = item;
        data.valid = true;
      }
    }
  });
  return data;
};

export const searchPaired = async (userId: string, search: string) => {
  let matched = [];
  await fetchContent(
    ["astrologic", "search-paired", userId, search].join("/")
  ).then((response) => {
    if (response.data) {
      const { valid, items } = response.data;
      if (valid && items instanceof Array) {
        matched = items;
      }
    }
  });
  return matched;
};

export const getPairedByChart = async (chartId: string) => {
  return getPaired(chartId, "chart");
};

export const getPairedByUser = async (userId: string, max = 20) => {
  return getPaired(userId, "user", max);
};

export const getNumPaired = async () => {
  let total = 0;
  await fetchContent("astrologic/num-paired-charts").then((res) => {
    const { data } = res;
    if (data instanceof Object) {
      const { num } = data;
      if (isNumeric(num)) {
        total = parseInt(num);
      }
    }
  });
  return total;
};

export const analysePaired = async (
  protocolId = "",
  start = 0,
  limit = 0,
  criteria = null
) => {
  const result = { valid: false, total: 0, items: [], start, limit, criteria };
  const queryString = buildQueryString(criteria);
  const limitInt = limit > 0 ? limit : 100;
  const url =
    ["astrologic/test-protocols", protocolId, start, limitInt].join("/") +
    queryString;

  await fetchContent(url).then((response) => {
    if (response instanceof Object) {
      const { data } = response;
      if (data instanceof Object) {
        const { items, total } = data;
        if (items instanceof Array) {
          result.items = items;
          result.total = total;
          result.valid = true;
        }
      }
    }
  });
  return result;
};

export const deleteUserChart = async (userId: string, chartId: string) => {
  let result = { valid: false, message: "", id: "" };
  await deleteData(`astrologic/delete-chart/${userId}/${chartId}`).then(
    (response) => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Object) {
          result = data;
        }
      }
    }
  );
  return result;
};

export const fetchPlanetStations = async (
  planetNum: number,
  datetime: string
) => {
  const path = `astrologic/planet-stations/${planetNum}/${datetime}`;
  return await fetchDataObject(path);
};

export const fetchPlacenames = async (search: string) => {
  const path = `geo/address/${search}`;
  return await fetchDataObject(path);
};

export const fetchAllPlanetStations = async (datetime: string) => {
  const path = `astrologic/all-planet-stations/${datetime}`;
  return await fetchDataObject(path);
};

export const fetchLexemeCategories = async () => {
  return await fetchDataObject("dictionary/categories");
};

export const fetchLexemes = async (category: string) => {
  const parts = ["dictionary", "list"];
  if (notEmptyString(category, 2)) {
    parts.push(category);
  }
  const path = parts.join("/");
  return await fetchDataObject(path);
};

export const fetchSnippetCategories = async () => {
  return await fetchDataObject("snippet/categories");
};

export const fetchSnippets = async (lang: string) => {
  const parts = ["snippet", "list", lang, 0, 0, 0];
  const path = parts.join("/");
  return await fetchDataObject(path);
};

export const fetchMessages = async (lang: string) => {
  const parts = ["message", "list", lang, 0, 0, 0];
  const path = parts.join("/");
  return await fetchDataObject(path);
};

export const fetchSnippet = async (category: string, subkey: string) => {
  const key = [category, subkey].join("__");
  const path = ["snippet", "by-key-start", key].join("/");
  return await fetchDataObject(path);
};

export const fetchPaymentOptions = async () => {
  const path = "user/payment-options";
  return await fetchDataObject(path);
};

export const fetchPreferenceOptions = async (
  survey = "preference_options",
  refresh = false
) => {
  const surveyKey = notEmptyString(survey, 4) ? survey : "preference_options";
  const parts = ["user/preferences", surveyKey];
  if (refresh) {
    parts.push("1");
  }
  const path = parts.join("/");
  return await fetchDataObject(path);
};

export const testFacetedSurveyAnswers = async (
  type = "faceted",
  items = [],
  refresh = false
) => {
  const parts = ["user", "test-surveys", type];
  if (refresh) {
    parts.push("1");
  }
  if (items instanceof Array && items.length > 0) {
    const response = await postData(parts.join("/"), items);
    if (response instanceof Object) {
      const { data } = response;
      if (data instanceof Object) {
        return { ...data, valid: true };
      }
    }
  }
  return { valid: false };
};

export const fetchFlags = async (refresh = true) => {
  const parts = ["setting", "flags"];
  if (refresh) {
    parts.push("refresh");
  }
  const path = parts.join("/");
  return await fetchDataObject(path);
};

export const fetchSurveys = async () => {
  const path = "user/survey-list";
  return await fetchDataObject(path);
};

export const fetchMultipleKeyScales = async () => {
  const path = "user/survey-multiscales";
  return await fetchDataObject(path);
};

export const fetchCountries = async () => {
  const path = "user/country-options";
  return await fetchDataObject(path);
};

export const fetchPermisions = async () => {
  const path = "user/permissions";
  return await fetchDataObject(path);
};

export const fetchRoleOptions = async () => {
  const path = "user/role-options";
  return await fetchDataObject(path);
};

export const fetchSetting = async (key: string) => {
  const path = "setting/by-key/" + key;
  return await fetchDataObject(path);
};

export const fetchProtocols = async (userId: string) => {
  const path = `setting/protocols/list/${userId}`;
  return await fetchDataObject(path);
};

export const saveProtocol = async (protocol, itemId = "") => {
  const hasItemId = notEmptyString(itemId, 8);
  const path = hasItemId
    ? `setting/protocol/edit/${itemId}`
    : "setting/protocol/save";
  const data: any = { valid: false, item: null };
  if (protocol instanceof Object) {
    const response = hasItemId
      ? await putData(path, protocol)
      : await postData(path, protocol);

    if (response.status >= 200 && response.status < 300) {
      const { item } = response.data;
      if (item instanceof Object) {
        data.valid = true;
        data.item = item;
      }
    }
  }
  return data;
};

export const saveRuleSet = async (
  ruleSet = null,
  itemId = "",
  colRef = "",
  index = -1,
  saveRule = true,
  limit = 1000
) => {
  const hasItemId = notEmptyString(itemId, 8);
  const hasColRef = notEmptyString(colRef, 2);

  const data: any = { valid: false, item: null, matches: [], num: -1 };
  if (ruleSet instanceof Object && hasItemId && hasColRef) {
    const saveFlag = saveRule ? 1 : 0;
    const limitInt = limit >= 100 && limit < 1000000 ? limit : 1000;
    const path = [
      "astrologic/protocol/rule",
      itemId,
      colRef,
      index,
      saveFlag,
      limitInt,
    ].join("/");
    const qStr = buildQueryString({ status: "reference" });
    const response = await putData(path + qStr, ruleSet);
    if (response.status >= 200 && response.status < 300) {
      const { item, matches, num } = response.data;
      if (item instanceof Object) {
        data.valid = true;
        data.item = item;
        data.matches = matches;
        data.num = num;
      }
    }
  }
  return data;
};

export const fetchPredictiveRuleSets = async (userId: string) => {
  const path = `setting/predictive/list/${userId}`;
  return await fetchDataObject(path);
};

export const savePredictiveRuleSet = async (rule, itemId = "") => {
  const hasItemId = notEmptyString(itemId, 12);
  const keys = Object.keys(rule);
  const path = hasItemId
    ? `setting/predictive/edit/${itemId}`
    : "setting/predictive/save";
  const result: any = { valid: false, item: null };
  if (keys.includes("_id")) {
    delete rule._id;
  }
  if (rule instanceof Object) {
    const response = hasItemId
      ? await putData(path, rule)
      : await postData(path, rule);
    if (response.status >= 200 && response.status < 300) {
      const { data } = response;
      if (data instanceof Object) {
        result.item = data;
        result.valid = true;
      }
    }
  }
  return result;
};

export const deletePredictiveRuleSet = async (userId = "", itemId = "") => {
  const path = [`setting/predictive/delete`, userId, itemId].join("/");
  const result: any = { valid: false, deleted: false, item: null };
  await deleteData(path).then((response) => {
    const { data } = response;
    if (data instanceof Object) {
      result.item = data.item;
      result.deleted = data.deleted;
      result.valid = data.valid;
    }
  });
  return result;
};

export const fetchLanguages = async (mode = "all", userId = "") => {
  const modeStr = ["all", "app", "both", "dict"].includes(mode) ? mode : "all";
  const path = ["setting", "languages", modeStr].join("/");
  return await fetchDataObject(path, userId);
};

export const fetchPairedTagOptions = async (latest = false) => {
  const cacheKey = "paired-tag-options";
  const rv = Vue.ls.get(cacheKey);
  let rows = [];
  if (!latest && rv instanceof Array && rv.length > 0) {
    rows = rv;
  } else {
    await fetchContent(["astrologic", cacheKey].join("/")).then((response) => {
      const { data } = response;
      if (data instanceof Array && data.length > 0) {
        Vue.ls.set(cacheKey, data, 60 * 60 * 1000);
        rows = data;
      }
    });
  }
  return rows;
};

export const fetchPairedTagStats = async (latest = false, max = 100000) => {
  const cacheKey = "tag-stats";
  const rv = Vue.ls.get(cacheKey);
  let result: Map<string, KeyNumValue> = new Map();
  if (!latest && rv instanceof Object) {
    result = new Map(Object.entries(rv));
  } else {
    await fetchContent(["astrologic", cacheKey, max].join("/")).then(
      (response) => {
        const { data } = response;
        if (data instanceof Object) {
          result = new Map(Object.entries(data));
          Vue.ls.set(cacheKey, data, 60 * 60 * 1000);
        }
      }
    );
  }
  return result;
};

export const fetchTraitTags = async () => {
  const cacheKey = "trait-tags";
  const rv = Vue.ls.get(cacheKey);
  let result = [];
  if (rv instanceof Array && rv.length > 0) {
    result = rv;
  } else {
    await fetchContent(["astrologic", cacheKey].join("/")).then((response) => {
      const { data } = response;
      if (data instanceof Array) {
        result = data.filter((row) => row instanceof Object);
        Vue.ls.set(cacheKey, data, 5 * 60 * 1000);
      }
    });
  }
  return result;
};

export const reassignTags = async (
  source: SlugName,
  target = null,
  years = -1,
  addToNotes = false,
  remove = false
) => {
  let result: any = { valid: false };
  const map: Map<string, any> = new Map();
  map.set("source", source);
  if (target instanceof Object) {
    const { slug, vocab } = target;
    if (notEmptyString(slug) && notEmptyString(vocab)) {
      map.set("target", target);
    }
  }
  if (addToNotes) {
    map.set("notes", true);
  }
  if (years > 0) {
    map.set("years", years);
  }
  const removeTag = remove && map.has("target") === false;
  map.set("remove", removeTag);
  const inputData = Object.fromEntries(map);
  await postData("astrologic/reassign-paired-tags", inputData).then(
    (response) => {
      const { data } = response;
      if (data instanceof Object) {
        result = data;
      }
    }
  );
  return result;
};

export const listCustomSettings = async () => {
  const path = "setting/list-custom";
  const response = await fetchContent(path);
  let items: Array<any> = [];
  if (response.data instanceof Array) {
    items = response.data;
  }
  return items;
};

export const listFiles = async (directory: string, userId = "") => {
  const path = "setting/list-dir/" + directory;
  const response = await fetchContent(path, userId);
  let data = {
    valid: false,
    path: "",
    files: [],
    size: 0,
    numRefs: 0,
  };
  if (response.data instanceof Object) {
    const keys = Object.keys(response.data);
    if (keys.includes("valid") && keys.includes("files")) {
      data = response.data;
    }
  }
  return data;
};

export const planetaryStations = async (
  num = 0,
  startYear = 2010,
  endYear = 2100
) => {
  const path = `astrologic/stations-by-planet/${num}/${startYear}/${endYear}`;
  const response = await fetchContent(path);
  let data = {
    valid: false,
    values: [],
  };
  if (response.data instanceof Object) {
    const keys = Object.keys(response.data);
    if (keys.includes("valid") && keys.includes("values")) {
      if (response.data.values instanceof Array) {
        data = response.data;
      }
    }
  }
  return data;
};

export const fetchTransitionInfo = async (lat: number, lng: number, jd = 0) => {
  const refJd = jd > 0 ? jd : currentJulianDay();
  const dt = julToISODate(refJd);
  const uri = [
    "astrologic/transitions",
    [lat, lng].join(","),
    dt,
    "extended",
  ].join("/");
  let data: any = { valid: false };
  await fetchContent(uri).then((response) => {
    if (response.data instanceof Object) {
      data = response.data;
    }
  });
  return data;
};
export const generateExport = async (userId: string, name: string) => {
  let data: any = { valid: false };
  await fetchContent(["setting/backup", userId, name].join("/")).then(
    (response) => {
      if (response.data instanceof Object) {
        data = response.data;
      }
    }
  );
  return data;
};

export const saveSetting = async (
  key,
  userId,
  value = null,
  notes = "",
  type = null
) => {
  const path = "setting/edit-by-key/" + key + "/" + userId;
  const response = await putData(path, { key, value, notes, type });
  let result: any = { valid: false };
  if (response instanceof Object) {
    const { data } = response;
    if (data instanceof Object) {
      if (data.setting) {
        result = data;
      }
    }
  }
  return result;
};

export const createSetting = async (key, userId = "", value = null) => {
  const path = "setting/create";
  const response = await postData(path, { key, value, userID: userId });
  let result: any = { valid: false };
  if (response instanceof Object) {
    const { data } = response;
    if (data instanceof Object) {
      if (data.setting) {
        result = data;
      }
    }
  }
  return result;
};

export const deleteSetting = async (settingId: string, userId: string) => {
  const path = ["setting/delete", settingId, userId].join("/");
  const data = { valid: false, setting: "" };
  await deleteData(path).then((response) => {
    if (response.data instanceof Object) {
      const { valid, setting } = response.data;
      if (valid) {
        data.valid = true;
        data.setting = setting;
      }
    }
  });
  return data;
};

export const saveLexeme = async (lexeme: Lexeme) => {
  const response = await postData("dictionary/save", lexeme);
  let data: any = { valid: false };
  if (response.data) {
    if (response.data instanceof Object) {
      data = { valid: true, ...response.data };
    }
  }
  return data;
};

export const saveSnippet = async (
  snippet: Snippet,
  langKeys: string[] = [],
  overrideKey = ""
) => {
  const qFilter: Map<string, string> = new Map();
  if (notEmptyString(overrideKey, 3)) {
    qFilter.set("override", overrideKey);
  }
  if (langKeys.length > 0) {
    qFilter.set("langs", langKeys.join(","));
  }
  const queryString =
    qFilter.size > 0
      ? buildQueryString(Object.fromEntries(qFilter.entries()), true)
      : "";
  const response = await postData("snippet/save" + queryString, snippet);
  let data: any = { valid: false };
  if (response.data) {
    if (response.data instanceof Object) {
      data = { valid: true, ...response.data };
    }
  }
  return data;
};

export const deleteLexeme = async (key: string, userId: string) => {
  const response = await deleteData(`dictionary/delete/${key}/${userId}`);
  let data: any = { valid: false };
  if (response.data) {
    if (response.data instanceof Object) {
      data = { ...response.data };
    }
  }
  return data;
};

export const deleteSnippet = async (
  key: string,
  userId: string,
  bulkMode = false,
  override = false
) => {
  const method = bulkMode ? "bulk-delete" : "delete";
  const parts = ["snippet", method, key, userId];
  if (!bulkMode && override) {
    parts.push("1");
  }
  const response = await deleteData(parts.join("/"));
  let data: any = { valid: false };
  if (response.data) {
    if (response.data instanceof Object) {
      data = { ...response.data };
    }
  }
  return data;
};

export const fetchSwissephFileList = async (subDir = "") => {
  const parts = ["astrologic", "swisseph", "files"];
  if (notEmptyString(subDir, 1)) {
    parts.push(subDir);
  }
  const response = await fetchData(parts.join("/"));
  const { data } = response;
  const result: any = { valid: false, files: [] };
  if (data instanceof Array) {
    if (data.length > 0) {
      result.files = data;
      result.valid = true;
    }
  }
  return result;
};

export const uploadToSwissEph = async (
  file,
  userId = "",
  newName = "",
  subDir = "",
  mode = ""
) => {
  const newNamePart = notEmptyString(newName, 5) ? newName : "-";
  const subDirPart = notEmptyString(subDir, 5) ? subDir : "-";
  const path = [
    "setting/upload-swiss-ephemeris",
    userId,
    newNamePart,
    subDirPart,
    mode,
  ].join("/");
  let result: any = { valid: false };
  const formData = new FormData();
  formData.set("file", file);
  await postData(path, formData).then((response) => {
    const { data } = response;
    if (data instanceof Object) {
      result = data;
    }
  });
  return result;
};

export const downloadResource = (
  userId: string,
  fileName: string,
  dir = ""
) => {
  const parts = ["setting", "file-download", userId, fileName];
  if (notEmptyString(dir)) {
    parts.push(dir);
  }
  const path = parts.join("/");
  return fetchContent(path);
};

export const deleteSwissEpheFile = async (
  userId: string,
  fileName: string,
  subDir = ""
) => {
  //
  const path = [
    "setting",
    "delete-swisseph-file",
    userId,
    fileName,
    subDir,
  ].join("/");
  const response = await deleteData(path);
  let result: any = { valid: false };
  if (response instanceof Object) {
    const { data } = response;
    if (data.valid) {
      result = data;
    }
  }
  return result;
};

export const deleteFile = async (userId: string, fileName: string) => {
  //
  const path = ["user", "media-item/delete", userId, fileName].join("/");
  const response = await deleteData(path);
  let result: any = { valid: false };
  if (response instanceof Object) {
    const { data } = response;
    if (data.valid) {
      result = data;
    }
  }
  return result;
};

export const listUsers = async (
  start = 0,
  limit = 100,
  criteria: any = null
) => {
  let output: any = { valid: false };
  await fetchContent(
    "user/list/" + start + "/" + limit + buildQueryString(criteria)
  ).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Object) {
      output = result;
      output.valid = true;
    }
  });
  return output;
};

export const listAdmins = async () => {
  return listUsers(0, 1000, { editor: 1, admin: 1 });
};

export const fetchSiteData = async () => {
  let returnData: any = {
    valid: false,
  };
  const cKey = "astrologic/settings";
  await fetchContent(cKey).then((res) => {
    const { data } = res;
    if (data instanceof Object) {
      if (data.valid instanceof Array) {
        returnData = data;
      }
    }
  });
  return returnData;
};

export const getDataList = async (cKey: string, mapFunc: any = null) => {
  let dataList: Array<any> = [];
  if (!mapFunc) {
    mapFunc = (item: any) => item;
  }
  await fetchContent(cKey).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Array) {
      dataList = result.map(mapFunc);
    }
  });
  return dataList;
};

export const authenticate = async (email: string, password: string) => {
  const data: any = {
    valid: false,
    hasSubmission: false,
  };
  const params = {
    email,
    password,
  };
  await postData("user/login", params).then((response) => {
    if (response.data) {
      const user = response.data;
      if (user.identifier) {
        if (user.active) {
          Object.entries(user).forEach((entry) => {
            const [key, val] = entry;
            data[key] = val;
          });
          data.valid = true;
        }
      }
      if (user.msg) {
        data.msg = user.msg;
      }
    }
  });
  return data;
};

export const updateUser = async (userId: string, edited: any = null) => {
  const data: any = {
    valid: false,
  };
  await putData("user/edit/" + userId, edited).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Object) {
      const { user, msg } = result;
      if (user._id) {
        data.user = user;
      }
      if (msg) {
        data.msg = msg;
      }
    }
  });
  return data;
};

export const resetPassword = async (hash: string, params = null) => {
  let data = {
    valid: false,
    msg: "unmatched",
  };
  await putData(`user/reset-pass/` + hash, params).then((res: any) => {
    if (res.data) {
      if (res.data.identifier) {
        data = res.data;
        if (data.valid) {
          data.msg = "OK";
        } else {
          data.msg = "Account unavailable";
        }
      }
    }
  });
  return data;
};

export const requestReset = async (email: string) => {
  let data: any = {
    valid: false,
    msg: "unmatched",
  };
  await postData(`user/reset-request`, { email }).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Object) {
      data = result;
      if (data.link) {
        data.valid = true;
      }
    }
  });
  return data;
};

export const registerUser = async (params = null) => {
  const data = {
    valid: false,
    user: null,
    msg: "",
  };
  const saveParams = {
    identifier: params.identifier,
    nickName: params.nickName,
    fullName: params.fullName,
    password: params.password,
    mode: "local",
    roles: params.roles,
    active: params.active,
  };
  await postData(`user/create`, saveParams).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Object) {
      const { user } = res.data;
      data.msg = res.data.message;
      if (user._id) {
        data.user = user;
        data.valid = true;
      }
    }
  });
  return data;
};

export const getIpWhitelist = async (userID: string) => {
  const url = ["setting/ip-whitelist/list", userID].join("/");
  let ips = [];
  await fetchContent(url).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Array) {
      ips = result;
    }
  });
  return ips;
};

export const saveIpWhitelist = async (userID: string, ips: string[]) => {
  const url = ["setting/ip-whitelist/save", userID].join("/");
  const data = { valid: false, ips: [] };
  const inData = { strings: ips };
  await putData(url, inData).then((res: any) => {
    const result = extractDataObj(res);
    if (result instanceof Object) {
      data.ips = result.ips;
      data.valid = result.valid;
    }
  });
  return ips;
};

export const fetchRoddenValues = async () => {
  const rv = Vue.ls.get("rodden-values");
  let rows = [];
  if (rv instanceof Array) {
    rows = rv;
  } else {
    fetchSetting("rodden_scale_values").then((data) => {
      if (data instanceof Object && data.value instanceof Array) {
        Vue.ls.set("rodden-values", data.value);
        rows = data.value.filter((rv) => rv.enabled);
      }
    });
  }
  return rows;
};
