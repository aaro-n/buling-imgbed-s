<script setup lang="ts">
import { toast } from '~/composables/useToast'
import Toast from '~/components/common/Toast.vue'
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
      <Toast 
        :visible="toast.visible.value" 
        :message="toast.message.value" 
        :type="toast.type.value" 
      />
    </NuxtLayout>
  </div>
</template>
