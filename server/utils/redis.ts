import Redis from "ioredis";

let redis;

export const getRedis = () => {
  if (!redis) {
    redis = new Redis({
      host: "127.0.0.1", // ← ИСПРАВЬ ЗДЕСЬ
      port: 6379,
      password: "",
      db: 0,
    });
  }
  return redis;
};
