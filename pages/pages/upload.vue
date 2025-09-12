<template>
  <div class="upload-page">
    <div class="page-header">
      <h2>上传图片</h2>
      <button class="btn paste-btn" @click="handlePasteClick">
        粘贴图片
      </button>
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
      <div class="link-tabs">
        <button v-for="tab in linkTabs" :key="tab.id" :class="['tab-btn', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id">
          {{ tab.name }}
        </button>
      </div>

      <div class="links-content">
        <div class="links-list">
          <div v-for="(link, index) in uploadedLinks" :key="index" class="link-row">
            <input type="text" readonly :value="getCurrentValue(link)">
            <button class="copy-link-btn" @click="copyToClipboard(getCurrentValue(link))">
              复制
            </button>
          </div>
        </div>
        <div class="copy-all">
          <button @click="copyAllLinks">复制全部</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import useApi from '~/services/api';
import imageCompression from 'browser-image-compression';
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

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  addFiles(files)
}

const handleDrop = (event) => {
  const files = Array.from(event.dataTransfer.files)
  addFiles(files)
}

const isProcessingPaste = ref(false)

const handlePaste = async (event) => {
  if (isProcessingPaste.value) return
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return
  }

  isProcessingPaste.value = true
  try {
    error.value = ''
    const items = Array.from(event.clipboardData.items)
    const imageFiles = items
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())

    if (imageFiles.length === 0) {
      error.value = '剪贴板中未找到图片.'
      return
    }

    error.value = ''
    await addFiles(imageFiles)
  } finally {
    // 确保处理完成后重置标志
    setTimeout(() => {
      isProcessingPaste.value = false
    }, 100)
  }
}

const validTypes = [
  'image/jpeg',     // .jpg, .jpeg
  'image/png',      // .png
  'image/gif',      // .gif
  'image/webp',     // .webp
  'image/svg+xml',  // .svg
  'image/bmp',      // .bmp
  'image/tiff',     // .tiff, .tif
  'image/x-icon',   // .ico
  'image/avif',     // .avif
  'image/heic',     // .heic
  'image/heif'      // .heif
]

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

    if (user.value?.enable_image_optimization) {
      try {
        const extension = file.name.split('.').pop().toLowerCase()
        const options = {
          // maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
          // 降低初始质量以加快压缩速度
          initialQuality: 0.8,
          // 添加最大迭代次数限制
          maxIteration: 2
        }

        // 针对不同格式采用不同的压缩策略
        if (file.size > 500 * 1024 && !file.type.includes('gif')) {
          // PNG 文件特殊处理
          if (extension === 'png') {
            options.fileType = 'image/jpeg'  // 转换为 JPEG 以获得更好的压缩率
            options.initialQuality = 0.85    // PNG 转 JPEG 时使用较高质量
          }

          const compressedBlob = await imageCompression(file, options)
          
          // 只有当压缩后的大小确实更小时才使用压缩结果
          if (compressedBlob.size < file.size) {
            const newFileName = extension === 'png' 
              ? `${file.name.split('.')[0]}.jpg`  // PNG转JPEG时改变文件扩展名
              : `${file.name.split('.')[0]}.${extension}`
            
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
        originalSize,     // 使用保存的原始大小
        compressedSize    // 使用保存的压缩后大小
      })
    }
    reader.readAsDataURL(processedFile)
  }
}

const removePreview = (index) => {
  previewImages.value.splice(index, 1)
}

const clearPreviews = () => {
  previewImages.value = []
}

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

        const response = await api.uploadImage(formData)
        preview.progress = 100
        preview.uploading = false

        const imageUrl = `${user.value.r2_custom_url}/${response.data.filename}`
        const baiduCdnUrl = user.value.enable_baidu_cdn
          ? `https://image.baidu.com/search/down?url=${imageUrl}`
          : null

        uploadedLinks.value.push({
          filename: response.data.filename,
          direct: imageUrl,
          baiduCdn: baiduCdnUrl,
          bbcode: `[img]${imageUrl}[/img]`,
          markdown: `![](${imageUrl})`,
          html: `<img src="${imageUrl}" alt="image">`
        })

        previewImages.value.splice(i, 1)
        i--
      } catch (err) {
        preview.uploading = false
        error.value = '部分图片上传失败，请重试'
        throw err
      } finally {
        clearInterval(progressInterval)
      }
    }

    if (uploadedLinks.value.length > 0) {
      toast.showToast('图片上传成功', 'success')
    }

  } catch (err) {
    // 错误已在上传过程中处理
  } finally {
    isUploading.value = false
  }
}

