export class InfoTableRow {
  keyName: string;
  mainValue: string;
  subValue: string;
  iconClass: string;
  iconLabel: string;

  constructor(
    keyName: string,
    mainValue: string,
    subValue: string,
    iconClass: string,
    iconLabel = ""
  ) {
    this.keyName = keyName;
    this.mainValue = mainValue;
    this.subValue = subValue;
    this.iconClass = iconClass;
    this.iconLabel = iconLabel;
  }
}
