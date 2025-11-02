// import { Centrifuge } from "centrifuge";

// export const useCentrifuge = () => {
//   const centrifuge = ref<Centrifuge | null>(null);
//   const isConnected = ref(false);
//   const connectionError = ref<string>("");
//   const reconnectAttempts = ref(0);
//   const maxReconnectAttempts = 5;

//   const connect = async (token: string): Promise<boolean> => {
//     return new Promise((resolve) => {
//       try {
//         connectionError.value = "";

//         // Правильная логика определения URL
//         const getWsUrl = (): string => {
//           if (typeof window === "undefined") {
//             // SSR - возвращаем дефолтный URL
//             return "ws://127.0.0.1:8000/connection/websocket";
//           }

//           const hostname = window.location.hostname;

//           // Production - когда заходим на сайт mio-messenger.com
//           if (
//             hostname === "mio-messenger.com" ||
//             hostname === "45.59.119.225"
//           ) {
//             // Подключаемся к тому же домену на порт 8000
//             return `ws://${hostname}:8000/connection/websocket`;
//           } else {
//             // Локальная разработка (localhost:3000) - подключаемся к внешнему серверу
//             return "ws://mio-messenger.com:8000/connection/websocket";
//           }
//         };

//         const wsUrl = getWsUrl();
//         console.log(`🔗 Connecting to: ${wsUrl}`);

//         centrifuge.value = new Centrifuge(wsUrl, {
//           token: token,
//           debug: true,
//           minReconnectDelay: 1000,
//           maxReconnectDelay: 5000,
//           maxReconnectAttempts: maxReconnectAttempts,
//         });

//         centrifuge.value.on("connecting", (ctx) => {
//           console.log("🔄 Connecting to Centrifugo...");
//           connectionError.value = "Подключаемся...";
//         });

//         centrifuge.value.on("connected", (ctx) => {
//           console.log("✅ Connected to Centrifugo!");
//           isConnected.value = true;
//           connectionError.value = "";
//           reconnectAttempts.value = 0;
//           resolve(true);
//         });

//         centrifuge.value.on("disconnected", (ctx) => {
//           console.log("❌ Disconnected from Centrifugo:", ctx.reason);
//           isConnected.value = false;
//           connectionError.value = `Отключено: ${ctx.reason}`;
//           if (reconnectAttempts.value >= maxReconnectAttempts) {
//             resolve(false);
//           }
//         });

//         centrifuge.value.on("error", (err) => {
//           console.error("💥 Centrifugo error:", err);
//           connectionError.value = `Ошибка: ${err.message}`;
//         });

//         centrifuge.value.on("reconnecting", (ctx) => {
//           reconnectAttempts.value++;
//           console.log(
//             `🔄 Reconnecting... (attempt ${reconnectAttempts.value})`
//           );
//           connectionError.value = `Переподключение... (попытка ${reconnectAttempts.value})`;
//         });

//         centrifuge.value.connect();

//         // Таймаут подключения
//         setTimeout(() => {
//           if (!isConnected.value) {
//             console.log("⏰ Connection timeout");
//             connectionError.value = "Таймаут подключения";
//             resolve(false);
//           }
//         }, 10000);
//       } catch (error) {
//         console.error("Connection setup error:", error);
//         connectionError.value = `Setup error: ${error}`;
//         resolve(false);
//       }
//     });
//   };

//   const subscribe = (channel: string, callback: (data: any) => void) => {
//     if (!centrifuge.value || !isConnected.value) {
//       console.error("Cannot subscribe - not connected");
//       return null;
//     }

//     try {
//       const sub = centrifuge.value.newSubscription(channel);
//       sub.on("publication", (ctx) => {
//         console.log(`📨 Message on ${channel}:`, ctx.data);
//         callback(ctx.data);
//       });
//       sub.on("subscribed", (ctx) => {
//         console.log(`✅ Subscribed to ${channel}`);
//       });
//       sub.on("error", (err) => {
//         console.error(`💥 Subscription error for ${channel}:`, err);
//       });
//       sub.subscribe();
//       return sub;
//     } catch (error) {
//       console.error("Subscription error:", error);
//       return null;
//     }
//   };

//   const disconnect = () => {
//     if (centrifuge.value) {
//       centrifuge.value.disconnect();
//       centrifuge.value = null;
//       isConnected.value = false;
//     }
//   };

//   onUnmounted(() => {
//     disconnect();
//   });

//   return {
//     connect,
//     subscribe,
//     disconnect,
//     isConnected: readonly(isConnected),
//     connectionError: readonly(connectionError),
//   };
// };

import { Centrifuge } from "centrifuge";
import { ref, readonly, onUnmounted } from "vue";

interface CentrifugeContext {
  reason?: string;
  [key: string]: any;
}

export const useCentrifuge = () => {
  const centrifuge = ref<Centrifuge | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string>("");
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;

  const connect = async (token: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        connectionError.value = "";

        const getWsUrl = (): string => {
          if (typeof window === "undefined") {
            return "ws://127.0.0.1:8000/connection/websocket";
          }

          const protocol =
            window.location.protocol === "https:" ? "wss:" : "ws:";
          const hostname = window.location.hostname;

          if (hostname === "localhost" || hostname === "127.0.0.1") {
            return "wss://mio-messenger.com/connection/websocket";
          } else {
            return `${protocol}//${hostname}/connection/websocket`;
          }
        };

        const wsUrl = getWsUrl();
        console.log(`🔗 Connecting to: ${wsUrl}`);

        centrifuge.value = new Centrifuge(wsUrl, {
          token: token,
          debug: true,
          minReconnectDelay: 1000,
          maxReconnectDelay: 5000,
          // Правильное название опции
          reconnectAttempts: maxReconnectAttempts,
        });

        centrifuge.value.on("connecting", (ctx: CentrifugeContext) => {
          console.log("🔄 Connecting to Centrifugo...");
          connectionError.value = "Подключаемся...";
        });

        centrifuge.value.on("connected", (ctx: CentrifugeContext) => {
          console.log("✅ Connected to Centrifugo!");
          isConnected.value = true;
          connectionError.value = "";
          reconnectAttempts.value = 0;
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
  };
};
