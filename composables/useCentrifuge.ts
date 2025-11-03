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
  userCount: number;
  lastMessage?: string;
}

export const useCentrifuge = () => {
  const currentUserId = ref("");
  const centrifuge = ref<Centrifuge | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string>("");
  const reconnectAttempts = ref(0);
  const loadedChats = ref<Chat[]>([]);

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

      return (response.chats || []).map((chat) => ({
        id: chat.id,
        name: chat.name,
        userCount: chat.userCount || 1,
        lastMessage: chat.lastMessage || "Нет сообщений",
      }));
    } catch (error) {
      console.error("❌ Failed to load user chats:", error);
      return [];
    }
  };

  // Функция добавления сообщений в чат
  const addMessagesToChat = (chatId: string, messages: any[]) => {
    const messagesStore = useMessagesStore();

    const processedMessages = messages
      .map((msg) => {
        if (msg.data && msg.data.message) {
          return msg.data.message;
        }
        return msg;
      })
      .filter((msg) => msg && msg.id);

    console.log(
      `✅ Adding ${processedMessages.length} processed messages to chat ${chatId}`,
      processedMessages
    );

    messagesStore.addMessages(chatId, processedMessages);
  };

  // Функция добавления нового чата
  const addNewChat = (chat: Chat) => {
    // Проверяем, нет ли уже такого чата
    const existingChatIndex = loadedChats.value.findIndex(
      (c) => c.id === chat.id
    );

    if (existingChatIndex === -1) {
      // Добавляем новый чат в начало списка
      loadedChats.value.unshift(chat);
      console.log(`✅ New chat added: ${chat.name} (${chat.id})`);
    } else {
      // Обновляем существующий чат
      loadedChats.value[existingChatIndex] = chat;
      console.log(`✅ Chat updated: ${chat.name} (${chat.id})`);
    }
  };

  // Функция обновления последнего сообщения в чате
  const updateChatLastMessage = (chatId: string, message: string) => {
    const chat = loadedChats.value.find((c) => c.id === chatId);
    if (chat) {
      chat.lastMessage =
        message.length > 50 ? message.substring(0, 50) + "..." : message;
      console.log(`✅ Last message updated for chat ${chatId}: ${message}`);
    }
  };

  const connect = async (token: string, userId: string): Promise<boolean> => {
    currentUserId.value = userId;

    return new Promise((resolve) => {
      try {
        connectionError.value = "";

        const getWsUrl = (): string => {
          return "wss://mio-messenger.com/connection/websocket";
        };

        const wsUrl = getWsUrl();
        console.log(`🔗 Connecting to: ${wsUrl} for user: ${userId}`);

        centrifuge.value = new Centrifuge(wsUrl, {
          token: token,
          debug: true,
          minReconnectDelay: 1000,
          maxReconnectDelay: 10000,
          getToken: async function () {
            console.log(
              "🔄 Token refresh requested for user:",
              currentUserId.value
            );
            try {
              const { data: tokenData } = await $fetch("/api/token", {
                method: "POST",
                body: { userId: currentUserId.value },
              });

              if (tokenData?.token) {
                console.log("✅ New token received");
                return tokenData.token;
              }
            } catch (error) {
              console.error("❌ Failed to refresh token:", error);
            }
            return token;
          },
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
            loadedChats.value = userChats;
            console.log(
              `📋 Loaded ${userChats.length} chats for user: ${currentUserId.value}`
            );

            // Подписываемся на обновления списка чатов
            subscribe("chats:updates", (data) => {
              console.log("🔄 Chat list update received:", data);
              if (data.chat) {
                addNewChat(data.chat);
              }
            });

            // Для каждого чата загружаем историю и подписываемся на сообщения
            for (const chat of userChats) {
              const messages = await loadHistory(`chat:${chat.id}`);
              console.log(
                `📜 Loaded ${messages.length} messages for chat ${chat.id}`
              );
              addMessagesToChat(chat.id, messages);

              // Подписываемся на новые сообщения
              subscribe(`chat:${chat.id}`, (data) => {
                console.log("📨 New real-time message:", data);
                const messagesStore = useMessagesStore();

                if (data.message) {
                  messagesStore.addMessage(chat.id, data.message);
                  updateChatLastMessage(chat.id, data.message.text);
                  console.log(
                    `✅ Real-time message added to chat ${chat.id}:`,
                    data.message
                  );
                } else if (data.data && data.data.message) {
                  messagesStore.addMessage(chat.id, data.data.message);
                  updateChatLastMessage(chat.id, data.data.message.text);
                  console.log(
                    `✅ Real-time message added to chat ${chat.id}:`,
                    data.data.message
                  );
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

          // Автоматически переподключаемся через 2 секунды
          setTimeout(() => {
            if (centrifuge.value && !isConnected.value) {
              console.log("🔄 Auto-reconnecting after disconnect...");
              centrifuge.value.connect();
            }
          }, 2000);
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

        // Увеличиваем таймаут подключения
        setTimeout(() => {
          if (!isConnected.value) {
            console.log("⏰ Connection timeout");
            connectionError.value = "Таймаут подключения";
            resolve(false);
          }
        }, 15000);
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
        console.log(`📨 Publication on ${channel}:`, ctx.data);
        callback(ctx.data);
      });

      sub.on("subscribed", (ctx: any) => {
        console.log(`✅ Successfully subscribed to ${channel}`);
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
    addNewChat,
    updateChatLastMessage,
  };
};
