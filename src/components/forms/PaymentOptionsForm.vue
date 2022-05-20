<template>
  <form class="edit-form pay-opts-form">
    <b-field v-if="enforcePaidLogicChecked" label="Enforce paid logic" class="row horizontal">
      <b-switch v-model="enforcePaidLogic" />
    </b-field>
    <fieldset
      v-for="(payOpt, ri) in editedPayOpts"
      :key="[payOpt, ri].join('-')"
      class="column"
    >
      <b-field label="Role" class="row">
        <b-select
          v-if="roleOptions.length > 0"
          v-model="editedPayOpts[ri].roleKey"
        >
          <option v-for="opt in roleOptions" :value="opt.key" :key="opt.key">{{
            opt.name
          }}</option>
        </b-select>
      </b-field>
      <b-field label="Payment key" class="row">
        <b-input
          type="text"
          class="key"
          maxlength="32"
          size="16"
          v-model="editedPayOpts[ri].subKey"
          :has-counter="false"
        />
      </b-field>
      <b-field label="Name" class="row">
        <b-input
          maxlength="256"
          size="48"
          class="name"
          type="text"
          v-model="editedPayOpts[ri].name"
          :has-counter="false"
        />
      </b-field>
      <b-field label="Period" class="row">
        <b-select v-if="periods.length > 0" v-model="editedPayOpts[ri].period">
          <option v-for="opt in periods" :value="opt.key" :key="opt.key">{{
            opt.name
          }}</option>
        </b-select>
      </b-field>
      <b-field label="Duration" class="row">
        <b-input
          maxlength="4"
          min="0"
          max="100"
          class="duration"
          type="number"
          step="1"
          v-model="editedPayOpts[ri].duration"
          :has-counter="false"
        />
      </b-field>
      <b-field label="Fallback" class="row">
        <b-switch type="is-info" v-model="editedPayOpts[ri].isFallback"
          >Default if other options are not applicable</b-switch
        >
      </b-field>
      <b-field label="Currency" class="row">
        <b-select v-if="currencies.length > 0" v-model="editedPayOpts[ri].curr">
          <option v-for="opt in currencies" :value="opt.key" :key="opt.key">{{
            opt.name
          }}</option>
        </b-select>
      </b-field>
      <b-field label="Amount" class="row">
        <b-input
          maxlength="4"
          min="0"
          max="100000"
          class="amount"
          type="number"
          step="0.01"
          v-model="editedPayOpts[ri].amount"
          :has-counter="false"
      /></b-field>
      <b-field label="Countries" class="row">
        <b-taginput
          v-model="editedPayOpts[ri].ccodes"
          ellipsis
          :data="filteredCountries"
          autocomplete
          :field="['editedPayOpts', ri, 'ccodes'].join('.')"
          icon="label"
          placeholder="Add countries"
          @typing="getFilteredCountries"
        >
          <template slot-scope="props">
            {{ matchCountryPrompt(props.option) }}
          </template>
          <template slot="empty">
            There are no countries
          </template>
        </b-taginput>
      </b-field>
      <b-icon icon="trash-can-outline" type="is-danger" @click.native="handleDelete(ri)" class="remove" />
    </fieldset>
    <div class="row horizontal actions">
      <b-button type="is-info" @click="addPO" icon-left="plus" size="is-large">Add payment plan</b-button>
      <b-button type="is-success" @click="submit" icon-left="content-save" size="is-large">Save</b-button>
    </div>
    
  </form>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import {
  Role,
  KeyName,
  PaymentOption,
  CountryOption,
} from "../../api/interfaces";
import { notEmptyString } from "../../api/validators";
import currencyValues from "../../api/mappings/currencies";
import { bus } from "../../main";
import { checkEnforcePaidLogic } from "@/api/methods";

@Component({
  components: {},
  filters: {},
})
export default class PaymentOptionsForm extends Vue {
  @Prop({ default: () => [] }) readonly paymentOptions: Array<PaymentOption>;
  @Prop({ default: () => [] }) readonly roles: Array<Role>;
  @Prop({ default: () => [] }) readonly countries: Array<CountryOption>;
  editedPayOpts: Array<PaymentOption> = [];

  filteredCountries: Array<string> = [];

  emptyPaymentOption: PaymentOption =  {
      key: "",
      name: "",
      curr: "",
      amount: 0,
      period: "months",
      isFallback: true,
      ccodes: [],
      duration: 3,
      maxRepeats: 0
  };

