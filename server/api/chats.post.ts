// server/api/chats.post.ts
import { getRedis } from "../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { chat, currentUserId, participants = [] } = body;

  if (!chat || !chat.id) {
    throw createError({ statusCode: 400, message: "Chat data is required" });
  }

  if (!currentUserId) {
    throw createError({ statusCode: 400, message: "User ID is required" });
  }

  const redis = getRedis();
  const chatKey = `chat:${chat.id}`;

  try {
    // Добавляем текущего пользователя в участники если его там нет
    const allParticipants = [...new Set([...participants, currentUserId])];

    // Сохраняем чат в Redis
    await redis.hset(chatKey, {
      id: chat.id,
      name: chat.name,
      userCount: allParticipants.length,
      lastMessage: chat.lastMessage || "Нет сообщений",
      createdAt: Date.now().toString(),
      participants: JSON.stringify(allParticipants),
    });

    console.log(`✅ Chat saved to Redis: ${chat.name} (${chat.id})`);

    // Добавляем чат каждому участнику в их список чатов (используем множество)
    for (const participantId of allParticipants) {
      const userChatsKey = `user:${participantId}:chats`;
      await redis.sadd(userChatsKey, chat.id);
      console.log(`✅ Chat ${chat.id} added to user ${participantId}`);
    }

    // Публикуем обновление через Centrifugo для всех участников
    try {
      const apiKey =
        "GGMnEv_F6rZjnMQqCousEmqhlOJm0LuodrHnUxfpJRxzqI41u4t-Tjze8Qpk3XFRIwiRd9SB-R_0pcCji1agVA";

      for (const participantId of allParticipants) {
        const centrifugoResponse = await $fetch("http://localhost:8000/api", {
          method: "POST",
          headers: {
            Authorization: `apikey ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: "publish",
            params: {
              channel: `user:${participantId}:chats`,
              data: {
                chat: {
                  id: chat.id,
                  name: chat.name,
                  userCount: allParticipants.length,
                  lastMessage: chat.lastMessage || "Нет сообщений",
                },
                action: "created",
                timestamp: Date.now(),
              },
            },
          }),
        });
        console.log(`✅ Chat update sent to user ${participantId}`);
      }
    } catch (centrifugoError) {
      console.error(
        "❌ Centrifugo publish failed, but chat saved:",
        centrifugoError
      );
    }

    return {
      success: true,
      chat: {
        ...chat,
        userCount: allParticipants.length,
        participants: allParticipants,
      },
    };
  } catch (error: any) {
    console.error("❌ Chat creation error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to create chat",
    });
  }
});
