import Vue from "vue";
import { notEmptyString } from "@/api/validators";
import { Chart } from "@/api/models/Chart";

export const matchInGridSet = (gridSet: any, setKey: string) => {
  const hasStored = gridSet instanceof Object;
  let widgetItems = [];
  if (hasStored) {
    if (gridSet[setKey] instanceof Array) {
      widgetItems = gridSet[setKey];
    }
  }
  return widgetItems;
};

export interface WidgetSetting {
  component: string;
  name: string;
  enabled: boolean;
  mode?: string;
}

export const getWidgetItems = (setKey: string) => {
  const gridSet = Vue.ls.get("grid-sets");
  return matchInGridSet(gridSet, setKey);
};

export const matchWidgetInstance = (
  widgetItems: Array<any>,
  name: string,
  index = -1
) => {
  return widgetItems.find((w, wi) => w.name === name && wi == index);
};

export const fetchWidgetInstance = (
  setKey: string,
  name: string,
  index = -1
) => {
  return getWidgetItems(setKey).find(
    (w, wi) => w.name === name && wi === index
  );
};

export const setWidgetOption = (
  setKey: string,
  name: string,
  index = -1,
  key: string,
  value = null
) => {
  const gs = Vue.ls.get("grid-sets");
  if (gs instanceof Object) {
    const items = matchInGridSet(gs, setKey);

    if (items.length > 0) {
      items.forEach((w, wi) => {
        if (w.name === name && wi == index) {
          items[wi][key] = value;
        }
      });
    }
    gs[setKey] = items;
    Vue.ls.set("grid-sets", gs);
  }
};

export const saveWidgetSetOptions = (
  gridSets: any,
  data: {
    rels: string[];
    set: string;
  }
) => {
  if (data.set && gridSets instanceof Object) {
    const gs = Object.assign({}, gridSets);
    gs[data.set] = data.rels
      .filter((rel) => notEmptyString(rel))
      .map((rel) => {
        const [name, ref] = rel.split("-");
        let vargaNum = 1;
        let set = 1;
        let mode = "";
        let chalitBhava = false;
        const index = parseInt(ref);
        const widgetItems = getWidgetItems(data.set);
        if (widgetItems.length > 0) {
          const currW = matchWidgetInstance(widgetItems, name, index);
          if (currW) {
            vargaNum = currW.vargaNum;
            if (currW.chalitBhava) {
              chalitBhava = currW.chalitBhava;
            }
            if (currW.set) {
              switch (currW.set) {
                case 1:
                case 2:
                  set = currW.set;
                  break;
              }
            }
            if (currW.mode) {
              switch (currW.mode) {
                case "single":
                case "double":
                case "midpoint_outer":
                  mode = currW.mode;
                  break;
              }
            }
          }
        }
        return { name, vargaNum, set, mode, chalitBhava };
      });
    Vue.ls.set("grid-sets", gs);
  }
};

export const syncOptions = (
  instance: any,
  setKey: string,
  name: string,
  index = 0
) => {
  const options = fetchWidgetInstance(setKey, name, index);
  if (options instanceof Object && instance instanceof Object) {
    Object.entries(options).forEach((entry) => {
      const [key, value] = entry;
      switch (key) {
        case "vargaNum":
          if (typeof value === "number") {
            instance.vargaNum = value;
          }
          break;
      }
    });
  }
};

export const matchPaneContext = (paneKey: string): string => {
  switch (paneKey) {
    case "p1":
      return "current";
    case "p2":
      return "single";
    case "p3":
      return "paired";
    case "p4":
      return "combo";
    default:
      return "-";
  }
};

const matchWidgetClassName = (widgetName = null) => {
  const key = notEmptyString(widgetName) ? widgetName.toLowerCase() : "";
  switch (key) {
    case "dashawidget":
      return "DashaTree";
    default:
      return widgetName;
  }
};

export const mapMenuWidget = (widget) => {
  const entries = [];
  if (widget instanceof Object) {
    Object.entries(widget).forEach((entry) => {
      const [k, v] = entry;
      switch (k) {
        case "name":
          entries.push(["name", matchWidgetClassName(v)]);
          break;
        case "vargaNum":
        case "mode":
        case "dasha":
        case "key":
        case "set":
          entries.push([k, v]);
          break;
        case "settings":
          if (v instanceof Object) {
            entries.concat(Object.entries(v));
          }
          break;
      }
    });
    if (!entries.some((pair) => pair[0] === "mode")) {
      entries.push(["mode", ""]);
    }
    if (!entries.some((pair) => pair[0] === "set")) {
      entries.push(["set", 1]);
    }
  }
  return Object.fromEntries(entries);
};

export const manageWidget = (
  gridSets,
  { action, context, index, name, vargaNum, mode, set }
) => {
  if (gridSets instanceof Object) {
    if (action === "remove") {
      if (name === "self" && index < index < gridSets[context].length) {
        gridSets[context].splice(index, 1);
      }
    } else {
      const widget: any = {
        name,
        vargaNum,
      };
      if (mode) {
        widget.mode = mode;
      }
      if (set) {
        widget.set = set;
      }
      const refIndex = action === "add" ? index + 1 : index;
      const gKeys = Object.keys(gridSets);
      if (gKeys.includes(context)) {
        gridSets[context].splice(refIndex, 0, widget);
      }
    }
    Vue.ls.set("grid-sets", gridSets);
  }
};

