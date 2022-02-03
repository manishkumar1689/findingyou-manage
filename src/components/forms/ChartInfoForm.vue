<template>
  <fragment>
    <form class="edit-form chart-form collapsible" :class="wrapperClasses">
      <fieldset class="chart-entry inner">
        <b-field class="form-row full-name top">
          <b-input
            size="64"
            class="name"
            v-model="name"
            type="text"
            placeholder="Full name (as commonly known)"
          />
          <b-select
            v-if="!isDefaultBirthChart"
            placeholder="Gender"
            v-model="gender"
            class="gender"
          >
            <option
              v-for="opt in genderOptions"
              :value="opt.key"
              :key="opt.key"
              >{{ opt.name }}</option
            >
          </b-select>
        </b-field>
        <fieldset class="form-row text-list alt-names">
          <b-field class="form-row alt-name" v-for="(altName, altNameIndex) in altNames"
            :key="['alt-name', altNameIndex].join('-')">
            <b-input
              size="64"
              class="name text-item"
              v-model="altNames[altNameIndex]"
              type="text"
              placeholder="Alternative names"
            />
            <b-icon v-if="altNameIndex > 0" icon="minus" @click.native="removeAltName(altNameIndex)" />
            <b-icon v-if="altNameIndex === lastAltNameIndex" icon="plus-circle" @click.native="addAltName" />
          </b-field>
        </fieldset>
        <b-field class="date-time" :id="birthPickerId">
          <birth-date-picker
            v-model="dateVal"
            :maxYear="maxYear"
            :minYear="minYear"
            delimiter="/"
            :closeOnSet="false"
          />
          <b-input size="is-medium" v-model="timeVal" class="time" type="time" :step="1" 
            />
          <div class="tz-info">{{tzInfo}}</div>
        </b-field>
        <b-field class="form-row locality-row" :class="localityClasses">
          <b-autocomplete
            v-if="!editLocalityMode"
            :data="suggestedLocations"
            :placeholder="locationPlaceholder"
            field="title"
            class="placename"
            :loading="isFetching"
            @typing="matchPlacename"
            @select="selectPlacename"
          >
            <template slot-scope="props">
              <div class="row">
                <span class="placename">{{ props.option.name }}</span>
                <em v-if="props.option.region.length > 1" class="region">{{
                  props.option.region
                }}</em>
                <em class="country">{{ props.option.country }}</em>
              </div>
            </template>
          </b-autocomplete>
          <b-input
            v-if="editLocalityMode"
            v-model="tempLocMatch"
            class="locality"
          />
          <span v-if="!isNew" class="edit" @click.stop="editLocality">
            <b-icon v-if="hasLocality" :icon="localityEditIcon" />
          </span>
        </b-field>
        <geolocation-input :geo="geo" />
        <b-field class="type-row">  
          <b-select
            v-if="!isDefaultBirthChart"
            placeholder="Event Type"
            v-model="eventType"
            class="event-type"
          >
            <option
              v-for="opt in eventTypeOptions"
              :value="opt.key"
              :key="opt.key"
              >{{ opt.name }}</option
            >
          </b-select>
          <b-select
            v-if="isBirthChart"
            placeholder="Rodden Scale"
            v-model="roddenValue"
            class="rodden"
          >
            <option
              v-for="opt in roddenOptions"
              :value="opt.key"
              :key="opt.key"
              >{{ opt.name }}</option
            >
          </b-select>
          <b-select v-model="status">
            <option v-for="opt in statusOptions" :key="opt.itemKey" :value="opt.key">{{opt.name}}</option>
          </b-select>
        </b-field>
        <fieldset class="form-row text-list sources">
          <b-field class="form-row source" v-for="(source, sourceIndex) in sources"
            :key="['source', sourceIndex].join('-')">
            <b-input
              size="64"
              class="source text-item"
              v-model="sources[sourceIndex]"
              type="text"
              placeholder="Sources"
            />
            <b-icon v-if="sourceIndex > 0" icon="minus" @click.native="removeSource(sourceIndex)" />
            <b-icon v-if="sourceIndex === lastSourceIndex" icon="plus-circle" @click.native="addSource" />
          </b-field>
        </fieldset>
        <b-field class="notes textarea-field" label="Notes">
          <b-input class="notes inner" v-model="notes" type="textarea" cols="40" rows="3" />
        </b-field>
        <div v-if="error" class="error-messages">
          <ul>
            <li v-for="(msg, mi) in messages" :key="['chart-form-message', index, mi].join('-')">{{msg}}</li>
          </ul>
        </div>
        <div
          v-if="showSubmit"
          class="form-row actions bottom"
          :class="submitClasses"
        >
        </div>
      </fieldset>

          <b-button
            icon-left="send"
            class="save"
            @click.stop.prevent="submit"
            type="is-success"
            >Save</b-button
          >
      <ol v-if="hasPairs" class="relations">
        <li v-for="(pairedItem, pi) in pairedItems" :key="['paired-item', selectedChartId, pi].join('-')" @click="openPaired(pairedItem)">{{pairedItem.relType|toWords}}: {{pairedItem.name}}</li>
      </ol>
    </form>
  </fragment>
