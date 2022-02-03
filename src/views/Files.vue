<template>
  <div class="files tech-data">
    <TechPanes />
  </div>
</template>

<script>
// @ is an alias to /src
import TechPanes from "@/components/TechPanes.vue";

export default {
  name: "Files",
  components: {
    TechPanes,
  },
};
</script>
