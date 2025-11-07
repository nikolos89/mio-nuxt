<script setup lang="ts">
import ChatDesktop from "@/components/ChatDesktop.vue";
import ChatTablet from "@/components/ChatTablet.vue";
import ChatMobile from "@/components/ChatMobile.vue";

const { isMobile } = useDevice();
</script>

<template>
  <div>
    <ChatMobile v-if="$device.isMobile" />
    <ChatTablet v-else-if="$device.isTablet" />
    <ChatDesktop v-else />
  </div>
</template>
