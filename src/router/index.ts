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
    path: "/messages/:section?/:key?",
    name: "Messages",
    component: lazyLoad("Messages"),
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
    path: "/user-blocks",
    name: "UserBlocks",
    component: lazyLoad("BlockListView"),
  },
  {
    path: "/reported-users",
    name: "ReportedUsers",
    component: lazyLoad("ReportedUserListView"),
  },
  {
    path: "/charts/:filter?/:page?",
    name: "Chart List",
    component: lazyLoad("ChartsList"),
  },
  {
    path: "/ip-whitelist",
    name: "IP Whitelist",
    component: lazyLoad("IpWhitelistView"),
  },
];

const router = new VueRouter({
  mode: "history",
  base: "/manage/",
  routes,
});

export default router;
