import { DictionaryState } from "@/store/types";
import {
  capitalize,
  ordinalNumber,
  truncate,
  truncateFirstInit,
  zeroPad,
} from "../converters";
import { KeyName } from "../interfaces";
import { isNumeric } from "../validators";

export interface ChartOptGroup {
  key: string;
  name: string;
  charts: Array<number>;
  types: Array<string>;
  options?: Array<KeyName>;
  optionKeys?: Array<string>;
  mapFunc?: string;
}

export const chartModes = [
  { key: "female", name: "Female chart", single: true, double: true },
  { key: "male", name: "Male chart", single: true, double: true },
  { key: "c1", name: "Chart A", single: false, double: true },
  { key: "c2", name: "Chart B", single: false, double: true },
  {
    key: "timespace",
    name: "T. Composite",
    single: true,
    double: true,
  },
  { key: "midpoint", name: "M. Composite", single: true, double: true },
  { key: "single", name: "Single chart", single: false, double: false },
  { key: "either", name: "Either chart", single: true, double: false },
];

export const typeTags = [
  { key: "spouse", name: "spouse" },
  { key: "spousal_equivalent", name: "spousal equivalent" },
  { key: "lover", name: "lover" },
  { key: "lived_together", name: "lived together" },
  { key: "one_night_stand", name: "one night stand" },
  { key: "friendship", name: "Friendship" },
  { key: "business_partner", name: "Business partner" },
];

export const qualityTags = [
  { key: "good", name: "good" },
  { key: "bad", name: "bad" },
  { key: "boring_dull", name: "boring / dull" },
  { key: "exciting", name: "exciting" },
  { key: "sexual_chemistry", name: "sexual chemistry" },
  { key: "multiple_breakups", name: "multiple breakups" },
  { key: "domestic_abuse", name: "domestic abuse" },
];

export const coreGrahaKeys = [
  "su",
  "mo",
  "ma",
  "me",
  "ju",
  "ve",
  "sa",
  "ra",
  "ke",
];

export const extendedGrahaKeys = [
  ...coreGrahaKeys,
  "as",
  "ur",
  "ne",
  "pl",
  "nat_benefic",
  "nat_malefic",
];

export const shulaGrahaKeys = [...coreGrahaKeys, "lord_bhukti", "lord_dasha"];

export const allGrahaKeys = [
  ...extendedGrahaKeys,
  "se",
  "as",
  "ds",
  "mc",
  "ic",
  "vt",
];

export const transitGrahaKeys = [
  ...coreGrahaKeys,
  "as",
  "lord_dasha",
  "lord_bhukti",
];

export const kotaGrahaKeys = [
  ...coreGrahaKeys,
  "lord_dasha",
  "lord_bhukti",
  "kota_pala",
  "kota_svami",
];

export const kutaGrahaKeys = [...coreGrahaKeys, "as", "ds"];

export const bmOpts = [
  "any_benefics",
  "any_malefics",
  "all_benefics",
  "all_malefics",
  "1_malefic",
  "2_malefics",
  "3_malefics",
  "1_benefic",
  "2_benefics",
  "2_benefics",
];

export const grahaNumOpts = [
  "any_graha",
  "any_2_grahas",
  "any_3_grahas",
  "any_4_grahas",
  "any_5_grahas",
  "any_6_grahas",
  "any_7_grahas",
];

export const moonAspectKeys = [
  "moon_t_15",
  "moon_t_01",
  "moon_t_02",
  "moon_t_03",
  "moon_t_04",
  "moon_t_05",
  "moon_t_06",
  "moon_t_07",
  "moon_t_08",
  "moon_t_09",
  "moon_t_10",
  "moon_t_11",
  "moon_t_12",
  "moon_t_13",
  "moon_t_14",
  "moon_t_00",
];

export const charaKarakaKeys = [
  "chara_1",
  "chara_2",
  "chara_3",
  "chara_4",
  "chara_5",
  "chara_6",
  "chara_7",
  "chara_8",
];

