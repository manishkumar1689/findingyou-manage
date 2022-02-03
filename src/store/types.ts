import { Lexeme } from "@/api/models/Lexeme";
import { ChartForm } from "@/api/models/ChartForm";
import { AyanamshaItem } from "@/api/interfaces";

export interface WindowState {
  height: number;
  width: number;
}

export interface MenuItem {
  to: string;
  title: string;
  active: boolean;
  children: Array<MenuItem>;
}

export interface UserState {
  _id: string;
  identifier: string;
  name: string;
  fullName?: string;
  roles: Array<string>;
  active: boolean;
  lastLogin: Date;
  created: Date;
  modified: Date;
  isAdmin: any;
}

export interface RootState {
  version: number;
}

export interface DictionaryState {
  lexemes: Array<Lexeme>;
  text: any;
  lexeme: any;
  byCategory: any;
  graha: any;
}

export interface ChartFormSetState {
  forms: Array<ChartForm>;
  addForm?: any;
  appendForm?: any;
  removeForm?: any;
}

export interface SettingState {
  ayanamsha: AyanamshaItem;
  degMode: "dms";
}
