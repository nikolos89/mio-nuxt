import { Centrifuge } from "centrifuge";
import { ref, readonly, onUnmounted } from "vue";
import { useMessagesStore } from "~/stores";

interface CentrifugeContext {
  reason?: string;
  [key: string]: any;
}

interface Chat {
  id: string;
  name: string;
  userCount: number; // ДОБАВЬ ЭТО
  lastMessage?: string; // ДОБАВЬ ЭТО (опционально)
}

export const useCentrifuge = () => {
  const centrifuge = ref<Centrifuge | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string>("");
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  const loadedChats = ref<Chat[]>([]); // Добавляем реактивные чаты

  // Функция загрузки истории
  const loadHistory = async (channel: string) => {
    console.log("🔄 Loading history for channel:", channel);
    try {
      const response = await $fetch("/api/centrifugo/history", {
        method: "POST",
        headers: {
          Authorization:
            "apikey GGMnEv_F6rZjnMQqCousEmqhlOJm0LuodrHnUxfpJRxzqI41u4t-Tjze8Qpk3XFRIwiRd9SB-R_0pcCji1agVA",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "history",
          params: { channel, limit: 100 },
        }),
      });
      console.log("📦 History response:", response);
      return response.messages || [];
    } catch (error) {
      console.error("History load error:", error);
      return [];
    }
  };

  // Функция загрузки чатов пользователя
  const loadUserChats = async (): Promise<Chat[]> => {
    try {
      const response = await $fetch("/api/chats", {
        method: "GET",
      });

      // Добавляем недостающие поля для интерфейса
      return (response.chats || []).map((chat) => ({
        id: chat.id,
        name: chat.name,
        userCount: chat.userCount || 1,
        lastMessage: chat.lastMessage || "Нет сообщений", // Используй из API если есть
      }));
    } catch (error) {
      console.error("❌ Failed to load user chats:", error);
      return [];
    }
  };

  // Замени функцию addMessagesToChat
  const addMessagesToChat = (chatId: string, messages: any[]) => {
    const messagesStore = useMessagesStore();

    // Обрабатываем сообщения из history API
    const processedMessages = messages
      .map((msg) => {
        // Если сообщение пришло из data.message (новый формат)
        if (msg.data && msg.data.message) {
          return msg.data.message;
        }
        // Если сообщение уже в правильном формате
        return msg;
      })
      .filter((msg) => msg && msg.id); // Фильтруем валидные сообщения

    console.log(
      `✅ Adding ${processedMessages.length} processed messages to chat ${chatId}`,
      processedMessages
    );

    messagesStore.addMessages(chatId, processedMessages);
  };

  const connect = async (token: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        connectionError.value = "";

        const getWsUrl = (): string => {
          return "wss://mio-messenger.com/connection/websocket";
        };

        const wsUrl = getWsUrl();
        console.log(`🔗 Connecting to: ${wsUrl}`);

        centrifuge.value = new Centrifuge(wsUrl, {
          token: token,
          debug: true,
          minReconnectDelay: 1000,
          maxReconnectDelay: 5000,
          maxReconnectAttempts: maxReconnectAttempts,
        });

        centrifuge.value.on("connecting", (ctx: CentrifugeContext) => {
          console.log("🔄 Connecting to Centrifugo...");
          connectionError.value = "Подключаемся...";
        });

        centrifuge.value.on("connected", async (ctx) => {
          console.log("✅ Connected to Centrifugo!");
          isConnected.value = true;
          connectionError.value = "";
          reconnectAttempts.value = 0;

          // Загружаем чаты и историю
          try {
            const userChats = await loadUserChats();
            loadedChats.value = userChats; // Сохраняем чаты
            console.log(`📋 Loaded ${userChats.length} chats`);

            // Для каждого чата загружаем историю
            for (const chat of userChats) {
              const messages = await loadHistory(`chat:${chat.id}`);
              console.log(
                `📜 Loaded ${messages.length} messages for chat ${chat.id}`
              );
              addMessagesToChat(chat.id, messages);

              // Подписываемся на новые сообщения
              subscribe(`chat:${chat.id}`, (data) => {
                console.log("📨 New message:", data);
                const messagesStore = useMessagesStore();

                if (data.message) {
                  messagesStore.addMessage(chat.id, data.message);
                }
              });
            }
          } catch (error) {
            console.error("❌ Failed to load chats history:", error);
          }

          resolve(true);
        });

        centrifuge.value.on("disconnected", (ctx: CentrifugeContext) => {
          console.log("❌ Disconnected from Centrifugo:", ctx.reason);
          isConnected.value = false;
          connectionError.value = `Отключено: ${ctx.reason}`;
          if (reconnectAttempts.value >= maxReconnectAttempts) {
            resolve(false);
          }
        });

        centrifuge.value.on("error", (err: any) => {
          console.error("💥 Centrifugo error:", err);
          connectionError.value = `Ошибка: ${err.message}`;
        });

        centrifuge.value.on("reconnecting", (ctx: CentrifugeContext) => {
          reconnectAttempts.value++;
          console.log(
            `🔄 Reconnecting... (attempt ${reconnectAttempts.value})`
          );
          connectionError.value = `Переподключение... (попытка ${reconnectAttempts.value})`;
        });

        centrifuge.value.connect();

        setTimeout(() => {
          if (!isConnected.value) {
            console.log("⏰ Connection timeout");
            connectionError.value = "Таймаут подключения";
            resolve(false);
          }
        }, 10000);
      } catch (error: any) {
        console.error("Connection setup error:", error);
        connectionError.value = `Setup error: ${error}`;
        resolve(false);
      }
    });
  };

  const subscribe = (channel: string, callback: (data: any) => void) => {
    if (!centrifuge.value || !isConnected.value) {
      console.error("Cannot subscribe - not connected");
      return null;
    }

    try {
      const sub = centrifuge.value.newSubscription(channel);

      sub.on("publication", (ctx: any) => {
        console.log(`📨 Message on ${channel}:`, ctx.data);
        callback(ctx.data);
      });

      sub.on("subscribed", (ctx: any) => {
        console.log(`✅ Subscribed to ${channel}`);
      });

      sub.on("error", (err: any) => {
        console.error(`💥 Subscription error for ${channel}:`, err);
      });

      sub.subscribe();
      return sub;
    } catch (error) {
      console.error("Subscription error:", error);
      return null;
    }
  };

  const disconnect = () => {
    if (centrifuge.value) {
      centrifuge.value.disconnect();
      centrifuge.value = null;
      isConnected.value = false;
    }
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    subscribe,
    disconnect,
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    loadedChats,
    loadHistory,
  };
};
