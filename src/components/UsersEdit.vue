<template>
  <form class="edit-form user-form" v-if="isValid">
    <div class="close" @click="dismiss">
      <b-icon icon="close"></b-icon>
    </div>
    <div class="row horizontal twin">
      <fieldset class="column">
        <b-field label="Full name(s)">
          <b-input
            name="fullName"
            v-model="fullName"
            placeholder="Enter formal full name"
            :maxlength="256"
            :native-size="64"
            class="name"
            type="text"
          />
        </b-field>
        <b-field label="Nick name">
          <b-input
            name="nickName"
            v-model="nickName"
            placeholder="Display name in app"
            :maxlength="256"
            :native-size="64"
            class="name"
            type="text"
          />
        </b-field>
        <b-field label="Login">
          <b-input
            name="identifier"
            v-model="identifier"
            placeholder="Login Email"
            :maxlength="256"
            :native-size="64"
            class="name"
            type="text"
          />
          <b-select placeholder="Login mode" v-model="mode">
            <option
              v-for="opt in modeOptions"
              :value="opt.key"
              :key="['mode-', opt.key].join('-')"
            >
              {{ opt.name }}
            </option>
          </b-select>
        </b-field>
        <b-field label="Gender">
          <b-select placeholder="Gender" v-model="gender">
            <option
              v-for="opt in genderOpts"
              :value="opt.key"
              :key="['mode-', opt.key].join('-')"
            >
              {{ opt.name }}
            </option>
          </b-select>
        </b-field>
        <b-field label="Roles" class="user-roles row switch-column" :class="roleClasses">
          <b-switch
            v-for="role in roleOptions"
            :key="role.itemKey"
            size="is-small"
            v-model="roleState[role.key]"
            :class="roleOptionClass(role.key)"
            >{{ role.name }}</b-switch
          >
        </b-field>
        <b-field label="Status" class="wrap user-status">
          <b-switch size="is-small" v-model="active">Active</b-switch>
          <b-switch size="is-small" v-model="blocked">Blocked</b-switch>
          <b-switch size="is-small" v-model="test">Test account</b-switch>
          <b-switch v-if="!isNew" size="is-small" v-model="mayEditPassword"
            >Edit password</b-switch
          >
        </b-field>
        <b-field v-if="editPassword" label="Passwords">
          <b-input
            name="password"
            v-model="password"
            placeholder="Password"
            :maxlength="20"
            :native-size="20"
            class="password"
            type="password"
          />
          <b-input
            name="cpassword"
            v-model="cpassword"
            placeholder="Confirm password"
            :maxlength="20"
            :native-size="20"
            class="password"
            type="password"
          />
        </b-field>
      </fieldset>
      <fieldset class="column second">
        <b-field label="Profile image" class="profile image column">
          <b-upload name="file" v-model="file">
            <a class="button is-primary">
              <b-icon icon="upload"></b-icon>
              <span>Choose file</span>
            </a>
          </b-upload>
          <b-button
            v-if="mayUpload"
            size="is-medium"
            left-icon="upload"
            @click="upload"
            >Upload</b-button
          >
          <em v-if="mayUpload" class="new-file">{{ file.name }}</em>
          <img
            v-if="hasProfileImage"
            :src="profileImageThumb"
            alt="Profile Image"
          />
        </b-field>
        <b-field v-if="hasProfileImage" class="row caption clear" label="Caption / Credits">
          <b-input
            type="textarea"
            cols="80"
            rows="3"
            v-model="publicCaptions[0]"
            />
        </b-field>
         <b-field label="Profile text (bio)" class="profile-text row clear">
          <b-input
            type="textarea"
            cols="80"
            rows="3"
            v-model="profileText"
            />
        </b-field>
        <template v-if="hasStatuses">
          <div class="status-item" v-for="st in status" :key="st.itemKey">
            <h4>{{ st.key }}</h4>
            <ol>
              <li class="payments" v-for="pt in st.payments" :key="pt.itemKey">
                <span class="amount">{{ pt.formatted }}</span>
                <span class="method">{{ pt.method }}</span>
                <span class="paid">{{ pt.paid }}</span>
              </li>
            </ol>
          </div>
        </template>
      </fieldset>
    </div>
    <ul v-if="hasErrors" class="errors">
      <li v-for="(msg, ei) in errorMsgs" :key="['error-msg', ei].join('-')">
        {{ msg }}
      </li>
    </ul>
    <div class="actions">
      <b-button @click="save" type="is-info" size="is-medium">{{topSaveLabel}}</b-button>
      <b-button @click="saveReturn" type="is-success" size="is-medium">{{saveAndReturn}}</b-button>
    </div>
    <div v-if="isSaved" class="info row horizontal twin">
      <div class="primary-column column vertical">
        <dl class="twin-column bold-labels">
          <dt >Location</dt>
          <dd>
            <template v-if="hasLocation">
              <span class="lat">{{ geo.lat | toDMSLat }} </span>
              <span class="lng">{{ geo.lng | toDMSLng }} </span>
              <span class="name">{{ placename }} </span>
            </template>
            <template v-else>
              <span class="name">[Unknown]</span>
            </template>
            <b-select v-if="showCustomLocations" v-model="customLocation">
              <option
                v-for="item in customLocationOptions"
                :key="item.itemKey"
                :value="item.value"
              >
                {{ item.name }}
              </option>
            </b-select>
          </dd>
          <dt>Birth chart</dt>
          <dd class="chart-input">
              <div v-if="detailEditMode">
                <b-field label="Date of birth (local time)" class="column vertical">
                    <birth-date-picker
                      v-model="dateVal"
                      :maxYear="maxYear"
                      :minYear="minYear"
                      delimiter="/"
                      :closeOnSet="false"
                    />
                </b-field>
                <b-field label="Time of birth (local time)" class="column vertical">
                    <b-input size="is-medium" v-model="timeVal" class="time" type="time" :step="1" 
                      />
                    <b-input size="is-medium" v-model="tzHrs" class="tz-offset" type="number" :step="0.25" title="decimal hours"
                      />
                </b-field>
                
                <b-field label="Location" class="column vertical">
                  <b-input v-model="birthGeo.lat" type="number" :step="0.001" class="coordinate" :min="-90" :max="90" />
                  <b-input v-model="birthGeo.lng" type="number" :step="0.001" class="coordinate" :min="-180" :max="180" />
                </b-field>
                <b-field label="Place of birth (custom locality)" class="column vertical">
                  <b-input v-model="pob" type="text" size="60" />
                  <b-icon icon="map" size="is-medium" type="is-success" @click.native="matchPlacenames"/>
                </b-field>
                <ul v-if="hasSuggestions" class="suggestions">
                  <li v-for="sug in suggestions" :key="sug.itemKey" @click="selectSuggestion(sug)">
                    <span>{{sug.name}}</span> (<em>{{sug.land}}</em>)
                  </li>
                </ul>
              </div>
              <div v-else>
                <p class="age" v-if="hasChart">
                  <span class="age item">
                    {{ age }}
                  </span>
                  <span class="dob item">
                    {{ dob }}
                  </span>
                </p>
                <p class="age" v-else-if="hasAge">
                  <span class="age item">
                    N/A
                  </span>
                  <span class="birth-date" title="Only DOB is known. No chart has been generated">
                    (
                      <em class="age item">
                    {{ age }}
                  </em>
                  <em class="dob item">
                    {{ dob }}
                  </em>
                    )
                  </span>
                </p>
                <p class="age" v-else>
                  N/A
                </p>
                <p v-if="hasChart">
                  <span class="lat">{{ chart.geo.lat | toDMSLat }} </span>
                  <span class="lng">{{ chart.geo.lng | toDMSLng }} </span>
                </p>
                <p v-if="hasChart">{{ chart.corePlacenames }}</p>
              </div>
          </dd>
        </dl>

        <div class="edit-actions">
          <b-button @click="toggleEditMode" :type="detailToggleDisplayMode" size="is-medium">{{toggleEditLabel}}</b-button>
          <b-button v-if="detailEditMode" @click="save" type="is-success" size="is-medium">{{bottomSaveLabel}}</b-button>
        </div>
        
        <dl class="twin-column bold-labels compact">
          <dt>Joined</dt>
          <dd>{{ current.createdAt | mediumDate }}</dd>
          <dt>Edited user data</dt>
          <dd>{{ current.modifiedAt | mediumDate }}</dd>
          <dt v-if="hasLoggedIn">Last logged in</dt>
          <dd v-if="hasLoggedIn" class="login">
            {{ current.login | mediumDate }}
          </dd>
        </dl>
      </div>
      <dl class="twin-column left-aligned long-title preferences">
        <template v-for="po in submittedPreferenceOptions">
          <dt :key="po.itemKey">
            {{ po.prompt }}
          </dt>
          <dd :key="[po.itemKey, 2].join('-')" :data-key="po.key" :data-value="preferenceMap[po.key]">
            <div v-if="!detailEditMode" class="value">{{ po.response }}</div>
            <div v-if="detailEditMode" class="editable-value" :class="po.rowClasses">
              <template v-if="po.type == 'float'">
                <b-input v-model="preferenceMap[po.key]" type="number" step="0.1" class="medium" />
              </template>
              <template v-if="po.type == 'integer'">
                <b-input v-model="preferenceMap[po.key]" type="number" step="1" class="medium" />
              </template>
              <template v-if="po.type == 'range_number'">
                <b-input v-model="preferenceMap[po.key][0]" type="number" :min="0" :max="150" size="4" :step="1" class="medium" />
                <b-input v-model="preferenceMap[po.key][1]" type="number" :min="0" :max="150" size="4" :step="1" class="medium" />
              </template>
              <template v-if="po.type == 'scale'">
                <b-input v-model="preferenceMap[po.key]" type="number" :min="-1" :max="2" size="2" :step="1" class="short" />
              </template>
              <template v-if="po.type == 'key_scale'">
                <b-select v-model="preferenceMap[po.key]">
                  <option v-for="(opt,oi) in po.options" :key="[opt.key,oi].join('-')" :value="opt.value">{{ opt.key }}</option>
                </b-select>
              </template>
              <template v-if="useTextField(po.type)">
                <b-input v-model="preferenceMap[po.key]" type="text" :size="textSize(po.type)" :class="textSizeClass(po.type)" />
              </template>
              <template v-if="po.type == 'uri'">
                <b-input v-model="preferenceMap[po.key]" type="url" size="128" class="long" />
              </template>
              <template v-if="po.type == 'string'">
                <b-select v-model="preferenceMap[po.key]">
                  <option v-for="(opt,oi) in po.options" :key="[opt.key,oi].join('-')" :value="opt.key">{{ opt.prompt }}</option>
                </b-select>
              </template>
              <template v-if="po.type == 'array_string'">
                  <b-checkbox-button v-for="(opt,oi) in po.options" v-model="preferenceMap[po.key]" :key="[po.key,opt,oi].join('-')" :native-value="opt.key">{{ opt.prompt }}</b-checkbox-button>
              </template>
              <template v-if="po.type == 'boolean'">
                <b-switch v-model="preferenceMap[po.key]" />
              </template>
            </div>
            </dd>
        </template>
      </dl>
    </div>
    <div v-if="isSaved" class="status-log">
      <div v-for="status in statusLog" :key="status.key"></div>
    </div>
    <div v-if="isSaved" class="profiles">
      <ul class="twin-column left-aligned long-title">
        <li v-for="(po, pIndex) in profiles" :key="po.itemKey">
          <article>
            {{ po.text }}
          </article>
          <div class="media-items grid grid-4 grid-responsive" v-if="po.hasMediaItems">
            <figure
              v-for="mi in po.mediaItems"
              :key="mi.itemKey"
              class="media-item"
            >
              <b-icon
                icon="trash-can-outline"
                class="remove"
                @click.native="handleDelete(pIndex, mi)"
              />
              <img v-if="mi.isImage" :src="mi.thumbnail" />
            </figure>
          </div>
        </li>
      </ul>
    </div>
    <div class="column swipe-users">
      <b-field class="row" label="Search other users">
         <b-autocomplete
            :data="suggestedNames"
            field="name"
            class="user-name"
            v-model="otherUser.name"
            :loading="isFetching"
            @typing="matchUserNames"
            @select="selectOtherUser"
          >
            <template slot-scope="props">
              <div class="row">
                {{props.option.name}}
              </div>
            </template>
          </b-autocomplete>
          <b-checkbox v-if="showGenderButton" v-model="genderOnly" type="is-info">{{genderOnlyLabel}}</b-checkbox>
          <template v-if="hasOtherUser">
            <!-- <b-button @click="rateUser(-1)" type="is-warning">Pass</b-button> -->
            <b-button @click="rateUser(1)" type="is-info">Like</b-button>
            <b-button @click="rateUser(2)" type="is-success">Star</b-button>
            <b-button @click="deselectUser">Clear</b-button>
          </template>
      </b-field>
      <b-field label="Likeability" class="row fetch-likes">
          <b-button @click="fetchLikes">Get ratings</b-button>
      </b-field>
      <b-table
            v-if="hasLikeability"
            :data="likes"
          >
            <template slot-scope="props">
              <b-table-column class="size" field="name" label="Name">
                {{props.row.name}}
              </b-table-column>
              <b-table-column class="age" field="age" label="Age">
                {{props.row.age}}
              </b-table-column>
              <b-table-column class="gender" field="gender" label="Gender">
                {{props.row.gender}}
              </b-table-column>
              <b-table-column class="edit" field="mode" label="Mode">
                {{props.row.mode}}
              </b-table-column>
              <b-table-column class="created" field="value" label="Rating">
                <b-icon :icon="matchLikeIcon(props.row.value)" :title="props.row.value" />
                <b-icon v-if="props.row.isMutual" icon="account-multiple" />
              </b-table-column>
              <b-table-column class="date" field="date" label="Date">
                {{props.row.date | mediumDate}}
              </b-table-column>
              <b-table-column class="edit" field="edit" label="Edit / Rate">
                <!-- <b-icon icon="thumb-up" size="is-small" :title="ratingTypeLabel(props.row, 1)" @click.native="rateUserByContext(props.row, 1)" />
                <b-icon icon="star" size="is-small" :title="ratingTypeLabel(props.row, 1)" @click.native="rateUserByContext(props.row, 2)" /> -->
                <b-icon icon="account-edit" class="edit-button" type="is-info" title="Edit user" @click.native="editOtherUser(props.row.id)" />
              </b-table-column>
            </template>
          </b-table>
    </div>
    <user-block-list :current="current" />
  </form>
