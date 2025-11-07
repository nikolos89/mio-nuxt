<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { SendHorizontal, CheckCheck, Search, X, Menu } from "lucide-vue-next";
import ChatLogic from "./ChatLogic.vue";

// ref на компонент с логикой
const logic = ref<any>(null);

/* --- PROXIES (имена точь-в-точь как в шаблоне) --- */
const auth = computed(() => logic.value?.auth ?? null);
const isConnected = computed(() => {
  return logic.value ? unref(logic.value.isConnected) : false;
});

const connectionError = computed(
  () => logic.value?.connectionError?.value ?? null
);

const searchUserLocal = computed({
  get: () => logic.value?.searchUser?.value ?? "",
  set: (v: string) => {
    if (logic.value) logic.value.searchUser.value = v;
  },
});
const handleSearchInputLocal = () => logic.value?.handleSearchInput?.();
const clearsearchUserLocal = () => logic.value?.clearsearchUser?.();

const showSearchResultsLocal = computed(
  () => logic.value?.showSearchResults?.value ?? false
);
const searchResultsLocal = computed(
  () => logic.value?.searchResults?.value ?? []
);
const createChatWithUserLocal = (user: any) =>
  logic.value?.createChatWithUser?.(user);

const createNewChatLocal = () => logic.value?.createNewChat?.();

const displayChatsLocal = computed(
  () => logic.value?.displayChats?.value ?? []
);
const selectChatLocal = (chat: any) => logic.value?.selectChat?.(chat);
const selectedChatLocal = computed(
  () => logic.value?.selectedChat?.value ?? null
);

const messagesContainerLocalRef = ref<HTMLElement | null>(null);
const messagesContainerLocal = computed(
  () => logic.value?.messagesContainer ?? null
);

const currentMessagesLocal = computed(
  () => logic.value?.currentMessages?.value ?? []
);
const currentUserLocal = computed(() => logic.value?.currentUser?.value ?? "");

const formatTimeLocal = (ts: number) => logic.value?.formatTime?.(ts);

const sendMessageLocal = () => logic.value?.sendMessage?.();

const textareaRefLocal = ref<HTMLTextAreaElement | null>(null);
const textareaRowsLocal = computed(() => logic.value?.textareaRows?.value ?? 1);

const newMessageLocal = computed({
  get: () => logic.value?.newMessage?.value ?? "",
  set: (v: string) => {
    if (logic.value) logic.value.newMessage.value = v;
  },
});

const handleKeydownLocal = (e: KeyboardEvent) =>
  logic.value?.handleKeydown?.(e);

const closeSearchResults = () => logic.value?.closeSearchResults?.();

