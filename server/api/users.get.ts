// server/api/users.get.ts
import { getRedis } from "../utils/redis";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { phone, currentUserId } = query;

  if (!phone) {
    throw createError({
      statusCode: 400,
      message: "Phone parameter is required",
    });
  }

  if (!currentUserId) {
    throw createError({
      statusCode: 400,
      message: "Current user ID is required",
    });
  }

  const redis = getRedis();

  try {
    // Ищем пользователей по части номера телефона, исключая текущего пользователя
    const userKeys = await redis.keys("user:*");
    const foundUsers = [];

    for (const key of userKeys) {
      // Проверяем тип ключа перед использованием
      const keyType = await redis.type(key);

      if (keyType === "hash") {
        const userData = await redis.hgetall(key);
        if (
          userData &&
          userData.phone &&
          userData.phone.includes(phone as string) &&
          userData.id !== currentUserId // Исключаем текущего пользователя
        ) {
          foundUsers.push({
            id: userData.id,
            phone: userData.phone,
            name: userData.name || userData.phone,
          });
        }
      } else {
        console.log(`ℹ️ Skipping key ${key} of type ${keyType}`);
      }
    }

    console.log(`🔍 Found ${foundUsers.length} users for phone: ${phone}`);

    return {
      users: foundUsers,
    };
  } catch (error) {
    console.error("❌ Failed to search users:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to search users",
    });
  }
});
