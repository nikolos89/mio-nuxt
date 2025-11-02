export default defineEventHandler(async (event) => {
  const apiKey =
    "GGMnEv_F6rZjnMQqCousEmqhlOJm0LuodrHnUxfpJRxzqI41u4t-Tjze8Qpk3XFRIwiRd9SB-R_0pcCji1agVA";
  const body = await readBody(event);

  try {
    const response = await $fetch("http://mio-messenger.com:8000/api", {
      method: "POST",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "publish",
        params: {
          channel: body.channel,
          data: body.data,
        },
      }),
    });

    return {
      success: true,
      data: response,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
});