  enforcePaidLogic = false;

  enforcePaidLogicChecked = false;

  saving = false;

  created() {
    this.sync();
    setTimeout(this.sync, 500);
    bus.$on("setting-saved", (result) => {
      const { key, data } = result;
      if (key === "payments") {
        this.sync();
      }
    });
  }

  sync() {
    this.enforcePaidLogicChecked = false;
    if (this.roles instanceof Array && this.paymentOptions instanceof Array) {
      this.editedPayOpts = this.paymentOptions.map(this.mapPO);
      checkEnforcePaidLogic().then(result => {
        if (result.valid) {
          this.enforcePaidLogic = result.enforce === true;
          setTimeout(() => {
            this.enforcePaidLogicChecked = true;
          }, 500);
        }
      });
    }
  }

  mapPO(row = null) {
    const r = row instanceof Object ? row : {};
    const { key, name, curr, amount, period, duration, maxRepeats } = r;
    let { isFallback, ccodes } = r;
    const [roleKey, subKey] = key.split("__");
    if (!isFallback) {
      isFallback = false;
    }
    if (!ccodes) {
      ccodes = [];
    }
    return {
      key,
      name,
      curr,
      amount,
      period,
      isFallback,
      ccodes,
      duration,
      maxRepeats,
      roleKey,
      subKey,
    };
  }

  addPO() {
    this.editedPayOpts.push(this.mapPO(this.emptyPaymentOption));
  }

  handleDelete(index = 0) {
    const row = this.editedPayOpts[index];
    this.$buefy.dialog.confirm({
      message: `Are you sure you wish to delete the payment plan "${row.name}" (key: ${row.key})`,
      cancelText: "Keep",
      confirmText: "Delete",
      type: "is-danger",
      onConfirm: () => this.deletePO(index),
    });
  }

  deletePO(index = 0) {
    if (index >= 0 && index < this.editedPayOpts.length) {
      this.editedPayOpts.splice(index, 1);
      this.submit();
    }
  }

  submit() {
    const editedPayOpts = this.editedPayOpts
      .filter((po) => po.subKey.length > 3 && po.roleKey.length > 3)
      .map((r) => {
        const {
          name,
          curr,
          amount,
          period,
          isFallback,
          ccodes,
          duration,
          maxRepeats,
          roleKey,
          subKey,
        } = r;
        const key = [roleKey, subKey].join("__");
        return {
          key,
          name,
          curr,
          amount,
          period,
          isFallback,
          ccodes,
          duration,
          maxRepeats,
        };
      });
    bus.$emit("save-setting", { key: "payments", value: editedPayOpts });
    const numOpts = editedPayOpts.length;
    bus.$emit('toast', {
      message: `Saved ${numOpts} payment options`
    });
  }

  getFilteredCountries(text) {
    const rgx = notEmptyString(text, 1)
      ? new RegExp("\\b" + text.trim().toLowerCase(), "i")
      : /----/;
    this.filteredCountries = this.countries
      .filter((option) => {
        return (
          rgx.test(option.name) ||
          rgx.test(option.l3) ||
          rgx.test(option.fullName)
        );
      })
      .map((c) => {
        return c.l3;
      });
  }

  matchCountryPrompt(key: string) {
    let str = "";
    const ctry = this.countries.find((c) => c.l3 === key);
    if (ctry) {
      str = [ctry.l3, ctry.name].join(": ");
    }
    return str;
  }

  get roleOptions() {
    const nonPayRoles = [
      "superadmin",
      "admin",
      "moderator",
      "active",
      "blocked",
    ];
    const roleOpts = this.roles
      .map((r) => {
        return { key: r.key, name: r.name };
      })
      .filter((r) => nonPayRoles.includes(r.key) === false);
    return [{ key: "-", name: "---" }, ...roleOpts];
  }

  get periods(): Array<KeyName> {
    return [
      { key: "days", name: "Day" },
      { key: "month", name: "Month" },
      { key: "year", name: "Year" },
    ];
  }

  get currencies(): Array<KeyName> {
    return currencyValues;
  }

  @Watch('enforcePaidLogic')
  changeEnforcePaidLogic(newVal) {
    if ((newVal === true || newVal === false) && !this.saving && this.enforcePaidLogicChecked) {
      this.saving = true;
      bus.$emit("save-setting", { key: "members__enforce_paid_logic", value: newVal, type: 'boolean' });
      setTimeout(() => {
        this.saving = false;
      }, 1500);
    }
  }

}
</script>