</template>
<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import birthDatePicker from "vue-birth-datepicker";
import {
  updateUser,
  deleteFile,
  fetchCustomLocations,
  fetchUserChart,
  profileUpload,
  registerUser,
  saveUserChart,
  fetchPlacenames,
  quickMatchUser,
  swipeUser,
  getLikeabilityByUser
} from "../api/methods";
import {
  getAge,
  mediumDateOnly,
  capitalize,
  snakeToWords,
  zeroPad,
  mediumDate,
  msToDatePart,
  sanitize,
  smartCastInt,
} from "../api/converters";
import {
  emptyString,
  isNumeric,
  notEmptyString,
  validDateTimeString,
} from "../api/validators";

import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { User, defaultUser, Placename } from "../api/interfaces/users";
import {
  expandPrefOption,
  hasPayments,
  mapToSuggestedPlace,
  matchLastPayment,
  matchLastPaymentDate,
  matchPreference,
  toPreferenceDefault,
} from "../api/mappers";
import { extractCorePlacenames } from "../api/helpers";
import { Chart } from "../api/models/Chart";
import { KeyName, LikeRow, PreferenceOption, Role, SimpleLocation, SuggestedPlace } from "../api/interfaces";
import { Geo } from "../api/interfaces/users";
import { bus } from "../main";
import defaultRoleKeys from "@/api/mappings/default-roles";
import genderOptions from "@/api/mappings/gender-options";
import { MediaItem } from "@/api/models/MediaItem";
import { GeoLoc } from "@/api/models/GeoLoc";
import { buildCustomLocOptions } from "@/api/mappings/custom-locations";
import UserBlockList from "./tables/UserBlockList.vue";
import { julToDateParts, julToUnixMillisecs } from "@/api/julian-date";
import { ChartInput } from "@/api/models/ChartForm";

