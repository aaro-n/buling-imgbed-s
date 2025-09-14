<template>
  <div class="images-page">
    <!-- 搜索框 -->
    <div class="search-container">
      <div class="search-input-group">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索图片名或备注..." 
          class="search-input"
          @keyup.enter="handleSearch"
        >
        <button class="search-btn" @click="handleSearch">
          搜索
        </button>
        <button v-if="searchQuery" class="clear-search-btn" @click="clearSearch">
          清除
        </button>
      </div>
    </div>
 
    <div class="page-header">
      <h2>当前用户已上传 {{ total }} 张图片</h2>
      <div class="header-actions">
        <button v-if="selectedImages.length > 0" class="btn delete-selected-btn" @click="handleBatchDelete">
          删除所选({{ selectedImages.length }})
        </button>
        <label class="select-all" v-if="images.length > 0">
          <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
          全选
        </label>
      </div>
    </div>
 
    <div v-if="loading" class="loading">加载中...</div>
 
    <div v-else-if="error" class="error">{{ error }}</div>
 
    <div v-else-if="images.length === 0" class="empty">
      {{ searchQuery ? '没有找到匹配的图片' : '暂无图片，请上传' }}
    </div>
 
    <div v-else class="image-grid">
      <div v-for="image in images" :key="image.id" class="image-card card">
        <div class="image-select">
          <input type="checkbox" :checked="selectedImages.includes(image.url)"
            @change="toggleImageSelection(image.url)">
        </div>
        <img :dataSrc="user" :src="`${user.r2_custom_url}/${image.url}`" :alt="image.originalFilename"
          @click="openPreview(image.url)" class="preview-cursor">
        
        <!-- 图片信息区域 -->
        <div class="image-info">
          <div class="image-name-container">
            <span class="image-name" :title="image.originalFilename">{{ image.originalFilename }}</span>
            <button class="rename-btn" @click="openRenameDialog(image)" title="重命名">
              ✏️
            </button>
          </div>
          
          <!-- 备注显示和编辑区域 -->
          <div class="description-container">
            <div v-if="!image.editingDescription" class="description-display">
              <span class="description-text" :title="image.description || '暂无备注'">
                {{ image.description || '暂无备注' }}
              </span>
              <button class="edit-desc-btn" @click="startEditDescription(image)" title="编辑备注">
                📝
              </button>
            </div>
            <div v-else class="description-edit">
              <input 
                v-model="image.tempDescription" 
                type="text" 
                placeholder="输入备注..." 
                class="description-input"
                @keyup.enter="saveDescription(image)"
                @keyup.escape="cancelEditDescription(image)"
                ref="descriptionInput"
              >
              <div class="description-actions">
                <button class="save-desc-btn" @click="saveDescription(image)">保存</button>
                <button class="cancel-desc-btn" @click="cancelEditDescription(image)">取消</button>
              </div>
            </div>
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
 
    <!-- 重命名对话框 -->
    <div v-if="showRenameDialog" class="dialog-overlay" @click="closeRenameDialog">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <h3>重命名图片</h3>
          <span class="dialog-close" @click="closeRenameDialog">×</span>
        </div>
        <div class="dialog-body">
          <input 
            v-model="newFileName" 
            type="text" 
            placeholder="输入新文件名..." 
            class="dialog-input"
            ref="renameInput"
          >
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-cancel" @click="closeRenameDialog">取消</button>
          <button class="dialog-btn dialog-btn-confirm" @click="confirmRename">确定</button>
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
 
// 搜索相关
const searchQuery = ref('')
 
// 预览相关
const previewImage = ref(null)
 
// 重命名相关
const showRenameDialog = ref(false)
const renamingImage = ref(null)
const newFileName = ref('')
 
// 备注编辑相关
const descriptionInput = ref(null)
const renameInput = ref(null)
 
// 打开预览
const openPreview = (imageUrl) => {
  previewImage.value = imageUrl
}
 
// 关闭预览
const closePreview = () => {
  previewImage.value = null
}
 
// 全选相关计算属性
const isAllSelected = computed(() => {
  return images.value.length > 0 && images.value.length === selectedImages.value.length
})
 
// 切换图片选择状态
const toggleImageSelection = (imageUrl) => {
  const index = selectedImages.value.indexOf(imageUrl)
  if (index === -1) {
    selectedImages.value.push(imageUrl)
  } else {
    selectedImages.value.splice(index, 1)
  }
}
 
// 搜索功能
const handleSearch = () => {
  currentPage.value = 1
  fetchImages()
}
 
// 清除搜索
const clearSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
  fetchImages()
}
 
