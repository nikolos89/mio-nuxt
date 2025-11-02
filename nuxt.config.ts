export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "nuxt-lucide-icons", "@nuxt/image"],
  runtimeConfig: {
    // Настройки для будущей интеграции с PostgreSQL
  },

  nitro: {
    devProxy: {
      host: "0.0.0.0",
    },
    // Добавьте это для продакшена
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