onMounted(() => {
  // связываем DOM ref'ы с логикой, если logic уже доступна — либо ждать когда станет
  if (logic.value) {
    logic.value.messagesContainer = messagesContainerLocalRef.value;
    logic.value.textareaRef = textareaRefLocal.value;
  } else {
    // если logic ещё не установлен в момент mount, watch за logic
    const stop = watch(
      () => logic.value,
      (val) => {
        if (val) {
          val.messagesContainer = messagesContainerLocalRef.value;
          val.textareaRef = textareaRefLocal.value;
          stop();
        }
      }
    );
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100" @click="closeSearchResults">
    <!-- Подключаем ChatLogic (логика) -->
    <ChatLogic ref="logic" />

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
          <div>
            <div v-if="$device.isDesktop">Desktop</div>
            <div v-else-if="$device.isTablet">Tablet</div>
            <div v-else>Mobile</div>
          </div>

          <p class="text-sm text-gray-600" v-if="auth && auth.user">
            {{ auth.user.phone }}
          </p>
          <p class="text-sm text-red-600" v-else>Не авторизован</p>
          <button
            @click="auth && auth.logout && auth.logout()"
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
                v-model="searchUserLocal"
                @input="handleSearchInputLocal"
                type="text"
                maxlength="25"
                placeholder="Найти пользователя..."
                class="w-full pr-7 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                :disabled="!isConnected"
                @click.stop
              />
              <Search
                class="absolute right-6 top-1/2 transform -translate-y-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                v-if="!searchUserLocal"
              />
              <X
                class="absolute right-6 top-1/2 transform -translate-y-[2px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                :size="20"
                @click="clearsearchUserLocal()"
                v-if="searchUserLocal"
              />

              <!-- Результаты поиска -->
              <div
                v-if="showSearchResultsLocal && searchResultsLocal.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-10"
                @click.stop
              >
                <div
                  v-for="user in searchResultsLocal"
                  :key="user.id"
                  @click="createChatWithUserLocal(user)"
                  class="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div class="font-medium text-gray-800">{{ user.phone }}</div>
                  <div class="text-sm text-gray-500">{{ user.name }}</div>
                </div>
              </div>

              <!-- Сообщение "ничего не найдено" -->
              <div
                v-if="showSearchResultsLocal && searchResultsLocal.length === 0"
                class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10"
                @click.stop
              >
                <div class="px-4 py-3 text-gray-500 text-center">
                  Пользователи не найдены
                </div>
              </div>
            </div>

            <div class="p-4 border-b">
              <button
                @click="createNewChatLocal"
                class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                :disabled="!(auth && auth.user)"
              >
                Новый чат
              </button>
            </div>

            <div class="flex-1 overflow-y-auto">
              <div
                v-if="!(auth && auth.user)"
                class="p-4 text-center text-gray-500"
              >
                Загрузка...
              </div>
              <div
                v-else-if="displayChatsLocal.length === 0"
                class="p-4 text-center text-gray-500"
              >
                Нет чатов. Создайте первый чат!
              </div>
              <div
                v-else
                v-for="chat in displayChatsLocal"
                :key="chat.id"
                @click="selectChatLocal(chat)"
                class="px-4 py-4 pr-2 border-b cursor-pointer transition-colors hover:bg-blue-50"
                :class="{
                  'bg-blue-100 border-blue-200':
                    selectedChatLocal?.id === chat.id,
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
            <template v-if="selectedChatLocal && auth && auth.user">
              <!-- Messages -->
              <div
                ref="messagesContainerLocal"
                class="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50"
              >
                <div
                  v-for="message in currentMessagesLocal"
                  :key="message.id"
                  class="flex"
                  :class="{
                    'justify-end': message.sender === currentUserLocal,
                  }"
                >
                  <div
                    class="max-w-xs lg:max-w-md px-3 py-[2px] rounded-2xl shadow-sm"
                    :class="
                      message.sender === currentUserLocal
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none border'
                    "
                  >
                    <div class="flex justify-between">
                      <div class="text-sm">{{ message.text }}</div>
                      <div
                        class="text-xs mt-1.5 pb-[3px] text-right pl-2 flex flex-col justify-end"
                        :class="
                          message.sender === currentUserLocal
                            ? 'text-blue-200'
                            : 'text-gray-400'
                        "
                      >
                        {{ formatTimeLocal(message.timestamp) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="currentMessagesLocal.length === 0"
                  class="text-center text-gray-500 flex flex-col h-full justify-center items-center"
                >
                  <div class="text-lg">Нет сообщений</div>
                  <div class="text-sm">Начните общение первым!</div>
                </div>
              </div>

              <!-- Message Input -->
              <div class="px-4 py-2 border-t bg-white">
                <form
                  @submit.prevent="sendMessageLocal"
                  class="flex gap-2 items-center"
                >
                  <textarea
                    v-model="newMessageLocal"
                    @keydown="handleKeydownLocal"
                    placeholder="Введите сообщение..."
                    :rows="textareaRowsLocal"
                    class="flex-1 rounded-lg content-center px-4 py-3 border-none outline-none resize-none min-h-[52px] max-h-32 overflow-y-auto"
                    :disabled="!isConnected"
                    ref="textareaRefLocal"
                  />
                  <button
                    type="submit"
                    class="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-[52px]"
                    :disabled="!newMessageLocal.trim() || !isConnected"
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
                <div class="text-lg font-semibold" v-if="auth && auth.user">
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