const defaultRoleStates = Object.fromEntries(
  defaultRoleKeys.map((key) => [key, false])
);

@Component({
  components: {
    UserBlockList,
    birthDatePicker
  },
  filters: FilterSet,
})
export default class UserEdit extends Vue {
  @State("user") user: UserState;
  @Prop({ default: () => defaultUser }) readonly current: User;
  @Prop({ default: () => [] })
  readonly preferenceOptions: Array<PreferenceOption>;
  @Prop({ default: () => [] }) readonly roleOpts: Array<Role>;

  fullName = "";
  nickName = "";
  identifier = "";
  mode = "";
  active = false;
  blocked = false;
  roles: string[] = [];
  test = false;
  status = [];
  geo: Geo = { lat: 0, lng: 0, alt: 0 };
  birthGeo: Geo = { lat: 0, lng: 0, alt: 0 };
  placenames = [];
  gender = "-";
  pob = "";
  profileText = "";
  preferenceMap: any = {};
  profiles = [];
  preview = "";
  chart = null;

  password = "";
  cpassword = "";
  mayEditPassword = false;
  roleState = Object.assign({}, defaultRoleStates);
  errorMsgs: string[] = [];
  customLocation = "--";
  customLocations: SimpleLocation[] = [];
  file = null;


  dateVal = 0;

