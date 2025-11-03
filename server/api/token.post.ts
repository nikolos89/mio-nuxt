export default defineEventHandler(async (event) => {
  try {
    // Теперь получаем пользователя из авторизации
    const authHeader = getHeader(event, "authorization");
    // В реальном приложении здесь была бы проверка JWT токена
    // Пока используем простой подход

    const body = await readBody(event);
    const { userId } = body;

    if (!userId) {
      return {
        error: "User ID is required",
        success: false,
      };
    }

    const secret =
      "9hfBoHP9HujBtnKoc-KMEDFnTCmPWfjZxCoHacagiI0HLcOww503Qz64tZrstfKD-foGBGeUdoQ8_lyt";

    const { createHmac } = await import("node:crypto");

    // 10 лет в секундах
    const oneDayInSeconds = 1 * 1 * 24 * 60 * 60; // 1 день в секундах

    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + oneDayInSeconds,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      "base64url"
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );

    const signature = createHmac("sha256", secret)
      .update(encodedHeader + "." + encodedPayload)
      .digest("base64url");

    const token = encodedHeader + "." + encodedPayload + "." + signature;

    return {
      token,
      success: true,
    };
  } catch (error: any) {
    console.error("Token generation error:", error);
    return {
      error: error.message,
      success: false,
    };
  }
});