export const baseHouseLords = [
  "house_1",
  "house_2",
  "house_3",
  "house_4",
  "house_5",
  "house_6",
  "house_7",
  "house_8",
  "house_9",
  "house_10",
  "house_11",
  "house_12",
];

const extraHouseLords = [
  "yoga_karaka",
  "kendra",
  "trikona",
  "dushtana",
  "maraka",
];

export const houseLords = [...baseHouseLords, ...extraHouseLords];

export const predictiveHouseLords = [
  ...baseHouseLords,
  "func_benefic",
  "func_malefic",
  ...extraHouseLords,
];

export const kutaHouseLords = baseHouseLords;

export const kutaOptKeys = [
  ...kutaGrahaKeys,
  ...kutaHouseLords,
  ...charaKarakaKeys,
];

export const signOpts = [
  { key: "01", name: "in aries" },
  { key: "02", name: "in taurus" },
  { key: "03", name: "in gemini" },
  { key: "04", name: "in cancer" },
  { key: "05", name: "in leo" },
  { key: "06", name: "in virgo" },
  { key: "07", name: "in libra" },
  { key: "08", name: "in scorpio" },
  { key: "09", name: "in sagittarius" },
  { key: "10", name: "in capricorn" },
  { key: "11", name: "in aquarius" },
  { key: "12", name: "in pisces" },
];

const caughadiaSecondaryOptions = [
  { key: "fortune", name: "Lot of Fortune" },
  { key: "spirit", name: "Lot of Spirit" },
  { key: "brighu_bindu", name: "Brighu Bindu" },
  { key: "yogi_point", name: "Yogi Point" },
  { key: "yogi_graha", name: "Yogi Graha" },
  { key: "avayogi_point", name: "AvaYogi Point" },
  { key: "avayogi_graha", name: "AvaYogi Graha" },
];

const caughadiaOptions = [
  { key: "udvega_timeslot", name: "udvega time-slot" },
  { key: "cala_timeslot", name: "cala  time-slot" },
  { key: "lābha_timeslot", name: "lābha  time-slot" },
  { key: "amṛta_timeslot", name: "amṛta  time-slot" },
  { key: "kāla_timeslot", name: "kāla  time-slot" },
  { key: "śubha_timeslot", name: "śubha  time-slot" },
  { key: "roga_timeslot", name: "roga  time-slot" },
  { key: "benefic_timeslot", name: "benefic  time-slot" },
  { key: "malefic_timeslot", name: "malefic  time-slot" },
];

const ppOptions = [
  { key: "birth_bird_graha", name: "Birth bird graha" },
  { key: "day_ruling_bird_graha", name: "Segment ruling bird graha" },
  { key: "day_dying_bird_graha", name: "Segment dying bird graha" },
  { key: "yama_ruling_graha", name: "Sub-yama ruling graha" },
  { key: "yama_eating_graha", name: "Sub-yama eating graha" },
  { key: "yama_walking_graha", name: "Sub-yama walking graha" },
  { key: "yama_sleeping_graha", name: "Sub-yama sleeping graha" },
  { key: "yama_dying_graha", name: "Sub-yama dying graha" },
  ...caughadiaSecondaryOptions,
];

const dignityOpts = [
  { key: "exalted_sign", name: "exalted (sign)" },
  { key: "mula_trikona", name: "mūla Trikona" },
  { key: "own_sign", name: "own sign" },
  { key: "greatfriend_sign", name: "sign of great friend" },
  { key: "friend_sign", name: "sign of friend" },
  { key: "neutral_sign", name: "sign of neutral" },
  { key: "enemy_sign", name: "sign of enemy" },
  { key: "archenemy_sign", name: "sign of arch enemy" },
  { key: "directional_strength", name: "directional strength" },
  { key: "retrograde", name: "retrograde" },
  { key: "vargottama", name: "vargottama" },
];

