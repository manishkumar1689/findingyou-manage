<template>
  <div class="home">
    <MainView />
  </div>
</template>

<script>
// @ is an alias to /src
import MainView from "@/components/MainView.vue";

export default {
  name: "Home",
  components: {
    MainView
  }
};
</script>
