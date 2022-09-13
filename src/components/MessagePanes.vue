<template>
  <div class="main-view" :class="wrapperClasses">
    <b-tabs v-model="activeTab" :multiline="true">
      <b-tab-item label="Feedback">
        <FeedbackListView />
      </b-tab-item>
      <b-tab-item label="Messages">
        <MessageList />
      </b-tab-item>
    </b-tabs>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { UserState } from "../store/types";
import MessageList from "./MessageList.vue";
import FeedbackListView from "./FeedbackListView.vue";

@Component({
  components: {
    MessageList,
    FeedbackListView,
  },
})
export default class MessagePanes extends Vue {
  @State("user") user: UserState;
  activeTab = 0;

  toast(message = "") {
    this.$buefy.toast.open({
      duration: 3000,
      message,
      position: "is-bottom",
      type: "is-success",
    });
  }
}
</script>