const houseOpts = [
  { key: "h1", name: "in House 1" },
  { key: "h2", name: "in House 2" },
  { key: "h3", name: "in House 3" },
  { key: "h4", name: "in House 4" },
  { key: "h5", name: "in House 5" },
  { key: "h6", name: "in House 6" },
  { key: "h7", name: "in House 7" },
  { key: "h8", name: "in House 8" },
  { key: "h9", name: "in House 9" },
  { key: "h10", name: "in House 10" },
  { key: "h11", name: "in House 11" },
  { key: "h12", name: "in House 12" },
  { key: "kendras", name: "in Kendras" },
  { key: "trikonas", name: "in Trikonas" },
  { key: "dushtanas", name: "in Dushtanas" },
  { key: "marakas", name: "in Marakas" },
  { key: "upachaya", name: "in Upachaya" },
];

const oddEvenSignOpts = [
  { key: "odd", name: "in odd sign" },
  { key: "even", name: "in even sign" },
];

const extraSignOpts = [
  { key: "fire", name: "in fire signs" },
  { key: "earth", name: "in earth signs" },
  { key: "air", name: "in air signs" },
  { key: "water", name: "in water signs" },
  { key: "movable", name: "in movable signs" },
  { key: "fixed", name: "in fixed signs" },
  { key: "dual", name: "in dual signs" },
];

const panchapakshiOpts = [
  { key: "birth_bird", name: "Birth Bird" },
  { key: "day_night_ruling_bird", name: "Day/Night Ruling Bird" },
  { key: "day_night_dying_bird", name: "Day/Night Dying Bird" },
  { key: "subyama_bird", name: "Sub-yama bird" },
  { key: "yama_action", name: "Yama action" },
  { key: "subyama_action", name: "Sub-yama action" },
];

const headFootSignOpts = [
  { key: "head_rising", name: "head rising" },
  { key: "back_rising", name: "feet rising" },
  { key: "both_rising", name: "both rising" },
];

const specialSignOpts = [
  ...signOpts,
  ...oddEvenSignOpts,
  ...extraSignOpts,
  ...headFootSignOpts,
];

const birthAscendantOpts = [{ key: "birth_asc", name: "Birth ascendant" }];

export const numGrahasNums = [1, 2, 3, 4, 5, 6, 7];

export const nakshatraNums = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
];

