<template>
  <div class="error-page">
    <div class="error-content card">
      <h1>{{ error.statusCode }}</h1>
      <p>{{ error.message }}</p>
      <button class="btn" @click="handleError">返回首页</button>
    </div>
  </div>
</template>

<script setup>
const error = useError()

const handleError = () => {
  clearError()
  navigateTo('/')
}
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-content {
  text-align: center;
  padding: 3rem;
}

h1 {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

p {
  margin-bottom: 2rem;
  color: var(--text-color);
}
</style> 