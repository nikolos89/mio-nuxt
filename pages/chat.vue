<script setup lang="ts">
import {
  SendHorizontal,
  CheckCheck,
  Search,
  X,
  Menu,
  ArrowLeft,
  Pencil,
} from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

// Используем наш composable для механики
const {
  // State
  currentUser,
  selectedChat,
  newMessage,
  messagesContainer,
  searchUser,
  searchResults,
  showSearchResults,
  textareaRef,
  textareaRows,

  // Computed
  currentMessages,
  displayChats,
  isConnected,
  connectionError,

  // Auth
  auth,

  // Methods
  handleKeydown,
  createChatWithUser,
  createNewChat,
  selectChat,
  sendMessage,
  formatTime,
  closeSearchResults,
  clearsearchUser,
  handleSearchInput,
} = useChatMechanics();

// Мобильное состояние
const isMobile = ref(false);
const showChatList = ref(true);
const showChatArea = ref(false);

// Определяем мобильное устройство
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    showChatList.value = true;
    showChatArea.value = true;
  } else if (!selectedChat.value) {
    showChatList.value = true;
    showChatArea.value = false;
  } else {
    showChatList.value = false;
    showChatArea.value = true;
  }
};

// Адаптивные методы выбора чата
const handleSelectChat = (chat: any) => {
  selectChat(chat);
  if (isMobile.value) {
    showChatList.value = false;
    showChatArea.value = true;
  }
};

const handleBackToChats = () => {
  if (isMobile.value) {
    selectedChat.value = null;
    showChatList.value = true;
    showChatArea.value = false;
  }
};

const items = [
  [
    {
      label: "Пункт 1",
      icon: "i-heroicons-pencil-square",
    },
  ],
];

function MenuApp() {
  alert("clicked");
}
</script>