  timeVal = "12:00:00";

  tzHrs = 0;

  maxYear = 2030;

  minYear = 1600;

  detailEditMode = false;

  suggestions: SuggestedPlace[] = [];
  
  suggestedNames: KeyName[] = [];
  otherUser: KeyName = { key: '', name: '' };
  isFetching = false;
  likes: LikeRow[] = [];
  genderOnly = false;

  publicCaptions: string[] = [];

  created() {
    if (this.current instanceof Object) {
      this.sync();
    }
  }

  async sync() {
    this.publicCaptions = [];
    this.blocked = false;
    if (notEmptyString(this.current.fullName)) {
      this.fullName = this.current.fullName;
    } else {
      this.fullName = "";
    }
    if (notEmptyString(this.current.nickName)) {
      this.nickName = this.current.nickName;
    } else {
      this.nickName = "";
    }
    if (notEmptyString(this.current.identifier)) {
      this.identifier = this.current.identifier;
    } else {
      this.identifier = "";
    }
    if (notEmptyString(this.current.mode)) {
      this.mode = this.current.mode;
    }
    if (notEmptyString(this.current.preview)) {
      this.preview = this.current.preview;
    }
    if (notEmptyString(this.current.pob)) {
      this.pob = this.current.pob;
    }
    if (this.current.roles instanceof Array) {
      this.current.roles.forEach((rk) => {
        this.roleState[rk] = true;
      });
    } else {
      Object.keys(this.roleState).forEach((rk) => {
        this.roleState[rk] = false;
      });
    }
    if (this.current.profiles instanceof Array && this.current.profiles.length > 0) {
      if (this.current.profiles[0] instanceof Object && notEmptyString(this.current.profiles[0].text)) {
        this.profileText = this.current.profiles[0].text;
      }
    }
    this.active = this.current.active;
    if (this.roleState.blocked) {
      this.blocked = this.roleState.blocked;
    }
    this.test = this.current.test;
    this.password = '';
    this.cpassword = '';
    this.mayEditPassword = false;
    if (this.current.gender) {
      this.gender = this.current.gender;
    } else {
      this.gender = "-";
    }
    if (this.current.status instanceof Array) {
      this.status = this.current.status
        .filter((st) => st instanceof Object)
        .map((st, si) => {
          const itemKey = ["status", si].join("-");
          const payments =
            st.payments instanceof Array
              ? st.payments.map((pt, pi) => {
                  const itemKey = ["payment", pt.service, si, pi].join("-");
                  const formatted = [pt.curr, zeroPad(pt.amount, 2)].join(" ");
                  const method = ["(", pt.service, ": ", pt.ref, ")"].join("");
                  const paid = mediumDate(pt.createdAt);
                  return { ...pt, itemKey, formatted, method, paid };
                })
              : [];
          const hasPayments = payments.length > 0;
          return { ...st, itemKey, hasPayments, payments };
        });
    }
    if (this.current.profiles instanceof Array) {
      this.profiles = this.current.profiles.map((po, pi) => {
        const itemKey = ["profile", this.current._id, pi, po.type].join("-");
        const hasMediaItems =
          po.mediaItems instanceof Array && po.mediaItems.length > 0;
        const mediaItems = hasMediaItems
          ? po.mediaItems.map((mi) => new MediaItem(mi))
          : [];
        return { ...po, itemKey, mediaItems, hasMediaItems };
      });
      if (this.profiles.length > 0 && this.profiles[0] instanceof Object && this.profiles[0].mediaItems instanceof Array) {
        for (const mi of this.profiles[0].mediaItems) {
          this.publicCaptions.push(mi.title);
        }
      }
    }
    if (this.current.preferences instanceof Array) {
      const pm: Map<string, any> = new Map();
      const optKeys = this.preferenceOptions.map(po => po.key);
      this.current.preferences.forEach(pref => {
        if (optKeys.includes(pref.key)) {
          pm.set(pref.key, pref.value);
        }
      })
      this.preferenceOptions.forEach(pref => {
        if (pm.has(pref.key) === false) {
          pm.set(pref.key, toPreferenceDefault(pref));
        }
      })
      this.preferenceMap = Object.fromEntries(pm);
    }
    if (this.current.geo instanceof Object) {
      this.geo = this.current.geo;
    }
    if (!this.hasChart) {
      this.fetchChart();
    }
    this.fetchLocations();
    setTimeout(() => {
      if (!this.hasChart) {    
        if (this.current.dob instanceof Date) {
          this.dateVal = this.current.dob.getTime();
          this.timeVal = this.current.dob.toISOString().split("T").pop().split(".").shift();
        } 
      }
    })
  }

  fetchLocations() {
    fetchCustomLocations().then((locs: SimpleLocation[]) => {
      this.customLocations = locs;
    });
  }

  get customLocationOptions() {
    return buildCustomLocOptions(this.customLocations);
  }

  get toggleEditLabel(): string {
    return this.detailEditMode ? 'Dismiss' : 'Edit details';
  }

  get validRoles(): string[] {
    return Object.entries(this.roleState).filter(entry => entry[1]).map(entry => entry[0]);
  }

  get roleClasses(): string[] {
    const cls = this.validRoles.map(k => sanitize(k, '-'));
    if (this.hasAdminRole) {
      cls.push('admin-role');
    } else {
      cls.push('member-role');
    }
    if (this.current.roles.includes('blocked') && cls.includes('blocked') === true) {
      cls.push('blocked-user');
    }
    return cls;
  }

  get hasAdminRole(): boolean {
    return this.validRoles.some(k => k.includes('admin') || k.includes('editor'));
  }

  roleOptionClass(roleKey = ""): string[] {
    const activeClass = Object.keys(this.roleState).includes(roleKey) && this.roleState[roleKey] ? 'active' : 'inactive';
    return [sanitize(roleKey), activeClass]
  }

