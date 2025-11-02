interface User {
  phone: string;
  id: string;
}

export const useAuth = () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  // Инициализация при загрузке
  const initAuth = () => {
    if (process.client) {
      const savedUser = localStorage.getItem("chat-user");
      if (savedUser) {
        user.value = JSON.parse(savedUser);
      }
    }
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
        }
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
      }
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
  };
};
