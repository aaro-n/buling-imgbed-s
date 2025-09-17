<template>
  <div class="images-page">
    <div class="page-header">
      <h2>当前用户已上传 {{ total }} 张图片</h2>
      <div class="header-actions">
        <button v-if="selectedImages.length > 0" class="btn delete-selected-btn" @click="handleBatchDelete">
          删除所选({{ selectedImages.length }})
        </button>
        <button v-if="selectedImages.length > 0" class="btn move-selected-btn" @click="showMoveDialog = true">
          移动到文件夹({{ selectedImages.length }})
        </button>
        <button class="btn create-folder-btn" @click="showCreateFolderDialog = true">
          创建文件夹
        </button>
        <label class="select-all" v-if="images.length > 0">
          <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
          全选
        </label>
      </div>
    </div>
 
    <!-- 搜索和文件夹选择 -->
    <div class="controls">
      <div class="folder-selector">
        <label>文件夹：</label>
        <select v-model="currentFolderId" @change="handleFolderChange">
          <option value="">所有图片</option>
          <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
            {{ folder.name }}
          </option>
        </select>
      </div>
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索图片名或备注..." 
          @input="handleSearch"
          class="search-input"
        >
      </div>
    </div>
 
    <div v-if="loading" class="loading">加载中...</div>
 
    <div v-else-if="error" class="error">{{ error }}</div>
 
    <div v-else-if="images.length === 0" class="empty">
      暂无图片，请上传
    </div>
 
    <div v-else class="image-grid">
      <div v-for="image in images" :key="image.id" class="image-card card">
        <div class="image-select">
          <input type="checkbox" :checked="selectedImages.some(img => img.id === image.id)"
            @change="toggleImageSelection(image)">
        </div>
        <img :src="`${user.r2_custom_url}/${image.url}`" :alt="image.name"
          @click="openPreview(image.url)" class="preview-cursor">
        <div class="image-info">
          <div class="image-name-container">
            <span class="image-name" v-if="!image.editing">{{ image.name }}</span>
            <input 
              v-else 
              type="text" 
              v-model="image.editName" 
              @blur="saveImageName(image)"
              @keyup.enter="saveImageName(image)"
              @keyup.esc="cancelEditName(image)"
              class="name-input"
              ref="nameInput"
            >
            <button class="edit-name-btn" @click="editImageName(image)" v-if="!image.editing">
              ✏️
            </button>
          </div>
          <div class="image-note">
            <span class="note-text" v-if="!image.editingNote">{{ image.note || '无备注' }}</span>
            <input 
              v-else 
              type="text" 
              v-model="image.editNote" 
              @blur="saveImageNote(image)"
              @keyup.enter="saveImageNote(image)"
              @keyup.esc="cancelEditNote(image)"
              class="note-input"
              ref="noteInput"
            >
            <button class="edit-note-btn" @click="editImageNote(image)" v-if="!image.editingNote">
              📝
            </button>
          </div>
          <button class="delete-btn" @click="handleDelete(image.url)">删除</button>
        </div>
      </div>
    </div>
 
    <div v-if="images.length > 0" class="pagination">
      <div class="page-numbers">
        <template v-if="pageNumbers[0] > 1">
          <button class="page-btn page-number" @click="handlePageChange(1)">
            1
          </button>
          <span v-if="pageNumbers[0] > 2" class="page-ellipsis">...</span>
        </template>
 
        <button v-for="num in pageNumbers" :key="num" :class="[
          'page-btn',
          'page-number',
          { active: currentPage === num }
        ]" @click="handlePageChange(num)">
          {{ num }}
        </button>
 
        <template v-if="pageNumbers[pageNumbers.length - 1] < totalPages">
          <span v-if="pageNumbers[pageNumbers.length - 1] < totalPages - 1" class="page-ellipsis">...</span>
          <button class="page-btn page-number" @click="handlePageChange(totalPages)">
            {{ totalPages }}
          </button>
        </template>
      </div>
    </div>
 
    <!-- 图片预览 -->
    <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
      <div class="image-preview-container">
        <span class="close-preview">×</span>
        <img :src="`${user.r2_custom_url}/${previewImage}`" alt="预览图片">
      </div>
    </div>
 
    <!-- 创建文件夹对话框 -->
    <div v-if="showCreateFolderDialog" class="dialog-overlay" @click="closeCreateFolderDialog">
      <div class="dialog" @click.stop>
        <h3>创建文件夹</h3>
        <div class="form-group">
          <label>文件夹名称：</label>
          <input type="text" v-model="newFolderName" placeholder="请输入文件夹名称">
        </div>
        <div class="form-group">
          <label>父文件夹：</label>
          <select v-model="newFolderParent">
            <option value="">根目录</option>
            <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
              {{ folder.name }}
            </option>
          </select>
        </div>
        <div class="dialog-actions">
          <button class="btn cancel-btn" @click="closeCreateFolderDialog">取消</button>
          <button class="btn confirm-btn" @click="createFolder">创建</button>
        </div>
      </div>
    </div>
 
    <!-- 移动图片对话框 -->
    <div v-if="showMoveDialog" class="dialog-overlay" @click="closeMoveDialog">
      <div class="dialog" @click.stop>
        <h3>移动图片到文件夹</h3>
        <div class="form-group">
          <label>选择文件夹：</label>
          <select v-model="targetFolderId">
            <option value="">根目录</option>
            <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
              {{ folder.name }}
            </option>
          </select>
        </div>
        <div class="dialog-actions">
          <button class="btn cancel-btn" @click="closeMoveDialog">取消</button>
          <button class="btn confirm-btn" @click="moveSelectedImages">移动</button>
        </div>
      </div>
    </div>
  </div>
