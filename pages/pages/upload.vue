<template>  
  <div class="upload-page">  
    <div class="page-header">  
      <h2>上传图片</h2>  
      <!-- 全局设置 -->  
      <div class="upload-settings">  
        <div class="setting-item">  
          <label class="checkbox-label">
            <input type="checkbox" v-model="enableTimePath" class="checkbox-input">
            <span class="checkbox-text">启用时间路径 (YYYY/MM/DD/)</span>
          </label>  
        </div>  
        <div class="setting-item">  
          <label class="select-label">默认文件夹:</label>
          <div class="select-group">
            <select v-model="defaultFolder" class="folder-select">
              <option value="">根目录</option>
              <option v-for="folder in folders" :key="folder" :value="folder">  
                {{ folder }}  
              </option>  
            </select>  
            <button @click="showCreateFolder = true" class="btn-create-folder">新建</button>  
          </div>
        </div>  
      </div>  
      <button class="btn-paste" @click="handlePasteClick">  
        <span class="paste-icon">📋</span>
        粘贴图片  
      </button>  
    </div>  
  
    <!-- 创建文件夹弹窗 -->  
    <div v-if="showCreateFolder" class="modal-overlay" @click="showCreateFolder = false">  
      <div class="modal" @click.stop>  
        <h3>创建文件夹</h3>  
        <input v-model="newFolderName" placeholder="文件夹名称" @keyup.enter="createFolder" class="modal-input">
        <div class="modal-actions">  
          <button @click="createFolder" class="btn btn-primary">创建</button>  
          <button @click="showCreateFolder = false" class="btn btn-secondary">取消</button>  
        </div>  
      </div>  
    </div>  
  
    <div class="upload-area" 
         @drop.prevent="handleDrop" 
         @dragover.prevent 
         @dragenter.prevent 
         @click="triggerFileInput"
         @paste="handlePaste"
         :class="{ 'upload-area-active': isDragActive }">
      <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect">  
      <div class="upload-hint" v-if="!previewImages.length">  
        <div class="upload-icon">
          <span class="upload-arrow">↑</span>
        </div>
        <p class="upload-main-text">点击、拖拽或粘贴图片到这里上传</p>  
        <p class="upload-sub-text">支持 jpg、png、gif、webp、svg、bmp、tiff、ico、avif、heic/heif 格式</p>  
      </div>  
  
      <div v-else class="preview-grid">  
        <div v-for="(preview, index) in previewImages" :key="index" class="preview-item">  
          <div class="preview-image-container">
            <img :src="preview.url" :alt="preview.file.name" class="preview-image">
          </div>
          <div class="preview-overlay">  
            <div class="file-info">  
              <span class="file-name">{{ preview.file.name }}</span>  
              <span class="file-size-info" :class="{ 'compress-info': preview.isCompressed }">  
                <template v-if="preview.isCompressed">  
                  已压缩: {{ formatFileSize(preview.originalSize) }} → {{ formatFileSize(preview.compressedSize) }}  
                  ({{ (preview.compressedSize / preview.originalSize * 100).toFixed(0) }}%)  
                </template>  
                <template v-else>  
                  大小: {{ formatFileSize(preview.file.size) }}  
                </template>  
              </span>  
            </div>  
              
            <!-- 备注和文件夹选择 -->  
            <div class="preview-controls">  
              <div class="control-group">  
                <label class="control-label">备注:</label>
                <input   
                  v-model="preview.description"   
                  placeholder="为图片添加备注..."   
                  class="description-input"  
                  @click.stop  
                >  
              </div>  
              <div class="control-group">  
                <label class="control-label">文件夹:</label>
                <select v-model="preview.folderPath" @click.stop class="folder-select-input">
                  <option value="">根目录</option>  
                  <option v-for="folder in folders" :key="folder" :value="folder">  
                    {{ folder }}  
                  </option>  
                </select>  
              </div>  
            </div>  
          </div>  
          <button class="remove-btn" @click.stop="removePreview(index)">  
            ✕  
          </button>  
          <div v-if="preview.uploading" class="upload-progress-overlay">  
            <div class="progress-bar">  
              <div class="progress" :style="{ width: preview.progress + '%' }"></div>  
            </div>  
            <span class="progress-text">{{ preview.progress }}%</span>  
          </div>  
        </div>  
      </div>  
    </div>  
  
    <div class="upload-actions" v-if="previewImages.length">  
      <button class="upload-btn" @click="uploadAll" :disabled="isUploading">  
        <span v-if="isUploading" class="uploading-spinner"></span>
        {{ isUploading ? '上传中...' : '开始上传' }}  
      </button>  
      <button class="clear-btn" @click="clearPreviews" :disabled="isUploading">  
        清空  
      </button>  
    </div>  
  
    <div v-if="error" class="error-message">  
      {{ error }}  
    </div>  
  
    <div v-if="uploadedLinks.length" class="uploaded-links">  
      <h3>上传成功的图片链接</h3>  
      <div class="link-tabs">  
        <button   
          v-for="tab in linkTabs"   
          :key="tab.key"  
          @click="activeTab = tab.key"  
          :class="{ active: activeTab === tab.key }"  
          class="tab-btn"  
        >  
          {{ tab.label }}  
        </button>  
      </div>  
        
      <div class="link-content">  
        <div v-for="(link, index) in uploadedLinks" :key="index" class="link-item">  
          <div class="link-preview">  
            <img :src="link.direct" :alt="link.filename" class="link-thumbnail">  
            <span class="link-filename">{{ link.filename }}</span>  
          </div>  
          <div class="link-url">  
            <input   
              :value="getLinkByType(link, activeTab)"   
              readonly   
              class="link-input"  
              :id="`link-${index}-${activeTab}`"  
            >  
            <button   
              @click="copyToClipboard(getLinkByType(link, activeTab), `link-${index}-${activeTab}`)"  
              class="copy-link-btn"  
            >  
              复制  
            </button>  
          </div>  
        </div>  
      </div>  
        
      <div class="copy-all">  
        <button @click="copyAllLinks" class="btn btn-primary">  
          复制所有{{ linkTabs.find(t => t.key === activeTab)?.label }}链接  
        </button>  
      </div>  
    </div>  
  </div>  