// 获取图片列表
const fetchImages = async () => {
  try {
    loading.value = true
    const api = useApi()
    const data = await api.getImages({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchQuery.value
    })
    if (data.success) {
      images.value = data.data.list.map(img => ({
        ...img,
        editingDescription: false,
        tempDescription: img.description || ''
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
 
// 备注编辑功能
const startEditDescription = (image) => {
  image.editingDescription = true
  image.tempDescription = image.description || ''
  nextTick(() => {
    if (descriptionInput.value) {
      descriptionInput.value.focus()
    }
  })
}
 
const saveDescription = async (image) => {
  try {
    const api = useApi()
    const success = await api.updateImageDescription(image.filename, image.tempDescription)
    if (success) {
      image.description = image.tempDescription
      image.editingDescription = false
      toast.showToast('备注更新成功', 'success')
    } else {
      throw new Error('备注更新失败')
    }
  } catch (err) {
    toast.showToast('备注更新失败', 'error')
  }
}
 
const cancelEditDescription = (image) => {
  image.editingDescription = false
  image.tempDescription = image.description || ''
}
 
// 重命名功能
const openRenameDialog = (image) => {
  renamingImage.value = image
  newFileName.value = image.originalFilename
  showRenameDialog.value = true
  nextTick(() => {
    if (renameInput.value) {
      renameInput.value.focus()
      renameInput.value.select()
    }
  })
}
 
const closeRenameDialog = () => {
  showRenameDialog.value = false
  renamingImage.value = null
  newFileName.value = ''
}
 
const confirmRename = async () => {
  if (!newFileName.value.trim()) {
    toast.showToast('文件名不能为空', 'error')
    return
  }
 
  try {
    const api = useApi()
    const success = await api.renameImage(renamingImage.value.filename, newFileName.value.trim())
    if (success) {
      renamingImage.value.originalFilename = newFileName.value.trim()
      closeRenameDialog()
      toast.showToast('重命名成功', 'success')
    } else {
      throw new Error('重命名失败')
    }
  } catch (err) {
    toast.showToast('重命名失败', 'error')
  }
}
 
// 删除功能
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
    const success = await api.deleteImage(selectedImages.value)
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
 
// 分页功能
const handlePageChange = (page) => {
  currentPage.value = page
  fetchImages()
}
 
// 计算页码范围
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
 
// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedImages.value = []
  } else {
    selectedImages.value = images.value.map(img => img.url)
  }
}
 
onMounted(() => {
  fetchImages()
})
</script>
 
<style scoped>
.images-page {
  position: relative;
}
 
/* 搜索框样式 */
.search-container {
  margin-bottom: 2rem;
}
 
.search-input-group {
  display: flex;
  gap: 0.5rem;
  max-width: 500px;
}
 
.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
}
 
.search-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
 
.search-btn, .clear-search-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}
 
.search-btn {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}
 
.clear-search-btn {
  background-color: #6b7280;
  color: white;
  border-color: #6b7280;
}
 
.search-btn:hover {
  background-color: #1d4ed8;
}
 
.clear-search-btn:hover {
  background-color: #4b5563;
}
 
/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
 
/* 图片网格 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
 
.image-card {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
 
.image-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
 
.image-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
 
/* 图片信息区域 */
.image-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
 
.image-name-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
 
.image-name {
  flex: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
 
.rename-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}
 
.rename-btn:hover {
  background-color: #f3f4f6;
}
 
/* 备注编辑样式 */
.description-container {
  min-height: 40px;
}
 
.description-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
 
.description-text {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
 
.edit-desc-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}
 
.edit-desc-btn:hover {
  background-color: #f3f4f6;
}
 
.description-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.description-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.875rem;
}
 
.description-input:focus {
  outline: none;
  border-color: #2563eb;
}
 
.description-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
 
.save-desc-btn, .cancel-desc-btn {
  padding: 0.25rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}
 
.save-desc-btn {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}
 
.cancel-desc-btn {
  background-color: #6b7280;
  color: white;
  border-color: #6b7280;
}
 
.delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}
 
.delete-btn:hover {
  background-color: #fef2f2;
}
 
/* 选择框 */
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
 
/* 对话框样式 */
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
 
.dialog-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
 
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
 
.dialog-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}
 
.dialog-close {
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}
 
.dialog-close:hover {
  color: #374151;
}
 
.dialog-body {
  padding: 1.5rem;
}
 
.dialog-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
}
 
.dialog-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
 
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}
 
.dialog-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
}
 
.dialog-btn-cancel {
  background-color: white;
  color: #374151;
  border-color: #e5e7eb;
}
 
.dialog-btn-cancel:hover {
  background-color: #f9fafb;
}
 
.dialog-btn-confirm {
  background-color: #2563eb;
  color: white;
}
 
.dialog-btn-confirm:hover {
  background-color: #1d4ed8;
}
 
/* 其他样式保持不变 */
.loading, .error, .empty {
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
 
.delete-selected-btn {
  background-color: #ef4444;
  color: white;
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
 
@media (max-width: 768px) {
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
 
  .image-card img {
    height: 150px;
  }
 
  .search-input-group {
    flex-direction: column;
  }
 
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
 
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
 
  .dialog-container {
    width: 95%;
    margin: 1rem;
  }
}
</style>
