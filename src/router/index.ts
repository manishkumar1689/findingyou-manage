import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

function lazyLoad(view) {
  return () => import(`@/views/${view}.vue`);
}

const routes = [
  {
    path: "/",
    name: "Home",
    component: lazyLoad("Home"),
  },
  {
    path: "/tech/:tab?/:subTab?",
    name: "Files & planetary data",
    component: lazyLoad("Files"),
  },
  {
    path: "/dictionary/:category?/:key?",
    name: "Dictionary",
    component: lazyLoad("Dictionary"),
  },
  {
    path: "/snippets/:category?/:key?",
    name: "Snippets",
    component: lazyLoad("Snippets"),
  },
  {
    path: "/settings/:section?/:key?",
    name: "Settings",
    component: lazyLoad("Settings"),
  },
  {
    path: "/users/:section?/:key?",
    name: "Users",
    component: lazyLoad("Users"),
  },
  {
    path: "/charts/:filter?/:page?",
    name: "Chart List",
    component: lazyLoad("ChartsList"),
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;