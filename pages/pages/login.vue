<template>
  <div class="auth-page">
    <div class="login-page card">
      <h2>登录</h2>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input id="username" v-model="formData.username" type="text" required>
        </div>
 
        <div class="form-group">
          <label for="password">密码</label>
          <input id="password" v-model="formData.password" type="password" required>
        </div>
 
        <button type="submit" class="btn login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
 
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
    </div>
  </div>
</template>
 
<script setup>
import useApi from '~/services/api'
import { toast } from '~/composables/useToast'
 
const api = useApi()
const formData = ref({
  username: '',
  password: ''
})
 
const loading = ref(false)
const error = ref('')
const { setToken } = useAuth()
const router = useRouter()
 
const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''
 
    const response = await api.login(formData.value)
    if (response.success) {
      setToken(response.token)  // 修复：现在response包含token
      toast.showToast('登录成功', 'success')
      router.push('/upload')
    } else {
      error.value = response.message || '登录失败'
    }
  } catch (err) {
    console.error('登录错误:', err)
    error.value = err.message || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
 
<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--background-color);
}
.login-page {
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}
 
h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-color);
}
 
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
 
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
label {
  color: var(--text-color);
}
 
input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
}
 
.login-btn {
  width: 100%;
}
 
.error-message {
  color: #ef4444;
  text-align: center;
}
</style>
