<script setup lang="ts">
import { SendHorizontal, CheckCheck, Search, X } from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

// Types
interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  userCount: number;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  chatId: string;
}

// Composables
const { connect, isConnected, connectionError, loadedChats, addNewChat } =
  useCentrifuge();
const auth = useAuth();
const messagesStore = useMessagesStore();

// State - используем ID пользователя из авторизации
const currentUser = computed(() => auth.user?.id || "");
const selectedChat = ref<Chat | null>(null);
const newMessage = ref("");
const messagesContainer = ref<HTMLElement>();
const searchUser = ref("");
const isOpen = ref(false);
const isAuthInitialized = ref(false);

// Computed
const currentMessages = computed(() => {
  if (!selectedChat.value) return [];
  return messagesStore.getMessages(selectedChat.value.id);
});

const displayChats = computed(() => {
  return loadedChats.value;
});

// Methods
const initializeChat = async () => {
  try {
    console.log("🔄 Initializing chat for user:", currentUser.value);

    if (!currentUser.value) {
      console.error("❌ No user ID available");
      return;
    }

    const { data: tokenData, error } = await useFetch("/api/token", {
      method: "POST",
      body: { userId: currentUser.value },
    });

    console.log("Token response:", tokenData.value, error.value);

    if (error.value) {
      console.error("❌ Token error:", error.value);
      return;
    }

    if (tokenData.value?.token) {
      console.log("✅ Token received, connecting...");
      const connected = await connect(tokenData.value.token, currentUser.value);

      if (connected) {
        console.log("🎉 Successfully connected to Centrifugo!");
        // ВСЕ ПОДПИСКИ ТЕПЕРЬ АВТОМАТИЧЕСКИ В useCentrifuge
      } else {
        console.error("❌ Failed to connect to Centrifugo");
      }
    } else {
      console.error("❌ No token in response");
    }
  } catch (error) {
    console.error("💥 Failed to initialize chat:", error);
  }
};

const updateChatLastMessage = (chatId: string, message: string) => {
  // Обновляем в loadedChats через composable
  addNewChat({
    id: chatId,
    name: `Чат ${chatId}`, // Имя будет обновлено при получении данных
    userCount: 1,
    lastMessage:
      message.length > 50 ? message.substring(0, 50) + "..." : message,
  });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    if (event.shiftKey) {
      // Shift+Enter - позволяем браузеру добавить новую строку
      // Ничего не делаем, браузер сам добавит \n
    } else {
      // Enter - отправка сообщения
      event.preventDefault();

      sendMessage();
      calculateRows();
    }
  }
};

const textareaRef = ref<HTMLTextAreaElement>();
const textareaRows = ref(1);

// Вычисляем количество строк для textarea
const calculateRows = () => {
  if (!textareaRef.value) return 1;

  const textarea = textareaRef.value;
  const lineHeight = 20; // Примерная высота строки в px
  const padding = 24; // padding-top + padding-bottom

  // Временно убираем ограничение по строкам для расчета
  textarea.style.height = "auto";
  const contentHeight = textarea.scrollHeight - padding;
  const calculatedRows = Math.max(
    1,
    Math.min(6, Math.floor(contentHeight / lineHeight))
  );

  return calculatedRows;
};

// Следим за изменением текста и обновляем количество строк
watch(newMessage, () => {
  nextTick(() => {
    textareaRows.value = calculateRows();
  });
});

const createNewChat = async () => {
  const newChatId = Date.now().toString(); // Используем timestamp как ID
  const newChat: Chat = {
    id: newChatId,
    name: `Чат ${newChatId}`,
    userCount: 1,
    lastMessage: "Нет сообщений",
  };

  try {
    // Отправляем запрос на создание чата
    const response = await $fetch("/api/chats", {
      method: "POST",
      body: {
        chat: newChat,
      },
    });

    if (response.success) {
      console.log("✅ Chat created successfully:", newChat);

      // Чат автоматически добавится через Centrifugo подписку
      // и будет отображен в реальном времени

      // Выбираем созданный чат
      selectChat(newChat);
    } else {
      console.error("❌ Failed to create chat:", response.error);
    }
  } catch (error) {
    console.error("❌ Error creating chat:", error);

    // Fallback: добавляем локально если сервер недоступен
    addNewChat(newChat);
    selectChat(newChat);
  }
};

