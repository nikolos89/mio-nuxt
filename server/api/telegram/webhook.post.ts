// server/api/telegram/webhook.post.ts
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

        // Здесь можно добавить отправку сообщения обратно
        console.log(`👤 Новый пользователь бота: ${chat.id}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return { success: false };
  }
});
