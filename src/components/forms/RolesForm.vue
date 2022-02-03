<template>
  <form class="edit-form lexeme-form">
    <fieldset v-for="(role, ri) in editedRoles" :key="[role.key, ri].join('-')" class="column" :class="roleClasses(role.key)">
      <b-field label="key" class="horizontal row">
        <b-input
          type="text"
          class="key"
          maxlength="32"
          size="16"
          v-model="editedRoles[ri].key"
          :has-counter="false"
          :disabled="isReservedRoleKey(role)"
        />
      </b-field>
      <b-field label="Name" class="horizontal row">
        <b-input
          maxlength="256"
          size="48"
          class="name"
          type="text"
          v-model="editedRoles[ri].name"
          :has-counter="false"
        />
      </b-field>
      <b-field label="Access">
        <b-switch type="is-info" v-model="editedRoles[ri].adminAccess">Admin Access</b-switch>
        <b-switch type="is-info" v-model="editedRoles[ri].appAccess">App access</b-switch>
      </b-field>
      <b-field label="Overrides / extends" class="horizontal row">
        <div class="flex-rows medium-small">
          <b-checkbox
            v-for="(roleOpt, pi) in overRoleOptions(editedRoles[ri].key)"
            :key="[roleOpt.key, ri, pi].join('-')"
            v-model="editedRoles[ri].overrides"
            :native-value="roleOpt.key"
            @click.native="handleOverride(ri, roleOpt.key)"
          >{{ roleOpt.name }}</b-checkbox>
        </div>
      </b-field>
      <div v-if="showPerms(role)" class="field row horizontal label-expandible">
        <label class="label" @click="toggleExpandPerms(role.key)">
          <b-icon :icon="expandRoleIcon(role.key)" />
          <span class="text">Permissions</span></label>
        <div v-if="isContracted(role.key)" class="preview-options row">
          {{rolePermList(role)}}
        </div>
        <div v-if="isExpanded(role.key)" class="column medium-small">
          <b-checkbox
            v-for="(perm, pi) in permKeyValues"
            :key="[perm.key, ri, pi].join('-')"
            v-model="editedRoles[ri].permissions"
            :native-value="perm.key"
          >{{ perm.name }}</b-checkbox>
        </div>
      </div>
      <b-field class="flex-rows" label="Payment options" v-if="hasPayOpts(role)">
        <ul class="horizontal">
          <li
            v-for="(payOpt, poi) in matchPayOpts(role)"
            :key="[payOpt.key, ri, poi].join('-')"
            :native-value="payOpt.key"
          >
            <strong class="name">{{ payOpt.name }}</strong>
            <span class="currency">
              {{
              [payOpt.amount, payOpt.curr].join(" ")
              }}
            </span>
          </li>
        </ul>
      </b-field>
      <b-icon v-if="mayDelete(role)" icon="trash-can-outline" type="is-danger" @click.native="handleDelete(ri)" class="remove" />
    </fieldset>
    <fieldset class="field horizontal row permission-limits label-expandible" :class="limitClasses">
      <label class="label" @click="toggleLimits">
        <b-icon :icon="expandLimitIcon" />
        <span class="text">Limits</span>
        </label>  
      <div class="rows">
        <template v-for="(limit, li) in limitRows">
          <b-field class="flex-rows" :key="limit.itemKey" :label="limit.label">
            <b-input v-model="limitValues[li].value" type="number" :min="0" />
          </b-field>
        </template>
      </div>
    </fieldset>
    <div class="row horizontal actions">
      <b-button type="is-info" @click="addRole" icon-left="plus" size="is-large">Add role / membership type</b-button>
      <b-button type="is-success" @click="submit" icon-left="content-save" size="is-large">Save</b-button>
    </div>
  </form>
</template>

<script lang="ts">
//import { Action } from "vuex-class";
import { toWords } from "@/api/helpers";
import { notEmptyString } from "@/api/validators";
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  Role,
  KeyName,
  PaymentOption,
} from "../../api/interfaces";
import defaultRoleKeys from "../../api/mappings/default-roles";
import { bus } from "../../main";

