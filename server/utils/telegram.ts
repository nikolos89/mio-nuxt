// utils/telegram.ts

const TELEGRAM_BOT_TOKEN = "8432097268:AAHuxIyTNqf6SyPiBPt0-LSAb8uuZOzgnHQ";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface SendMessageParams {
  chat_id: string | number;
  text: string;
  parse_mode?: string;
}

export class TelegramService {
  private static instance: TelegramService;

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  async sendMessage(params: SendMessageParams): Promise<boolean> {
    try {
      const response = await $fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: params.chat_id,
          text: params.text,
          parse_mode: params.parse_mode || "HTML",
        }),
      });

      console.log("✅ Telegram message sent successfully");
      return true;
    } catch (error: any) {
      console.error("❌ Failed to send Telegram message:", error);
      return false;
    }
  }

  // Метод для отправки кода аутентификации
  async sendAuthCode(
    chatId: string | number,
    phone: string,
    code: string
  ): Promise<boolean> {
    const message = `
🔐 <b>Код подтверждения для Mio Messenger</b>

📱 Номер телефона: <code>${phone}</code>
🔢 Код подтверждения: <code>${code}</code>

⏱ Код действителен 10 минут
⚠️ Никому не сообщайте этот код
    `.trim();

    return await this.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  }

  // Метод для отправки уведомления о успешной авторизации
  async sendAuthSuccess(
    chatId: string | number,
    phone: string
  ): Promise<boolean> {
    const message = `
✅ <b>Успешная авторизация в Mio Messenger</b>

📱 Номер телефона: <code>${phone}</code>
🕐 Время: ${new Date().toLocaleString("ru-RU")}

🔒 Если это были не вы, немедленно смените код.
    `.trim();

    return await this.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  }
}

export const telegramService = TelegramService.getInstance();
