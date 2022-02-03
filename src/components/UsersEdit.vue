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
            >{{ opt.name }}</option
          >
        </b-select>
      </b-field>
      <b-field label="Gender">
        <b-select placeholder="Gener" v-model="gender">
          <option
            v-for="opt in genderOpts"
            :value="opt.key"
            :key="['mode-', opt.key].join('-')"
            >{{ opt.name }}</option
          >
        </b-select>
      </b-field>
      <b-field label="Roles" class="wrap">
        <b-switch v-for="role in roleOptions" :key="role.itemKey" size="is-small" v-model="roleState[role.key]">{{role.name}}</b-switch>  
      </b-field>
      <b-field label="Status" class="wrap">
        <b-switch size="is-small" v-model="active">Active</b-switch>
        <b-switch size="is-small" v-model="test">Test account</b-switch>
        <b-switch v-if="!isNew" size="is-small" v-model="mayEditPassword">Edit password</b-switch>
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
            <h4>{{st.key}}</h4>
            <ol>
              <li class="payments" v-for="pt in st.payments" :key="pt.itemKey">
                <span class="amount">{{pt.formatted}}</span>
                <span class="method">{{pt.method}}</span>
                <span class="paid">{{pt.paid}}</span>
              </li>
            </ol>
          </div>
        </template>
      </fieldset>
    </div>
    <div class="actions">
      <b-button @click="save">Save</b-button>
    </div>
    <div class="info row horizontal twin">
      <dl class="twin-column bold-labels">
        <dt v-if="hasChart">Location</dt>
        <dd v-if="hasChart">
          <span class="lat">{{ geo.lat | toDMSLat }} </span>
          <span class="lng">{{ geo.lng | toDMSLng }} </span>
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
          <dd :key="[po.itemKey,2].join('-')">{{ po.response }}</dd>
        </template>
      </dl>
    </div>
    <div class="status-log">
      <div v-for="status in statusLog" :key="status.key"></div>
    </div>
    <div class="profiles">
      <ul class="twin-column left-aligned long-title">
        <li v-for="(po, pIndex) in profiles" :key="po.itemKey">
          <article >
            {{ po.text }}
          </article>
            <div class="media-items grid grid-4" v-if="po.hasMediaItems">
              <figure v-for="mi in po.mediaItems" :key="mi.itemKey" class="media-item">
                <b-icon icon="trash-can-outline" class="remove" @click.native="handleDelete(pIndex, mi)" />
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
import { deleteFile, fetchUserChart, registerUser } from "../api/methods";
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
  notEmptyString,
  validDateTimeString,
} from "../api/validators";

import { FilterSet } from "../api/composables/FilterSet";
import { UserState } from "../store/types";
import { User, defaultUser } from "../api/interfaces/users";
import {
  hasPayments,
  matchLastPayment,
  matchLastPaymentDate,
  matchPrefence,
  extractPayments,
} from "../api/mappers";
import { Chart } from "../api/models/Chart";
import { PreferenceOption, Role } from "../api/interfaces";
import { Geo } from "../api/interfaces/users";
import { updateUser } from "../api/methods";
import { bus } from "../main";
import defaultRoleKeys from "@/api/mappings/default-roles";
import genderOptions from "@/api/mappings/gender-options";
import { MediaItem } from "@/api/models/MediaItem";

const defaultRoleStates = Object.fromEntries(defaultRoleKeys.map(key => [key,false]));

@Component({
  filters: FilterSet,
})
export default class UserEdit extends Vue {
  @State("user") user: UserState;
  @Prop({ default: () => defaultUser }) readonly current: User;
  @Prop({ default: () => [] }) readonly preferenceOptions: Array<
    PreferenceOption
  >;
  @Prop({ default: () => [] }) readonly roleOpts: Array<Role>;

  private fullName = "";
  private nickName = "";
  private identifier = "";
  private mode = "";
  private active = false;
  private roles: string[] = [];
  private test = false;
  private status = [];
  private geo: Geo = { lat: 0, lng: 0, alt: 0 };
  private placenames = [];
  private gender = "-";
  private preferences = [];
  private profiles = [];
  private preview = "";
  private chart = null;

  private password = "";
  private cpassword = "";
  private mayEditPassword = false;
  private roleState = Object.assign({}, defaultRoleStates)

  created() {
    if (this.current instanceof Object) {
      this.sync();
    }
  }

