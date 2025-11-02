module.exports = {
  apps: [
    {
      name: "mio-nuxt", // название вашего приложения
      port: "3000", // порт для приложения
      exec_mode: "cluster", // режим кластера
      instances: "max", // использовать максимальное количество ядер
      script: "./.output/server/index.mjs", // путь к сбилдированному файлу

      // Переменные окружения
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NITRO_HOST: "0.0.0.0",
        NITRO_PORT: 3000,
        HOST: "0.0.0.0",
      },

      // Логи
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
