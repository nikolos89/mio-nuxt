// server/api/chats.get.ts
import { getRedis } from "../utils/redis";

export default defineEventHandler(async (event) => {
  const redis = getRedis();

  try {
    // Получаем все чаты из Redis
    const chatKeys = await redis.keys("chat:list:*");
    const chats = [];

    // Для каждого ключа чата получаем данные
    for (const key of chatKeys) {
      const chatData = await redis.hgetall(key);
      if (chatData && chatData.id) {
        chats.push({
          id: chatData.id,
          name: chatData.name || `Чат ${chatData.id}`,
          userCount: parseInt(chatData.userCount) || 1,
          lastMessage: chatData.lastMessage || "Нет сообщений",
          createdAt: chatData.createdAt || Date.now().toString(),
        });
      }
    }

    // Сортируем по дате создания (новые сверху)
    chats.sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));

    console.log(`✅ Loaded ${chats.length} chats from Redis`);

    return {
      chats: chats.length > 0 ? chats : getDefaultChats(),
    };
  } catch (error) {
    console.error("❌ Failed to load chats from Redis:", error);
    // Возвращаем тестовые данные при ошибке
    return {
      chats: getDefaultChats(),
    };
  }
});

// Функция для получения чатов по умолчанию
function getDefaultChats() {
  return [
    {
      id: "1111",
      name: "Общий чат",
      userCount: 3,
      lastMessage: "Добро пожаловать!",
    },
    {
      id: "2222",
      name: "Техподдержка",
      userCount: 2,
      lastMessage: "Чем можем помочь?",
    },
    {
      id: "3333",
      name: "Разработка",
      userCount: 5,
      lastMessage: "Обсуждаем новые фичи",
    },
  ];
}