  fetchChart() {
    if (this.isSaved) {
      fetchUserChart(this.current._id).then((result) => {
        if (result.valid) {
          this.assignChart(result.chart)
        }
      });
    }
  }

  assignChart(chartData: any = null) {
    this.chart = new Chart(chartData);
    this.birthGeo = { 
      lat: Math.round(this.chart.geo.lat * 1000) / 1000,
      lng: Math.round(this.chart.geo.lng * 1000) / 1000,
      alt: this.chart.geo.alt
      };
    const jDate = julToDateParts(this.chart.jd, this.chart.tzOffset);
    const jDateStr = jDate.timeString();
    this.timeVal = jDateStr;
    this.dateVal = julToUnixMillisecs(this.chart.jd, this.chart.tzOffset);
    this.tzHrs = this.chart.tzOffset / 3600;
    const currPob = this.pob;
    if (notEmptyString(currPob) && this.chart.placenames.length > 1) {
      this.pob = [currPob.split(',').shift(), this.chart.placenames[0].name].join(', ');
    }
  }

  get hasLocation() {
    return (
      this.current.geo instanceof Object &&
      isNumeric(this.current.geo.lat) &&
      isNumeric(this.current.geo.lng)
    );
  }

  get statusLog() {
    return this.status.map((status, si) => {
      const { payments } = status;
      const hasPayments =
        payments instanceof Array ? payments.length > 0 : false;
      const itemKey = [this.current._id, status.key, si].join("-");
      if (hasPayments) {
        status.payments = status.payments.map((p, pi) => {
          const itemKey = [this.current._id, status.key, p.type, pi].join("-");
          return { ...p, itemKey };
        });
      }
      return { ...status, hasPayments, itemKey };
    });
  }

  get isNew() {
    return emptyString(this.current._id, 12);
  }

  get profileImage() {
    const po = this.current.profiles;
    if (po.length > 0) {
      if (po[0].mediaItems.length > 0) {
        if (po[0].mediaItems[0] instanceof Object) {
          return new MediaItem(po[0].mediaItems[0]);
        }
      }
    }
    return new MediaItem();
  }

  get hasProfileImage() {
    return notEmptyString(this.profileImage.filename, 7);
  }

  get profileImageThumb() {
    return this.profileImage.filename.length > 5
      ? this.profileImage.thumbnail
      : "";
  }

  get profileImageFilename() {
    return this.profileImage.filename.length > 5
      ? this.profileImage.filename
      : "";
  }

  get isSaved() {
    return !this.isNew;
  }

  get hasStatuses() {
    return this.status.length > 0;
  }

  get hasErrors() {
    return this.errorMsgs.length > 0;
  }

  get editPassword() {
    return this.isNew || this.mayEditPassword;
  }

  get showEditPassword() {
    return !this.isNew && this.mode === "local";
  }

  get isValid() {
    return this.current instanceof Object;
  }

  get hasChart() {
    return this.chart instanceof Chart && this.chart.jd > 0 && this.chart.grahas.length > 6;
  }

  get showCustomLocations() {
    return this.current.test && this.hasCustomLocations;
  }

  get hasCustomLocations() {
    return this.customLocations.length > 0;
  }

  get hasGeo() {
    if (
      notEmptyString(this.customLocation) &&
      this.customLocation.startsWith("{") &&
      this.customLocation.endsWith("}")
    ) {
      const customLoc = JSON.parse(this.customLocation);
      return (
        customLoc instanceof Object &&
        notEmptyString(customLoc.name, 3) &&
        isNumeric(customLoc.lng) &&
        isNumeric(customLoc.lat)
      );
    } else {
      return false;
    }
  }

  get topSaveLabel() {
    return this.detailEditMode ? 'Save' : 'Save core fields';
  }

  get saveAndReturn() {
    return 'Save and return';
  }


  get bottomSaveLabel() {
    return this.detailEditMode ? 'Save user and chart details' : '';
  }

   get detailToggleDisplayMode() {
    return this.detailEditMode ? 'is-info' : 'is-warning';
  }

  get showGenderButton() {
    if (this.preferenceMap.genders instanceof Array) {
      return this.preferenceMap.genders.length === 1;
    } else {
      return false;
    }
  }

  get genderOnlyLabel() {
    if (this.showGenderButton) {
      switch (this.preferredGenderOpt) {
        case 'f':
          return 'Women only';
        case 'm':
          return 'Men only';
        default:
          return '-';
      }
    } else {
      return '-';
    }
  }


