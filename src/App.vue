<template>
  <div id="app" :class="wrapperClasses">
    <aside id="nav-aside">
      <nav v-if="isLoggedIn" id="nav">
        <ul class="menu">
          <li
            v-for="item in mainMenu"
            :key="item.key"
            :class="item.classNames"
            @click="linkSelected"
          >
            <template v-if="item.reload">
              <a :href="item.to" class="reload">{{item.label}}</a>
            </template>
            <template v-else>
              <template v-if="item.hasIcon">
                <span class="action" @click="handleIconClick(item)">
                  <b-icon :icon="item.icon" size="is-small"></b-icon>
                </span>
              </template>
              <router-link :to="item.to" :active="item.active">{{
                item.label
              }}</router-link>
            </template>
          </li>
        </ul>
      </nav>
      <div v-if="isLoggedIn" class="actions top">
        <div class="refresh" @click="clearCaches" title="Clear caches">
          <b-icon icon="refresh"></b-icon>
        </div>
        <b-tooltip class="logout-trigger" :label="loggedInHint" position="is-bottom">
          <b-icon icon="logout" @click.native="logout" ></b-icon>
        </b-tooltip>
        <b-tooltip class="web-info info-widget" :label="webInfo.label" position="is-bottom">
          <b-icon icon="web" :class="webInfo.className"></b-icon>
        </b-tooltip>
        <div class="clock-info info-widget" position="is-bottom" :multilined="true">
          <b-icon icon="clock"></b-icon>
          <dl class="inner">
            <template v-for="item in dateInfo">
              <template>
                <dt :key="item.key">{{item.label}}</dt>
                <dd :key="item.key2">{{item.value}}</dd>
              </template>
            </template>
          </dl>
        </div>
      </div>
      <footer class="side-footer">
        <p>
          <span class="copy">{{copyInfo}}</span>
          <em>{{webInfoLabel}}</em>
        </p>
      </footer>
    </aside>
    <main id="main" :class="mainClassNames">
      <template v-if="isLoggedIn">
        <router-view />
      </template>
      <template v-else>
        <Login />
      </template>
    </main>
    <div class="toggle-main-nav" @click="toggleMainNav">
      <b-icon icon="dots-vertical" />
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State, Action } from "vuex-class";
import { fetchLexemes } from "./api/methods";
import Login from "./components/Login.vue";
import { bus } from "./main";
import { UserState } from "./store/types";
import { notEmptyString } from "./api/validators";
import { currentJulianDate, JulDate } from "./api/julian-date";
import { decPlaces } from "./api/converters";
const nsUser = "user";
const nsDict = "dictionary";
@Component({
  components: {
    Login,
  },
})
export default class App extends Vue {
  @State("user") user: UserState;
  @Action("assignUser", { namespace: nsUser }) assignUser: any;
  @Action("assignItems", { namespace: nsDict }) assignItems: any;
  isLoggedIn = false;

  private showMainNav = false;

  private version = 0.61;

  private julianDate = currentJulianDate();

  private mainMenuItems = [
    { to: "/", label: "Home" },
    { to: "/astro/ui", label: "Astro", reload: true },
    { to: "/astro/compatibility", label: "Compatibility Protocols", reload: true },
    { to: "/users", label: "Users" },
    { to: "/dictionary", label: "Dictionary", icon: "book-alphabet" },
    { to: "/snippets", label: "Snippets" },
    { to: "/messages", label: "Messages" },
    { to: "/settings", label: "Settings" },
    { to: "/charts", label: "Chart List" },
    { to: "/tech", label: "Files & Planetary Stations" },
    { to: "/ip-whitelist", label: "IP Whitelist" },
  ];

  created() {
    const storedVersion = this.$ls.get("version");
    const currVer = storedVersion ? storedVersion : 0;
    if (currVer !== this.version) {
      this.clearCaches();
      setTimeout(() => {
        this.$ls.set("version", this.version);
      }, 1000);
    }
    this.checkUser(true);
    this.loadDictionary();
    bus.$on("login", (ok: boolean) => {
      if (ok) {
        this.checkUser();
      }
    });
    bus.$on("show-chart-sidebar", (active: boolean) => {
      if (active) {
        this.showMainNav = false;
      }
    });
    bus.$on("escape", () => {
      this.showMainNav = false;
    });

    window.addEventListener("keydown", this.handleKeyDown);

    this.julianDate = currentJulianDate();
  }

  checkUser(assignNewUser = false) {
    const user = this.$ls.get("user");
    let valid = false;
    if (user instanceof Object) {
      const { active } = user;
      valid = active === true;
      if (valid) {
        this.isLoggedIn = true;
        if (assignNewUser) {
          this.assignUser(user);
        }
      }
    }
    return valid;
  }