</template>  
  
<script setup>  
import useApi from '~/services/api'  
import imageCompression from 'browser-image-compression'  
import { toast } from '~/composables/useToast'  
  
definePageMeta({  
  middleware: 'auth'  
})  
  
const router = useRouter()  
const fileInput = ref(null)  
const error = ref('')  
const previewImages = ref([])  
const isUploading = ref(false)  
const uploadedLinks = ref([])  
const user = useState('user', () => null)  
const activeTab = ref('direct')  
const isDragActive = ref(false)
  
// 状态管理  
const enableTimePath = ref(false)  
const defaultFolder = ref('')  
const folders = ref([])  
const showCreateFolder = ref(false)  
const newFolderName = ref('')  
  
// 链接类型标签  
const linkTabs = [  
  { key: 'direct', label: '直链' },  
  { key: 'bbcode', label: 'BBCode' },  
  { key: 'markdown', label: 'Markdown' },  
  { key: 'html', label: 'HTML' }  
]  
  
// 支持的图片格式  
const validTypes = [  
  'image/jpeg',  
  'image/jpg',   
  'image/png',  
  'image/gif',  
  'image/webp',  
  'image/svg+xml',  
  'image/bmp',  
  'image/tiff',  
  'image/x-icon',  
  'image/vnd.microsoft.icon',  
  'image/avif',  
  'image/heic',  
  'image/heif'  
]  
  
// 获取文件夹列表  
const fetchFolders = async () => {  
  try {  
    const api = useApi()  
    const response = await api.getFolders()  
    folders.value = response.data || []  
  } catch (err) {  
    console.error('获取文件夹失败:', err)  
  }  
}  
  
// 创建文件夹  
const createFolder = async () => {  
  if (!newFolderName.value.trim()) return  
    
  try {  
    const api = useApi()  
    await api.createFolder({ name: newFolderName.value.trim() })  
    await fetchFolders()  
    showCreateFolder.value = false  
    newFolderName.value = ''  
    toast.showToast('文件夹创建成功', 'success')  
  } catch (err) {  
    toast.showToast('文件夹创建失败', 'error')  
  }  
}  
  