</template>

<script lang="ts">
import { State } from "vuex-class";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import birthDatePicker from "vue-birth-datepicker";
import GeolocationInput from "../widgets/GeolocationInput.vue";
import {
  saveUserChart,
  fetchPlacenames,
  fetchRoddenValues,
  getTzData,
} from "../../api/methods";
import { notEmptyString, isNumeric, emptyString } from "../../api/validators";
import eventTypeValues from "../../api/mappings/event-type-values";
import { bus } from "../../main";
import {
  smartCastFloat,
  asDateString,
  longDate,
  smartCastInt,
  hourMinTz,
} from "../../api/converters";
import {
  DictionaryState,
  UserState,
} from "../../store/types";
import { GeoLoc } from "../../api/models/GeoLoc";
import { ChartForm } from "../../api/models/ChartForm";
import { FilterSet } from "../../api/composables/FilterSet";
import { Chart } from "../../api/models/Chart";
import { KeyName } from "../../api/interfaces";
import { extractCorePlacenames } from "../../api/helpers";
import {
  genderOptions,
  transformKeyNameOptions,
} from "@/api/mappers";
import { julToDateParts, julToUnixMillisecs } from "@/api/julian-date";
import { PairedRef } from "@/api/interfaces/users";

@Component({
  components: {
    birthDatePicker,
    GeolocationInput,
  },
  filters: FilterSet,
})
export default class ChartInfoForm extends Vue {
  @State("dictionary") dictionary: DictionaryState;
  @State("user") user: UserState;
  @Prop({ default: new Chart(null) }) chart: Chart;
  @Prop({ default: [] }) statusOptions: KeyName[];
  @Prop({ default: [] }) pairedItems: PairedRef[];

  private datetime = new Date();

  private dateVal = 0;

  private timeVal = "12:00:00";

  private maxYear = 2030;

  private minYear = 1600;

  private form = new ChartForm();

  private geo = new GeoLoc([0, 0, 0]);

  private geoChanged = false;

  private dateChanged = false;

  private error = false;

  private messages = [];

  private _id = "";
  private name = "";
  private altNames: string[] = [];
  private gender = "-";
  private isDefaultBirthChart = false;
  private type = "person";
  private eventType = "birth";
  private notes = "";
  private status = "";
  private sources: string[] = [];
  private roddenScale = "";
  private roddenValue = -1;
  private roddenValues: Array<KeyName> = [];
  private selectedChartId = "";
  private initialized = false;
  private suggestedLocations = [];
  private tempLocMatch = "";
  private mode = "current";
  private expanded = true;new
  private notesExpanded = false;
  private editMode = true;
  private isFetching = false;
  private editLocalityMode = false;
  private saving = false;

  private tzInfo = '';

  created() {
    fetchRoddenValues().then((items) => {
      this.roddenValues = items;
    });
    setTimeout(() => {
      if (this.hasChart) {
        this.sync();
      }
    }, 3000);
  }

