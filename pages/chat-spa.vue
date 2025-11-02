<script setup lang="ts">
// Эта страница рендерится только на клиенте
const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});

// Остальной код как в chat.vue, но оберните template в v-if="isClient"
</script>

<template>
  <div v-if="isClient">
    <!-- Весь ваш текущий template -->
  </div>
  <div v-else class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="text-2xl mb-4">⏳</div>
      <div class="text-lg">Загрузка чата...</div>
    </div>
  </div>
</template>