@Component({
  components: {},
  filters: {},
})
export default class RolesForm extends Vue {
  @Prop({ default: () => [] }) readonly roles: Array<Role>;
  @Prop({ default: () => [] }) readonly permissions: Array<KeyName>;
  @Prop({ default: () => [] }) readonly limits: Array<KeyName>;
  private editedRoles: Array<Role> = [];
  private selectedRoleKey = "";
  private limitValues: Array<KeyName> = [];
  private showLimits = false;

  created() {
    this.sync();
    setTimeout(this.sync, 1000);
  }

  sync() {
    if (this.roles instanceof Array) {
      this.editedRoles = this.roles.map(this.mapRole);
      this.limitValues = this.limits.filter(lm => lm instanceof Object);
    }
  }

  mapRole(row) {
    const { key, name, adminAccess, appAccess } = row;
    let { overrides, permissions } = row;
    if (!overrides) {
      overrides = [];
    }
    if (!permissions) {
      permissions = [];
    }
    return { key, name, overrides, adminAccess, appAccess, permissions };
  }

  matchPayOpts(role: Role): Array<PaymentOption> {
    let opts: Array<PaymentOption> = [];
    const mr = this.roles.find((r) => r.key === role.key);
    if (mr instanceof Object) {
      if (mr.payOpts) {
        opts = mr.payOpts;
      }
    }
    return opts;
  }

  filterRolePermKeys(role: Role, permKeys: string[] = []): string[] {
    const notExtendKeys = ['blocked', 'superadmin'];
    const extendingRoles = role.overrides instanceof Array? this.roles.filter(r => role.overrides.includes(r.key) && notExtendKeys.includes(r.key) === false) : [];
    if (extendingRoles.length > 0) {
      extendingRoles.forEach(r2 => {
        r2.permissions.forEach(pk => {
          if (permKeys.includes(pk) === false) {
            permKeys.push(pk);
          }
        });
        if (r2.overrides instanceof Array && r2.overrides.length > 0) {
          this.filterRolePermKeys(r2, permKeys);
        }
      });
    }
    return permKeys;
  }

  renderPermName(perm = null) {
    let str = "";
    if (perm instanceof Object) {
      const { key, name } = perm;
      if (notEmptyString(name)) {
        str = name.trim();
        if (name.indexOf('%d') >= 0) {
          const limit = this.limits.find(lm => lm.key === key);
          if (limit instanceof Object) {
            str = str.replace('%d', limit.value.toString());
          }
        }
      }
    }
    return str;
  }

  rolePerms(role: Role): KeyName[] {
    const permKeys = role.permissions;
    this.filterRolePermKeys(role, permKeys);
    return this.permissions.filter(p => permKeys.includes(p.key));
  }

  rolePermList(role: Role): string {
    return this.rolePerms(role).map(this.renderPermName).join(', ');
  }

  hasPayOpts(role: Role) {
    let valid = false;
    const po = this.matchPayOpts(role);
    if (po instanceof Array) {
      valid = po.length > 0;
    }
    return valid;
  }

  isReservedRoleKey(role) {
    return defaultRoleKeys.includes(role.key);
  }

  mayDelete(role) {
    return !this.isReservedRoleKey(role)? !this.hasPayOpts(role) : false;
  }

  showPerms(role) {
    return ['blocked'].includes(role.key) === false;
  }

  handleDelete(index = 0) {
    if (index >= 0 && index < this.editedRoles.length) {
    const row = this.editedRoles[index];
      this.$buefy.dialog.confirm({
        message: `Are you sure you wish to delete the role "${row.name}" (key: ${row.key})`,
        cancelText: "Keep",
        confirmText: "Delete",
        type: "is-danger",
        onConfirm: () => this.delete(index),
      });
    }
  }

  delete(index = 0) {
    if (index >= 0 && index < this.editedRoles.length) {
      this.editedRoles.splice(index, 1);
      this.submit();
    }
  }

