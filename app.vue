<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Mio Messenger",
  meta: [
    { name: "description", content: "Modern messaging application" },
    { name: "theme-color", content: "#C71585" },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, user-scalable=no",
    },
  ],
  link: [
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "manifest", href: "/manifest.json" },
    { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
  ],
  htmlAttrs: {
    lang: "ru",
  },
});
</script>