  loadDictionary() {
    const lexItems = this.$ls.get("dictionary");
    if (lexItems instanceof Array) {
      this.assignItems(lexItems);
    } else {
      fetchLexemes("").then((data) => {
        if (data.valid) {
          if (data.items instanceof Array) {
            this.assignItems(data.items);
            this.$ls.set("dictionary", data.items);
          }
        }
      });
    }
  }

  logout() {
    this.$ls.remove("user");
    this.isLoggedIn = false;
    const { path } = this.$route;
    if (path !== "/") {
      this.$router.push("/");
    }
  }

  handleKeyDown(e) {
    switch (e.which) {
      case 37:
        bus.$emit("prev", true);
        break;
      case 39:
        bus.$emit("next", true);
        break;
      case 27:
        bus.$emit("escape", true);
        break;
    }
  }

  toggleMainNav() {
    this.showMainNav = !this.showMainNav;
  }

  clearCaches(key = null) {
    if (window.localStorage instanceof Object) {
      const keys = Object.keys(window.localStorage).map((k) =>
        k.replace(/^fy_/, "")
      );
      const hasFilter = notEmptyString(key);
      keys
        .filter((k) => !hasFilter || key === k)
        .forEach((k) => {
          switch (k) {
            case "user":
            case "c1":
            case "c2":
            case "selected-pc":
              break;
            default:
              this.$ls.remove(k);
              break;
          }
        });
      if (!hasFilter) {
        bus.$emit("fd", true);
      }
    }
  }

  linkSelected(e) {
    if (e.target instanceof HTMLElement) {
      const { tagName } = e.target;
      if (tagName.toLowerCase() === "a") {
        this.showMainNav = false;
      }
    }
  }

  get loggedInHint(): string {
    let str = "";
    if (this.isLoggedIn) {
      str = `Logged in as ${this.user.fullName}`;
    }
    return str;
  }

  get webInfo() {
    const {host} = window.location;
    return {
      label: ['Host', host].join(': '),
      className: host.split(".").shift().split(":").shift(),
    };
  }

  get webInfoLabel() {
    return this.webInfo.label;
  }

  get copyInfo(): string {
    const year = new Date().getFullYear();
    return `© FindingYou ${year}`;
  }

  get mainMenu() {
    const toParts = (localPath: string) =>
      localPath.length > 2 ? localPath.substring(1).split("/") : ["home"];
    const { path } = this.$route;
    const pathSection = toParts(path).shift();
    return this.mainMenuItems.map((mi) => {
      const parts = toParts(mi.to);
      const refName = parts.join("--");
      const key = ["menu-item", refName].join("-");
      const section = parts.shift();
      const active = pathSection === section;
      const classNames = [section];
      const keys = Object.keys(mi);
      const icon = keys.includes("icon") ? mi.icon : "";
      const hasIcon = icon.length > 1;
      const reload = keys.includes('reload') ? mi.reload : false;
      if (section !== refName) {
        classNames.push(refName);
      }
      if (active) {
        classNames.push("active");
      } else if (reload) {
        classNames.push("astro");
      }
      return { ...mi, key, active, classNames, icon, hasIcon, refName, reload };
    });
  }

  get wrapperClasses() {
    const cls = [];
    if (this.showMainNav) {
      cls.push("show-main-nav");
    }
    return cls;
  }

  get mainClassNames() {
    const { path } = this.$route;
    const parts = path.length > 2 ? path.substring(1).split("/") : ["home"];
    const first = parts[0];
    const cls = [first];
    if (parts.length > 1) {
      cls.push(parts.slice(0, 2).join("--"));
    }
    if (parts.length > 2) {
      cls.push(parts.slice(0, 3).join("--"));
    }
    if (!this.isLoggedIn) {
      cls.push('show-login');
      cls.push('home');
    }
    return cls;
  }

  get dateInfo() {
    const items = [];
    if (this.julianDate instanceof JulDate) {
      items.push({ label: "Julian day", value: decPlaces(this.julianDate.jd, 4)});
      items.push({
        label: "Date/time",
        value: this.julianDate.dmyHm,
      });
      items.push({
        label: "Timezone", 
        value: this.julianDate.offsetHrs,
      });
    }
    return items.map((item, index) => {
      const key = ['date-info', index].join('-');
      const key2 = ['date-info-2', index].join('-');
      return {...item, key, key2};
    });
  }

  handleIconClick(item) {
    switch (item.refName) {
      case "dictionary":
        this.clearCaches("dictionary");
        setTimeout(this.loadDictionary, 500);
        setTimeout(() => {
          bus.$emit("reload", true);
        }, 2500);
        break;
    }
  }
}
</script>
<style lang="scss">
@import "./styles/app.scss";
</style>