  extractPlaceNames(customLoc: SimpleLocation) {
    const placenames: Placename[] = [];
    if (this.hasGeo) {
      const { lat, lng, name } = customLoc;
      let plNames = name.split(",").map((str) => str.trim());
      if (plNames.length < 2) {
        plNames = name.split("(").map((str) => str.trim().replace(/\)$/, ""));
      }
      for (let i = 0; i < plNames.length; i++) {
        const type = i === 0 ? "PPLA" : "ADM1";
        const fullName = plNames[i];
        placenames.push({
          fullName,
          type,
          name: fullName,
          geo: new GeoLoc([lat, lng]),
        });
      }
    }
    return placenames;
  }

  get placename() {
    return extractCorePlacenames(this.current.placenames);
  }

  get age(): number {
    return this.hasChart ? getAge(this.chart.datetime) : this.current.dob instanceof Date ? getAge(this.current.dob) : 0;
  }

  get hasAge(): boolean {
    return this.age > 0;
  }

  get dob(): string {
    return this.hasChart
      ? mediumDateOnly(this.chart.datetime, this.chart.tzOffset)
      : this.current.dob instanceof Date ? mediumDateOnly(this.current.dob) : '';
  }

  get modeOptions() {
    return [
      {
        key: "local",
        name: "Local",
      },
      {
        key: "google",
        name: "Google",
      },
      {
        key: "facebook",
        name: "Facebook",
      },
    ];
  }

  get submittedPreferenceOptions() {
    return this.preferenceOptions
      .map((opt, index) => {
        const itemKey = [opt.key, index].join("-");
        const response = this.matchPreferenceDisplay(opt.key);
        const hasResponse = response !== null;
        const options = opt.options instanceof Array && opt.options.length > 0 ? opt.options.map(opKey => {
          return {
            key: opKey,
            prompt: expandPrefOption(opt.key, opKey)
          }
        }) : [];
        const rowClasses = [];
        switch (opt.type) {
          case 'array_string':
            rowClasses.push('column');
            break;
          default:
            rowClasses.push('row');
            break;
        }
        return { ...opt, options, itemKey, response, hasResponse, rowClasses };
      })
      .filter((item) => item.hasResponse);
  }

  useTextField(prefType = ''): boolean {
    switch (prefType) {
      case "text":
      case "code":
        return true;
      default:
        return false;
    }
  }

  textSizeInt(prefType = ''): number {
    switch (prefType) {
      case 'text':
        return 255;
      default:
        return 32;
    }
  }

  textSize(prefType = ''): string {
    return this.textSizeInt(prefType).toString();
  }

  textSizeClass(prefType = ''): string {
    switch (prefType) {
      case 'text':
        return 'long';
      default:
        return 'medium';
    }
  }

  get hasLoggedIn() {
    return (
      this.current.login instanceof Date ||
      validDateTimeString(this.current.login)
    );
  }

  get roleOptions() {
    const opts =
      this.roleOpts.length > 0 ? this.roleOpts : this.defaultRoleOptions();
    return opts.map((opt, index) => {
      const itemKey = ["role", opt.key, index].join("-");
      return { ...opt, itemKey };
    });
  }

  defaultRoleOptions() {
    return defaultRoleKeys.map((key) => {
      const name = key === "active" ? "Member" : capitalize(snakeToWords(key));
      return {
        key,
        name,
      };
    });
  }

  get genderOpts() {
    return genderOptions;
  }

  hasPayments(user: User) {
    return hasPayments(user);
  }

  matchLastPayment(user: User) {
    return matchLastPayment(user);
  }

  matchLastPaymentDate(user: User) {
    return matchLastPaymentDate(user);
  }

  matchPreference(key: string) {
    let preference = null;
    const { preferences } = this.current;
    if (preferences instanceof Array) {
      preference = preferences.find((p) => p.key === key);
    }
    if (!preference) {
      preference = { key, value: null, type: "" };
    }
    return matchPreference(preference, this.preferenceOptions);
  }

  matchPreferenceDisplay(key: string) {
    const pr = this.matchPreference(key);
    return pr instanceof Object ? pr.display : "";
  }

  get roleKeys() {
    return this.roleOpts.length > 0 ? this.roleOpts : defaultRoleKeys;
  }

  save(returnMode = false) {
    this.errorMsgs = [];
    this.roles = Object.entries(this.roleState)
      .filter((entry) => entry[1])
      .map((entry) => entry[0]);
    const errorTypes: string[] = [];
    const edited: any = {
      identifier: this.identifier,
      nickName: this.nickName,
      fullName: this.fullName,
      mode: this.mode,
      gender: this.gender,
      roles: this.roles,
      active: this.active,
      test: this.test,
      admin: this.user._id,
    };
    if (notEmptyString(this.profileText)) {
      edited.publicProfileText = this.profileText;
    }
    if (this.publicCaptions.length > 0 && notEmptyString(this.publicCaptions[0])) {
      edited.publicCaptions = this.publicCaptions;
    }
    if (this.detailEditMode) {
      edited.preferences = [];
      Object.entries(this.preferenceMap).forEach(([key, val]) => {
        const item = this.preferenceOptions.find(po => po.key === key);
        if (item instanceof Object) {
          const { type } = item;
          edited.preferences.push({
            key,
            type,
            value: val
          })
        }
      })
      if (this.birthGeo) {
        const datetime = msToDatePart(this.dateVal, this.tzHrs) + 'T' + this.timeVal;
        const tzOffset = this.tzHrs * 3600;
        const pob = notEmptyString(this.pob) ? this.pob.split(",").shift() : '';
        const inData = {
          name: this.current.nickName,
          gender: this.current.gender,
          user: this.current._id,
          lat: this.birthGeo.lat,
          lng: this.birthGeo.lng,
          alt: this.birthGeo.alt,
          isDefaultBirthChart: true,
          datetime, 
          tzOffset,
          roddenValue: 1000,
          type: "person",
          eventType: "birth",
          _id: this.hasChart ? this.chart._id : '',
          pob,
        } as ChartInput;
        edited.pob = pob;
        edited.dob = datetime;
        saveUserChart(inData).then(response => {
          const { chart } = response;
          if (chart instanceof Object) {
            this.assignChart(chart);
          }
        });
      }
    }
    if (this.hasGeo) {
      const customLoc = JSON.parse(this.customLocation);
      const km10 = 360 / 4000;
      const randomMinus = () => (Math.random() >= 0.5 ? 1 : -1);
      const diffY = Math.random() * km10 * randomMinus();
      const diffX =
        Math.random() *
        km10 *
        Math.cos((Math.PI / 180) * customLoc.lat) *
        randomMinus();
      let lat = customLoc.lat + diffY;
      if (lat > 90) {
        lat = 90;
      }
      if (lat < -90) {
        lat = -90;
      }
      let lng = customLoc.lng + diffX;
      if (lng > 180) {
        lng = 180;
      }
      if (lng < -180) {
        lng = -180;
      }
      edited.geo = {
        lat,
        lng,
      };
      edited.placenames = this.extractPlaceNames(customLoc);
    }
    let valid =
      notEmptyString(this.identifier, 5) &&
      notEmptyString(this.nickName, 1) &&
      notEmptyString(this.fullName, 2) &&
      notEmptyString(this.mode, 1);
    if (!valid) {
      errorTypes.push("core");
    }
    if (notEmptyString(this.password) && this.editPassword) {
      this.password = this.password.trim();
      this.cpassword = this.cpassword.trim();
      if (this.password.length > 7 && this.password === this.cpassword) {
        edited.password = this.password;
      } else {
        valid = false;
        errorTypes.push("password");
      }
    }
    if (valid) {
      if (this.isNew) {
        registerUser(edited).then(() => {
          this.toast(`Added account for ${this.fullName}`);
        });
      } else {
        updateUser(this.current._id, edited).then(() => {
          this.toast(`updated account for ${this.fullName}`);
        });
      }
      if (returnMode === true) {
        setTimeout(() => {
          bus.$emit("update-user-list", true);
        }, 1000);
      }
    } else {
      this.setErrorMsgs(errorTypes);
    }
  }

  saveReturn() {
    this.save(true);
  }

  setErrorMsgs(errorTypes: string[] = []) {
    this.errorMsgs = errorTypes.map((type) => {
      switch (type) {
        case "core":
          return "Please add a full name, nickName, email, login mode and at least one role";
        case "password":
          return "Please ensure the password has at least 7 characters without spaces and matches the confirmation field";
        default:
          return "Please check errors";
      }
    });
  }

  handleDelete(index = 0, mediaItem: MediaItem) {
    this.$buefy.dialog.confirm({
      message: `Are you sure you wish to delete "${mediaItem.ref}?"`,
      cancelText: "Keep",
      confirmText: "Delete",
      type: "is-danger",
      onConfirm: () => this.deleteMedia(index, mediaItem),
    });
  }

  deleteMedia(index = 0, mediaItem: MediaItem) {
    if (index >= 0 && index < this.profiles.length) {
      const profile = this.profiles[index];
      if (profile instanceof Object) {
        const mediaIndex = profile.mediaItems.findIndex(
          (mi) => mi.filename === mediaItem.filename
        );
        if (mediaIndex >= 0) {
          deleteFile(this.current._id, mediaItem.filename).then((result) => {
            if (result.valid) {
              this.toast(`The file ${result.item.filename} has been deleted`);
              this.profiles[index].mediaItems.splice(mediaIndex, 1);
              bus.$emit("remove-media-item", {
                user: this.current._id,
                index,
                mediaRef: result.item.filename,
              });
            }
          });
        }
      }
    }
  }

  toast(message = "") {
    this.$buefy.toast.open({
      duration: 3000,
      message,
      position: "is-bottom",
      type: "is-success",
    });
  }

  dismiss() {
    bus.$emit("escape", true);
  }

  validate() {
    const errorTypes: string[] = [];
    let valid =
      notEmptyString(this.identifier, 5) &&
      notEmptyString(this.nickName, 1) &&
      notEmptyString(this.fullName, 2) &&
      notEmptyString(this.mode, 1);
    if (!valid) {
      errorTypes.push("core");
    }
    if (notEmptyString(this.password) && this.editPassword) {
      const passOk =
        this.password.length > 7 && this.password === this.cpassword;
      if (!passOk) {
        valid = false;
        errorTypes.push("password");
      }
    }
    if (!valid) {
      this.setErrorMsgs(errorTypes);
    } else {
      this.errorMsgs = [];
    }
  }

  get mayUpload() {
    return this.file instanceof File && this.file.type.startsWith("image/");
  }

  toggleEditMode() {
    if (this.detailEditMode) {
      this.detailEditMode = false;
    } else {
      if (!this.hasChart) {
        this.setToCurrLocation();
      }
      this.detailEditMode = true;
    }
  }

  setToCurrLocation() {
    this.birthGeo = this.geo;
    if (this.placenames.length > 0 && emptyString(this.pob)) {
      this.pob = this.placenames[this.placenames.length - 1];
    }
  }

  upload() {
    if (this.file instanceof File) {
      profileUpload(
        this.current._id,
        this.file,
        this.profileImageFilename,
        this.current.nickName
      ).then((result) => {
        if (result instanceof Object && result.valid) {
          if (result.user instanceof Object) {
            const { profiles } = result.user;
            if (profiles instanceof Array) {
              setTimeout(() => {
                bus.$emit("update-user-record", this.current._id, { profiles });
              }, 250);
            }
          }
        }
        this.file = null;
      });
    }
  }

  matchPlacenames() {
    this.suggestions = [];
    fetchPlacenames(this.pob).then(data => {
      if (data instanceof Object) {
        const { items } = data;
        if (items instanceof Array) {
          const places: SuggestedPlace[] = [];
          const keys: string[] = [];
          items.forEach((item, index) => {
            const sug = mapToSuggestedPlace(item);
            const itemKey = ['spl', item.lat, item.lng, index].join('-');
            const nk = [sanitize(item.name), sanitize(item.land)].join('--');
            if (keys.indexOf(nk) < 0) {
              places.push({...sug, itemKey});
              keys.push(nk);
            }
          });
          this.suggestions = places;
        }
      }
    })
  }

  selectSuggestion(sug: SuggestedPlace) {
    this.birthGeo.lat = sug.lat;
    this.birthGeo.lng = sug.lng;
    this.pob = [sug.name, sug.land].join(", ");
    setTimeout(() => {
      this.suggestions = [];
    }, 500);
  }

  rateUser(num = 0) {
    if (num !== 0 && this.hasOtherUser) {
      this.rateUserById(this.otherUser.key, num, this.current._id);
    }
  }

  rateUserByContext(row: LikeRow, num = 0) {
    if (row instanceof Object) {
      const targetId = row.mode === 'to' ? row.id : this.current._id;
      const sourceId = row.mode === 'to' ? this.current._id : row.id;
      this.rateUserById(targetId, num, sourceId);
    }
  }

  rateUserById(refId = '', num = 0, sourceId = '') {
    if (num !== 0 && notEmptyString(refId, 12)) {
      swipeUser(sourceId, refId, num).then(r => {
        if (r) {
          const action = num > 1 ? "starred" : num > 0?  "liked" : "passed on";
          const userRef = refId === this.current._id ? 'The current user' : 'The other user';
          this.toast(`${userRef} has been ${action}`)
          setTimeout(() => {
            this.fetchLikes();
          }, 2000)
        }
      });
    }
  }

  ratingNumTOWord(num = 1) {
    switch (num) {
      case 1:
        return 'Like';
      case 2:
        return 'Start';
      case -1:
      case -2:
      case -3:
        return 'Unlike';
      default:
        return '';
    }
  }

  ratingTypeLabel(row: LikeRow, num = 1) {
    const word = this.ratingNumTOWord(num);
    return row.mode === 'to' ? `${word} ${row.name}` : `Let ${row.name} ${word.toLowerCase()} ${this.current.nickName}`;
  }

  editOtherUser(userId = '') {
    bus.$emit('load-user', userId);
  }

  get hasSuggestions() {
    return this.suggestions.length > 0;
  }

  selectOtherUser(user: KeyName) {
    if (user instanceof Object && notEmptyString(user.key)) {
      this.otherUser = user;
    }
  }

  deselectUser() {
    this.otherUser = {
      key: '',
      name: ''
    }
    this.suggestedNames = [];
  }

  get hasOtherUser() {
    return notEmptyString(this.otherUser.key, 20);
  }

  get hasLikeability() {
    return this.likes.length > 0;
  }

  get preferredGenderOpt() {
    if (this.preferenceMap.genders instanceof Array && this.preferenceMap.genders.length > 0) {
      return this.preferenceMap.genders[0];
    } else {
      return '';
    }
  }

  matchUserNames(search = '') {
    if (!this.isFetching && search.length > 2) {
      this.isFetching = true;
      const genderKey = (this.showGenderButton && this.genderOnly)?  this.preferredGenderOpt : '';
      quickMatchUser(search, genderKey).then(users => {
        if (users instanceof Array) {
          this.suggestedNames = users;
        }
        this.isFetching =false;
      })
    } else {
      this.suggestedNames = [];
    }
  }

  matchLikeIcon(value = 0) {
    const intVal = smartCastInt(value);
    const refInt = intVal < -3 ? -3 :  intVal > 2 ? 2 : intVal;
    switch (refInt) {
      case 2:
        return 'star';
      case 1:
        return 'thumb-up';
      case -1:
      case -2:
      case -3:
        return 'thumb-down';
      default:
        return 'circle-outline';
    }
  }

  fetchLikes() {
    getLikeabilityByUser(this.current._id).then(items => {
      if (items instanceof Array) {
        this.likes = items.filter(row => row instanceof Object).map(row => {
          const { otherId, mode, identifier, value, name, age, gender, date, isMutual } = row;
          return { id:otherId, mode, identifier, value, name, age, gender, date, isMutual: isMutual === true };
        });
      } else {
        this.likes = [];
      }
    })
  }

  @Watch("current")
  changeCurrent(newVal) {
    if (newVal instanceof Object) {
      this.chart = new Chart();
      this.sync();
      this.deselectUser();
      this.likes = [];
      this.detailEditMode = false;
    }
  }

  @Watch("password")
  changePassword() {
    if (this.editPassword) {
      this.validate();
    }
  }

  @Watch("cpassword")
  changeCpassword() {
    if (this.editPassword) {
      this.validate();
    }
  }

  @Watch("blocked")
  changeBlocked(newVal) {
    if (newVal === true) {
      this.roleState['blocked'] = true;
      this.active = false;
    } else if (newVal === false) {
      this.roleState['blocked'] = false;
    }
  }

  @Watch("active")
  changeActive(newVal) {
    if (newVal === true) {
      this.blocked = false;
    }
  }

  @Watch("roleState", { deep: true })
  changeRoleState(newVal) {
    if (newVal instanceof Object) {
      const hasAdminRole =
        Object.entries(newVal).filter(
          (entry) =>
            ["superadmin", "admin", "editor"].includes(entry[0]) && entry[1]
        ).length > 0;
      if (hasAdminRole && this.isNew) {
        this.mode = "local";
      }
    }
  }
}
</script>
<style lang="scss">
@import "@/styles/variables.scss";
ul.suggestions {
  li {
    cursor: pointer;
    &:hover {
      background-color: rgba($highlight-color, 0.25);
    }
  }
}

