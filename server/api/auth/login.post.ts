// server/api/login.post.ts
import { getRedis } from "../../utils/redis";
import { telegramService } from "../../utils/telegram";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { phone, telegramChatId } = body; // Добавляем telegramChatId

    // Валидация номера телефона
    const phoneRegex = /^\d{10,15}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return {
        success: false,
        message:
          "Введите корректный номер телефона (только цифры, 10-15 символов)",
      };
    }

    // Генерируем 4-значный код
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Сохраняем код
    const storage = useStorage("auth");
    await storage.setItem(`code:${phone}`, {
      code,
      phone,
      createdAt: Date.now(),
      attempts: 0,
      telegramChatId: telegramChatId || null, // Сохраняем chatId если есть
    });

    console.log(`🔐 Код для ${phone}: ${code}`);

    // ОТПРАВЛЯЕМ КОД В TELEGRAM ЕСЛИ УКАЗАН chatId
    if (telegramChatId) {
      try {
        const telegramSent = await telegramService.sendAuthCode(
          telegramChatId,
          phone,
          code
        );

        if (telegramSent) {
          console.log(`✅ Код отправлен в Telegram для ${phone}`);
        } else {
          console.log(`⚠️ Не удалось отправить код в Telegram для ${phone}`);
        }
      } catch (telegramError) {
        console.error("❌ Ошибка отправки в Telegram:", telegramError);
        // Продолжаем выполнение даже если Telegram недоступен
      }
    }

    // Сохраняем пользователя в Redis
    const redis = getRedis();
    const userId = `user-${phone}`;

    try {
      await redis.hset(`user:${userId}`, {
        id: userId,
        phone: phone,
        name: phone,
        createdAt: Date.now().toString(),
        telegramChatId: telegramChatId || "",
      });
      console.log(`✅ User saved to Redis: ${phone} (${userId})`);
    } catch (redisError) {
      console.error("❌ Failed to save user to Redis:", redisError);
    }

    return {
      success: true,
      message: telegramChatId ? `Код отправлен` : `Код отправлен`,
      telegramSent: !!telegramChatId,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Ошибка сервера",
    };
  }
});
