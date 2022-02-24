<template>
  <IpWhitelist />
</template>
<script lang="ts">
// @ is an alias to /src
import IpWhitelist from "@/components/tables/IpWhitelist.vue";

export default {
  name: "IpWhitelistView",
  components: {
    IpWhitelist,
  },
};
</script>
