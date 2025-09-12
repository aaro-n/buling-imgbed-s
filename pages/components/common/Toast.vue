<template>
  <div 
    v-show="visible" 
    class="toast" 
    :class="type"
  >
    {{ message }}
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info'
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  top:10vh;
  /* bottom: 2rem; */
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  color: white;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.8);
}

.success {
  background-color: rgba(34, 197, 94, 0.9);
}

.error {
  background-color: rgba(239, 68, 68, 0.9);
}
</style> 