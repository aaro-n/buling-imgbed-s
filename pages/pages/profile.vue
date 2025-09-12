<template>
  <div class="profile-page">
    <div class="card profile-card">
      <h2>个人资料</h2>

      <div v-if="loading" class="loading">加载中...</div>

      <div class="profile-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <div class="input-group">
            <input id="username" v-model="tempValues.username" type="text" autocomplete="off"
              :disabled="!editingField.username">
            <template v-if="editingField.username">
              <button type="button" class="edit-btn confirm" 
                :disabled="saving" 
                @click="confirmEdit('username')">
                {{ saving ? '更新中...' : '确认' }}
              </button>
              <button type="button" class="edit-btn cancel" @click="cancelEdit('username')">取消</button>
            </template>
            <button v-else type="button" class="edit-btn" @click="startEdit('username')">修改</button>
          </div>
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <div class="input-group">
            <input id="password" type="text" v-model="tempValues.password" autocomplete="new-password"
              :disabled="!editingField.password">
            <template v-if="editingField.password">
              <button type="button" class="edit-btn confirm" 
                :disabled="saving" 
                @click="confirmEdit('password')">
                {{ saving ? '更新中...' : '确认' }}
              </button>
              <button type="button" class="edit-btn cancel" @click="cancelEdit('password')">取消</button>
            </template>
            <button v-else type="button" class="edit-btn" @click="startEdit('password')">修改</button>
          </div>
        </div>

        <div class="form-group">
          <label for="chat_id">绑定TG用户ID</label>
          <div class="input-group">
            <input id="chat_id" v-model="tempValues.chat_id" type="number" autocomplete="off"
              :disabled="!editingField.chat_id">
            <template v-if="editingField.chat_id">
              <button type="button" class="edit-btn confirm" 
                :disabled="saving" 
                @click="confirmEdit('chat_id')">
                {{ saving ? '更新中...' : '确认' }}
              </button>
              <button type="button" class="edit-btn cancel" @click="cancelEdit('chat_id')">取消</button>
            </template>
            <button v-else type="button" class="edit-btn" @click="startEdit('chat_id')">修改</button>
          </div>
        </div>

        <div class="form-group">
          <label for="r2_custom_url">R2存储桶链接</label>
          <div class="input-group">
            <input id="r2_custom_url" v-model="tempValues.r2_custom_url" type="url"  autocomplete="off"
              :disabled="!editingField.r2_custom_url">
            <template v-if="editingField.r2_custom_url">
              <button type="button" class="edit-btn confirm" 
                :disabled="saving" 
                @click="confirmEdit('r2_custom_url')">
                {{ saving ? '更新中...' : '确认' }}
              </button>
              <button type="button" class="edit-btn cancel" @click="cancelEdit('r2_custom_url')">取消</button>
            </template>
            <button v-else type="button" class="edit-btn" @click="startEdit('r2_custom_url')">修改</button>
          </div>
        </div>


        <div class="form-group">
          <label for="enable_baidu_cdn">开启百度CDN加速</label>
          <div class="input-group">
            <select id="enable_baidu_cdn" v-model="tempValues.enable_baidu_cdn"
              :disabled="!editingField.enable_baidu_cdn">
              <option :value="0">关闭</option>
              <option :value="1">开启</option>
            </select>
            <template v-if="editingField.enable_baidu_cdn">
              <button type="button" class="edit-btn confirm" 
                :disabled="saving" 
                @click="confirmEdit('enable_baidu_cdn')">
                {{ saving ? '更新中...' : '确认' }}
              </button>
              <button type="button" class="edit-btn cancel" @click="cancelEdit('enable_baidu_cdn')">取消</button>
            </template>
            <button v-else type="button" class="edit-btn" @click="startEdit('enable_baidu_cdn')">修改</button>
          </div>
        </div>

        <div class="form-group">
          <label for="enable_image_optimization">前台启用图片压缩 (>500KB)</label>
          <div class="input-group">
            <select id="enable_image_optimization" v-model="tempValues.enable_image_optimization"
              :disabled="!editingField.enable_image_optimization">
              <option :value="0">关闭</option>
              <option :value="1">开启</option>
            </select>
            <template v-if="editingField.enable_image_optimization">
              <button type="button" class="edit-btn confirm" 
                :disabled="saving" 
                @click="confirmEdit('enable_image_optimization')">
                {{ saving ? '更新中...' : '确认' }}
              </button>
              <button type="button" class="edit-btn cancel" @click="cancelEdit('enable_image_optimization')">取消</button>
            </template>
            <button v-else type="button" class="edit-btn" @click="startEdit('enable_image_optimization')">修改</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import useApi from '~/services/api'
