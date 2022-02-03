<template>
  <div class="flag-wrapper" :class="wrapperClasses">
    <form class="edit-form flag-form">
      <div class="flags">
        <fieldset
          class="flag"
          v-for="(flag, ri) in editFlags"
          :key="[flag.key, ri].join('-')"
        >
          <b-field label="Prompt" class="horizontal">
            <b-input
              type="textarea"
              minlength="3"
              maxlength="512"
              :rows="2"
              placeholder="flag / prompt"
              v-model="editFlags[ri].prompt"
              @change.native.prevent="updateKey(editFlags[ri])"
            ></b-input>
          </b-field>
          <b-field class="key-field horizontal" label="Key">
            <b-input
              type="text"
              class="key"
              maxlength="48"
              size="16"
              v-model="editFlags[ri].key"
              :has-counter="false"
            />
          </b-field>
          <b-field class="type-field horizontal" label="Type">
            <b-select v-if="types.length > 0" v-model="editFlags[ri].type">
              <option
                v-for="opt in types"
                :value="opt.key"
                :key="['flag', opt.key, ri].join('-')"
              >
                {{ opt.name }}
              </option>
            </b-select>
            <b-switch v-model="editFlags[ri].isRating">Rating</b-switch>

            <b-input
              type="text"
              class="default-string-value"
              maxlength="16"
              size="16"
              v-model="editFlags[ri].defaultStringValue"
              :has-counter="false"
            />
          </b-field>
          <b-field
            v-if="isNumberType(editFlags[ri])"
            label="Range"
            class="rules horizontal"
          >
            <b-slider
              v-model="editFlags[ri].range"
              :min="-5"
              :max="10"
              :step="1"
              :ticks="true"
            >
              <template v-for="val in numSet">
                <b-slider-tick
                  :value="val"
                  :key="['slider-tick', val].join('-')"
                  >{{ val | majorTick }}</b-slider-tick
                >
              </template>
            </b-slider>
          </b-field>
          <b-field
            v-if="isStringType(editFlags[ri])"
            label="Options"
            class="options horizontal"
          >
            <b-input
              v-model="editFlag[ri].options"
              type="textarea"
              minlength="3"
              maxlength="512"
              :rows="4"
              placeholder="Options"
            >
            </b-input>
          </b-field>
        </fieldset>
      </div>
      <div class="actions bottom horizontal">
        <b-button
          type="is-success"
          size="is-large"
          icon-left="content-save"
          @click="submit"
          >Save</b-button
        >
        <b-button icon-left="plus" class="plus flag" @click="addFlag"
          >Add new flag</b-button
        >
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { sanitize, smartCastFloat, smartCastInt } from "@/api/converters";
import {
  fetchFlags,
} from "@/api/methods";
import { Component, Vue } from "vue-property-decorator";
import {
  Flag,
  PreferenceOption,
} from "../../api/interfaces";
import { isNumeric, notEmptyString } from "../../api/validators";
import { bus } from "../../main";

@Component({
  components: {},
  filters: {
    majorTick(val) {
      let str = "";
      if (isNumeric(val)) {
        str = Math.abs(val % 5) === 0 ? val.toString() : "";
      }
      return str;
    },
  },
})
export default class MemberFlagForm extends Vue {
  private flags: Array<any> = [];

  private editFlags: Array<Flag> = [];

  private coreFlags = [];

  private types = [
    { key: "boolean", name: "Yes/No", showOptions: true },
    { key: "string", name: "multiple choice (text)", showOptions: true },
    { key: "text", name: "custom text", showOptions: false },
    { key: "int", name: "Integer" },
    { key: "double", name: "Float (decimal fraction)" },
    {
      key: "array_string",
      name: "set of strings",
    },
    {
      key: "array_int",
      name: "Set of integers",
      showOptions: true,
    },
    {
      key: "array_double",
      name: "Set of float values",
      showOptions: true,
    },
  ];

  created() {
    this.sync();
    setTimeout(this.sync, 500);
    bus.$on("setting-saved", (result) => {
      const { key, data } = result;
      if (key === "flags") {
        this.sync();
        this.showMessage(`Saved flags`);
      }
    });
  }

