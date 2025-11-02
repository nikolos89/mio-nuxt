// server/api/chats.get.ts
export default defineEventHandler(async (event) => {
  // Здесь должна быть логика загрузки чатов из БД
  // Пока вернем тестовые данные

  return {
    chats: [
      {
        id: "1111",
        name: "Общий чат1",
        userCount: 3, // ДОЛЖНО БЫТЬ
        lastMessage: "Добро пожаловать!1", // опционально
      },
      {
        id: "2222",
        name: "Техподдержка2",
        userCount: 2,
        lastMessage: "Чем можем помочь?2",
      },
      {
        id: "3333",
        name: "Разработка3",
        userCount: 5,
        lastMessage: "Обсуждаем новые фичи3",
      },
    ],
  };
});
