<template>  
  <div class="upload-page">  
    <div class="page-header">  
      <h2>上传图片</h2>  
      <!-- 添加全局设置 -->  
      <div class="upload-settings">  
        <div class="setting-item">  
          <label>  
            <input type="checkbox" v-model="enableTimePath">  
            启用时间路径 (YYYY/MM/DD/)  
          </label>  
        </div>  
        <div class="setting-item">  
          <label>默认文件夹:</label>  
          <select v-model="defaultFolder">  
            <option value="">根目录</option>  
            <option v-for="folder in folders" :key="folder" :value="folder">  
              {{ folder }}  
            </option>  
          </select>  
          <button @click="showCreateFolder = true" class="btn-small">新建</button>  
        </div>  
      </div>  
      <button class="btn paste-btn" @click="handlePasteClick">  
        粘贴图片  
      </button>  
    </div>  
  
    <!-- 创建文件夹弹窗 -->  
    <div v-if="showCreateFolder" class="modal-overlay" @click="showCreateFolder = false">  
      <div class="modal" @click.stop>  
        <h3>创建文件夹</h3>  
        <input v-model="newFolderName" placeholder="文件夹名称" @keyup.enter="createFolder">  
        <div class="modal-actions">  
          <button @click="createFolder" class="btn">创建</button>  
          <button @click="showCreateFolder = false" class="btn btn-secondary">取消</button>  
        </div>  
      </div>  
    </div>  
  
    <div class="upload-area" @drop.prevent="handleDrop" @dragover.prevent @dragenter.prevent @click="triggerFileInput"  
      @paste="handlePaste">  
      <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect">  
      <div class="upload-hint" v-if="!previewImages.length">  
        <p>点击、拖拽或粘贴图片到这里上传</p>  
        <p class="sub-hint">支持 jpg、png、gif、webp、svg、bmp、tiff、ico、avif、heic/heif 格式</p>  
        <div class="icon">  
          <span class="upload-arrow">↑</span>  
        </div>  
      </div>  
  
      <div v-else class="preview-grid">  
        <div v-for="(preview, index) in previewImages" :key="index" class="preview-item">  
          <img :src="preview.url" :alt="preview.file.name">  
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
              
            <!-- 添加备注和文件夹选择 -->  
            <div class="preview-controls">  
              <div class="control-group">  
                <label>备注:</label>  
                <input   
                  v-model="preview.description"   
                  placeholder="为图片添加备注..."   
                  class="description-input"  
                  @click.stop  
                >  
              </div>  
              <div class="control-group">  
                <label>文件夹:</label>  
                <select v-model="preview.folderPath" @click.stop>  
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
        <button @click="copyAllLinks" class="btn">  
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
  
// 新增状态  
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
  const files = Array.from(event.dataTransfer.files)  
  addFiles(files)  
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
        description: '', // 新增备注字段  
        folderPath: defaultFolder.value // 新增文件夹路径字段  
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
        formData.append('enableTimePath', enableTimePath.value) // 补全 enableTimePath.value 
  
Wiki pages you might want to explore:  
- [Pages (shorteners/buling-imgbed)](/wiki/shorteners/buling-imgbed#4.2)