// 触发文件选择  
const triggerFileInput = () => {  
  fileInput.value?.click()  
}  
  
// 处理文件选择  
const handleFileSelect = (event) => {  
  const files = Array.from(event.target.files)  
  addFiles(files)  
  event.target.value = ''  
}  
  
// 处理拖拽上传  
const handleDrop = (event) => {  
  isDragActive.value = false
  const files = Array.from(event.dataTransfer.files)  
  addFiles(files)  
}  
 
// 处理拖拽事件
const handleDragEnter = () => {
  isDragActive.value = true
}
 
const handleDragLeave = () => {
  isDragActive.value = false
}
 
// 处理粘贴上传  
const handlePaste = (event) => {  
  const items = Array.from(event.clipboardData.items)  
  const files = items  
    .filter(item => item.type.startsWith('image/'))  
    .map(item => item.getAsFile())  
    .filter(file => file !== null)  
    
  if (files.length > 0) {  
    addFiles(files)  
  }  
}  
  
// 处理粘贴按钮点击  
const handlePasteClick = async () => {  
  try {  
    const clipboardItems = await navigator.clipboard.read()  
    const files = []  
      
    for (const clipboardItem of clipboardItems) {  
      for (const type of clipboardItem.types) {  
        if (type.startsWith('image/')) {  
          const blob = await clipboardItem.getType(type)  
          const file = new File([blob], `pasted-image-${Date.now()}.png`, { type })  
          files.push(file)  
        }  
      }  
    }  
      
    if (files.length > 0) {  
      addFiles(files)  
    } else {  
      toast.showToast('剪贴板中没有图片', 'warning')  
    }  
  } catch (err) {  
    toast.showToast('无法访问剪贴板', 'error')  
  }  
}  
  
// 添加文件到预览列表  
const addFiles = async (files) => {  
  const validFiles = files.filter(file => {  
    const isValid = validTypes.includes(file.type)  
    if (!isValid) {  
      error.value = '不支持的图片格式，请使用 jpg、png、gif、webp、svg、bmp、tiff、ico、avif、heic/heif 格式'  
    }  
    return isValid  
  })  
  
  if (validFiles.length === 0) return  
  
  for (const file of validFiles) {  
    let processedFile = file  
    let isCompressed = false  
    let originalSize = file.size  
    let compressedSize = file.size  
  
    // 图片压缩处理  
    if (user.value?.enable_image_optimization) {  
      try {  
        if (file.type === 'image/png' || file.type === 'image/jpeg') {  
          const options = {  
            maxSizeMB: 1,  
            maxWidthOrHeight: 1920,  
            useWebWorker: true,  
            fileType: file.type === 'image/png' ? 'image/jpeg' : file.type  
          }  
  
          const compressedBlob = await imageCompression(file, options)  
            
          if (compressedBlob.size < file.size) {  
            const extension = file.type === 'image/png' ? 'jpg' : file.name.split('.').pop()  
            const newFileName = file.name.includes('.')  
              ? `${file.name.split('.')[0]}.${extension}`  
              : `${file.name}.${extension}`  
              
            processedFile = new File(  
              [compressedBlob],  
              newFileName,  
              { type: compressedBlob.type }  
            )  
            isCompressed = true  
            compressedSize = processedFile.size  
          }  
        }  
      } catch (err) {  
        processedFile = file  
      }  
    }  
  
    const reader = new FileReader()  
    reader.onload = (e) => {  
      previewImages.value.push({  
        file: processedFile,  
        url: e.target.result,  
        uploading: false,  
        progress: 0,  
        isCompressed,  
        originalSize,  
        compressedSize,  
        description: '',  
        folderPath: defaultFolder.value  
      })  
    }  
    reader.readAsDataURL(processedFile)  
  }  
}  
  
// 移除预览图片  
const removePreview = (index) => {  
  previewImages.value.splice(index, 1)  
}  
  