const handlePasteClick = async () => {
  if (isProcessingPaste.value) return

  isProcessingPaste.value = true
  try {
    const clipboardItems = await navigator.clipboard.read()

    // 检查剪贴板是否为空
    if (clipboardItems.length === 0) {
      error.value = '剪贴板为空'
      return
    }

    let hasImage = false
    for (const clipboardItem of clipboardItems) {
      const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'))

      if (imageTypes.length > 0) {
        hasImage = true
        for (const imageType of imageTypes) {
          const blob = await clipboardItem.getType(imageType)
          const file = new File([blob], `pasted-image-${Date.now()}.${imageType.split('/')[1]}`, { type: imageType })
          addFiles([file])
        }
      }
    }

    if (!hasImage) {
      error.value = '剪贴板中未找到图片'
    } else {
      error.value = '' // 清除错误信息
    }
  } catch (err) {
    // 细化错误提示
    if (err.name === 'NotAllowedError') {
      error.value = '无法访问剪贴板，请确保已授予权限'
    } else if (err.name === 'SecurityError') {
      error.value = '由于安全限制无法访问剪贴板'
    } else {
      error.value = '读取剪贴板失败，请重试'
    }
  } finally {
    // 确保处理完成后重置标志
    setTimeout(() => {
      isProcessingPaste.value = false
    }, 100)
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.showToast('复制成功', 'success')
  } catch (err) {
    toast.showToast('复制失败', 'error')
  }
}

// 添加新的响应式数据
const currentTab = ref('direct')
const linkTabs = [
  { id: 'direct', name: '直接链接' },
  { id: 'baiduCdn', name: '百度加速', show: computed(() => user.value.enable_baidu_cdn) },
  { id: 'bbcode', name: 'BBCode' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'html', name: 'HTML' }
].filter(tab => !tab.show || tab.show.value)

// 获取当前标签对应的链接值
const getCurrentValue = (link) => {
  return link[currentTab.value]
}

// 复制所有链接
const copyAllLinks = async () => {
  const allLinks = uploadedLinks.value
    .map(link => getCurrentValue(link))
    .join('\n')
  await copyToClipboard(allLinks)
}

// 添加 onMounted 钩子
onMounted(() => {
  document.addEventListener('paste', handlePaste)
})

// 添加 onUnmounted 钩子来清理事件监听
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})

// 添加文件大小格式化函数
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 KB'
  const kb = bytes / 1024
  return kb < 1024
    ? `${kb.toFixed(1)} KB`
    : `${(kb / 1024).toFixed(1)} MB`
}
</script>

<style scoped>
.upload-page {
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.paste-btn {
  padding: 0.5rem 1rem;
  background-color: #60a5fa;
  color: white;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.paste-btn:hover {
  background-color: #3b82f6;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 200px;
}

.upload-area:hover {
  border-color: #60a5fa;
  background-color: --upload-hover-background;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.preview-item {
  position: relative;
  aspect-ratio: 1;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.875rem;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  position: absolute;
  /* top: -24px; */
  right: 0;
  background: rgb(253 2 2 / 50%);
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.upload-progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
}

.progress-bar {
  width: 80%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin-bottom: 0.5rem;
}

.progress {
  height: 100%;
  background: #60a5fa;
  border-radius: 2px;
  transition: width 0.2s;
}

.upload-actions {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.upload-btn,
.clear-btn {
  padding: 0.5rem 2rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.upload-btn {
  background-color: #60a5fa;
  color: white;
}

.upload-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.clear-btn {
  background-color: #ef4444;
  color: white;
}

.clear-btn:disabled {
  background-color: #f87171;
  cursor: not-allowed;
}

.hidden {
  display: none;
}

.upload-hint {
  color: #6b7280;
}

.icon {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
}

.upload-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 2px solid #60a5fa;
  border-radius: 50%;
  color: #60a5fa;
  font-size: 1.2rem;
}

.upload-area:hover .upload-arrow {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: scale(1.1);
  transition: all 0.3s;
}

.sub-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.error-message {
  margin-top: 1rem;
  text-align: center;
  color: #ef4444;
}

.uploaded-links {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.link-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  text-align: center;
  white-space: normal;
  word-wrap: break-word;
  font-size: 0.875rem;
  line-height: 1.2;
}

.tab-btn.active {
  color: #3b82f6;
  font-weight: 500;
  border-bottom: 2px solid #3b82f6;
  margin-bottom: -0.5rem;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--card-background);
  padding: 0.5rem;
  border-radius: 4px;
}

.link-row input {
  /* input框禁止一切默认样式 */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  outline: none;
  /* 其他样式 */

  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background: var(--card-background);
  font-size: 1rem;
  color: var(--text-color);
}

.copy-link-btn {
  padding: 0.5rem 1rem;
  background-color: #60a5fa;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-link-btn:hover {
  background-color: #3b82f6;
}

.copy-all {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.copy-all button {
  padding: 0.5rem 1rem;
  background-color: #60a5fa;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.copy-all button:hover {
  background-color: #3b82f6;
}

.file-size-info {
  display: block;
  font-size: 0.75rem;
  color: #9ca3af;
  /* 未压缩时的默认颜色 */
  margin-top: 0.25rem;
  word-break: break-word;
}

.compress-info {
  color: #65ff85;
  /* 压缩后的颜色 */
}

.file-info {
  flex: 1;
  overflow: hidden;
  padding-right: 0.5rem;
}

/* 添加媒体查询，在手机端调整预览图大小 */
@media (max-width: 768px) {
  .preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
  }
}
</style>