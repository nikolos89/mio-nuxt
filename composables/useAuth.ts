interface User {
  phone: string;
  id: string;
}

export const useAuth = () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  // Инициализация при загрузке - ФИКСИРОВАННАЯ ВЕРСИЯ
  const initAuth = () => {
    if (process.client) {
      const savedUser = localStorage.getItem("chat-user");
      console.log("🔄 Auth init - localStorage chat-user:", savedUser);
      if (savedUser) {
        try {
          user.value = JSON.parse(savedUser);
          console.log("✅ Auth initialized with user:", user.value);
        } catch (error) {
          console.error("❌ Failed to parse saved user:", error);
          localStorage.removeItem("chat-user");
        }
      } else {
        console.log("ℹ️ No saved user found in localStorage");
      }
    }
  };

  // Принудительная проверка авторизации
  const checkAuth = (): boolean => {
    if (process.client) {
      const savedUser = localStorage.getItem("chat-user");
      if (savedUser && !user.value) {
        try {
          user.value = JSON.parse(savedUser);
          console.log("✅ Auth checked and user restored:", user.value);
          return true;
        } catch (error) {
          console.error("❌ Failed to parse user during check:", error);
          return false;
        }
      }
    }
    return !!user.value;
  };

  // Вход - запрос кода
  const login = async (
    phone: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const data = await $fetch("/api/auth/login", {
        method: "POST",
        body: { phone },
      });

      return {
        success: data.success,
        message: data.message || "Код отправлен",
      };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.data?.message || "Ошибка сервера",
      };
    }
  };

  // Проверка кода
  const verify = async (
    phone: string,
    code: string
  ): Promise<{ success: boolean; user?: User; message: string }> => {
    try {
      const data = await $fetch("/api/auth/verify", {
        method: "POST",
        body: { phone, code },
      });

      if (data.success && data.user) {
        user.value = data.user;
        if (process.client) {
          localStorage.setItem("chat-user", JSON.stringify(data.user));
          localStorage.setItem("chat-user-id", data.user.id);
        }
        console.log("✅ User verified and saved:", data.user);
        return {
          success: true,
          user: data.user,
          message: "Успешный вход",
        };
      }

      return {
        success: false,
        message: data.message || "Неверный код",
      };
    } catch (error: any) {
      console.error("Verify error:", error);
      return {
        success: false,
        message: error.data?.message || "Ошибка сервера",
      };
    }
  };

  // Выход
  const logout = async (): Promise<void> => {
    try {
      await $fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      user.value = null;
      if (process.client) {
        localStorage.removeItem("chat-user");
        localStorage.removeItem("chat-user-id");
      }
      console.log("✅ User logged out");
      await navigateTo("/login");
    }
  };

  // Инициализируем сразу
  initAuth();

  return {
    user: readonly(user),
    isAuthenticated,
    login,
    verify,
    logout,
    initAuth,
    checkAuth, // Добавляем новую функцию
  };
};