<template>
  <div class="min-h-screen bg-gray-100" @click="closeSearchResults">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b sticky top-0 z-20">
      <div
        class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center max-h-16"
      >
        <div class="flex items-center gap-3">
          <!-- Mobile Menu Button -->
          <button
            v-if="isMobile && showChatArea && selectedChat"
            @click="handleBackToChats"
            class="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft :size="20" />
          </button>

          <div class="" v-if="!selectedChat">
            <Menu color="#C71585" @click="MenuApp" />
          </div>

          <h1
            class="text-xl font-bold text-gray-800 text-md flex flex-row"
            v-if="!selectedChat"
          >
            <div class="text-[#C71585]">M</div>
            <div class="text-[#FF1493]">i</div>
            <div class="text-[#FF69B4]">o</div>
          </h1>

          <!-- Chat Title on Mobile -->
          <div
            v-if="isMobile && showChatArea && selectedChat"
            class="flex items-center gap-2"
          >
            <div class="w-8 h-8 bg-green-200/50 rounded-full flex-shrink-0">
              <nuxt-img
                class="w-8 h-8 rounded-full"
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWAk-mfGdhPFylzhxWsEXqJa6DR5KaCd2ThA&s"
              />
            </div>
            <div>
              <div class="font-semibold text-gray-800 text-sm">
                {{ selectedChat.name }}
              </div>
              <p class="text-xs text-gray-600">
                <span :class="isConnected ? 'text-green-600' : 'text-red-600'">
                  {{ isConnected ? "online" : "offline" }}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div class="text-right flex items-center gap-4">
          <p
            class="text-sm text-gray-600 sm:block"
            v-if="auth.user && !selectedChat"
          >
            {{ auth.user.phone }}
          </p>
          <button
            @click="auth.logout()"
            class="text-[12px] bg-transparent border border-[#C71585]/30 text-slate-500 px-2 py-1 rounded hover:bg-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto p-2 sm:p-4">
      <div
        class="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-110px)]"
      >
        <div class="flex h-full">
          <!-- Sidebar - Список чатов -->
          <div
            class="border-r bg-gray-50 flex flex-col transition-all duration-300 ease-in-out"
            :class="{
              'w-1/4': !isMobile,
              'absolute inset-0 z-10 mt-14 ': isMobile && showChatList,
              hidden: isMobile && !showChatList,
              'w-full ': isMobile,
            }"
          >
            <div class="flex flex-row gap-3 sm:gap-2 border-b">
              <!-- Search Section -->
              <div class="w-full relative pt-1 pl-4 pb-2">
                <input
                  v-model="searchUser"
                  @input="handleSearchInput"
                  type="text"
                  maxlength="25"
                  placeholder="Найти пользователя..."
                  class="w-full pr-7 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                  :disabled="!isConnected"
                  @click.stop
                />
                <Search
                  class="absolute right-3 top-[30%] transform -translate-y-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  v-if="!searchUser"
                />
                <X
                  class="absolute right-3 top-[30%] transform -translate-y-[2px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  :size="20"
                  @click="clearsearchUser()"
                  v-if="searchUser"
                />

                <!-- Результаты поиска -->
                <div
                  v-if="showSearchResults && searchResults.length > 0"
                  class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-10"
                  @click.stop
                >
                  <div
                    v-for="user in searchResults"
                    :key="user.id"
                    @click="createChatWithUser(user)"
                    class="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div class="font-medium text-gray-800">
                      {{ user.phone }}
                    </div>
                    <div class="text-sm text-gray-500">{{ user.name }}</div>
                  </div>
                </div>

                <!-- Сообщение "ничего не найдено" -->
                <div
                  v-if="showSearchResults && searchResults.length === 0"
                  class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10"
                  @click.stop
                >
                  <div class="px-4 py-3 text-gray-500 text-center">
                    Пользователи не найдены
                  </div>
                </div>
              </div>

              <!-- New Chat Button -->
              <div class="py-1 pr-4">
                <button
                  @click="createNewChat"
                  class="w-full bg-[#C71585]/30 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  :disabled="!auth.user"
                >
                  <span class="hidden sm:inline">Новый чат</span>
                  <!-- <span class="sm:hidden" :class="!isMobile ? 'hidden' : ''">+ Чат</span> -->
                  <div class="" v-if="isMobile">
                    <Pencil />
                  </div>
                  <div class="" v-if="!isMobile">
                    <span class="sm:hidden">+ Чат</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Chats List -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="!auth.user" class="p-4 text-center text-gray-500">
                Загрузка...
              </div>
              <div
                v-else-if="displayChats.length === 0"
                class="p-4 text-center text-gray-500"
              >
                Нет чатов. Создайте первый чат!
              </div>
              <div
                v-else
                v-for="chat in displayChats"
                :key="chat.id"
                @click="handleSelectChat(chat)"
                class="px-3 sm:px-4 py-3 pr-2 border-b cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-100"
                :class="{
                  'bg-blue-100 border-blue-200': selectedChat?.id === chat.id,
                }"
              >
                <div
                  class="flex flex-row gap-2 sm:gap-3 justify-between items-center"
                >
                  <div
                    class="flex flex-row gap-2 sm:gap-3 flex-1 min-w-0 items-center"
                  >
                    <div class="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      <nuxt-img
                        class="w-10 h-10 sm:w-12 sm:h-12 bg-green-200/50 rounded-full"
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWAk-mfGdhPFylzhxWsEXqJa6DR5KaCd2ThA&s"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div
                        class="font-semibold text-gray-800 truncate text-sm sm:text-base"
                      >
                        {{ chat.name }}
                      </div>
                      <div
                        class="text-xs sm:text-sm text-gray-500 truncate mt-0.5"
                      >
                        {{ chat.lastMessage || "Нет сообщений" }}
                      </div>
                    </div>
                  </div>
                  <div
                    class="text-xs sm:text-sm flex flex-col justify-center gap-1 text-slate-500 text-right flex-shrink-0"
                  >
                    <div
                      class="flex flex-row gap-1 justify-center items-center text-center"
                    >
                      <CheckCheck
                        :size="12"
                        class="sm:w-4 sm:h-4"
                        color="#3b82f6"
                      />
                      <div class="text-xs">11:55</div>
                    </div>
                    <div
                      class="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      23
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Chat Area -->
          <div
            class="flex-1 flex flex-col transition-all duration-300 ease-in-out"
            :class="{
              hidden: isMobile && !showChatArea,
              flex: !isMobile || (isMobile && showChatArea),
            }"
          >
            <template v-if="selectedChat && auth.user">
              <!-- Chat Header (Desktop) -->
              <div
                class="border-b bg-white px-4 py-3 hidden sm:flex items-center gap-3"
              >
                <div
                  class="w-10 h-10 bg-green-200/50 rounded-full flex-shrink-0"
                >
                  <nuxt-img
                    class="w-10 h-10 rounded-full"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWAk-mfGdhPFylzhxWsEXqJa6DR5KaCd2ThA&s"
                  />
                </div>
                <div>
                  <div class="font-semibold text-gray-800">
                    {{ selectedChat.name }}
                  </div>
                  <p class="text-sm text-gray-600">
                    <span
                      :class="isConnected ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ isConnected ? "online" : "offline" }}
                    </span>
                    <span
                      v-if="connectionError"
                      class="text-xs text-orange-600 ml-2"
                    >
                      ({{ connectionError }})
                    </span>
                  </p>
                </div>
              </div>

              <!-- Messages Area -->
              <div
                ref="messagesContainer"
                class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-gray-50"
              >
                <div
                  v-for="message in currentMessages"
                  :key="message.id"
                  class="flex"
                  :class="{ 'justify-end': message.sender === currentUser }"
                >
                  <div
                    class="max-w-[85%] sm:max-w-xs lg:max-w-md px-3 py-2 rounded-2xl shadow-sm"
                    :class="
                      message.sender === currentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none border'
                    "
                  >
                    <div class="flex flex-col">
                      <div class="text-sm break-words">{{ message.text }}</div>
                      <div
                        class="text-xs mt-1 text-right"
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
                  class="text-center text-gray-500 flex flex-col h-full justify-center items-center p-8"
                >
                  <div class="text-4xl mb-4">💬</div>
                  <div class="text-lg font-semibold mb-2">Нет сообщений</div>
                  <div class="text-sm">Начните общение первым!</div>
                </div>
              </div>

              <!-- Message Input -->
              <div class="px-3 sm:px-4 py-2 border-t bg-white">
                <form
                  @submit.prevent="sendMessage"
                  class="flex gap-2 items-end"
                >
                  <textarea
                    v-model="newMessage"
                    @keydown="handleKeydown"
                    placeholder="Введите сообщение..."
                    :rows="textareaRows"
                    class="flex-1 rounded-2xl content-center px-4 py-3 border-none outline-none resize-none min-h-[44px] max-h-32 overflow-y-auto bg-gray-100 focus:bg-gray-200 transition-colors text-sm sm:text-base"
                    :disabled="!isConnected"
                    ref="textareaRef"
                  />
                  <button
                    type="submit"
                    class="bg-blue-500 text-white p-2 sm:px-4 sm:py-3 rounded-full sm:rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-[44px] w-[44px] sm:w-auto sm:h-[52px]"
                    :disabled="!newMessage.trim() || !isConnected"
                  >
                    <SendHorizontal :size="20" class="sm:mr-1" />
                    <span class="hidden sm:inline">Отпр.</span>
                  </button>
                </form>
              </div>
            </template>

            <!-- No Chat Selected -->
            <div
              v-else
              class="flex-1 flex items-center justify-center text-gray-500 bg-gradient-to-br from-blue-50 to-purple-50"
            >
              <div class="text-center p-8">
                <div class="text-6xl mb-4">👋</div>
                <div class="text-xl font-semibold mb-2" v-if="auth.user">
                  Добро пожаловать!
                </div>
                <div class="text-lg font-semibold mb-2" v-else>Загрузка...</div>
                <div class="text-sm text-gray-600 max-w-sm">
                  Выберите чат из списка или создайте новый для начала общения
                </div>
                <button
                  v-if="auth.user && isMobile"
                  @click="createNewChat"
                  class="mt-4 bg-blue-500 text-white py-3 px-6 rounded-full hover:bg-blue-600 transition-colors font-medium"
                >
                  Создать новый чат
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Стили для скроллбара как в Telegram */
.messages-container::-webkit-scrollbar {
  width: 4px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c5c5c5;
  border-radius: 2px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Анимации для мобильного интерфейса */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}
</style>
