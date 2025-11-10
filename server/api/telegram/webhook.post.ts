// server/api/telegram/webhook.post.ts
import { telegramService } from "../../utils/telegram";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Обработка входящих сообщений от Telegram
    if (body.message) {
      const { chat, text } = body.message;

      // Простой эхо-бот для тестирования
      if (text === "/start") {
        const welcomeMessage = `
🤖 <b>Mio Messenger Bot</b>

Отправляйте код подтверждения для входа в приложение Mio Messenger.

Для получения кода:
1. Введите номер телефона в приложении
2. Укажите этот Chat ID: <code>${chat.id}</code>
3. Получите код здесь

🔒 Ваш Chat ID: <code>${chat.id}</code>
        `.trim();

        // 👈 ОТПРАВЛЯЕМ СООБЩЕНИЕ ОБРАТНО ПОЛЬЗОВАТЕЛЮ
        await telegramService.sendMessage({
          chat_id: chat.id,
          text: welcomeMessage,
          parse_mode: "HTML",
        });

        console.log(`👤 Новый пользователь бота: ${chat.id}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return { success: false };
  }
});
// https://api.telegram.org/bot8432097268:AAHuxIyTNqf6SyPiBPt0-LSAb8uuZOzgnHQ/setWebhook?url=https://mio-messenger.com/api/telegram/webhook
