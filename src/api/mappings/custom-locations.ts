import { SimpleLocation } from "../interfaces";

export const buildCustomLocOptions = (
  customLocations: SimpleLocation[] = []
) => {
  return [
    {
      lat: 0,
      lng: 0,
      name: "--",
      itemKey: "custom-location-empty",
      value: "--",
    },
    ...customLocations.map((item) => {
      const { lat, lng, name } = item;
      const itemKey = ["custom-location", lat, lng].join("-");
      const value = JSON.stringify(item);
      return { lat, lng, name, itemKey, value };
    }),
  ];
};
