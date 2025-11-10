export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxtjs/tailwindcss",
    "nuxt-lucide-icons",
    "@nuxt/image",
    "@pinia/nuxt",
    "@nuxtjs/device",
    // Убираем @nuxtjs/pwa
  ],

  app: {
    head: {
      title: "Mio Messenger",
      meta: [
        { name: "description", content: "Message input output" },
        { name: "theme-color", content: "#C71585" },
      ],
    },
  },

  runtimeConfig: {
    // Настройки для будущей интеграции с PostgreSQL
  },

  nitro: {
    devProxy: {
      host: "0.0.0.0",
    },
    serveStatic: true,
  },

  vite: {
    server: {
      allowedHosts: [
        "mio-messenger.com",
        "localhost",
        "127.0.0.1",
        "45.59.119.225",
      ],
      hmr: {
        clientPort: 3000,
      },
    },
  },
});
