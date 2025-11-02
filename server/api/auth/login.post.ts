export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { phone } = body;

    // Валидация номера телефона (только цифры, 10-15 символов)
    const phoneRegex = /^\d{10,15}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return {
        success: false,
        message:
          "Введите корректный номер телефона (только цифры, 10-15 символов)",
      };
    }

    // Генерируем 4-значный код
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Временное хранилище кодов (всегда перезаписываем старый код)
    const storage = useStorage("auth");
    await storage.setItem(`code:${phone}`, {
      code,
      phone,
      createdAt: Date.now(),
      attempts: 0,
    });

    console.log(`🔐 Код для ${phone}: ${code}`); // В продакшене убрать!

    return {
      success: true,
      message: `Код отправлен на ${phone}`,
      // В реальном приложении здесь была бы отправка SMS
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Ошибка сервера",
    };
  }
});
