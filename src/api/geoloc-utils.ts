import Vue from "vue";
import { smartCastInt } from "./converters";
import { isNumeric } from "./validators";

const showGeoLoc = (data, callback) => {
  const { coords } = data;
  if (coords) {
    callback(
      {
        longitude: coords.longitude,
        latitude: coords.latitude,
        alt: 20
      }
    );
  }
};

export const fetchGeo = (callback, reset = false) => {
  const stored = reset === true ? null : Vue.ls.get('geoloc');
  const keys = stored instanceof Object ? Object.keys(stored) : [];
  const hasStored = keys.includes("coords") && keys.includes("timestamp");
  if (hasStored) {
    showGeoLoc(stored, callback);
  } else {
    if (navigator.geolocation.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        (data) => {
          const {coords, timestamp} = data;
          Vue.ls.set('geoloc', {
            coords: {
              longitude: coords.longitude,
              latitude: coords.latitude,
              alt: 20
            },
            timestamp
          }, 24 * 60 * 60 * 1000);
          showGeoLoc(data, callback);
        },
        (error) => {
          callback(error);
        },
        { maximumAge: 60 * 60 * 1000 }
      );
    }
  }
};

export const naturalTzOffset = (lng = 0) => {
  return Math.floor((lng + 7.5) / 15) * 3600;
}

export const setGeoLocation = (inData = null, tzData = null) => {
  if (inData instanceof Object) {
    const {lat, lng, alt } = inData;
    if (isNumeric(lat) && isNumeric(lng)) {
      const timestamp = new Date().getTime();
      const tzObj = tzData instanceof Object ? tzData : { tz: "", tzOffset: naturalTzOffset(lng), shortTz: "" }
      Vue.ls.set('geoloc', {
        coords: {
          longitude: lng,
          latitude: lat,
          alt
        },
        ...tzObj,
        timestamp
      }, 24 * 60 * 60 * 1000);
    }
  }
}

export const getGeoTzOffset = () => {
  const stored = Vue.ls.get('geoloc');
  const hasStored = stored instanceof Object;
  const keys = hasStored ? Object.keys(stored) : [];
  const hasStoredOffset = keys.includes('tzOffset') && isNumeric(stored.tzOffset);
  if (!hasStoredOffset) {
    const mins = new Date().getTimezoneOffset();
    return mins !== 0 ? 0 - (mins * 60) : 0;
  } else {
    return smartCastInt(stored.tzOffset)
  }
}