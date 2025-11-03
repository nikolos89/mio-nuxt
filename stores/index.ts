// stores/index.ts
export const useMessagesStore = defineStore("messages", () => {
  const messages = ref<Record<string, any[]>>({});

  const addMessages = (chatId: string, newMessages: any[]) => {
    if (!messages.value[chatId]) {
      messages.value[chatId] = [];
    }

    newMessages.forEach((msg) => {
      const exists = messages.value[chatId].some((m) => m.id === msg.id);
      if (!exists) {
        messages.value[chatId].push(msg);
      }
    });

    messages.value[chatId].sort((a, b) => a.timestamp - b.timestamp);
  };

  const getMessages = (chatId: string) => {
    return messages.value[chatId] || [];
  };

  const addMessage = (chatId: string, message: any) => {
    if (!messages.value[chatId]) {
      messages.value[chatId] = [];
    }

    const exists = messages.value[chatId].some((m) => m.id === message.id);
    if (!exists) {
      messages.value[chatId].push(message);
      messages.value[chatId].sort((a, b) => a.timestamp - b.timestamp);
    }
  };

  return { messages, addMessages, getMessages, addMessage };
});
