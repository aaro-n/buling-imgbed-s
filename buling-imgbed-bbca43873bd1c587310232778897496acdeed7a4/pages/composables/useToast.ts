import { ref } from 'vue'

export function useToast() {
  const visible = ref(false)
  const message = ref('')
  const type = ref('info')

  const showToast = (msg: string, toastType: 'info' | 'success' | 'error' = 'info') => {
    message.value = msg
    type.value = toastType
    visible.value = true

    setTimeout(() => {
      visible.value = false
    }, 2000)
  }

  return {
    visible,
    message,
    type,
    showToast
  }
}

export const toast = useToast() 