</template>
 
<script setup>
import useApi from '~/services/api';
import { toast } from '~/composables/useToast'
 
definePageMeta({
  middleware: 'auth'
})
 
const images = ref([])
const loading = ref(true)
const error = ref('')
const user = useState('user', () => null)
 
// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)
 
// 选中图片
const selectedImages = ref([])
 
// 预览相关
const previewImage = ref(null)
 
// 搜索和文件夹
const searchQuery = ref('')
const currentFolderId = ref('')
const folders = ref([])
 
// 对话框
const showCreateFolderDialog = ref(false)
const showMoveDialog = ref(false)
const newFolderName = ref('')
const newFolderParent = ref('')
const targetFolderId = ref('')
 
// 计算属性
const isAllSelected = computed(() => {
  return images.value.length > 0 && images.value.length === selectedImages.value.length
})
 
const folderOptions = computed(() => {
  const flattenFolders = (folders, parentName = '') => {
    let result = []
    folders.forEach(folder => {
      const fullName = parentName ? `${parentName} / ${folder.name}` : folder.name
      result.push({ ...folder, fullName })
      if (folder.children && folder.children.length > 0) {
        result = result.concat(flattenFolders(folder.children, fullName))
      }
    })
    return result
  }
  return flattenFolders(folders.value)
})
 
// 方法定义
const openPreview = (imageUrl) => {
  previewImage.value = imageUrl
}
 
const closePreview = () => {
  previewImage.value = null
}
 
const toggleImageSelection = (image) => {
  const index = selectedImages.value.findIndex(img => img.id === image.id)
  if (index === -1) {
    selectedImages.value.push(image)
  } else {
    selectedImages.value.splice(index, 1)
  }
}
 
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedImages.value = []
  } else {
    selectedImages.value = [...images.value]
  }
}
 
