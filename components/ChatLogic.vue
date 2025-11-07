<script setup lang="ts">
/* Взято из pages/chat.vue — логика не изменялась, только вынесена сюда.
   Всё как было: composables, state, methods, watch, onMounted и т.д.
*/

const { isMobile } = useDevice();

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

interface User {
  id: string;
  phone: string;
  name: string;
}

// Composables
const { connect, isConnected, connectionError, loadedChats, addNewChat } =
  useCentrifuge();
const auth = useAuth();
const messagesStore = useMessagesStore();

// State
const currentUser = computed(() => auth.user?.id || "");
const selectedChat = ref<Chat | null>(null);
const newMessage = ref("");
const messagesContainer = ref<HTMLElement | null>(null);
const searchUser = ref("");
const isOpen = ref(false);
const isAuthInitialized = ref(false);
const searchResults = ref<User[]>([]);
const showSearchResults = ref(false);
const searchTimeout = ref<NodeJS.Timeout | null>(null);

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
        console.log("📋 Current chats:", loadedChats.value);
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
  addNewChat({
    id: chatId,
    name: `${chatId}`,
    userCount: 1,
    lastMessage:
      message.length > 50 ? message.substring(0, 50) + "..." : message,
  });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    if (event.shiftKey) {
      // Shift+Enter - allow newline
    } else {
      event.preventDefault();
      sendMessage();
      calculateRows();
    }
  }
};

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const textareaRows = ref(1);

const calculateRows = () => {
  if (!textareaRef.value) return 1;
  const textarea = textareaRef.value;
  const lineHeight = 20;
  const padding = 24;
  textarea.style.height = "auto";
  const contentHeight = textarea.scrollHeight - padding;
  const calculatedRows = Math.max(
    1,
    Math.min(6, Math.floor(contentHeight / lineHeight))
  );
  return calculatedRows;
};

watch(newMessage, () => {
  nextTick(() => {
    textareaRows.value = calculateRows();
  });
});

const searchUsers = async () => {
  if (!searchUser.value.trim()) {
    searchResults.value = [];
    showSearchResults.value = false;
    return;
  }

  try {
    console.log("🔍 Searching users for:", searchUser.value);

    const { data, error } = await useFetch("/api/users", {
      method: "GET",
      query: {
        phone: searchUser.value,
        currentUserId: currentUser.value,
      },
    });

    if (error.value) {
      console.error("❌ Search error:", error.value);
      return;
    }

    if (data.value?.users) {
      searchResults.value = data.value.users;
      showSearchResults.value = true;
      console.log(`✅ Found ${searchResults.value.length} users`);
    }
  } catch (error) {
    console.error("❌ Failed to search users:", error);
  }
};

const handleSearchInput = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
  searchTimeout.value = setTimeout(() => {
    searchUsers();
  }, 2000);
};

const createChatWithUser = async (user: User) => {
  const chatId = `${currentUser.value}_${user.id}_${Date.now()}`;
  const newChat: Chat = {
    id: chatId,
    name: `${user.phone}`,
    userCount: 2,
    lastMessage: "Нет сообщений",
  };

  try {
    console.log("🔄 Creating chat with user:", user);

    addNewChat(newChat);
    console.log("✅ Chat added locally, now selecting:", newChat);

    selectChat(newChat);

    showSearchResults.value = false;
    searchUser.value = "";

    const response = await $fetch("/api/chats", {
      method: "POST",
      body: {
        chat: newChat,
        currentUserId: currentUser.value,
        participants: [currentUser.value, user.id],
      },
    });

    if (response.success) {
      console.log("✅ Chat created successfully on server:", newChat);
    } else {
      console.error("❌ Failed to create chat on server:", response.error);
    }
  } catch (error) {
    console.error("❌ Error creating chat on server:", error);
  }
};

const createNewChat = async () => {
  const newChatId = `personal_${currentUser.value}_${Date.now()}`;
  const newChat: Chat = {
    id: newChatId,
    name: `Мой чат ${new Date().toLocaleTimeString()}`,
    userCount: 1,
    lastMessage: "Нет сообщений",
  };

  try {
    console.log("🔄 Creating new personal chat:", newChat);

    addNewChat(newChat);
    console.log("✅ Chat added locally, now selecting:", newChat);

    selectChat(newChat);

    const response = await $fetch("/api/chats", {
      method: "POST",
      body: {
        chat: newChat,
        currentUserId: currentUser.value,
        participants: [currentUser.value],
      },
    });

    if (response.success) {
      console.log("✅ Personal chat created successfully on server:", newChat);
    } else {
      console.error(
        "❌ Failed to create personal chat on server:",
        response.error
      );
    }
  } catch (error) {
    console.error("❌ Error creating personal chat on server:", error);
  }
};

const selectChat = (chat: Chat) => {
  selectedChat.value = chat;
  console.log("✅ Chat selected:", chat);
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
    const messagesStore = useMessagesStore();
    messagesStore.addMessage(selectedChat.value.id, message);
    updateChatLastMessage(selectedChat.value.id, newMessage.value);
    newMessage.value = "";
    nextTick(() => scrollToBottom());

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

const closeSearchResults = () => {
  showSearchResults.value = false;
};

// Watch for loadedChats changes to debug
watch(
  loadedChats,
  (newChats) => {
    console.log("🔄 loadedChats updated:", newChats);
  },
  { deep: true }
);

onMounted(async () => {
  console.log("🔄 Chat component mounted");

  const isAuthed = auth.checkAuth();
  console.log("🔍 Auth check result:", isAuthed);
  console.log("🔍 Auth user:", auth.user);

  if (isAuthed && auth.user?.id) {
    console.log("✅ User authenticated, initializing chat...");
    await initializeChat();
    isAuthInitialized.value = true;
  } else {
    console.error("❌ User not authenticated even after check");
    if (process.client) {
      const savedUser = localStorage.getItem("chat-user");
      console.log("🔍 Direct localStorage check:", savedUser);
      if (savedUser) {
        console.log("🔄 Trying to manually restore user from localStorage...");
        try {
          const userData = JSON.parse(savedUser);
          // @ts-ignore
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

watch(currentMessages, () => {
  nextTick(() => scrollToBottom());
});

function clearsearchUser() {
  searchUser.value = "";
  searchResults.value = [];
  showSearchResults.value = false;
}

const items = [
  [
    {
      label: "Пункт 1",
      icon: "i-heroicons-pencil-square",
    },
  ],
];

// Expose everything used by templates
defineExpose({
  // state & refs
  currentUser,
  selectedChat,
  newMessage,
  messagesContainer,
  searchUser,
  isOpen,
  isAuthInitialized,
  searchResults,
  showSearchResults,
  searchTimeout,
  textareaRef,
  textareaRows,
  // computed
  currentMessages,
  displayChats,
  // composables / status
  auth,
  isConnected,
  connectionError,
  loadedChats,
  addNewChat,
  // methods
  initializeChat,
  updateChatLastMessage,
  handleKeydown,
  calculateRows,
  searchUsers,
  handleSearchInput,
  createChatWithUser,
  createNewChat,
  selectChat,
  sendMessage,
  scrollToBottom,
  formatTime,
  closeSearchResults,
  clearsearchUser,
  // other
  items,
});
</script>