// 清空预览列表  
const clearPreviews = () => {  
  previewImages.value = []  
}  
  
// 上传所有图片  
const uploadAll = async () => {  
  if (isUploading.value) return  
  isUploading.value = true  
  error.value = ''  
  uploadedLinks.value = []  
  
  try {  
    const api = useApi()  
  
    for (let i = 0; i < previewImages.value.length; i++) {  
      const preview = previewImages.value[i]  
      preview.uploading = true  
      preview.progress = 0  
      preview.error = ''  
  
      const progressInterval = setInterval(() => {  
        if (preview.progress < 90) {  
          preview.progress += 10  
        }  
      }, 200)  
  
      try {  
        const formData = new FormData()  
        formData.append('imgfile', preview.file)  
        formData.append('description', preview.description || '')  
        formData.append('folderPath', preview.folderPath || '')  
        formData.append('enableTimePath', enableTimePath.value) 
        
        const response = await api.uploadImage(formData, (event) => {
          if (event.lengthComputable) {
            preview.progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
          }
        })
        
        preview.progress = 100;
        uploadedLinks.value.push({
          id: response.data.id,
          filename: response.data.filename,
          direct: response.data.direct, // 现在会包含完整R2链接
          bbcode: `[img]${response.data.direct}[/img]`,
          markdown: `![${response.data.filename}](${response.data.direct})`,
          html: `<img src="${response.data.direct}" alt="${response.data.filename}">`
        })
        toast.showToast(`图片 ${preview.file.name} 上传成功`, 'success')
 
      } catch (uploadError) {  
        console.error('上传图片失败:', uploadError)  
        preview.error = '上传失败'  
        toast.showToast(`上传 ${preview.file.name} 失败`, 'error')  
      } finally {  
        clearInterval(progressInterval)  
        preview.uploading = false  
      }  
    }  
  
    toast.showToast('所有图片上传完成', 'success')  
  
  } catch (err) {  
    error.value = '上传过程中发生未知错误'  
    toast.showToast('上传过程中发生未知错误', 'error')  
  } finally {  
    isUploading.value = false  
  }  
}  
 
// 辅助函数：格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
 
// 辅助函数：根据类型获取链接
const getLinkByType = (link, type) => {
  return link[type] || link.direct;
};
 
// 辅助函数：复制到剪贴板
const copyToClipboard = async (text, elementId) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.showToast('链接已复制', 'success');
    const inputElement = document.getElementById(elementId);
    if (inputElement) {
      inputElement.select();
      inputElement.focus();
    }
  } catch (err) {
    console.error('复制失败:', err);
    toast.showToast('复制失败', 'error');
  }
};
 
// 辅助函数：复制所有链接
const copyAllLinks = async () => {
  const allLinks = uploadedLinks.value.map(link => getLinkByType(link, activeTab.value)).join('\n');
  if (allLinks) {
    await copyToClipboard(allLinks, 'all-links-input-placeholder');
  } else {
    toast.showToast('没有链接可复制', 'warning');
  }
};
 
// 页面加载时获取文件夹列表
onMounted(() => {
  fetchFolders();
});
 
onUnmounted(() => {
  // 清理工作
});
</script>  
 
<style scoped>
.upload-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
 
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}
 
.page-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
 
.upload-settings {
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
}
 
.setting-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #4b5563;
}
 
.checkbox-input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #3b82f6;
}
 
.select-label {
  font-size: 0.9rem;
  color: #4b5563;
  font-weight: 500;
}
 
.select-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
 
.folder-select {
  padding: 0.4rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  background: white;
  color: #374151;
  outline: none;
  transition: border-color 0.2s;
}
 
.folder-select:focus {
  border-color: #3b82f6;
}
 
.btn-create-folder {
  padding: 0.4rem 0.8rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}
 
.btn-create-folder:hover {
  background: #2563eb;
}
 
.btn-paste {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
 
.btn-paste:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
 
.paste-icon {
  font-size: 1.1rem;
}
 
.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f9fafb;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
.upload-area:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}
 
.upload-area-active {
  border-color: #3b82f6;
  background: #dbeafe;
  transform: scale(1.02);
}
 