export const chartOptSets = [
  {
    key: "graha",
    name: "Grahas",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: allGrahaKeys,
    mapFunc: "expandGrahaKey",
  },
  {
    key: "predictivegraha",
    name: "Grahas",
    charts: [1, 2],
    types: ["transit"],
    optionKeys: extendedGrahaKeys,
    mapFunc: "expandGrahaKey",
  },
  {
    key: "shulagraha",
    name: "Grahas",
    charts: [1, 2],
    types: ["shula"],
    optionKeys: shulaGrahaKeys,
    mapFunc: "expandGrahaKey",
  },
  {
    key: "predictivehouse",
    name: "House Lords",
    charts: [1, 2],
    types: ["transit"],
    optionKeys: predictiveHouseLords,
    mapFunc: "expandHouseLords",
  },
  {
    key: "predictiveascendant",
    name: "Lagna",
    charts: [1],
    types: ["transit"],
    options: birthAscendantOpts,
  },
  {
    key: "predictivesigns",
    name: "Signs",
    charts: [2],
    types: ["transit"],
    options: specialSignOpts,
  },
  {
    key: "transitgraha",
    name: "Transiting Graha",
    charts: [1, 2],
    types: ["sarvatobhadra", "chandra_kalanala"],
    optionKeys: transitGrahaKeys,
    mapFunc: "expandGrahaKey",
  },
  {
    key: "kotagraha",
    name: "Transiting Graha",
    charts: [1, 2],
    types: ["kota"],
    optionKeys: kotaGrahaKeys,
    mapFunc: "expandGrahaKey",
  },
  {
    key: "lordship",
    name: "Lordships",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: houseLords,
    mapFunc: "expandHouseLords",
  },
  {
    key: "houses",
    name: "in houses",
    charts: [2],
    types: ["synastry", "mirroring", "composite", "transit"],
    options: houseOpts,
  },
  {
    key: "signs",
    name: "in Sign(s)",
    charts: [2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      ...signOpts,
      ...extraSignOpts,
      { key: "by_sun", name: "in sign ruled by Sun" },
      { key: "by_moon", name: "in sign ruled by Moon" },
      { key: "by_ma", name: "in sign ruled by Mars" },
      { key: "by_me", name: "in sign ruled by Mercury" },
      { key: "by_ju", name: "in sign ruled by Jupiter" },
      { key: "by_ve", name: "in sign ruled by Venus" },
      { key: "by_sa", name: "in sign ruled by Saturn" },
    ],
  },
  {
    key: "caughadia",
    name: "Caughadia",
    charts: [1],
    types: ["caughadia"],
    options: caughadiaOptions,
  },

  {
    key: "caughadia_2",
    name: "Caughadia",
    charts: [2],
    types: ["caughadia"],
    options: caughadiaSecondaryOptions,
  },
  {
    key: "dignities",
    name: "Dignities",
    types: ["synastry", "mirroring", "composite", "transit"],
    charts: [2],
    options: dignityOpts,
  },
  {
    key: "natbm",
    name: "Natural M/B",
    charts: [1],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: bmOpts,
    mapFunc: "expandNatBm",
  },
  {
    key: "funcbm",
    name: "Functional M/B",
    charts: [1],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: bmOpts,
    mapFunc: "expandFuncBm",
  },
  {
    key: "special",
    name: "Special",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "yogi", name: "Yogi deg" },
      { key: "yogi_graha", name: "Yogi graha" },
      { key: "avayogi_deg", name: "AvaYogi deg" },
      { key: "avayogi_graha", name: "AvaYogi G." },
      { key: "bija_sphuta", name: "Bīja deg" },
      { key: "ksetra_sphuta", name: "Kṣetra deg" },
      { key: "gulika", name: "Gulika" },
      { key: "mandi", name: "Māṇdi" },
    ],
  },
  {
    key: "num_grahas",
    name: "# of Grahas",
    charts: [1],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: numGrahasNums.map((n) => n.toString()),
    mapFunc: "expandNumGrahas",
  },
  {
    key: "cara_karakas",
    name: "Karakas",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: charaKarakaKeys,
    mapFunc: "expandCharakara",
  },
  {
    key: "upapada",
    name: "Upapada",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "lagna", name: "Upapada L." },
      { key: "second", name: "Upapada 2nd" },
      { key: "lord", name: "Upapada R." },
      { key: "arudha_lagna", name: "Arudha L." },
    ],
  },
  {
    key: "p_vara",
    name: "P: Vāra",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "num_1", name: "Sun" },
      { key: "num_2", name: "Mon" },
      { key: "num_3", name: "Tue" },
      { key: "num_4", name: "Wed" },
      { key: "num_5", name: "Thu" },
      { key: "num_6", name: "Fri" },
      { key: "num_7", name: "Sat" },
    ],
  },
  {
    key: "p_karana",
    name: "P: Karaṇa",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "num_1", name: "bava" },
      { key: "num_2", name: "bālava" },
      { key: "num_3", name: "kaulava" },
      { key: "num_4", name: "taitila" },
      { key: "num_5", name: "garaja" },
      { key: "num_6", name: "vaṇija" },
      { key: "num_7", name: "viṣṭi" },
      { key: "num_8", name: "śakuni" },
      { key: "num_9", name: "nāga" },
      { key: "num_10", name: "catuṣpāda" },
      { key: "num_11", name: "kiṃstughna" },
    ],
  },
  {
    key: "p_yoga",
    name: "P: Yoga",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "num_1", name: "viṣkambha" },
      { key: "num_2", name: "prīti" },
      { key: "num_3", name: "āyuśmān" },
      { key: "num_4", name: "saubhāgya" },
      { key: "num_5", name: "śobhana" },
      { key: "num_6", name: "atigaṇḍa" },
      { key: "num_7", name: "sukarma" },
      { key: "num_8", name: "dhṛti" },
      { key: "num_9", name: "śūla" },
      { key: "num_10", name: "gaṇḍa" },
      { key: "num_11", name: "vṛddhi" },
      { key: "num_12", name: "dhruva" },
      { key: "num_13", name: "vyāghatā" },
      { key: "num_14", name: "harṣaṇa" },
      { key: "num_15", name: "vajra" },
      { key: "num_16", name: "siddhi" },
      { key: "num_17", name: "vyatipāta" },
      { key: "num_18", name: "variyas" },
      { key: "num_19", name: "parigha" },
      { key: "num_20", name: "śiva" },
      { key: "num_21", name: "siddha" },
      { key: "num_22", name: "sādhya" },
      { key: "num_23", name: "śubha" },
      { key: "num_24", name: "śukla" },
      { key: "num_25", name: "brahma" },
      { key: "num_26", name: "māhendra" },
      { key: "num_27", name: "vaidhṛti" },
    ],
  },
  {
    key: "p_tithi",
    name: "P: Tithi",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "num_1", name: "s. pratipadā" },
      { key: "num_2", name: "s. dvitīyā" },
      { key: "num_3", name: "s. tṛtīyā" },
      { key: "num_4", name: "s. caturthī" },
      { key: "num_5", name: "s. pancamī" },
      { key: "num_6", name: "s. ṣaṣthī" },
      { key: "num_7", name: "s. saptamī" },
      { key: "num_8", name: "s. aṣṭamī" },
      { key: "num_9", name: "s. navamī" },
      { key: "num_10", name: "s. daśamī" },
      { key: "num_11", name: "s. ekādaśī" },
      { key: "num_12", name: "s. dvādaśī" },
      { key: "num_13", name: "s. trayodaśī" },
      { key: "num_14", name: "s. caturdaśī" },
      { key: "num_15", name: "pūrṇimā" },
      { key: "num_16", name: "k. pratipadā" },
      { key: "num_17", name: "k. dvitīyā" },
      { key: "num_18", name: "k. tṛtīyā" },
      { key: "num_19", name: "k. caturthī" },
      { key: "num_20", name: "k. pancamī" },
      { key: "num_21", name: "k. ṣaṣthī" },
      { key: "num_22", name: "k. saptamī" },
      { key: "num_23", name: "k. aṣṭamī" },
      { key: "num_24", name: "k. navamī" },
      { key: "num_25", name: "k. daśamī" },
      { key: "num_26", name: "k. ekādaśī" },
      { key: "num_27", name: "k. dvādaśī" },
      { key: "num_28", name: "k. trayodaśī" },
      { key: "num_29", name: "k. caturdaśī" },
      { key: "num_30", name: "amāvasyā" },
      { key: "gt_hm", name: "> half moon" },
      { key: "lt_hm", name: "< half moon" },
      { key: "h_1", name: "śuklapakṣa" },
      { key: "q_1", name: "śukla -50%" },
      { key: "q_2", name: "śukla +50%" },
      { key: "h_2", name: "kṛṣṇapakṣa" },
      { key: "q_3", name: "kṛṣṇa -50%" },
      { key: "q_4", name: "kṛṣṇa +50%" },
    ],
  },
  {
    key: "nakshatras",
    name: "P: Nakṣatras",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    optionKeys: nakshatraNums.map((n) => n.toString()),
    mapFunc: "expandNakshtra",
  },
  {
    key: "lots",
    name: "Lots",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite"],
    options: [
      { key: "fortune", name: "Fortune" },
      { key: "spirit", name: "Spirit" },
      { key: "eros", name: "Eros" },
      { key: "necessity", name: "Necessity" },
      { key: "courage", name: "Courage" },
      { key: "victory", name: "Victory" },
      { key: "nemesis", name: "Nemesis" },
      { key: "wife", name: "Wife" },
      { key: "husband", name: "Husband" },
      { key: "marriage", name: "Marriage" },
    ],
  },
  {
    key: "kutas",
    name: "Kutas",
    charts: [1, 2],
    types: ["synastry", "mirroring", "composite", "kutas"],
    optionKeys: kutaOptKeys,
    mapFunc: "expandKutaKey",
  },
  {
    key: "panchapakshi",
    name: "Pancha Paksi",
    charts: [1],
    types: ["panchapakshi"],
    options: panchapakshiOpts,
  },
  {
    key: "panchapakshitransit",
    name: "Pancha Paksi",
    charts: [1],
    types: ["panchapakshi"],
    options: ppOptions,
  },
];