  toast(message = "", duration = 3000, type = "is-success") {
    this.$buefy.toast.open({
      duration,
      message,
      position: "is-bottom",
      type,
    });
  }

  resetFormStates() {
    this.error = false;
    this.messages = [];
  }

  sync() {
    if (this.hasChart) {
      this.populateForm();
    }
    this.setDefaultDatetime();
    setTimeout(() => {
      this.initialized = true;
    }, 1000);
  }

  populateForm() {
    const {
      name,
      altNames,
      gender,
      type,
      notes,
      eventType,
      roddenValue,
      sources
    } = this.chart.subject;
    this.tempLocMatch = "";
    const { isDefaultBirthChart } = this.chart;
    
    const { lat, lng, alt } = this.chart.geo;

    if (isNumeric(lat) && isNumeric(lng)) {
      this.geo = new GeoLoc([lat, lng, alt]);
    }
    this.name = name;
    this.altNames = altNames instanceof Array && altNames.length > 0? altNames : [""];
    this.isDefaultBirthChart = isDefaultBirthChart;
    this.type = type;
    this.gender = gender;
    this.status = this.chart.status;
    this.notes = notEmptyString(notes)? notes : "";
    this.eventType = notEmptyString(eventType, 3) && eventType !== type? eventType : "birth";
    this.roddenValue = smartCastInt(roddenValue);
    this.selectedChartId = this.chart._id;
    this.sources = sources instanceof Array && sources.length > 0? sources : [""];
    this.setDefaultDatetime();
  }

  get isNew() {
    return !this.chart.hasId;
  }

  get numAltNames() {
    return this.altNames instanceof Array ? this.altNames.length : 0;
  }

  get numAltNameFields() {
    return this.numAltNames > 1? this.numAltNames : 1;
  }

  get hasPairs() {
    return this.pairedItems instanceof Array && this.pairedItems.length > 0;
  }

  get lastAltNameIndex() {
    return this.numAltNameFields - 1;
  }

  get numSources() {
    return this.sources.length > 1? this.sources.length : 1;
  }

  get lastSourceIndex() {
    return this.numSources - 1;
  }

  get localityEditIcon() {
    return this.editLocalityMode ? "magnify" : "pencil";
  }

  get selectedIds() {
    return [this.chart._id];
  }

  get wrapperClasses() {
    const cls = [];
    if (this.hasChart) {
      cls.push("has-chart");
    }
    if (this.placenames.length > 2) {
      cls.push("has-placename");
    }
    return cls;
  }

  get localityClasses() {
    return this.isNew? "full-width" : "may-edit";
  }

  get notesClasses() {
    return [this.notesExpanded? 'open' : "closed"];
  }

  get birthPickerId() {
    return ['birth-picker', 0].join('-');
  }

  async matchPlacename(search = "") {
    if (notEmptyString(search, 1)) {
      if (!this.isFetching) {
        this.isFetching = true;
        this.tempLocMatch = "";
        await fetchPlacenames(search).then((data) => {
          if (data.valid) {
            this.suggestedLocations = data.items;
            setTimeout(() => {
              this.isFetching = false;
            }, 50);
          }
        });
      }
      setTimeout(() => {
        this.isFetching = false;
      }, 1000);
    }
    setTimeout(() => {
      this.isFetching = false;
    }, 2000);
  }

  selectPlacename(item) {
    if (item instanceof Object) {
      let { lat, lng } = item;
      if (isNumeric(lat) && isNumeric(lng)) {
        lat = smartCastFloat(lat);
        lng = smartCastFloat(lng);
        this.geo = new GeoLoc([lat, lng, 0]);
        this.tempLocMatch = [item.fullName, item.country].join(", ");
        const datePart = this.dateChanged? new Date(this.dateVal).toISOString().split("T").shift() : "";
        const geo = new GeoLoc([lat,lng]);
        getTzData(geo, datePart).then(result => {
          if (result.valid) {
            const tzAbbr = notEmptyString(result.shortTz) && /^[A-Z]+$/i.test(result.shortTz)? result.shortTz : "";
            const parts = [["UTC", hourMinTz(result.tzOffset, true)].join(" ")];
            if (notEmptyString(tzAbbr)) {
              parts.unshift(tzAbbr);
            }
            this.tzInfo = parts.join(" / ");
          }
        });
      }
    }
  }

  