import { toast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  middleware: 'auth'
})
const user = useState('user', () => null)

const loading = ref(true)
const saving = ref(false)

const { setToken } = useAuth()

// 获取用户资料
const fetchProfile = async () => {
  try {
    loading.value = true
    if (!user.value) {
      console.log('用户数据为空')
      const api = useApi()
      const data = await api.getProfile()
      user.value = data
    }
  } catch (err) {
    toast.showToast('获取个人资料失败', 'error')
    console.error(err)
  } finally {
    loading.value = false
  }
}


// 添加编辑状态控制
const editingField = ref({
  username: false,
  chat_id: false,
  r2_custom_url: false,
  enable_baidu_cdn: false,
  enable_image_optimization: false,
  password: false
})

// 临时存储编辑值
const tempValues = ref({
  username: '',
  chat_id: '',
  r2_custom_url: '',
  enable_baidu_cdn: '',
  enable_image_optimization: '',
  password: '******'
})

// 监听user变化，更新tempValues
watch(() => user.value, (newUser) => {
  if (newUser) {
    tempValues.value = {
      username: newUser.username || '',
      chat_id: newUser.chat_id || '',
      r2_custom_url: newUser.r2_custom_url || '',
      enable_baidu_cdn: newUser.enable_baidu_cdn ?? 0,
      enable_image_optimization: newUser.enable_image_optimization ?? 0,
      password: '******'
    }
  }
}, { immediate: true })

// 开始编辑
const startEdit = (field) => {
  editingField.value[field] = true
  // 保存当前值作为临时值
  if (field !== 'password') {
    tempValues.value[field] = user.value[field]
  } else {
    tempValues.value.password = '' // 密码编辑时清空临时值
  }
  
  // 添加这段代码来实现输入框聚焦
  nextTick(() => {
    const input = document.getElementById(field)
    if (input) {
      input.focus()
    }
  })
}

// 确认编辑
const confirmEdit = async (field) => {
  try {
    if ((field === 'password' && tempValues.value[field] === '') ||
      (field !== 'password' && tempValues.value[field] === user.value[field])) {
      cancelEdit(field)
      return
    }

    saving.value = true
    const api = useApi()
    const value = tempValues.value[field]

    const response = await api.updateProfile({
      field,
      value
    })
    
    if (response.success) {
      if (response.token) {
        setToken(response.token)
      } else {
        user.value = response.data
      }
      toast.showToast('更新成功', 'success')
      editingField.value[field] = false
    } else {
      toast.showToast(response.message, 'error')
    }
  } catch (err) {
    toast.showToast(err.message, 'error')
  } finally {
    saving.value = false

  }
}

// 取消编辑
const cancelEdit = (field) => {
  editingField.value[field] = false
  if (field !== 'password') {
    // 恢复原值
    tempValues.value[field] = user.value[field]
  } else {
    tempValues.value[field] = '******'
  }

}

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  gap: 2rem;
}

.profile-card,
.stats-card {
  padding: 2rem;
}

h2,
h3 {
  margin-bottom: 1.5rem;
  color: var(--text-color);
}

.profile-form {
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

input:disabled {
  background-color: var(--card-background);
  cursor: not-allowed;
}

.password-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--background-color);
  border-radius: 4px;
}

.stat-label {
  color: var(--text-color);
  opacity: 0.8;
  font-size: 0.9rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--primary-color);
}

.loading {
  text-align: center;
  padding: 2rem;
}

.input-group {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.edit-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.edit-btn:not(.confirm):not(.cancel) {
  background-color: var(--primary-color);
  color: white;
}

.edit-btn.confirm {
  background-color: #10b981;
  /* 绿色 */
  color: white;
}

.edit-btn.cancel {
  background-color: #ef4444;
  /* 红色 */
  color: white;
}

.edit-btn:hover {
  opacity: 0.9;
}

select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
}

select:disabled {
  background-color: var(--card-background);
  cursor: not-allowed;
}
@media (max-width: 768px) {
 .edit-btn {
    padding: 0.5rem 0.6rem;
  }
}

.edit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>