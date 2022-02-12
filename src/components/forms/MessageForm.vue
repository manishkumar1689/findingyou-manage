<template>
  <form class="edit-form snippet-form">
    <div class="close" @click="close">
      <b-icon icon="close" size="is-large" />
    </div>
    <b-field label="Key" class="horizontal row">
      <b-input
        type="text"
        maxlength="64"
        v-model="key"
        :has-counter="false"
        :disabled="true"
      />
    </b-field>
    
      <fieldset class="version" v-for="(item, itemIndex) in items" :key="['msg-version', itemIndex].join('-')">
        
          <b-field
            class="horizontal lang with-locale"
            label="Language"
          >
            <b-select v-model="item.langCode">
              <option
                v-for="opt in langOptions"
                :value="opt.key"
                :key="['translation', itemIndex, opt.key].join('-')"
                >{{ opt.name }}</option
              >
            </b-select>
            <b-input
              size="2"
              maxlength="2"
              pattern="[A-Z][A-Z]"
              type="text"
              class="code"
              title="Locale code, e.g. US, MX, IN, BR etc."
              v-model="item.locale"
              :has-counter="false"
            />
          </b-field>
          <b-field class="horizontal subject" label="Subject">
            <b-input
              size="128"
              type="text"
              class="text"
              v-model="item.subject"
              :has-counter="false"
            />
          </b-field>
          <b-field
            class="horizontal body" label="Body"
          >
            <vue-editor
          :id="['text-editor', itemIndex].join('-')"
          :editorToolbar="customToolbar"
          v-model="item.body"
      ></vue-editor>
          </b-field>
          <b-field class="horizontal from-mail" label="From name">
            <b-input
              size="40"
              type="text"
              class="text"
              v-model="item.fromName"
              :has-counter="false"
            />
          </b-field>
          <b-field class="horizontal from-mail" label="From email">
            <b-input
              size="64"
              type="text"
              class="email"
              v-model="item.fromMail"
              :has-counter="false"
            />
          </b-field>
      </fieldset>
    <ol v-if="hasErrors" class="errors">
      <li v-for="(error, ei) in errors" :key="['error', ei].join('-')">
        {{ error }}
      </li>
    </ol>
    <b-button type="is-success" @click="submit" icon-left="content-save-outline"
      >Save</b-button>
  </form>
</template>

<script lang="ts">
//import { Action } from "vuex-class";
import { VueEditor } from "vue2-editor";
import { saveMessageSet, retrieveLangOpts, buildEnabledLangOptions } from "../../api/methods";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { LanguageItem } from "../../api/interfaces";
import { Message, MessageSet } from "../../api/schemas";
import { bus } from "../../main";
import { customToolbar } from "@/api/wysiwyg";

@Component({
  components: {
    VueEditor
  },
  filters: {},
})
export default class MessageForm extends Vue {
  @Prop({ default: () => new MessageSet() }) readonly messageSet: MessageSet;

  key = "";
  items: Message[] = [];
  langOpts: Array<LanguageItem> = [];
  extraVersions = 0;
  errors: string[] = [];

  created() {
    this.sync();
  }

  sync() {
    const { key } = this.messageSet;
    this.key = key;
    if (this.messageSet.items.length > 0) {
      this.items =  this.messageSet.items.map(item => new Message(item));
    }
    this.loadLangOpts();
  }

  loadLangOpts() {
    retrieveLangOpts().then(items => {
      this.langOpts = items;
    })
  }

  get langOptions() {
    return buildEnabledLangOptions(this.langOpts);
  }

  get customToolbar() {
    return customToolbar;
  }

  addTranslation() {
    this.extraVersions++;
  }

  mayRemoveTranslation(row: Message, index: number) {
    const lastIndex = this.items.length - 1;
    return index > 0 && (index < lastIndex || row.subject.trim().length < 0);
  }

  removeTranslation(index: number) {
    if (index > 0 && index < this.items.length) {
      this.items.splice(index, 1);
      if (this.extraVersions > 1) {
        this.extraVersions--;
      }
    }
  }

  rowClassNames(row, index = 0) {
    const cls = [];
    if (!row.show && index > 0) {
      cls.push('hide')
    }
    return [];
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  @Watch("messageSet")
  changesnippet() {
    this.sync();
  }

  @Watch("extraVersions")
  changeExtraVersions(newVal) {
    const numCurrentversions = this.messageSet.items.length;
    const numEditableversions = this.items.length;
    const newTrs = numEditableversions - numCurrentversions;
    const extra = newVal - newTrs;
    if (extra > 0) {
      for (let i = 0; i < extra; i++) {
        this.items.push(new Message());
      }
    }
  }

  close() {
    bus.$emit('message-close', true);
  }

  submit() {
    this.save(true);
  }

  save(close = false) {
    this.errors = [];
    saveMessageSet(new MessageSet({key: this.key, items: this.items})).then(rsp => {
      if (rsp.valid) {
        bus.$emit('message-set-saved', rsp.result);
        if (close) {
          setTimeout(this.close, 500);
        }
      }
    });    
  }
}
</script>
