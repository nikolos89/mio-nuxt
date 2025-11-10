// server/api/verify.post.ts
import { getRedis } from "../../utils/redis";
import { telegramService } from "../../utils/telegram";

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

    // Сохраняем пользователя
    await storage.setItem(`user:${phone}`, user);

    // Сохраняем в Redis
    const redis = getRedis();
    const userKey = `user:${user.id}`;

    try {
      await redis.hset(userKey, {
        id: user.id,
        phone: user.phone,
        name: user.phone,
        createdAt: Date.now().toString(),
        telegramChatId: codeData.telegramChatId || "",
      });
      console.log(
        `✅ User saved to Redis for search: ${user.phone} (${user.id})`
      );
    } catch (redisError) {
      console.error("❌ Failed to save user to Redis:", redisError);
    }

    // ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ В TELEGRAM О УСПЕШНОЙ АВТОРИЗАЦИИ
    if (codeData.telegramChatId) {
      try {
        await telegramService.sendAuthSuccess(codeData.telegramChatId, phone);
        console.log(
          `✅ Уведомление об авторизации отправлено в Telegram для ${phone}`
        );
      } catch (telegramError) {
        console.error(
          "❌ Ошибка отправки уведомления в Telegram:",
          telegramError
        );
      }
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