const selectChat = (chat: Chat) => {
  selectedChat.value = chat;
  nextTick(() => scrollToBottom());
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedChat.value || !isConnected.value)
    return;

  const message: Message = {
    id: Date.now().toString(),
    text: newMessage.value,
    sender: currentUser.value,
    timestamp: Date.now(),
    chatId: selectedChat.value.id,
  };

  try {
    // НЕМЕДЛЕННО добавляем сообщение в хранилище
    const messagesStore = useMessagesStore();
    messagesStore.addMessage(selectedChat.value.id, message);

    // Обновляем последнее сообщение в чате
    updateChatLastMessage(selectedChat.value.id, newMessage.value);

    // Очищаем поле ввода
    newMessage.value = "";

    // Скроллим вниз
    nextTick(() => scrollToBottom());

    // Затем отправляем на сервер
    await $fetch("/api/centrifugo/publish", {
      method: "POST",
      body: {
        channel: `chat:${selectedChat.value.id}`,
        data: { message },
      },
    });

    console.log("✅ Message sent to server");
  } catch (error) {
    console.error("Failed to send message:", error);
    // Можно показать уведомление пользователю
  }
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Lifecycle - ПРОСТАЯ И РАБОЧАЯ ВЕРСИЯ
onMounted(async () => {
  console.log("🔄 Chat component mounted");

  // ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА АВТОРИЗАЦИИ
  const isAuthed = auth.checkAuth();
  console.log("🔍 Auth check result:", isAuthed);
  console.log("🔍 Auth user:", auth.user);
  console.log("🔍 Auth isAuthenticated:", auth.isAuthenticated.value);

  if (isAuthed && auth.user?.id) {
    console.log("✅ User authenticated, initializing chat...");
    await initializeChat();
    isAuthInitialized.value = true;
  } else {
    console.error("❌ User not authenticated even after check");

    // ПРЯМАЯ ПРОВЕРКА localStorage
    if (process.client) {
      const savedUser = localStorage.getItem("chat-user");
      console.log("🔍 Direct localStorage check:", savedUser);
      if (savedUser) {
        console.log("🔄 Trying to manually restore user from localStorage...");
        try {
          const userData = JSON.parse(savedUser);
          // @ts-ignore - временное решение
          auth.user = userData;
          console.log("✅ Manually restored user:", userData);
          await initializeChat();
          isAuthInitialized.value = true;
        } catch (error) {
          console.error("❌ Failed to manually restore user:", error);
        }
      }
    }
  }
});

// Auto-scroll when new messages arrive
watch(currentMessages, () => {
  nextTick(() => scrollToBottom());
});

function clearsearchUser() {
  searchUser.value = "";
}

