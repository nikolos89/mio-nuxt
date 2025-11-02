import Redis from "ioredis";

let redis;

export const getRedis = () => {
  if (!redis) {
    redis = new Redis({
      host: "45.59.119.225", // IP твоего сервера с Redis
      port: 6379,
      password: "OsMQOwwKs4Q1SkvZ_7Sx0Q",
      db: 0,
    });
  }
  return redis;
};