  get hasBodies() {
    if (this.hasChart) {
      return this.chart.grahas.length > 0;
    } else {
      return false;
    }
  }

  get hasLocality(): boolean {
    return notEmptyString(this.locationPlaceholder);
  }

  get hasAyanamshas() {
    return this.ayanamshas.length > 0;
  }

  get ayanamshas() {
    return this.form.chart.ayanamshas;
  }

  get eventTypeOptions() {
    return eventTypeValues;
  }

  get isBirthChart() {
    return this.eventType === "birth";
  }

  get hasChart() {
    return (
      this.chart instanceof Chart &&
      this.chart.subject instanceof Object &&
      this.chart.grahas instanceof Array &&
      this.chart.grahas.length > 0 &&
      (this.selectedChartId.length > 8 || !this.initialized)
    );
  }

  get placenames(): string {
    return this.chart.corePlacenames;
  }

  get locationPlaceholder(): string {
    let pln = this.tempLocMatch;
    if (pln.length < 2 && this.hasChart) {
      pln = extractCorePlacenames(this.chart.placenames);
    }
    const typeStr = this.eventType === "birth" ? "birth " : "";
    return pln.length > 0 ? pln : `Enter ${typeStr}locality (city, country)`;
  }

  get chartLocalDt(): string {
    return this.hasChart
      ? longDate(this.chart.datetime, this.chart.tzOffset)
      : "";
  }

  get chartGeo() {
    return this.hasChart ? this.chart.geo : new GeoLoc([0, 0, 0]);
  }

  get hasPlacenames(): boolean {
    return this.placenames.length > 1;
  }

  get chartDatetime() {
    return this.hasChart ? this.form.chart.datetime : null;
  }

  get tzText() {
    return this.hasChart ? this.form.chart.tzText : "";
  }

  get submitClasses() {
    const cls = [];
    if (this.showSubmit) {
      cls.push('show-submit');
    }
    const numButtons = cls.length;
    if (numButtons == 1) {
      cls.push('single');
    }
    return cls;
  }

  get showSubmit() {
    return this.editMode;
  }

  get genderOptions() {
    return genderOptions(this.dictionary);
  }

  get roddenOptions() {
    return transformKeyNameOptions(this.roddenValues, "Please select Rodden scale...");
  }

  setDefaultDatetime() {
    let sf = this.form;
    let dt = null;
    if (sf) {
      dt = sf.chart.datetime;
    }
    if (!sf) {
      sf = this.$ls.get("form");
      if (sf) {
        dt = sf.datetime;
        this.name = sf.name;
        this.isDefaultBirthChart = sf.isDefaultBirthChart;
        this.gender = sf.gender;
        this.eventType = sf.eventType;
        this.roddenValue = smartCastInt(sf.roddenValue);
      }
    }
    if (dt) {
      this.datetime = dt;
    }
    if (!sf) {
      const nowDt = new Date();
      this.datetime = nowDt;
      const maxYear = nowDt.getFullYear();
      this.maxYear = maxYear + 1;
      this.minYear = maxYear - 401;
      const year = this.datetime.getFullYear();
      const mins = this.datetime.getMinutes();
      this.datetime.setFullYear(year - 20);
      this.datetime.setSeconds(0);
      this.datetime.setMinutes(Math.floor(mins / 15) * 15);
    }
    if (this.datetime instanceof Date) {
      const jDate = julToDateParts(this.chart.jd, this.chart.tzOffset);
      const jDateStr = jDate.timeString();
      this.timeVal = jDateStr;
      this.dateVal = julToUnixMillisecs(this.chart.jd, this.chart.tzOffset);
      const prefix = this.chart.tzAbbr;
      const parts = [jDate.offsetHm];
      if (notEmptyString(prefix)) {
        parts.unshift(prefix);
      }
      this.tzInfo = parts.join(" / ");
      this.dateChanged = false;
      this.geoChanged = false;
    }
    setTimeout(() => {
      this.dateChanged = false;
      this.geoChanged = false;
    }, 500);
  }

