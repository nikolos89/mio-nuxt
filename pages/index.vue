<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="text-center">
      <div class="text-2xl mb-4">⏳</div>
      <div>Перенаправление...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

const auth = useAuth();

onMounted(() => {
  auth.initAuth();

  if (auth.isAuthenticated.value) {
    navigateTo("/chat");
  } else {
    navigateTo("/login");
  }
});
</script>