  addRole() {
    const newRole = {
      adminAccess: false,
      appAccess: false,
      key: "",
      name: "",
      overrides: [],
      permissions: []
    }
    this.editedRoles.push(this.mapRole(newRole));
  }

  toggleExpandPerms(roleKey = "") {
    this.selectedRoleKey = roleKey === this.selectedRoleKey? "" : roleKey;
  }

  toggleLimits() {
    this.showLimits = !this.showLimits;
  }

  isExpanded(roleKey = "") {
    return roleKey === this.selectedRoleKey;
  }

  isContracted(roleKey = "") {
    
    return !this.isExpanded(roleKey);
  }

  expandIcon(expanded = false) {
    return expanded
      ? "arrow-collapse-vertical"
      : "arrow-expand-vertical";
  }

  expandRoleIcon(roleKey = "") {
    return this.expandIcon(this.isExpanded(roleKey));
  }

  get expandLimitIcon() {
    return this.expandIcon(this.showLimits);
  }

  overRoleOptions(currKey = "") {
    const notOverride = ['blocked','superadmin', currKey];
    return this.roleOptions.filter(role => notOverride.includes(role.key) === false)
  }

  roleClasses(roleKey = "") {
    const cls = [roleKey.replace(/_+/g,'-')];
    if (this.isExpanded(roleKey)) {
      cls.push('expanded');
    }
    return cls;
  }

  handleOverride(index = -1, roleKey = "") {
    if (index >= 0 && index < this.editedRoles.length) {
      const role = this.editedRoles[index];
      const active = role.overrides.includes(roleKey) === false;
      if (active) {
        const otherRole = this.editedRoles.find(r => r.key === role.key);
        if (otherRole instanceof Object) {
          if (otherRole.permissions instanceof Array) {
            otherRole.permissions.forEach(rk => {
              if (role.permissions.includes(rk) === false) {
                this.editedRoles[index].permissions.push(rk);
              }
            })
          }
        }
      }
    }
  }

  submit() {
    const editedRoles = this.editedRoles.filter(
      (r) => r.key.length > 3 && r.name.trim().length > 2
    );
    const numRoles = editedRoles.length;
    if (numRoles > 4) {
      bus.$emit("save-setting", {
        key: "roles",
        value: editedRoles,
      });
      bus.$emit('toast', {
        message: `Saved ${numRoles} roles.`
      });
      if (this.limitValues.length > 0) {
        setTimeout(() => {
          bus.$emit("save-setting", {
            key: "permission_limits",
            type: "lookup_set",
            value: this.limitValues,
          });
          this.$ls.set("permission-limits", this.limitValues);
        }, 2000);
      }
    }
  }

  get roleOptions() {
    const roleOpts = this.roles.map((r) => {
      return { key: r.key, name: r.name };
    });
    return [{ key: "all", name: "Override all" }, ...roleOpts];
  }

  get permKeyValues() {
    return this.permissions.map(perm => {
      return {
        key: perm.key,
        name: this.renderPermName(perm)
      }
    })
  }

  get limitRows() {
    return this.limitValues.map((limit, li) => {
      const { key, value, name} = limit;
      const perm = this.permissions.find(p => p.key === key);
      const text = notEmptyString(name)? name : toWords(key);
      const label = text.replace('%d', ['[',value,']'].join(''));
      return {
        key,
        value,
        itemKey: ['limit', li].join('-'),
        label
      }
    })
  }

  get limitClasses() {
    return this.showLimits ? ['open'] : ['closed'];
  }

}
</script>
<style lang="scss">
@import "@/styles/variables.scss";
#app .permission-limits {
  &.closed {
    .rows {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.5s ease-in-out, max-height 1s ease-in-out;
    }
  }
  &.open {
    .rows {
      max-height: 100em;
      overflow: visible;
      opacity: 1;
    }
  }
  .rows {
    text-align: left;
    .label {
      font-weight: normal;
      width: 20em;
      order: 2;
    }
    .field {
      text-align: left;
      .label {
        width: auto;
      }
      input {
        max-width: 5em;
        text-align: right;
        margin-right: 0.5em;
      }
    }
  }
}
</style>