  sync() {
    fetchFlags().then((flags) => {
      if (flags instanceof Array) {
        this.editFlags = flags.map((fl) => {
          const { key, type, isRating, defaultValue } = fl;
          let { range, options } = fl;
          const prompt = key.toString().replace(/_/g, " ");
          if (!(options instanceof Array)) {
            options = [];
          } else {
            options = options.map((op) => op.toString());
          }
          if (!(range instanceof Array)) {
            range = [1, 5];
          } else {
            range = range.map((v) => smartCastFloat(v));
          }
          let defaultStringValue = "";
          switch (type) {
            case "int":
            case "double":
              defaultStringValue = defaultValue.toString();
              break;
            case "boolean":
              defaultStringValue = defaultValue ? "true" : "false";
              break;
            default:
              defaultStringValue = defaultValue.toString();
              break;
          }
          return {
            key,
            prompt,
            type,
            isRating: isRating === true,
            defaultStringValue,
            options,
            range,
          };
        });
      }
    });
  }

  showMessage(message: string, duration = 2000) {
    bus.$emit("toast", {message, duration});
  }

  get wrapperClasses() {
    const cls = [];
    return cls;
  }

  matchType(flag: PreferenceOption) {
    const { type, options } = flag;
    let str = notEmptyString(type, 2) ? type.replace(/_/g, " ") : "";
    const tp = this.types.find((tp) => tp.key === type);
    if (tp) {
      str = tp.name;
    }
    if (options instanceof Array && options.length > 0) {
      str += " / " + options.length;
    }
    return str;
  }

  addFlag() {
    const defType = this.types.length > 0 ? this.types[0].key : "string";
    const item = {
      key: "_new",
      prompt: "",
      type: defType,
      options: [],
      rules: [],
    };
    this.editFlags.push(item);
  }

  mayDelete(key: string) {
    return this.coreFlags.includes(key) === false;
  }

  removeFlag(key) {
    if (this.mayDelete(key)) {
      const poi = this.editFlags.findIndex((po) => po.key === key);
      if (poi >= 0) {
        this.editFlags.splice(poi, 1);
        this.showMessage(`Removed flag. Save to confirm`);
      }
    }
  }
  submit() {
    const editFlags = this.editFlags
      .filter((fl) => fl instanceof Object && fl.key.length > 1)
      .map((fl) => {
        const {
          key,
          prompt,
          type,
          defaultStringValue,
          isRating,
          optionString,
        } = fl;
        let { range } = fl;
        if (range instanceof Array) {
          range = range.map(smartCastInt);
        } else {
          range = [];
        }
        let options = [];
        if (typeof optionString === "string") {
          options = optionString.split(/\n/).map((opt) => opt.trim());
        }
        let defaultValue = null;
        const simpleValue = notEmptyString(defaultStringValue)? defaultStringValue.trim().toLowerCase() : "";
        switch (type) {
          case "boolean":
            switch (simpleValue) {
              case "true":
              case "yes":
              case "1":
                defaultValue = true;
                break;
              default:
                defaultValue = false;
                break;
            }
            break;
          case "int":
          case "double":
            if (isNumeric(defaultStringValue)) {
              defaultValue = parseFloat(defaultStringValue);
            } else {
              defaultValue = 0;
            }
            break;
          default:
            defaultValue = simpleValue;
            break;
        }
        return {
          key,
          type,
          defaultValue,
          range,
          options,
          isRating: isRating === true,
        };
      });
    bus.$emit("save-setting", {
      key: "flags",
      value: editFlags,
      type: "flags",
    });
  }

  isNumberType(item) {
    if (item instanceof Object) {
      const { type } = item;
      switch (type) {
        case "int":
        case "double":
          return true;
        default:
          return false;
      }
    }
    return false;
  }

  isStringType(item) {
    if (item instanceof Object) {
      const { type } = item;
      switch (type) {
        case "string":
        case "array_string":
          return true;
        default:
          return false;
      }
    }
    return false;
  }

  showOptions(flag: PreferenceOption) {
    const typeRow = this.types.find((tp) => tp.key === flag.type);
    let valid = false;
    if (typeRow) {
      valid = typeRow.showOptions;
    }
    return valid;
  }

  updateKey(item) {
    if (item instanceof Object) {
      const { prompt } = item;
      if (prompt) {
        if (prompt.length > 1) {
          const txt = sanitize(prompt, "_", 48);
          const ck = item.key;
          if (ck.length < 24 || ck === "_new") {
            item.key = txt;
          }
        }
      }
    }
  }

  get numSet() {
    const nums = [];
    for (let i = -5; i <= 10; i++) {
      nums.push(i);
    }
    return nums;
  }
}
</script>