export class BuildCompatibilityOptions {
  private type = "synastry";

  private optionGroups: Array<ChartOptGroup> = [];

  private dictionary: DictionaryState;

  constructor(type: string, dictionary: DictionaryState) {
    this.type = type;
    this.dictionary = dictionary;
    this.optionGroups = chartOptSets
      .filter((og) => {
        return og.types.some((tp) => ["all", type].includes(tp));
      })
      .map((og) => {
        const { key, name, charts, types, options, optionKeys, mapFunc } = og;
        let expandedOpts: Array<KeyName> = [];
        if (optionKeys instanceof Array) {
          switch (mapFunc) {
            case "expandHouseLords":
              expandedOpts = optionKeys.map((key) =>
                this.expandHouseLords(key)
              );
              break; /* 
            case "expandLunarPhases":
              expandedOpts = optionKeys.map(this.expandLunarPhases);
              break; */
            case "expandCharakara":
              expandedOpts = optionKeys.map((key) => this.expandCharakara(key));
              break;
            case "expandNumGrahas":
              expandedOpts = optionKeys.map(this.expandNumGrahas);
              break;
            case "expandNatBm":
              expandedOpts = optionKeys.map(this.expandNatBm);
              break;
            case "expandFuncBm":
              expandedOpts = optionKeys.map(this.expandFuncBm);
              break;
            case "expandGrahaKey":
              expandedOpts = optionKeys.map((key) => this.expandGrahaKey(key));
              break;
            case "expandNakshtra":
              expandedOpts = optionKeys.map(this.expandNakshtra);
              break;
            case "expandKutaKey":
              expandedOpts = optionKeys.map(this.expandKutaKey);
              break;
          }
        }
        if (options instanceof Array && options.length > 0) {
          expandedOpts = options.map((opt) => this.expandDefault(opt, og.key));
        }
        return {
          key,
          name,
          charts,
          types,
          options: expandedOpts,
        };
      });
    this.dictionary = dictionary;
  }