.chart-input {
  .field {
    .icon {
      margin-left: 0.75em;
      i {
        position: relative;
        top: -0.625em;
        transition: transform 0.333s ease-in-out;
        &:hover {
          transform: skew(-3deg);
        }
      }
    }
  }
}

td.edit {
  .icon {
    opacity: 0.5;
    &:hover {
      opacity: 1;
    }
  }
  .edit-button {
    padding-left: 0.75em;
  }
}

.user-name {
  min-width: 20em;
  @media (min-width: 70em) {
    min-width: 25em;
  }
  @media (min-width: 80em) {
    min-width: 30em;
  }
  @media (min-width: 85em) {
    min-width: 33em;
  }
  @media (min-width: 90em) {
    min-width: 36em;
  }
}

.user-roles {
  label.blocked {
    display: none;
  }
  &.member-role {
    label {
      &.superadmin,
      &.admin,
      &.editor {
        opacity: 0.66667;
        pointer-events: none;
      }
    }
  }
  &.blocked-user {
    background-color: rgba($danger, 0.125);
  }
}

.user-form > .row.twin > fieldset.second {
  display: block;
  .field.column.image {
    display: block;
    label.upload {
      float: left;
    }
    img {
      float: right;
      margin-left: 0.75em;
    }
    margin-bottom: 1rem;
    min-height: 4rem;
  }
  .clear {
    clear: both;
    width: 100%;
  }
}

#main .edit-form .column .user-status {
  label.switch {
    margin-right: 0.25em;
    .control-label {
      margin: 0 0.25em 0 0;
      padding-left: 0;
    }
  }
}

</style>