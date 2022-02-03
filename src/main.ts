import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import Buefy from "buefy";
import Storage from "vue-ls";
import VueScrollTo from "vue-scrollto";
import "buefy/dist/buefy.css";
import "vue-birth-datepicker/dist/vueBirthDatepicker.css";
import Fragment from "vue-fragment";

const options = {
  namespace: "fy_",
  name: "ls",
  storage: "local",
};

Vue.use(Storage, options);

export const bus = new Vue();

Vue.use(Buefy);

Vue.use(Fragment.Plugin);

Vue.use(VueScrollTo, {
  container: "body",
  duration: 500,
  easing: "ease",
  offset: 0,
  force: true,
  cancelable: true,
  onStart: false,
  onDone: false,
  onCancel: false,
  x: false,
  y: true,
});

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
