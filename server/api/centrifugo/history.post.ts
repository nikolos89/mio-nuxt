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
      // Ищем поле "data" в массиве [key1, value1, key2, value2, ...]
      let dataField = null;
      for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] === "data") {
          dataField = fields[i + 1];
          break;
        }
      }

      let data = null;
      if (dataField) {
        try {
          data = JSON.parse(dataField);
        } catch (e) {
          console.error("❌ Failed to parse message data:", dataField, e);
          data = { error: "Invalid JSON", raw: dataField };
        }
      }

      // Возвращаем сообщение в правильном формате
      return {
        id,
        data: data || {}, // Все данные сообщения
        ...(data?.message || {}), // Распаковываем message если есть
      };
    });

    const validMessages = parsedMessages.filter(
      (msg) => msg && msg.id && msg.timestamp && !isNaN(msg.timestamp)
    );

    return {
      messages: validMessages.reverse(),
      count: validMessages.length,
    };
  } catch (err) {
    console.error("❌ Redis history load error:", err);
    throw createError({
      statusCode: 500,
      message: "Failed to load messages from Redis",
    });
  }
});
