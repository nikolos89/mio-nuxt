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
      JSON.stringify(data) // Сохраняем как JSON строку
    );

    console.log(`✅ Message saved to Redis: ${channel}, id: ${messageId}`);

    // Также отправляем в Centrifugo для реального времени
    const apiKey =
      "GGMnEv_F6rZjnMQqCousEmqhlOJm0LuodrHnUxfpJRxzqI41u4t-Tjze8Qpk3XFRIwiRd9SB-R_0pcCji1agVA";

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

    return {
      success: true,
      redisId: messageId,
      centrifugo: centrifugoResponse,
    };
  } catch (error: any) {
    console.error("❌ Publish error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to publish message",
    });
  }
});
