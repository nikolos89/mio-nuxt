// // server/api/centrifugo/history.post.ts
// export default defineEventHandler(async (event) => {
//   const body = await readBody(event);
//   const { channel } = body;

//   const response = await $fetch("https://mio-messenger.com/api/centrifugo", {
//     method: "POST",
//     headers: {
//       Authorization: `apikey ${process.env.CENTRIFUGO_API_KEY}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       method: "history",
//       params: {
//         channel: channel,
//         limit: 100,
//       },
//     }),
//   });

//   return response;
// });

// server/api/centrifugo/history.post.ts
import { getRedis } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { channel, limit = 50 } = body;

  if (!channel) {
    throw createError({ statusCode: 400, message: "Channel is required" });
  }

  const redis = getRedis();
  const streamKey = `centrifugo.stream.${channel}`;

  try {
    // Читаем последние N сообщений из стрима
    const messages = await redis.xrevrange(streamKey, "+", "-", "COUNT", limit);

    const parsedMessages = messages.map(([id, fields]) => {
      const dataField = fields.find((f, i) => i % 2 === 0 && f === "data")
        ? fields[fields.indexOf("data") + 1]
        : null;

      let data = null;
      try {
        data = JSON.parse(dataField || "{}");
      } catch {
        data = { raw: dataField };
      }

      return {
        id,
        ...data.message, // у тебя именно message внутри data
      };
    });

    return {
      messages: parsedMessages.reverse(), // в прямом порядке
      count: parsedMessages.length,
    };
  } catch (err) {
    console.error("❌ Redis history load error:", err);
    throw createError({
      statusCode: 500,
      message: "Failed to load messages from Redis",
    });
  }
});
