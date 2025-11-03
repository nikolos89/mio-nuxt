// server/api/verify.post.ts
import { getRedis } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { phone, code } = body;

    // Валидация
    if (!phone || !code) {
      return {
        success: false,
        message: "Номер телефона и код обязательны",
      };
    }

    const storage = useStorage("auth");
    const codeData = await storage.getItem(`code:${phone}`);

    if (!codeData) {
      return {
        success: false,
        message: "Код не найден или устарел. Запросите новый код.",
      };
    }

    // Проверяем попытки
    if (codeData.attempts >= 3) {
      await storage.removeItem(`code:${phone}`);
      return {
        success: false,
        message: "Превышено количество попыток. Запросите новый код.",
      };
    }

    // Проверяем срок действия кода (10 минут)
    const codeAge = Date.now() - codeData.createdAt;
    if (codeAge > 10 * 60 * 1000) {
      await storage.removeItem(`code:${phone}`);
      return {
        success: false,
        message: "Код устарел. Запросите новый.",
      };
    }

    // Проверяем код
    if (codeData.code !== code) {
      // Увеличиваем счетчик попыток
      await storage.setItem(`code:${phone}`, {
        ...codeData,
        attempts: codeData.attempts + 1,
      });

      const remainingAttempts = 3 - (codeData.attempts + 1);
      return {
        success: false,
        message: `Неверный код. ${
          remainingAttempts > 0
            ? `Осталось попыток: ${remainingAttempts}`
            : "Превышено количество попыток"
        }`,
      };
    }

    // Код верный - создаем пользователя
    await storage.removeItem(`code:${phone}`);

    const user = {
      id: `user-${phone}`,
      phone: phone,
    };

    // Сохраняем пользователя в основном хранилище
    await storage.setItem(`user:${phone}`, user);

    // СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ В REDIS ДЛЯ ПОИСКА
    const redis = getRedis();
    const userKey = `user:${user.id}`;

    try {
      await redis.hset(userKey, {
        id: user.id,
        phone: user.phone,
        name: user.phone, // Используем номер телефона как имя по умолчанию
        createdAt: Date.now().toString(),
      });
      console.log(
        `✅ User saved to Redis for search: ${user.phone} (${user.id})`
      );
    } catch (redisError) {
      console.error("❌ Failed to save user to Redis:", redisError);
      // Продолжаем выполнение даже если Redis недоступен
    }

    return {
      success: true,
      user,
      message: "Успешная авторизация",
    };
  } catch (error: any) {
    console.error("Verify error:", error);
    return {
      success: false,
      message: "Ошибка сервера",
    };
  }
});
