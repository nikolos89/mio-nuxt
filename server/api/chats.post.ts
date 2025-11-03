// server/api/chats.post.ts
import { getRedis } from "../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { chat } = body;

  if (!chat || !chat.id) {
    throw createError({ statusCode: 400, message: "Chat data is required" });
  }

  const redis = getRedis();
  const chatKey = `chat:list:${chat.id}`;

  try {
    // Сохраняем чат в Redis
    await redis.hset(chatKey, {
      id: chat.id,
      name: chat.name,
      userCount: chat.userCount || 1,
      lastMessage: chat.lastMessage || "Нет сообщений",
      createdAt: Date.now().toString(),
    });

    console.log(`✅ Chat saved to Redis: ${chat.name} (${chat.id})`);

    // Публикуем обновление через Centrifugo
    try {
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
            channel: "chats:updates",
            data: {
              chat: {
                id: chat.id,
                name: chat.name,
                userCount: chat.userCount || 1,
                lastMessage: chat.lastMessage || "Нет сообщений",
              },
              action: "created", // Добавляем действие
              timestamp: Date.now(),
            },
          },
        }),
      });

      console.log(
        "✅ Chat update published to Centrifugo:",
        centrifugoResponse
      );
    } catch (centrifugoError) {
      console.error(
        "❌ Centrifugo publish failed, but chat saved:",
        centrifugoError
      );
    }

    return {
      success: true,
      chat: chat,
    };
  } catch (error: any) {
    console.error("❌ Chat creation error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to create chat",
    });
  }
});