const fetchImages = async () => {
  try {
    loading.value = true
    const api = useApi()
    const data = await api.getImages({
      page: currentPage.value,
      pageSize: pageSize.value,
      folderId: currentFolderId.value || null,
      search: searchQuery.value
    })
    if (data.success) {
      images.value = data.data.list.map(img => ({
        ...img,
        editing: false,
        editName: img.name,
        editingNote: false,
        editNote: img.note || ''
      }))
      total.value = data.data.pagination.total
      totalPages.value = data.data.pagination.totalPages
    } else {
      images.value = []
      error.value = data.message
    }
  } catch (err) {
    error.value = '获取图片列表失败'
    console.error(err)
  } finally {
    loading.value = false
  }
}
 
const fetchFolders = async () => {
  try {
    const api = useApi()
    const data = await api.getFolders()
    if (data.success) {
      folders.value = data.data.folders
    }
  } catch (err) {
    console.error('获取文件夹列表失败:', err)
  }
}
 
const handleDelete = async (imageUrl) => {
  if (!confirm('确定要删除这张图片吗？')) return
 
  try {
    const api = useApi()
    const success = await api.deleteImage([imageUrl])
    if (success) {
      toast.showToast('删除成功', 'success')
      await fetchImages()
    } else {
      throw new Error('删除失败')
    }
  } catch (err) {
    toast.showToast('删除失败', 'error')
  }
}
 
const handleBatchDelete = async () => {
  if (!confirm(`确定要删除选中的 ${selectedImages.value.length} 张图片吗？`)) return
 
  try {
    const api = useApi()
    const success = await api.deleteImage(selectedImages.value.map(img => img.url))
    if (success) {
      toast.showToast(`成功删除 ${selectedImages.value.length} 张图片`, 'success')
      selectedImages.value = []
      await fetchImages()
    } else {
      throw new Error('批量删除失败')
    }
  } catch (err) {
    toast.showToast('批量删除失败', 'error')
  }
}
 
const handlePageChange = (page) => {
  currentPage.value = page
  fetchImages()
}
 
const handleFolderChange = () => {
  currentPage.value = 1
  fetchImages()
}
 
const handleSearch = debounce(() => {
  currentPage.value = 1
  fetchImages()
}, 300)
 
const editImageName = (image) => {
  image.editing = true
  image.editName = image.name
  nextTick(() => {
    const input = document.querySelector('.name-input')
    if (input) input.focus()
  })
}
 
const saveImageName = async (image) => {
  if (image.editName.trim() === '') {
    image.editName = image.name
    image.editing = false
    return
  }
 
  try {
    const api = useApi()
    const success = await api.renameImage(image.id, image.editName.trim())
    if (success) {
      image.name = image.editName.trim()
      toast.showToast('重命名成功', 'success')
    } else {
      throw new Error('重命名失败')
    }
  } catch (err) {
    toast.showToast('重命名失败', 'error')
  } finally {
    image.editing = false
  }
}
 
const cancelEditName = (image) => {
  image.editing = false
  image.editName = image.name
}
 
const editImageNote = (image) => {
  image.editingNote = true
  image.editNote = image.note || ''
  nextTick(() => {
    const input = document.querySelector('.note-input')
    if (input) input.focus()
  })
}
 
const saveImageNote = async (image) => {
  try {
    const api = useApi()
    const success = await api.updateImageNote(image.id, image.editNote.trim())
    if (success) {
      image.note = image.editNote.trim()
      toast.showToast('备注更新成功', 'success')
    } else {
      throw new Error('备注更新失败')
    }
  } catch (err) {
    toast.showToast('备注更新失败', 'error')
  } finally {
    image.editingNote = false
  }
}
 
const cancelEditNote = (image) => {
  image.editingNote = false
  image.editNote = image.note || ''
}
 
const closeCreateFolderDialog = () => {
  showCreateFolderDialog.value = false
  newFolderName.value = ''
  newFolderParent.value = ''
}
 
const createFolder = async () => {
  if (!newFolderName.value.trim()) {
    toast.showToast('请输入文件夹名称', 'error')
    return
  }
 
  try {
    const api = useApi()
    const success = await api.createFolder(newFolderName.value.trim(), newFolderParent.value || null)
    if (success) {
      toast.showToast('文件夹创建成功', 'success')
      await fetchFolders()
      closeCreateFolderDialog()
    } else {
      throw new Error('创建文件夹失败')
    }
  } catch (err) {
    toast.showToast('创建文件夹失败', 'error')
  }
}
 