  async sync() {
    if (notEmptyString(this.current.fullName)) {
      this.fullName = this.current.fullName;
    }
    if (notEmptyString(this.current.nickName)) {
      this.nickName = this.current.nickName;
    }
    if (notEmptyString(this.current.identifier)) {
      this.identifier = this.current.identifier;
    }
    if (notEmptyString(this.current.mode)) {
      this.mode = this.current.mode;
    }
    if (notEmptyString(this.current.preview)) {
      this.preview = this.current.preview;
    }
    if (this.current.roles instanceof Array) {
      this.current.roles.forEach(rk => {
        this.roleState[rk] = true;
      });
    }
    this.active = this.current.active;
    this.test = this.current.test;
    if (this.current.gender) {
      this.gender = this.current.gender;
    }
    if (this.current.status instanceof Array) {
      this.status = this.current.status.filter(st => st instanceof Object).map((st, si) => {
        const itemKey = ['status', si].join('-');
        const payments = st.payments instanceof Array ? st.payments.map((pt, pi) => {
          const itemKey = ['payment', pt.service, si, pi].join('-');
          const formatted = [pt.curr, zeroPad(pt.amount, 2)].join(' ')
          const method = ['(',pt.service,': ', pt.ref, ')'].join('');
          const paid = mediumDate(pt.createdAt);
          return { ...pt, itemKey, formatted, method, paid };
        }) : [];
        const hasPayments = payments.length > 0;
        return { ...st, itemKey, hasPayments, payments }
      });
    }
    if (this.current.profiles instanceof Array) {
      this.profiles = this.current.profiles.map((po, pi) => {
        const itemKey = ['profile', this.user._id, pi, po.type].join('-');
        const hasMediaItems = po.mediaItems instanceof Array && po.mediaItems.length > 0;
        const mediaItems = hasMediaItems ? po.mediaItems.map(mi => new MediaItem(mi)) : [];
        return {...po, itemKey, mediaItems, hasMediaItems };
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
  }

  fetchChart() {
    fetchUserChart(this.current._id).then((result) => {
      if (result.valid) {
        this.chart = new Chart(result.chart);
      }
    });
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
    return emptyString(this.current._id, 10);
  }

  get hasStatuses() {
    return this.status.length > 0;
  }

  get editPassword() {
    return this.isNew || this.mayEditPassword;
  }

  get showEditPassword() {
    return !this.isNew && this.mode === 'local';
  }

  get isValid() {
    return this.current instanceof Object;
  }

  get hasChart() {
    return this.chart instanceof Chart;
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
    return this.preferenceOptions.map((opt, index) => {
      const itemKey = [opt.key, index].join('-');
      const response = this.matchPrefenceDisplay(opt.key);
      const hasResponse = response !== null;
      return {...opt, itemKey, response, hasResponse};
    }).filter(item => item.hasResponse);
  }

  get hasLoggedIn() {
    return (
      this.current.login instanceof Date ||
      validDateTimeString(this.current.login)
    );
  }

  get roleOptions() {
    const opts = this.roleOpts.length > 0 ? this.roleOpts : this.defaultRoleOptions();
    return opts.map((opt, index) => {
      const itemKey = ['role', opt.key, index].join('-');
      return { ...opt, itemKey }
    });
  }

  defaultRoleOptions() {
    return defaultRoleKeys.map(key => {
      const name = key === "active"? "Member" : capitalize(snakeToWords(key));
      return {
        key,
        name,
      }
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

  matchPrefence(key: string) {
    let preference = null;
    const { preferences } = this.current;
    if (preferences instanceof Array) {
      preference = preferences.find((p) => p.key === key);
    }
    if (!preference) {
      preference = { key, value: null, type: "" };
    }
    return matchPrefence(preference, this.preferenceOptions);
  }

  matchPrefenceDisplay(key: string) {
    const pr = this.matchPrefence(key);
    return pr instanceof Object ? pr.display : "";
  }

  get roleKeys() {
    return this.roleOpts.length > 0 ? this.roleOpts : defaultRoleKeys;
  }

  save() {
    this.roles = Object.entries(this.roleState).filter(entry => entry[1]).map(entry => entry[0]);
    const edited: any = {
      identifier: this.identifier,
        nickName: this.nickName,
        fullName: this.fullName,
        mode: this.mode,
        gender: this.gender,
        roles: this.roles,
        active: this.active,
        admin: this.user._id
    };
    let valid = notEmptyString(this.identifier, 5) && notEmptyString(this.nickName, 1) && notEmptyString(this.fullName, 2) && notEmptyString(this.mode, 1);
    if (notEmptyString(this.password) && this.editPassword) {
      this.password = this.password.trim();
      this.cpassword = this.cpassword.trim();
      if (this.password.length > 7 && this.password === this.cpassword) {
        edited.password = this.password;
        
      } else {
        valid = false;
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
      }, 1000)
    }
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
        const mediaIndex = profile.mediaItems.findIndex(mi => mi.filename === mediaItem.filename);
        if (mediaIndex >= 0) {
          deleteFile(this.current._id, mediaItem.filename).then(result => {
            if (result.valid) {
              this.toast(`The file ${result.item.filename} has been deleted`);
              this.profiles[index].mediaItems.splice(mediaIndex, 1);
              bus.$emit('remove-media-item', {
                user: this.current._id,
                index,
                mediaRef: result.item.filename
              })
            }
          })
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

  @Watch("current")
  changeCurrent(newVal) {
    if (newVal instanceof Object) {
      this.sync();
    }
  }
}
</script>
