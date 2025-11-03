// server/api/centrifugo/publish.post.ts
import { getRedis } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { channel, data } = body;

  if (!channel) {
    throw createError({ statusCode: 400, message: "Channel is required" });
  }

  const redis = getRedis();
  const streamKey = `centrifugo.stream.${channel}`;

  try {
    // Сохраняем сообщение в Redis
    const messageId = await redis.xadd(
      streamKey,
      "*",
      "data",
      JSON.stringify(data)
    );

    console.log(`✅ Message saved to Redis: ${channel}, id: ${messageId}`);

    // Пробуем отправить в Centrifugo, но не блокируем из-за ошибок
    try {
      const apiKey =
        "GGMnEv_F6rZjnMQqCousEmqhlOJm0LuodrHnUxfpJRxzqI41u4t-Tjze8Qpk3XFRIwiRd9SB-R_0pcCji1agVA";

      // Используй тот же хост что и для WebSocket
      const centrifugoResponse = await $fetch("http://localhost:8000/api", {
        method: "POST",
        headers: {
          Authorization: `apikey ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "publish",
          params: {
            channel: channel,
            data: data,
          },
        }),
      });

      console.log("✅ Centrifugo publish success:", centrifugoResponse);

      return {
        success: true,
        redisId: messageId,
        centrifugo: centrifugoResponse,
      };
    } catch (centrifugoError) {
      console.error(
        "❌ Centrifugo publish failed, but message saved to Redis:",
        centrifugoError
      );

      // Все равно возвращаем успех, т.к. сообщение сохранено в Redis
      return {
        success: true,
        redisId: messageId,
        centrifugo: { error: "Centrifugo unavailable, but message saved" },
      };
    }
  } catch (error: any) {
    console.error("❌ Publish error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to publish message",
    });
  }
});