const closeMoveDialog = () => {
  showMoveDialog.value = false
  targetFolderId.value = ''
}
 
const moveSelectedImages = async () => {
  if (selectedImages.value.length === 0) return
 
  try {
    const api = useApi()
    const success = await api.moveImagesToFolder(
      selectedImages.value.map(img => img.id),
      targetFolderId.value || null
    )
    if (success) {
      toast.showToast('图片移动成功', 'success')
      selectedImages.value = []
      await fetchImages()
      closeMoveDialog()
    } else {
      throw new Error('移动图片失败')
    }
  } catch (err) {
    toast.showToast('移动图片失败', 'error')
  }
}
 
const pageNumbers = computed(() => {
  const range = 2
  let start = Math.max(1, currentPage.value - range)
  let end = Math.min(totalPages.value, currentPage.value + range)
 
  const length = end - start + 1
  if (length < 5 && totalPages.value >= 5) {
    if (currentPage.value <= 3) {
      end = Math.min(5, totalPages.value)
    } else {
      start = Math.max(1, totalPages.value - 4)
    }
  }
 
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
 
// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
 
onMounted(() => {
  fetchImages()
  fetchFolders()
})
</script>
 
<style scoped>
.images-page {
  position: relative;
}
 
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
 
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}
 
.folder-selector,
.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.folder-selector select,
.search-input {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.9rem;
}
 
.search-input {
  min-width: 200px;
}
 
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
 
.image-card {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}
 
.image-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
 
.image-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.image-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.image-name {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.image-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}
 
.note-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.name-input,
.note-input {
  flex: 1;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: inherit;
}
 
.edit-name-btn,
.edit-note-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
}
 
.edit-name-btn:hover,
.edit-note-btn:hover {
  background: #f3f4f6;
}
 
.delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
 
.delete-btn:hover {
  background: #fee2e2;
}
 
.loading,
.error,
.empty {
  text-align: center;
  padding: 2rem;
}
 
.pagination {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
 
.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
 
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
 
.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.page-number {
  min-width: 2rem;
  height: 2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
.page-number.active {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}
 
.page-ellipsis {
  color: #6b7280;
  padding: 0 0.25rem;
}
 
.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
 
.delete-selected-btn,
.move-selected-btn,
.create-folder-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
 
.delete-selected-btn {
  background-color: #ef4444;
  color: white;
}
 
.move-selected-btn {
  background-color: #3b82f6;
  color: white;
}
 
.create-folder-btn {
  background-color: #10b981;
  color: white;
}
 
.image-select {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1;
}
 
.image-select input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
}
 
.select-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
 
.select-all input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
}
 
.preview-cursor {
  cursor: zoom-in;
}
 
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
 
.image-preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}
 
.image-preview-container img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
}
 
.close-preview {
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  font-size: 40px;
  cursor: pointer;
  z-index: 1001;
}
 
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
 
.dialog {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  max-width: 90vw;
}
 
.dialog h3 {
  margin: 0 0 1rem 0;
  color: #1f2937;
}
 
.form-group {
  margin-bottom: 1rem;
}
 
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}
 
.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}
 
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
 
.dialog-actions .btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
 
.cancel-btn {
  background-color: #6b7280;
  color: white;
}
 
.confirm-btn {
  background-color: #3b82f6;
  color: white;
}
 
@media (max-width: 768px) {
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
  }
 
  .image-card img {
    height: 150px;
  }
 
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
 
  .folder-selector,
  .search-box {
    width: 100%;
  }
 
  .search-input {
    min-width: auto;
  }
 
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
 
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
 
  .dialog {
    min-width: auto;
    margin: 1rem;
  }
}
</style>