  groups() {
    return this.optionGroups;
  }

  expandDefault(opt: KeyName, group: string): KeyName {
    let k = "";
    let n = "";
    if (opt instanceof Object) {
      const { key, name } = opt;
      k = [group, key].join("__");
      n = name;
    }
    return {
      key: k,
      name: n,
    };
  }

  expandHouseLords(subkey: string, prefix = "lordship"): KeyName {
    const isString = typeof subkey === "string";
    const parts = isString ? subkey.split("_") : [""];
    const endWord = parts[parts.length - 1];
    const isNumbered = isNumeric(endWord);
    const isBM = subkey.startsWith("func_");
    const name = isNumbered
      ? ["Lord of", ordinalNumber(endWord)].join(" ")
      : isBM
      ? subkey.replace("func_", "func.  ")
      : truncate([parts.map(capitalize).join(""), "L."].join(" "), 12);
    const key = [prefix, subkey].join("__");
    return {
      key,
      name,
    };
  }

  matchDictGrahaName = (key: string) => {
    let name = key;
    if (/^[a-z][a-z]$/.test(key)) {
      const lex = this.dictionary.graha(key);
      if (lex instanceof Object && lex.hasText()) {
        name = capitalize(lex.text("en", "lt"));
      }
    }
    return name;
  };