  editLocality() {
    const newMode = this.editLocalityMode !== true;
    if (newMode && emptyString(this.tempLocMatch)) {
      this.tempLocMatch = this.locationPlaceholder;
    }
    this.editLocalityMode = newMode;
  }

  newChart() {
    this.selectedChartId = "";
    this.name = "";
    this.tempLocMatch = "";
    this.editLocalityMode = false;
    this.notes = "";
    this.timeVal = "00:00:00";
    this.geo = new GeoLoc([0,0,0]);
    this.roddenValue = -1;
    this.gender = "-";
    const dt = new Date();
    const year = dt.getFullYear() - 40;
    const firstYearInDecade = Math.floor(year / 10 ) * 10;
    this.dateVal = Date.UTC(firstYearInDecade, 0, 1, 0, 0, 0);
    this.geoChanged = false;
    this.dateChanged = false;
    this.form.chart._id = "";
    this.tzInfo = '';
    setTimeout(() => {
      this.dateChanged = false;
      this.geoChanged = false;
    }, 750);
  }

  toggleCollapse(e) {
    if (e.target instanceof HTMLElement) {
      const cl = e.target.classList;
      if (cl.contains('radio') === false && cl.contains('control') === false) {
        this.expanded = !this.expanded;
      }
    }
  }

  toggleNotesCollapse() {
    this.notesExpanded = !this.notesExpanded;
  }

  postValidate() {
    this.validate(this.error);
  }

  validate(showMessages = false) {
    const {
      datetime,
      geo,
      name,
      gender,
      roddenValue
    } = this;
    let valid = true;
    this.messages = [];
    if (emptyString(name)) {
      valid = false;
      if (showMessages) {
        this.messages.push("Please select a name");
      }
    }
    if (emptyString(gender) || gender === "-") {
      valid = false;
      if (showMessages) {
        this.messages.push("Please select a gender option");
      }
    }
    const isValidDate = datetime instanceof Date;
    if (!isValidDate || (!this.dateChanged  && this.isNew)) {
      valid = false;
      if (showMessages) {
        this.messages.push("Please select a date");
      }
    }
    if (geo.lat === 0 && geo.lng === 0 && !this.geoChanged) {
      valid = false;
      if (showMessages) {
        this.messages.push("Please select a location");
      }
      const isZero = geo.lat === 0 && geo.lng === 0;
    }
    if (roddenValue < 0 && this.eventType === 'birth') {
      valid = false;
      if (showMessages) {
        this.messages.push("Please select a Rodden scale option");
      }
    }
    this.error = !valid;
    if (valid && !this.saving && this.initialized) {
      this.submit(true);
    }
    return valid;
  }

  
  matchEnteredDate() {
    const dateEl = document.querySelector(`#${this.birthPickerId} .birthday-picker input`);
    if (dateEl instanceof HTMLInputElement) {
      const {value} = dateEl;
      if (notEmptyString(value, 6) && /^(\d\d)\/(\d\d)\/(\d\d\d\d)$/.test(value)) {
        const parts = value.split('/');
        parts.reverse();
        return [parts.join('-'),this.timeVal].join('T');
      }
    }
  }

  addAltName() {
    this.altNames.push("");
  }

  removeAltName(index = 0) {
    if (index >= 0 && index < this.altNames.length) {
      this.altNames.splice(index, 1);
    }
  }

  openPaired(pairedItem = null) {
    if (pairedItem instanceof Object) {
      const fromChartId = this.selectedChartId;
      const { chartId } = pairedItem;
      if (notEmptyString(chartId)) {
        bus.$emit("open-paired-chart", {fromChartId, toChartId: chartId});
      }
    }
  }

  addSource() {
    this.sources.push("");
  }

  removeSource(index = 0) {
    if (index >= 0 && index < this.sources.length) {
      this.sources.splice(index, 1);
    }
  }