const items = [
  [
    {
      label: "Пункт 1",
      icon: "i-heroicons-pencil-square",
    },
  ],
];
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <div class="bg-white shadow-sm border-b">
      <div
        class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center"
      >
        <div>
          <h1 class="text-xl font-bold text-gray-800 text-md flex flex-row">
            <div class="text-[#C71585]">M</div>
            <div class="text-[#FF1493]">i</div>
            <div class="text-[#FF69B4]">o</div>
          </h1>
          <p class="text-sm text-gray-600">
            <span :class="isConnected ? 'text-green-600' : 'text-red-600'">
              {{ isConnected ? "Онлайн" : "Офлайн" }}
            </span>
            <span v-if="connectionError" class="text-xs text-orange-600 ml-2">
              ({{ connectionError }})
            </span>
          </p>
        </div>
        <div class="text-right flex items-center gap-4">
          <p class="text-sm text-gray-600" v-if="auth.user">
            {{ auth.user.phone }}
          </p>
          <p class="text-sm text-red-600" v-else>Не авторизован</p>
          <button
            @click="auth.logout()"
            class="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto p-4">
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="flex h-[calc(100vh-110px)]">
          <!-- Sidebar - Список чатов -->
          <div class="w-1/4 border-r bg-gray-50 flex flex-col">
            <div class="pt-4 px-4 w-full relative">
              <input
                v-model="searchUser"
                type="text"
                maxlength="25"
                placeholder="Найти пользователя..."
                class="w-full pr-7 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                :disabled="!isConnected"
              />
              <Search
                class="absolute right-6 top-1/2 transform -translate-y-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                v-if="!searchUser"
              />
              <X
                class="absolute right-6 top-1/2 transform -translate-y-[2px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                :size="20"
                @click="clearsearchUser()"
                v-if="searchUser"
              />
            </div>

            <div class="p-4 border-b">
              <button
                @click="createNewChat"
                class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                :disabled="!auth.user"
              >
                Новый чат
              </button>
            </div>

            <div class="flex-1 overflow-y-auto">
              <div v-if="!auth.user" class="p-4 text-center text-gray-500">
                Загрузка...
              </div>
              <div
                v-else
                v-for="chat in displayChats"
                :key="chat.id"
                @click="selectChat(chat)"
                class="px-4 py-4 pr-2 border-b cursor-pointer transition-colors hover:bg-blue-50"
                :class="{
                  'bg-blue-100 border-blue-200': selectedChat?.id === chat.id,
                }"
              >
                <div class="flex flex-row gap-3 justify-between">
                  <div class="flex flex-row gap-3 flex-1 min-w-0">
                    <div class="w-12 flex-shrink-0">
                      <nuxt-img
                        class="w-12 h-12 bg-green-200/50 rounded-full"
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWAk-mfGdhPFylzhxWsEXqJa6DR5KaCd2ThA&s"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-gray-800 truncate">
                        {{ chat.name }}
                      </div>
                      <div class="text-sm text-gray-500 truncate mt-1">
                        {{ chat.lastMessage || "Нет сообщений" }}
                      </div>
                    </div>
                  </div>
                  <div
                    class="w-14 h-full text-sm flex flex-col justify-center pt-1 gap-[3px] text-slate-500 text-right flex-shrink-0"
                  >
                    <div
                      class="flex flex-row gap-1 justify-center items-center text-center"
                    >
                      <CheckCheck :size="15" color="#3b82f6" />
                      <div class="">11:55</div>
                    </div>
                    <div class="">23</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Chat Area -->
          <div class="flex-1 flex flex-col">
            <template v-if="selectedChat && auth.user">
              <!-- Messages -->
              <div
                ref="messagesContainer"
                class="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50"
              >
                <div
                  v-for="message in currentMessages"
                  :key="message.id"
                  class="flex"
                  :class="{ 'justify-end': message.sender === currentUser }"
                >
                  <div
                    class="max-w-xs lg:max-w-md px-3 py-[2px] rounded-2xl shadow-sm"
                    :class="
                      message.sender === currentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none border'
                    "
                  >
                    <div
                      class="text-xs font-semibold mb-1"
                      :class="
                        message.sender === currentUser
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      "
                    ></div>
                    <div class="flex justify-between">
                      <div class="text-sm">{{ message.text }}</div>
                      <div
                        class="text-xs mt-1.5 pb-[3px] text-right pl-2 flex flex-col justify-end"
                        :class="
                          message.sender === currentUser
                            ? 'text-blue-200'
                            : 'text-gray-400'
                        "
                      >
                        {{ formatTime(message.timestamp) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="currentMessages.length === 0"
                  class="text-center text-gray-500 flex flex-col h-full justify-center items-center"
                >
                  <div class="text-lg">Нет сообщений</div>
                  <div class="text-sm">Начните общение первым!</div>
                </div>
              </div>

              <!-- Message Input -->
              <div class="px-4 py-2 border-t bg-white">
                <form
                  @submit.prevent="sendMessage"
                  class="flex gap-2 items-center"
                >
                  <textarea
                    v-model="newMessage"
                    @keydown="handleKeydown"
                    placeholder="Введите сообщение..."
                    :rows="textareaRows"
                    class="flex-1 rounded-lg content-center px-4 py-3 border-none outline-none resize-none min-h-[52px] max-h-32 overflow-y-auto"
                    :disabled="!isConnected"
                    ref="textareaRef"
                  />
                  <button
                    type="submit"
                    class="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-[52px]"
                    :disabled="!newMessage.trim() || !isConnected"
                  >
                    <SendHorizontal :size="20" />
                  </button>
                </form>
              </div>
            </template>

            <!-- No Chat Selected -->
            <div
              v-else
              class="flex-1 flex items-center justify-center text-gray-500"
            >
              <div class="text-center">
                <div class="text-2xl mb-2">👋</div>
                <div class="text-lg font-semibold" v-if="auth.user">
                  Выберите чат
                </div>
                <div class="text-lg font-semibold" v-else>Загрузка...</div>
                <div class="text-sm">или создайте новый для начала общения</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
