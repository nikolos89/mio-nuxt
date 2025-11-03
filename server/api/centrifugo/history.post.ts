// server/api/centrifugo/history.post.ts
import { getRedis } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { method, params } = body;

  if (method !== "history") {
    throw createError({ statusCode: 400, message: "Method must be 'history'" });
  }

  const { channel, limit = 50 } = params || {};

  if (!channel) {
    throw createError({ statusCode: 400, message: "Channel is required" });
  }

  const redis = getRedis();
  const streamKey = `centrifugo.stream.${channel}`;

  try {
    const messages = await redis.xrevrange(streamKey, "+", "-", "COUNT", limit);

    const parsedMessages = messages.map(([id, fields]) => {
      const dataField = fields.find((f, i) => i % 2 === 0 && f === "data")
        ? fields[fields.indexOf("data") + 1]
        : null;

      let data = null;
      try {
        data = JSON.parse(dataField || "{}");
      } catch {
        data = { raw: dataField };
      }

      return {
        id,
        ...data.message,
      };
    });

    return {
      messages: parsedMessages.reverse(),
      count: parsedMessages.length,
    };
  } catch (err) {
    console.error("❌ Redis history load error:", err);
    throw createError({
      statusCode: 500,
      message: "Failed to load messages from Redis",
    });
  }
});