  submit(prevalidated = false) {
    const {
      datetime,
      geo,
      name,
      gender,
      isDefaultBirthChart,
      type,
      notes,
      eventType,
      roddenValue
    } = this;
    const user = this.user._id;
    const { lat, lng } = geo;
    let { alt } = geo;
    if (!isNumeric(alt)) {
      alt = 10;
    }
    const isValid = prevalidated || this.validate();
    if (isValid && !this.saving) {
      const enteredDatetime = this.matchEnteredDate();
      const dtString = notEmptyString(enteredDatetime)? enteredDatetime : asDateString(datetime);
      
      const data = {
        _id: this.selectedChartId,
        user,
        datetime: dtString,
        isDefaultBirthChart: isDefaultBirthChart === true,
        lat,
        lng,
        alt,
        name,
        gender,
        type,
        notes,
        eventType,
        roddenValue,
        altNames: this.altNames.filter(s => notEmptyString(s, 1)),
        sources: this.sources.filter(s => notEmptyString(s, 5)),
        locality: this.tempLocMatch,
      };
      this.editLocalityMode = false;
      this.saving = true;
      const isNew = this.isNew;
      saveUserChart(data).then((result) => {
        if (result.valid) {
          const cf = new Chart(result.chart);
          this.name = cf.name;
          this.type = cf.type;
          this.eventType = cf.eventType;
          this.gender = cf.gender;
          this.roddenValue = smartCastInt(cf.roddenValue);
          this.selectedChartId = "";         
          const {subject} = cf;
          if (notEmptyString(subject.notes)) {
            this.notes = subject.notes;
          }
          const objectName = isNew? "New chart" : "Chart";
          const action = isNew? "created" : "updated";
          const msg = `${objectName} for ${subject.name} ${action}`;
          this.toast(msg, 5000);
          bus.$emit("reload-charts", {id: cf._id});
          setTimeout(() => {
            this.selectedChartId = cf._id;
            this.mode = 'current';
          }, 250);
          const saveBlockTs = isNew? 750 : 1500;
          setTimeout(() => {
            this.saving = false;
          }, saveBlockTs);
        }
      });
      setTimeout(() => {
        this.saving = false;
      }, 5000);
    }
  }

  @Watch("dateVal")
  changeDateString(newVal) {
    const hours = this.datetime.getHours();
    const minutes = this.datetime.getMinutes();
    const seconds = this.datetime.getSeconds();
    const dt = new Date(newVal);
    dt.setHours(hours);
    dt.setMinutes(minutes);
    dt.setSeconds(seconds);
    this.datetime = dt;
  }

  @Watch("timeVal")
  changeTime() {
    const parts = this.timeVal
      .split(":")
      .filter(isNumeric)
      .map(parseFloat);
    if (parts.length > 0) {
      if (parts.length < 3) {
        if (parts.length < 2) {
          parts.push(0);
        }
        parts.push(0);
      }
      const [hours, minutes, seconds] = parts;
      this.datetime.setHours(hours);
      this.datetime.setMinutes(minutes);
      this.datetime.setSeconds(seconds);

    }
  }

  @Watch("dateVal")
  changeDateVal() {
    this.dateChanged = true;
  }

  @Watch("timeVal")
  changeTimeVal() {
    this.dateChanged = true;
  }

  @Watch("geo.lng")
  changeGeoLng() {
    this.geoChanged = true;
  }

  @Watch("geo.lat")
  changeGeoLat() {
    this.geoChanged = true;
  }

  @Watch("geo.alt")
  changeGeoAlt() {
    this.geoChanged = true;
  }

  @Watch("mode")
  changeMode(newVal) {
    switch (newVal) {
      case 'current':
        this.sync();
        break;
      case 'new':
        this.newChart();
        break;
    }
  }

  @Watch("chart")
  changeChart() {
    this.sync();
  }

  @Watch("selectedChartId")
  changeSelectedChartId(newVal) {
    if (this.initialized) {
      if (notEmptyString(newVal, 8)) {
        this.sync();
      } else {
        this.name = "";
      }
    }
  }
}
</script>
