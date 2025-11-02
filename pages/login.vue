<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: "auth",
});

const auth = useAuth();
const router = useRouter();

const step = ref<"phone" | "code">("phone");
const phone = ref("");
const code = ref("");
const phoneError = ref("");
const codeError = ref("");
const message = ref("");
const messageType = ref<"success" | "error">("success");
const loading = ref(false);

// Валидация телефона
const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phone);
};

// Сброс формы
const resetForm = () => {
  step.value = "phone";
  code.value = "";
  message.value = "";
  phoneError.value = "";
  codeError.value = "";
};

// Запрос нового кода
const requestNewCode = async () => {
  if (!validatePhone(phone.value)) {
    message.value = "Введите корректный номер телефона";
    messageType.value = "error";
    return;
  }

  loading.value = true;
  message.value = "";

  try {
    const result = await auth.login(phone.value);

    if (result.success) {
      message.value = "Новый код отправлен";
      messageType.value = "success";
      code.value = ""; // Очищаем поле кода
    } else {
      message.value = result.message;
      messageType.value = "error";
    }
  } catch (error: any) {
    message.value = "Ошибка при запросе кода";
    messageType.value = "error";
    console.error("Request code error:", error);
  } finally {
    loading.value = false;
  }
};

// Обработка отправки формы
const handleSubmit = async () => {
  phoneError.value = "";
  codeError.value = "";
  message.value = "";
  loading.value = true;

  try {
    if (step.value === "phone") {
      // Валидация телефона
      if (!validatePhone(phone.value)) {
        phoneError.value = "Введите корректный номер телефона (10-15 цифр)";
        return;
      }

      // Запрос кода
      const result = await auth.login(phone.value);

      if (result.success) {
        step.value = "code";
        message.value = result.message;
        messageType.value = "success";
      } else {
        message.value = result.message;
        messageType.value = "error";
      }
    } else {
      // Проверка кода
      if (!code.value || code.value.length !== 4) {
        codeError.value = "Введите 4-значный код";
        return;
      }

      const result = await auth.verify(phone.value, code.value);

      if (result.success && result.user) {
        message.value = result.message;
        messageType.value = "success";

        // Ждем немного чтобы показать сообщение об успехе
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Редирект в чат
        await navigateTo("/chat");
      } else {
        message.value = result.message;
        messageType.value = "error";
      }
    }
  } catch (error: any) {
    message.value = "Произошла ошибка. Попробуйте еще раз.";
    messageType.value = "error";
    console.error("Auth error:", error);
  } finally {
    loading.value = false;
  }
};

// Авто-редирект если уже авторизован
onMounted(() => {
  if (auth.isAuthenticated.value) {
    navigateTo("/chat");
  }
});

// const phoneError = ref("");
// const loading = ref(false);

const formatPhone = (event: Event) => {
  const target = event.target as HTMLInputElement;
  phone.value = target.value.replace(/\D/g, "");
};
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
  >
    <!-- Анимированный градиентный фон -->
    <div
      class="absolute inset-0 bg-gradient-rotate animate-gradient-rotate"
    ></div>

    <!-- Контент -->
    <div
      class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 relative z-10"
    >
      <!-- Заголовок -->
      <div class="text-center mb-8">
        <h1
          class="text-3xl font-bold text-gray-900 mb-2 flex flex-row w-full justify-center"
        >
          <div class="text-[#C71585]">M</div>
          <div class="text-[#FF1493]">i</div>
          <div class="text-[#FF69B4]">o</div>
        </h1>
        <p class="text-gray-600">Message Input Output</p>
      </div>

      <!-- Форма входа -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Ввод телефона -->
        <div v-if="step === 'phone'">
          <label
            for="phone"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Номер телефона
          </label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="79991234567"
            @input="formatPhone"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none hover:shadow-md focus:shadow transition-shadow duration-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            :class="{ 'border-red-500': phoneError }"
            maxlength="15"
            :disabled="loading"
          />
          <p v-if="phoneError" class="mt-2 text-sm text-red-600">
            {{ phoneError }}
          </p>
          <p class="mt-2 text-xs text-gray-500">
            Только цифры, без пробелов и спецсимволов.
          </p>
        </div>

        <!-- Ввод кода -->
        <div v-if="step === 'code'">
          <label
            for="code"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Код подтверждения
          </label>
          <input
            id="code"
            v-model="code"
            type="text"
            placeholder="1234"
            maxlength="4"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 hover:shadow-md focus:shadow focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-2xl tracking-widest"
            :class="{ 'border-red-500': codeError }"
            :disabled="loading"
          />
          <p v-if="codeError" class="mt-2 text-sm text-red-600">
            {{ codeError }}
          </p>
          <!-- <p class="mt-2 text-md text-gray-500 text-center">
            Код отправлен на {{ phone }}
            <button
              type="button"
              @click="requestNewCode"
              class="text-blue-600 hover:text-blue-800 underline ml-1"
              :disabled="loading"
            >
              Запросить новый код
            </button>
          </p> -->
        </div>

        <!-- Сообщения -->
        <div
          v-if="message"
          class="p-3 rounded-lg text-sm flex justify-between items-center"
          :class="
            messageType === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          "
        >
          <div class="">
            {{ message }}
          </div>
          <div
            @click="requestNewCode"
            class="text-white text-sx text-slate-300 py-1 px-2 bg-gray-300 rounded-md w-fit cursor-pointer hover:bg-gray-400 transition-colors"
            :disabled="loading"
          >
            перезапросить
          </div>
        </div>

        <!-- Кнопки -->
        <div class="space-y-3">
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg
                class="animate-spin h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{ step === "phone" ? "Получить код" : "Войти" }}
            </span>
            <span v-else>
              {{ step === "phone" ? "Получить код" : "Войти" }}
            </span>
          </button>

          <button
            v-if="step === 'code'"
            type="button"
            @click="resetForm"
            class="w-full text-gray-600 py-2 px-4 rounded-lg hover:text-gray-800 transition-colors"
            :disabled="loading"
          >
            ← Назад к вводу номера
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style>
.bg-gradient-rotate {
  background: linear-gradient(-45deg, #f0f9ff, #ebd4ff, #dddbff, #f0f9ff);
  background-size: 400% 400%;
}

@keyframes gradient-rotate {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.animate-gradient-rotate {
  animation: gradient-rotate 6s ease infinite;
}
</style>
