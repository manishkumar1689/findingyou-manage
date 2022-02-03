
export class TransitItem {
  jd = 0;
  lng = 0;
  constructor(inData = null) {
    if (inData instanceof Object) {
      const {jd, lng} = inData;
      this.jd = jd;
      this.lng = lng;
    }
  }
}

export class TransitInfoRow {
  key = "";
  refKey = "";
  lng = 0;
  charaKaraka = 0;
  charaName = "";
  label = "";
  rise = new TransitItem();
  set = new TransitItem();
  mc = new TransitItem();
  ic = new TransitItem();

  constructor(key = "", lng = 0, label = "", transitions = [], charaNum = 0, charaName = "", refKey = "") {
    this.key = key;
    this.refKey = refKey;
    this.lng = lng;
    this.label = label;
    const transitRow = transitions.find(r => r.key === key);
    
    const hasTransit = transitRow instanceof Object;
    if (charaNum > 0) {
      this.charaKaraka = charaNum;
    }
    if (charaName.length > 1) {
      this.charaName = charaName;
    }
    if (hasTransit) {
      this.rise = new TransitItem(transitRow.rise);
      this.set = new TransitItem(transitRow.set);
      this.mc = new TransitItem(transitRow.mc);
      this.ic = new TransitItem(transitRow.ic);
    }
  }

  get hasIcon() {
    return this.key.length === 2;
  }

  get hasCharaKaraka() {
    return this.charaKaraka > 0;
  }

  get hasLabel() {
    return this.label.length > 1;
  }

}