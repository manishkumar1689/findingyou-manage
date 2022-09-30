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
          <b-select placeholder="Gener" v-model="gender">
            <option
              v-for="opt in genderOpts"
              :value="opt.key"
              :key="['mode-', opt.key].join('-')"
            >
              {{ opt.name }}
            </option>
          </b-select>
        </b-field>
        <b-field label="Roles" class="user-roles column">
          <b-switch
            v-for="role in roleOptions"
            :key="role.itemKey"
            size="is-small"
            v-model="roleState[role.key]"
            >{{ role.name }}</b-switch
          >
        </b-field>
        <b-field label="Status" class="wrap">
          <b-switch size="is-small" v-model="active">Active</b-switch>
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
      <fieldset class="column">
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
      <b-button @click="save" type="is-success" size="is-medium">Save</b-button>
    </div>
    <div v-if="isSaved" class="info row horizontal twin">
      <dl class="twin-column bold-labels">
        <dt>Location</dt>
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
        <dt v-if="hasChart">Age / DOB</dt>
        <dd v-if="hasChart">
          <p class="age">
            <span class="age item">
              {{ age }}
            </span>
            <span class="dob item">
              {{ dob }}
            </span>
          </p>
          <p>
            <span class="lat">{{ chart.geo.lat | toDMSLat }} </span>
            <span class="lng">{{ chart.geo.lng | toDMSLng }} </span>
          </p>
          <p>{{ chart.corePlacenames }}</p>
        </dd>
        <dt>Joined</dt>
        <dd>{{ current.createdAt | mediumDate }}</dd>
        <dt>Edited user data</dt>
        <dd>{{ current.modifiedAt | mediumDate }}</dd>
        <dt>Last logged in</dt>
        <dd v-if="hasLoggedIn" class="login">
          {{ current.login | mediumDate }}
        </dd>
      </dl>
      <dl class="twin-column left-aligned long-title preferences">
        <template v-for="po in submittedPreferenceOptions">
          <dt :key="po.itemKey">
            {{ po.prompt }}
          </dt>
          <dd :key="[po.itemKey, 2].join('-')">{{ po.response }}</dd>
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
          <div class="media-items grid grid-4" v-if="po.hasMediaItems">
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
  </form>
</template>
<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import {
  deleteFile,
  fetchCustomLocations,
  fetchSetting,
  fetchUserChart,
  registerUser,
} from "../api/methods";
import {
  getAge,
  mediumDateOnly,
  capitalize,
  snakeToWords,
  zeroPad,
  mediumDate,
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
  hasPayments,
  matchLastPayment,
  matchLastPaymentDate,
  matchPreference,
} from "../api/mappers";
import { extractCorePlacenames } from "../api/helpers";
import { Chart } from "../api/models/Chart";
import { PreferenceOption, Role, SimpleLocation } from "../api/interfaces";
import { Geo } from "../api/interfaces/users";
import { updateUser } from "../api/methods";
import { bus } from "../main";
import defaultRoleKeys from "@/api/mappings/default-roles";
import genderOptions from "@/api/mappings/gender-options";
import { MediaItem } from "@/api/models/MediaItem";
import { GeoLoc } from "@/api/models/GeoLoc";
import { buildCustomLocOptions } from "@/api/mappings/custom-locations";

const defaultRoleStates = Object.fromEntries(
  defaultRoleKeys.map((key) => [key, false])
);

@Component({
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
  roles: string[] = [];
  test = false;
  status = [];
  geo: Geo = { lat: 0, lng: 0, alt: 0 };
  placenames = [];
  gender = "-";
  preferences = [];
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

  created() {
    if (this.current instanceof Object) {
      this.sync();
    }
  }

  async sync() {
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
    if (this.current.roles instanceof Array) {
      this.current.roles.forEach((rk) => {
        this.roleState[rk] = true;
      });
    } else {
      Object.keys(this.roleState).forEach((rk) => {
        this.roleState[rk] = false;
      });
    }
    this.active = this.current.active;
    this.test = this.current.test;
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
    }
    if (this.current.preferences instanceof Array) {
      this.preferences = this.current.preferences;
    }
    if (this.current.geo instanceof Object) {
      this.geo = this.current.geo;
    }
    if (!this.hasChart) {
      this.fetchChart();
    }
    this.fetchLocations();
  }

  fetchLocations() {
    fetchCustomLocations().then((locs: SimpleLocation[]) => {
      this.customLocations = locs;
    });
  }

  get customLocationOptions() {
    return buildCustomLocOptions(this.customLocations);
  }

  fetchChart() {
    if (this.isSaved) {
      fetchUserChart(this.current._id).then((result) => {
        if (result.valid) {
          this.chart = new Chart(result.chart);
        }
      });
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
    return this.chart instanceof Chart;
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

  get age() {
    return this.hasChart ? getAge(this.chart.datetime) : 0;
  }

  get dob() {
    return this.hasChart
      ? mediumDateOnly(this.chart.datetime, this.chart.tzOffset)
      : "";
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
        return { ...opt, itemKey, response, hasResponse };
      })
      .filter((item) => item.hasResponse);
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

  save() {
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
      setTimeout(() => {
        bus.$emit("update-user-list", true);
      }, 1000);
    } else {
      this.setErrorMsgs(errorTypes);
    }
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

  @Watch("current")
  changeCurrent(newVal) {
    if (newVal instanceof Object) {
      this.sync();
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