export const saveEnabledLangsFromQueryString = (ls) => {
  if (window.location.search.length > 1) {
    const { search } = window.location;
    if (search.indexOf("langs=") >= 0) {
      const langStr = search
        .split("langs=")
        .pop()
        .split("&")
        .shift();
      if (notEmptyString(langStr)) {
        const langs = langStr.toLowerCase().split(",");
        if (langs.length > 0) {
          if (langs.indexOf("en") < 0) {
            langs.unshift("en");
          }
          if (ls instanceof Object) {
            ls.set("enabled_langs", langs);
          }
        }
      }
    }
  }
};

export const addChartToList = (chart: Chart) => {
  if (chart instanceof Object) {
    const { _id } = chart;
    if (notEmptyString(_id) && chart.subject.eventType === "birth") {
      const currChartIds = Vue.ls.get("chart-items");
      const hasChartIds = currChartIds instanceof Array;
      const items = hasChartIds ? currChartIds : [];
      const currIndex = items.findIndex((item) => item.id === _id);
      if (currIndex >= 0) {
        items.splice(currIndex, 1);
      }
      items.unshift(chart.summary);
      Vue.ls.set("chart-items", items);
    }
  }
};

const predictiveInnerFrameOpts: WidgetSetting[] = [
  { component: "Birth", name: "Birth Chart", enabled: true },
  { component: "TithiPravesha", name: "Tithi Praveśa chart", enabled: false },
  { component: "NakshtraPravesha", name: "Nakṣhtra Praveśa chart", enabled: false },
  { component: "YogaPravesh", name: "Yoga Praveśa chart", enabled: false },
  { component: "Varshaphal", name: "Varṣaphal chart", enabled: false }
];

const predictiveMidFrameOpts: WidgetSetting[] = [
  { component: "Transit", name: "Transits", enabled: true },
  { component: "MidTimeTransit", name: "Mid-Time Transits", enabled: false },
  { component: "BhinnashthakavargaTransit", name: "Bhinnāṣṭhakavarga Transit", enabled: false },
];

const WidgetSettingOpts: WidgetSetting[] = [
  { component: "SingleChart", name: "Default (Birth Chart)", enabled: true },
  { component: "SingleChart__full", name: "Kakṣha Transit ", enabled: true },
  { component: "SarvatobhadraCakra", name: "Sarvatobhadra cakra", enabled: true },
  { component: "KotaCakraChart", name: "Koṭa cakra", enabled: true },
  { component: "ShulaCakra", name: "Śūla cakra", enabled: true  },
  { component: "CandraKalanalaCakra", name: "Candra kālānala", enabled: true  }
];

export const predictiveMenuItems = (context = "predictive", index = 0) => {
  const items = [{
      name: "Innermost / Centre",
      key: "c1",
      widgets: predictiveInnerFrameOpts,
    },
    {
      name: "Outer Frame",
      key: "c2",
      widgets: predictiveMidFrameOpts
    },
    {
      name: "Display Type",
      widgets: WidgetSettingOpts,
      key: "widget",
    }
  ];
  return items.map((item, mi) => {
    const itemKey = ["predictive-opt", item.key, mi].join("-");
    item.widgets = item.widgets.map(w => {
      const title = w.name;
      const key = w.component.replace(/([a-z])([A-Z])/, '$1_$2').toLowerCase();
      const itemKey = [context, index, mi, key].join("-");
      return { ...w, itemKey, title };
    });
    return { ...item, itemKey };
  });
}

export const defaultPredictiveSettings = {
  c1: { 
    varga:4,
    component: "Birth"
  },
  c2:{
    varga: 40,
    component: "Transit"
  },
  widget:{
    varga: 7,
    component: "CandraKalanalaCakra"
  }
};


export const matchMainPredictiveSettings = (context = "predictive", index = 0) => {
  const storedSettings = Vue.ls.get('predictive-main-widget');
  const vargas: number[] = [1, 1, 1];
  const components: string[] = ["Birth", "Transit", "SingleChart"];
  const settings = storedSettings instanceof Object? storedSettings : defaultPredictiveSettings;
  Object.entries(settings).forEach(entry => {
    const [key, value] = entry;
    const keyIndex = predictiveMenuItems(context, index).findIndex(mi => mi.key === key);
    if (keyIndex >= 0 && keyIndex <= vargas.length) {
      if (value instanceof Object) {
        Object.entries(value).forEach(sub => {
          const [k,v] = sub;
          const subType = typeof v;
          if (subType === "string" && k === "component") {
            components[keyIndex] = v;
          } else if (subType === "number" && k === "varga") {
            vargas[keyIndex] = v;
          }
        });
      }
    }
  });
  return { vargas, components, settings };
}