  renderGrahaName = (key: string) => {
    switch (key) {
      case "lord_dasha":
        return "Lord for Daśa";
      case "lord_bhukti":
        return "Lord for Bhukti";
      case "kota_pala":
        return "Koṭa Pāla";
      case "kota_svami":
        return "Koṭa Svāmi";
      case "nat_benefic":
        return "Nat. benefic";
      case "nat_malefic":
        return "Nat. malefic";
      default:
        return this.matchDictGrahaName(key);
    }
  };

  expandGrahaKey = (key: string, prefix = "graha"): KeyName => {
    let name = key;
    switch (key) {
      case "as":
        name = "Asc.";
        break;
      case "ds":
        name = "Desc.";
        break;
      case "mc":
        name = "MC";
        break;
      case "ic":
        name = "IC";
        break;
      case "vt":
        name = "Vertex";
        break;
      case "se":
        name = "Sedna";
        break;
      default:
        name = this.renderGrahaName(key);
        break;
    }
    return {
      key: [prefix, key].join("__"),
      name,
    };
  };

  expandCharakara = (subkey: string, prefix = "chara_karaka"): KeyName => {
    const dictKey = ["karaka", subkey].join("_");
    const lex = this.dictionary.lexeme("graha", dictKey);
    const name =
      lex instanceof Object
        ? lex.text("sa", "short", "lt")
        : subkey.replace(/_+/g, " ");
    const key = [prefix, subkey].join("__");
    return {
      key,
      name: truncateFirstInit(name, 16),
    };
  };

  expandNakshtra = (numVal: string) => {
    let name = numVal;
    const key = ["nk", numVal].join("");
    const n = parseInt(numVal);
    const prefix = n < 22 ? "n27" : "n28";
    const dictKey = [prefix, zeroPad(n, 2)].join("_");
    const lex = this.dictionary.lexeme("nakshatra", dictKey);
    if (lex) {
      name = lex.text("sa", "standard", "lt");
    }
    return {
      key,
      name,
    };
  };

  expandNumGrahas(numVal: string): KeyName {
    const subkey = ["any", numVal].join("_");
    const key = ["num_grahas", subkey].join("__");
    const noun = numVal !== "1" ? "grahas" : "graha";
    const numChar = numVal !== "1" ? numVal.toString() : "";
    const name = ["any", numChar, noun].join(" ");
    return {
      key,
      name,
    };
  }

  expandBm = (subkey: string, functional = false): KeyName => {
    const prefix = functional ? "funcbm" : "natbm";
    const name = capitalize(subkey.replace(/_+/g, " "));
    const key = [prefix, subkey].join("__");
    return {
      key,
      name,
    };
  };

  expandNatBm = (subkey: string): KeyName => {
    return this.expandBm(subkey, false);
  };

  expandFuncBm = (subkey: string): KeyName => {
    return this.expandBm(subkey, true);
  };

  expandKutaKey = (subkey: string): KeyName => {
    if (subkey.length === 2) {
      return this.expandGrahaKey(subkey, "kutas");
    } else if (subkey.startsWith("chara_")) {
      return this.expandCharakara(subkey, "kutas");
    } else {
      return this.expandHouseLords(subkey, "kutas");
    }
  };
}

export const mayBeAspected = (optKey = "") => {
  const [category, key] = optKey.split("__");
  const catKey = category.replace("predictive", "");
  switch (catKey) {
    case "p_yoga":
    case "p_karana":
    case "p_tithi":
    case "p_vara":
    case "birth_asc":
    case "ascendant":
      return false;
    case "upapada":
      switch (key) {
        case "lord":
          return true;
        default:
          return false;
      }
    default:
      return true;
  }
};

export const filterBySignOnly = (optKey = "") => {
  const catKey = optKey
    .split("__")
    .shift()
    .replace("predictive", "");
  switch (catKey) {
    case "ascendant":
      return true;
    default:
      return false;
  }
};
