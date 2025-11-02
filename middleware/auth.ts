export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuth();

  // Если пользователь не авторизован и пытается зайти в чат
  if (!auth.isAuthenticated.value && to.path === "/chat") {
    return navigateTo("/login");
  }

  // Если пользователь авторизован и пытается зайти на логин
  if (auth.isAuthenticated.value && to.path === "/login") {
    return navigateTo("/chat");
  }
});
