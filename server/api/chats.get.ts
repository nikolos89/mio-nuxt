// server/api/chats.get.ts
import { getRedis } from "../utils/redis";

export default defineEventHandler(async (event) => {
  // Получаем ID текущего пользователя из запроса
  const query = getQuery(event);
  const currentUserId = query.userId as string;

  if (!currentUserId) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  const redis = getRedis();

  try {
    // Ищем чаты конкретного пользователя
    const userChatsKey = `user:${currentUserId}:chats`;
    const chatIds = await redis.smembers(userChatsKey);

    const chats = [];

    // Для каждого ID чата получаем данные
    for (const chatId of chatIds) {
      const chatKey = `chat:${chatId}`;
      const chatData = await redis.hgetall(chatKey);

      if (chatData && chatData.id) {
        chats.push({
          id: chatData.id,
          name: chatData.name || `Чат ${chatData.id}`,
          userCount: parseInt(chatData.userCount) || 1,
          lastMessage: chatData.lastMessage || "Нет сообщений",
          createdAt: chatData.createdAt || Date.now().toString(),
          participants: chatData.participants
            ? JSON.parse(chatData.participants)
            : [],
        });
      }
    }

    // Сортируем по дате создания (новые сверху)
    chats.sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));

    console.log(`✅ Loaded ${chats.length} chats for user ${currentUserId}`);

    return {
      chats: chats,
    };
  } catch (error) {
    console.error("❌ Failed to load user chats from Redis:", error);
    return {
      chats: [],
    };
  }
});
