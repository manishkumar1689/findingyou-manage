<template>
  <fragment>
    <div class="signs">
      <i
        v-for="sign in signs"
        :key="sign.key"
        class="symbol"
        :class="sign.icon"
      ></i>
    </div>
    <h1>FindingYou Administration</h1>
    <form class="user-form">
      <b-field label="Email">
        <b-input
          type="email"
          maxlength="128"
          v-model="email"
          :has-counter="false"
        />
      </b-field>
      <b-field label="Password">
        <b-input
          maxlength="20"
          minlength="8"
          type="password"
          v-model="password"
          :has-counter="false"
        />
      </b-field>
      <b-button type="is-success" @click="submit">Login</b-button>
      <p v-if="error" class="error">{{ errorMsg }}</p>
    </form>
  </fragment>
</template>

<script lang="ts">
import { Action } from "vuex-class";
import { authenticate } from "../api/methods";
import { Component, Vue } from "vue-property-decorator";
import { bus } from "../main";
import { saveEnabledLangsFromQueryString } from "@/store/local";

@Component({
  components: {},
  filters: {},
})
export default class Login extends Vue {
  @Action("assignUser", { namespace: "user" }) assignUser: any;
  email = "";
  password = "";
  error = false;
  errorMsg = "";

  created() {
    saveEnabledLangsFromQueryString(this.$ls);
  }

  submit() {
    this.error = false;
    this.errorMsg = "";

    if (this.email.length > 5 && this.password.length > 7) {
      authenticate(this.email, this.password).then((data) => {
        let success = false;
        if (data instanceof Object) {
          if (data.active) {
            if (data.roles) {
              success = this.handleUserData(data);
              bus.$emit("login", true);
            }
          }
        }
        if (!success) {
          this.error = true;
          if (!data.valid && data.msg) {
            this.errorMsg = data.msg;
          } else {
            this.errorMsg = "Please check your user name and password";
          }
        }
      });
    }
  }

  handleUserData(data: any): boolean {
    let roles: Array<string> = [];
    const adminRoles = ["superadmin", "admin", "moderator"];
    if (data.roles instanceof Array) {
      roles = data.roles.filter((r) => adminRoles.includes(r));
      this.assignUser(data);
      this.$ls.set("user", data);
      if (roles.length > 0 && roles.includes("blocked") === false) {
        const { path } = this.$route;
        const tgPath =
          roles.includes("superadmin") || roles.includes("admin")
            ? "/testing"
            : "/";
        if (path !== tgPath) {
          this.$router.push(tgPath);
        }
      }
    }
    return roles.length > 0;
  }

  get signs() {
    const offset = Math.floor(Math.random() * 12 * 0.999999);
    return Array.from(new Array(12)).map((v, i) => {
      const num = ((i + offset) % 12) + 1;
      return {
        num,
        icon: ["icon", "sign", num].join("-"),
        key: ["login", "sign", num, i].join("-"),
      };
    });
  }
}
</script>
