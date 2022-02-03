import { LngLat } from "../models/Chart";
import { GeoLoc } from "../models/GeoLoc";

export interface Geo {
  lat: number;
  lng: number;
  alt?: number;
}

export interface Payment {
  service: string;
  ref: string;
  amount: number;
  curr: string;
  createdAt: Date;
}

export interface Placename {
  name: string;
  fullName: string;
  type: string;
  geo: GeoLoc;
}

export interface Preference {
  key: string;
  value: any;
  type: string;
}

export interface Attributes {
  width: number;
  height: number;
  orientation: number;
  duration: number;
  uploadDate: string;
  preview: string;
}

export interface MediaItem {
  filename: string;
  mime: string;
  source: string;
  size: number;
  attributes: Attributes;
  type: string;
  title: string;
}

export interface Profile {
  type: string;
  text: string;
  mediaItems: MediaItem[];
  createdAt: Date;
  modifiedAt: Date;
}

export interface Status {
  role: string;
  current: boolean;
  payments: Payment[];
  expiresAt?: Date;
  createdAt: Date;
  modifiedAt: Date;
}

export interface User {
  _id: string;
  fullName: string;
  nickName: string;
  identifier: string;
  mode: string;
  roles: string[];
  active: boolean;
  test: boolean;
  status: Status[];
  geo?: Geo;
  placenames?: Placename[];
  gender?: string;
  preferences?: Preference[];
  profiles: Profile[];
  preview?: string;
  token?: string;
  login?: Date;
  createdAt?: Date;
  modifiedAt?: Date;
}

export const defaultUser: User = {
  _id: "",
  fullName: "",
  nickName: "",
  identifier: "",
  mode: "",
  roles: [],
  active: false,
  test: false,
  status: [],
  geo: { lat: 0, lng: 0, alt: 0 },
  placenames: [],
  gender: "-",
  preferences: [],
  profiles: [],
  preview: "",
};

export interface PairedRef {
  id: string;
  chartId: string;
  refNum: number;
  name: string;
  datetime: string;
  tzOffset: number;
  relType?: string;
}

export interface ChartItem {
  _id: string;
  isDefaultBirthChart: boolean;
  name: string;
  gender: string;
  tzOffset: number;
  status?: string;
  jd: number;
  datetime: string;
  date?: string;
  time?: string;
  roddenValue?: number;
  roddenScale: string;
  minOffset?: number;
  lat: number;
  lng: number;
  alt?: number;
  paired: PairedRef[];
}
