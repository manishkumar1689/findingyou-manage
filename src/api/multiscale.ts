import { PreferenceOption } from "./interfaces";

export const mapMultiscaleOption = (op = null) => {
  const { valueOpts } = op;
  if (valueOpts instanceof Array) {
    op.valueOpts = op.valueOpts
      .filter((vo) => vo instanceof Object)
      .map((vo) => {
        const { key, category, name, value } = vo;
        return {
          key,
          category,
          name,
          value,
        };
      });
  }
  return op;
};

export const filterMultiscaleOptions = (po: PreferenceOption) => {
  return po.options
    .filter((op) => op instanceof Object)
    .map(mapMultiscaleOption);
};

export const big5DomainMap = {
  O: "Openness",
  C: "Conscientiousnes",
  E: "Extroversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

export const jungianDomainMap = {
  IE: "Introversion - Extroversion",
  SN: "Sensing – Intuition",
  FT: "Thinking – Feeling",
  JP: "Judging – Perceiving",
};

export const big5SubDomainNumbers = [1, 2, 3, 4, 5, 6];
