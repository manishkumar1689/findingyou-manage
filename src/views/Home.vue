<template>
  <div class="home">
    <MainView />
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import MainView from "@/components/MainView.vue";

export default {
  name: "Home",
  components: {
    MainView
  }
};
</script>
