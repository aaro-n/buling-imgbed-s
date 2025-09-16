<!-- pages/pages/profile.vue -->  
<template>  
  <div class="profile-page">  
    <div class="page-header">  
      <h2>个人资料设置</h2>  
    </div>  
  
    <div class="profile-form">  
      <div class="form-section">  
        <h3>基本信息</h3>  
        <div class="form-group">  
          <label>用户名:</label>  
          <input v-model="profile.username" type="text" readonly class="readonly-input">  
        </div>  
        <div class="form-group">  
          <label>邮箱:</label>  
          <input v-model="profile.email" type="email">  
        </div>  
      </div>  
  
      <div class="form-section">  
        <h3>上传设置</h3>  
        <div class="form-group">  
          <label class="checkbox-label">  
            <input type="checkbox" v-model="profile.enable_time_path">  
            启用时间路径 (YYYY/MM/DD/)  
          </label>  
          <p class="help-text">启用后，上传的图片将按日期自动分类到对应文件夹</p>  
        </div>  
        <div class="form-group">  
          <label class="checkbox-label">  
            <input type="checkbox" v-model="profile.enable_image_optimization">  
            启用图片压缩优化  
          </label>  
          <p class="help-text">自动压缩大图片以节省存储空间</p>  
        </div>  
      </div>  
  
      <div class="form-section">  
        <h3>存储设置</h3>  
        <div class="form-group">  
          <label>R2存储桶自定义域名:</label>  
          <input v-model="profile.r2_custom_url" type="url" placeholder="https://your-domain.com">  
          <p class="help-text">设置后，图片链接将使用此域名而非默认域名</p>  
        </div>  
      </div>  
  
      <div class="form-actions">  
        <button @click="saveProfile" class="btn btn-primary" :disabled="saving">  
          {{ saving ? '保存中...' : '保存设置' }}  
        </button>  
      </div>  
    </div>  
  </div>  
</template>  
  
<script setup>  
import useApi from '~/services/api'  
import { toast } from '~/composables/useToast'  
  
definePageMeta({  
  middleware: 'auth'  
})  
  
const api = useApi()  
const saving = ref(false)  
const user = useState('user', () => null)  
  
const profile = ref({  
  username: '',  
  email: '',  
  enable_time_path: false,  
  enable_image_optimization: false,  
  r2_custom_url: ''  
})  
  
// 加载用户资料  
const loadProfile = async () => {  
  try {  
    const response = await api.getProfile()  
    if (response?.data) {  
      profile.value = { ...response.data }  
    }  
  } catch (err) {  
    toast.showToast('加载用户资料失败', 'error')  
  }  
}  
  
// 保存用户资料  
const saveProfile = async () => {  
  saving.value = true  
  try {  
    const response = await api.updateProfile(profile.value)  
    if (response?.success) {  
      // 更新全局用户状态  
      user.value = { ...user.value, ...profile.value }  
      toast.showToast('设置保存成功', 'success')  
    } else {  
      toast.showToast('保存失败', 'error')  
    }  
  } catch (err) {  
    toast.showToast('保存失败', 'error')  
  } finally {  
    saving.value = false  
  }  
}  
  
onMounted(() => {  
  loadProfile()  
})  
</script>  
  
<style scoped>  
.profile-page {  
  max-width: 800px;  
  margin: 0 auto;  
  padding: 20px;  
}  
  
.profile-form {  
  background: white;  
  border-radius: 8px;  
  padding: 30px;  
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);  
}  
  
.form-section {  
  margin-bottom: 30px;  
  padding-bottom: 20px;  
  border-bottom: 1px solid #eee;  
}  
  
.form-section:last-child {  
  border-bottom: none;  
}  
  
.form-section h3 {  
  margin-bottom: 20px;  
  color: #333;  
  font-size: 18px;  
}  
  
.form-group {  
  margin-bottom: 20px;  
}  
  
.form-group label {  
  display: block;  
  margin-bottom: 8px;  
  font-weight: 500;  
  color: #555;  
}  
  
.checkbox-label {  
  display: flex !important;  
  align-items: center;  
  cursor: pointer;  
}  
  
.checkbox-label input[type="checkbox"] {  
  margin-right: 10px;  
  margin-bottom: 0;  
}  
  
.form-group input[type="text"],  
.form-group input[type="email"],  
.form-group input[type="url"] {  
  width: 100%;  
  padding: 12px;  
  border: 1px solid #ddd;  
  border-radius: 4px;  
  font-size: 14px;  
}  
  
.readonly-input {  
  background-color: #f5f5f5;  
  cursor: not-allowed;  
}  
  
.help-text {  
  margin-top: 5px;  
  font-size: 12px;  
  color: #666;  
}  
  
.form-actions {  
  text-align: right;  
  margin-top: 30px;  
}  
  
.btn {  
  padding: 12px 24px;  
  border: none;  
  border-radius: 4px;  
  cursor: pointer;  
  font-size: 14px;  
  transition: background-color 0.3s;  
}  
  
.btn-primary {  
  background-color: #007bff;  
  color: white;  
}  
  
.btn-primary:hover:not(:disabled) {  
  background-color: #0056b3;  
}  
  
.btn:disabled {  
  opacity: 0.6;  
  cursor: not-allowed;  
}  
</style>
