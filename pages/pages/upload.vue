<!-- pages/pages/upload.vue -->
<template>
  <div class="upload-page">
    <div class="upload-container">
      <div class="upload-header">
        <h2>📸 图片上传</h2>
        <p>支持拖拽上传、粘贴上传，单次最多上传10张图片</p>
      </div>
 
      <!-- 上传区域 -->
      <div 
        class="upload-zone" 
        :class="{ 'drag-over': isDragOver, 'uploading': isUploading }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @click="triggerFileInput"
      >
        <div class="upload-content">
          <div v-if="!isUploading" class="upload-prompt">
            <div class="upload-icon">📁</div>
            <h3>点击或拖拽图片到此处上传</h3>
            <p>支持 JPG、PNG、GIF、WebP 格式</p>
            <p>单张图片最大 10MB</p>
          </div>
          
          <div v-else class="uploading-status">
            <div class="loading-spinner"></div>
            <h3>正在上传图片...</h3>
            <p>{{ uploadProgress }}%</p>
          </div>
        </div>
        
        <input 
          ref="fileInput" 
          type="file" 
          multiple 
          accept="image/*" 
          @change="handleFileSelect"
          class="file-input"
        >
      </div>
 
      <!-- 上传结果 -->
      <div v-if="uploadResults.length > 0" class="upload-results">
        <h3>上传结果</h3>
        <div class="results-grid">
          <div v-for="(result, index) in uploadResults" :key="index" class="result-card">
            <div class="result-image">
              <img :src="result.thumbnail" :alt="result.originalFilename">
            </div>
            <div class="result-info">
              <div class="result-name" :title="result.originalFilename">
                {{ result.originalFilename }}
              </div>
              <div class="result-status" :class="result.status">
                {{ result.status === 'success' ? '✅ 上传成功' : '❌ 上传失败' }}
              </div>
              <div v-if="result.status === 'success'" class="result-links">
                <div class="link-item">
                  <label>图片链接:</label>
                  <div class="link-container">
                    <input 
                      :value="result.url" 
                      readonly 
                      class="link-input"
                      :ref="el => linkInputs[index] = el"
                    >
                    <button @click="copyLink(result.url, index)" class="copy-btn">
                      {{ copiedStates[index] ? '已复制' : '复制' }}
                    </button>
                  </div>
                </div>
                <div class="link-item">
                  <label>Markdown:</label>
                  <div class="link-container">
                    <input 
                      :value="result.markdown" 
                      readonly 
                      class="link-input"
                    >
                    <button @click="copyLink(result.markdown, index + 'md')" class="copy-btn">
                      {{ copiedStates[index + 'md'] ? '已复制' : '复制' }}
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="error-message">
                {{ result.error }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="upload-actions">
          <button @click="clearResults" class="btn btn-secondary">清空结果</button>
          <button @click="triggerFileInput" class="btn btn-primary">继续上传</button>
        </div>
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
 
const fileInput = ref(null)
const isUploading = ref(false)
const isDragOver = ref(false)
const uploadProgress = ref(0)
const uploadResults = ref([])
const linkInputs = ref({})
const copiedStates = ref({})
const user = useState('user', () => null)
 
// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}
 
// 处理文件选择
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  uploadFiles(files)
}
 
// 处理拖拽事件
const handleDragOver = (event) => {
  event.preventDefault()
  isDragOver.value = true
}
 
const handleDragLeave = () => {
  isDragOver.value = false
}
 
const handleDrop = (event) => {
  event.preventDefault()
  isDragOver.value = false
  const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'))
  uploadFiles(files)
}
 
// 上传文件
const uploadFiles = async (files) => {
  if (files.length === 0) {
    toast.showToast('请选择图片文件', 'error')
    return
  }
 
  if (files.length > 10) {
    toast.showToast('一次最多上传10张图片', 'error')
    return
  }
 
  // 检查文件大小
  const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024)
  if (oversizedFiles.length > 0) {
    toast.showToast('单张图片大小不能超过10MB', 'error')
    return
  }
 
  isUploading.value = true
  uploadProgress.value = 0
  uploadResults.value = []
 
  const api = useApi()
 
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const formData = new FormData()
    formData.append('image', file)
 
    try {
      const response = await api.uploadImage(formData)
      
      uploadProgress.value = Math.round(((i + 1) / files.length) * 100)
 
      if (response?.success && response?.data) {
        // 使用用户的R2自定义域名构建URL
        const imageUrl = user.value?.r2_custom_url 
          ? `${user.value.r2_custom_url}/${response.data.url}`
          : response.data.url
 
        uploadResults.value.push({
          status: 'success',
          originalFilename: file.name,
          url: imageUrl,
          markdown: `![${file.name}](${imageUrl})`,
          thumbnail: imageUrl // 使用完整URL作为缩略图
        })
      } else {
        uploadResults.value.push({
          status: 'error',
          originalFilename: file.name,
          error: response?.message || '上传失败'
        })
      }
    } catch (error) {
      uploadResults.value.push({
        status: 'error',
        originalFilename: file.name,
        error: '网络错误，请重试'
      })
    }
  }
 
  isUploading.value = false
  toast.showToast(`上传完成！成功 ${uploadResults.value.filter(r => r.status === 'success').length} 张，失败 ${uploadResults.value.filter(r => r.status === 'error').length} 张`, 'success')
}
 