.upload-icon {
  margin-bottom: 1.5rem;
}
 
.upload-arrow {
  font-size: 3rem;
  color: #9ca3af;
  animation: bounce 2s infinite;
}
 
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
 
.upload-main-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}
 
.upload-sub-text {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}
 
.hidden {
  display: none;
}
 
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  width: 100%;
}
 
.preview-item {
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}
 
.preview-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}
 
.preview-image-container {
  width: 100%;
  height: 200px;
  overflow: hidden;
}
 
.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}
 
.preview-item:hover .preview-overlay {
  transform: translateY(0);
}
 
.file-info {
  margin-bottom: 0.8rem;
}
 
.file-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
  word-break: break-word;
}
 
.file-size-info {
  font-size: 0.8rem;
  opacity: 0.9;
}
 
.compress-info {
  color: #10b981;
  font-weight: 500;
}
 
.preview-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
 
.control-label {
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0.9;
}
 
.description-input,
.folder-select-input {
  padding: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s;
}
 
.description-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}
 
.description-input:focus,
.folder-select-input:focus {
  border-color: rgba(255, 255, 255, 0.6);
}
 
.remove-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0;
}
 
.preview-item:hover .remove-btn {
  opacity: 1;
}
 
.remove-btn:hover {
  background: #dc2626;
  transform: scale(1.1);
}
 
.upload-progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}
 
.progress-bar {
  width: 80%;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}
 
.progress {
  height: 100%;
  background: #3b82f6;
  border-radius: 4px;
  transition: width 0.3s ease;
}
 
.progress-text {
  font-size: 0.9rem;
  font-weight: 500;
}
 
.upload-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: center;
}
 
.upload-btn,
.clear-btn {
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.upload-btn {
  background: #3b82f6;
  color: white;
}
 
.upload-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}
 
.upload-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
 
.clear-btn {
  background: #6b7280;
  color: white;
}
 
.clear-btn:hover:not(:disabled) {
  background: #4b5563;
}
 
.uploading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
 
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
 
.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  text-align: center;
}
 
.uploaded-links {
  margin-top: 3rem;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
 
.uploaded-links h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}
 
.link-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}
 
.tab-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  background: none;
  color: #6b7280;
  cursor: ponter;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}
 
.tab-btn:hover {
  background: #f3f4f6;
  color: #374151;
}
 
.tab-btn.active {
  background: #3b82f6;
  color: white;
}
 
.link-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
 
.link-item {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  transition: background 0.2s;
}
 
.link-item:hover {
  background: #f3f4f6;
}
 
.link-preview {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 200px;
}
 
.link-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 0.375rem;
}
 
.link-filename {
  font-size: 0.9rem;
  color: #374151;
  word-break: break-word;
}
 
.link-url {
  flex: 1;
  display: flex;
  gap: 0.5rem;
}
 
.link-input {
  flex: 1;
  padding: 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  background: white;
  outline: none;
  transition: border-color 0.2s;
}
 
.link-input:focus {
  border-color: #3b82f6;
}
 
.copy-link-btn {
  padding: 0.6rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}
 
.copy-link-btn:hover {
  background: #2563eb;
}
 
.copy-all {
  margin-top: 1.5rem;
  text-align: center;
}
 
.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
 
.btn-primary {
  background: #3b82f6;
  color: white;
}
 
.btn-primary:hover {
  background: #2563eb;
}
 
.btn-secondary {
  background: #6b7280;
  color: white;
}
 
.btn-secondary:hover {
  background: #4b5563;
}
 
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
 
.modal {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  min-width: 300px;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}
 
.modal h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #1f2937;
}
 
.modal-input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  outline: none;
  transition: border-color 0.2s;
}
 
.modal-input:focus {
  border-color: #3b82f6;
}
 
.modal-actions {
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
}
 
@media (max-width: 768px) {
  .upload-page {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .upload-settings {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .preview-grid {
    grid-template-columns: 1fr;
  }
  
  .link-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }
  
  .link-url {
    width: 100%;
  }
  
  .upload-area {
    padding: 2rem 1rem;
  }
}
</style>