// 复制链接
const copyLink = async (text, key) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedStates.value[key] = true
    toast.showToast('链接已复制到剪贴板', 'success')
    
    setTimeout(() => {
      copiedStates.value[key] = false
    }, 2000)
  } catch (error) {
    // 如果clipboard API不可用，使用传统方法
    const input = linkInputs.value[key] || document.createElement('input')
    input.value = text
    input.select()
    document.execCommand('copy')
    copiedStates.value[key] = true
    toast.showToast('链接已复制到剪贴板', 'success')
    
    setTimeout(() => {
      copiedStates.value[key] = false
    }, 2000)
  }
}
 
// 清空结果
const clearResults = () => {
  uploadResults.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
 
// 监听粘贴事件
onMounted(() => {
  const handlePaste = async (event) => {
    const items = Array.from(event.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    
    if (imageItems.length > 0) {
      event.preventDefault()
      const files = await Promise.all(
        imageItems.map(item => new Promise(resolve => {
          const file = item.getAsFile()
          resolve(file)
        }))
      )
      uploadFiles(files.filter(Boolean))
    }
  }
 
  document.addEventListener('paste', handlePaste)
  
  onUnmounted(() => {
    document.removeEventListener('paste', handlePaste)
  })
})
</script>
 
<style scoped>
.upload-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
 
.upload-container {
  background: var(--card-background);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
 
.upload-header {
  text-align: center;
  margin-bottom: 2rem;
}
 
.upload-header h2 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.8rem;
}
 
.upload-header p {
  color: var(--text-color-light);
  margin: 0;
}
 
.upload-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
 
.upload-zone:hover {
  border-color: var(--primary-color);
  background-color: rgba(var(--primary-rgb), 0.02);
}
 
.upload-zone.drag-over {
  border-color: var(--primary-color);
  background-color: rgba(var(--primary-rgb), 0.1);
  transform: scale(1.02);
}
 
.upload-zone.uploading {
  border-color: var(--primary-color);
  background-color: rgba(var(--primary-rgb), 0.05);
}
 
.upload-content {
  text-align: center;
  padding: 2rem;
}
 
.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}
 
.upload-prompt h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1.2rem;
}
 
.upload-prompt p {
  color: var(--text-color-light);
  margin: 0.25rem 0;
}
 
.uploading-status h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}
 
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}
 
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
 
.file-input {
  display: none;
}
 
.upload-results {
  margin-top: 2rem;
}
 
.upload-results h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}
 
.results-grid {
  display: grid;
  gap: 1rem;
}
 
.result-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}
 
.result-image {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}
 
.result-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.result-name {
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
 
.result-status {
  font-size: 0.875rem;
  font-weight: 500;
}
 
.result-status.success {
  color: #10b981;
}
 
.result-status.error {
  color: #ef4444;
}
 
.result-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.link-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
 
.link-item label {
  font-size: 0.75rem;
  color: var(--text-color-light);
  font-weight: 500;
}
 
.link-container {
  display: flex;
  gap: 0.5rem;
}
 
.link-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  background-color: #f9fafb;
}
 
.copy-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
  white-space: nowrap;
  transition: all 0.2s;
}
 
.copy-btn:hover {
  background-color: #f3f4f6;
}
 
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}
 
.upload-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}
 
.btn {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}
 
.btn-primary {
  background-color: var(--primary-color);
  color: white;
}
 
.btn-primary:hover {
  background-color: var(--primary-color-dark);
}
 
.btn-secondary {
  background-color: #f3f4f6;
  color: var(--text-color);
  border: 1px solid #d1d5db;
}
 
.btn-secondary:hover {
  background-color: #e5e7eb;
}
 
@media (max-width: 768px) {
  .upload-page {
    padding: 1rem;
  }
  
  .upload-container {
    padding: 1.5rem;
  }
  
  .result-card {
    flex-direction: column;
  }
  
  .result-image {
    width: 100%;
    height: 120px;
  }
  
  .upload-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
