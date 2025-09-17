<template>
  <div class="images-page">
    <div class="page-header">
      <h2>当前用户已上传 {{ total }} 张图片</h2>
      <div class="header-actions">
        <button v-if="selectedImages.length > 0" class="btn delete-selected-btn" @click="handleBatchDelete">
          删除所选({{ selectedImages.length }})
        </button>
        <button v-if="selectedImages.length > 0" class="btn move-selected-btn" @click="showMoveDialog = true">
          移动所选({{ selectedImages.length }})
        </button>
        <label class="select-all" v-if="images.length > 0">
          <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
          全选
        </label>
      </div>
    </div>
 
    <!-- 文件夹筛选 -->
    <div class="folder-filter">
      <label>文件夹：</label>
      <select v-model="currentFolder" @change="handleFolderChange">
        <option value="">全部图片</option>
        <option v-for="folder in folders" :key="folder" :value="folder">{{ folder }}</option>
      </select>
    </div>
 
    <div v-if="loading" class="loading">加载中...</div>
 
    <div v-else-if="error" class="error">{{ error }}</div>
 
    <div v-else-if="images.length === 0" class="empty">
      暂无图片，请上传
    </div>
 
    <div v-else class="image-grid">
      <div v-for="image in images" :key="image.id" class="image-card card">
        <div class="image-select">
          <input type="checkbox" :checked="selectedImages.includes(image.url)"
            @change="toggleImageSelection(image.url)">
        </div>
        <img :dataSrc="user" :src="`${user.r2_custom_url}/${image.url}`" :alt="image.name"
          @click="openPreview(image.url)" class="preview-cursor">
        <div class="image-info">
          <span class="image-name" @click="startRename(image)" :title="image.name">{{ image.name }}</span>
          <div class="image-actions">
            <button class="rename-btn" @click="startRename(image)">重命名</button>
            <button class="delete-btn" @click="handleDelete(image.url)">删除</button>
          </div>
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
 
    <!-- 重命名对话框 -->
    <div v-if="showRenameDialog" class="dialog-overlay" @click="showRenameDialog = false">
      <div class="dialog-content" @click.stop>
        <h3>重命名图片</h3>
        <input v-model="newImageName" type="text" placeholder="输入新名称" @keyup.enter="confirmRename">
        <div class="dialog-actions">
          <button @click="showRenameDialog = false">取消</button>
          <button @click="confirmRename" class="primary">确定</button>
        </div>
      </div>
    </div>
 
    <!-- 移动对话框 -->
    <div v-if="showMoveDialog" class="dialog-overlay" @click="showMoveDialog = false">
      <div class="dialog-content" @click.stop>
        <h3>移动到文件夹</h3>
        <select v-model="targetFolder">
          <option value="">根目录</option>
          <option v-for="folder in folders" :key="folder" :value="folder">{{ folder }}</option>
        </select>
        <div class="new-folder">
          <input v-model="newFolderName" type="text" placeholder="或输入新文件夹名称">
          <button @click="createFolder">创建</button>
        </div>
        <div class="dialog-actions">
          <button @click="showMoveDialog = false">取消</button>
          <button @click="confirmMove" class="primary">移动</button>
        </div>
      </div>
    </div>
 
    <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
      <div class="image-preview-container">
        <span class="close-preview">×</span>
        <img :src="`${user.r2_custom_url}/${previewImage}`" alt="预览图片">
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
 
// 添加分页相关的响应式变量
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)
 
// 添加选中图片数组
const selectedImages = ref([])
 
// 添加预览相关的状态和方法
const previewImage = ref(null)
 
// 添加文件夹相关状态
const folders = ref([])
const currentFolder = ref('')
 
// 添加重命名相关状态
const showRenameDialog = ref(false)
const renamingImage = ref(null)
const newImageName = ref('')
 
// 添加移动相关状态
const showMoveDialog = ref(false)
const targetFolder = ref('')
const newFolderName = ref('')
 
// 打开预览
const openPreview = (imageUrl) => {
  previewImage.value = imageUrl
}
 
// 关闭预览
const closePreview = () => {
  previewImage.value = null
}
 
// 添加全选相关的计算属性
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
 
// 获取文件夹列表
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
 
// 获取图片列表
const fetchImages = async () => {
  try {
    loading.value = true
    const api = useApi()
    const data = await api.getImages({
      page: currentPage.value,
      pageSize: pageSize.value,
      folder: currentFolder.value
    })
    if (data.success) {
      images.value = data.data.list
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
 
// 文件夹改变处理
const handleFolderChange = () => {
  currentPage.value = 1
  selectedImages.value = []
  fetchImages()
}
 
// 开始重命名
const startRename = (image) => {
  renamingImage.value = image
  newImageName.value = image.name
  showRenameDialog.value = true
}
 
// 确认重命名
const confirmRename = async () => {
  if (!renamingImage.value || !newImageName.value.trim()) {
    toast.showToast('请输入有效的名称', 'error')
    return
  }
 
  try {
    const api = useApi()
    const success = await api.renameImage(renamingImage.value.url, newImageName.value.trim())
    if (success) {
      toast.showToast('重命名成功', 'success')
      showRenameDialog.value = false
      renamingImage.value = null
      newImageName.value = ''
      await fetchImages()
    } else {
      throw new Error('重命名失败')
    }
  } catch (err) {
    toast.showToast('重命名失败', 'error')
  }
}
 
// 创建新文件夹
const createFolder = () => {
  const folderName = newFolderName.value.trim()
  if (folderName && !folders.value.includes(folderName)) {
    folders.value.push(folderName)
    targetFolder.value = folderName
    newFolderName.value = ''
    toast.showToast('文件夹创建成功', 'success')
  }
}
 
// 确认移动
const confirmMove = async () => {
  if (selectedImages.value.length === 0) {
    toast.showToast('请选择要移动的图片', 'error')
    return
  }
 
  try {
    const api = useApi()
    const success = await api.moveImage(selectedImages.value, targetFolder.value)
    if (success) {
      toast.showToast(`成功移动 ${success.data.movedCount} 张图片`, 'success')
      showMoveDialog.value = false
      selectedImages.value = []
      targetFolder.value = ''
      await fetchImages()
    } else {
      throw new Error('移动失败')
    }
  } catch (err) {
    toast.showToast('移动失败', 'error')
  }
}
 
// 修改单个删除方法
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
 
// 修改批量删除方法
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
 
// 添加页码改变的处理方法
const handlePageChange = (page) => {
  currentPage.value = page
  fetchImages()
}
 
// 添加计算页码范围的方法
const pageNumbers = computed(() => {
  const range = 2 // 当前页左右显示的页码数
  let start = Math.max(1, currentPage.value - range)
  let end = Math.min(totalPages.value, currentPage.value + range)
 
  // 调整起始页，确保始终显示5个页码（如果总页数足够）
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
 
// 添加全选/取消全选方法
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // 如果当前是全选状态，则清空选择
    selectedImages.value = []
  } else {
    // 如果当前不是全选状态，则选择所有图片
    selectedImages.value = images.value.map(img => img.url)
  }
}
 
onMounted(() => {
  fetchFolders()
  fetchImages()
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
 
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
 
.image-card {
  position: relative;
}
 
.image-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}
 
.image-info {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.image-name {
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
 
.image-name:hover {
  color: #2563eb;
}
 
.image-actions {
  display: flex;
  gap: 0.5rem;
}
 
.rename-btn {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.8rem;
}
 
.delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.8rem;
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
 
.page-info {
  font-size: 0.9rem;
  color: #6b7280;
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
 
.page-btn:hover:not(:disabled) {
  background-color: #f3f4f6;
}
 
.page-btn.active:hover {
  background-color: #2563eb;
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
 
.move-selected-btn {
  background-color: #2563eb;
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
 
/* 文件夹筛选样式 */
.folder-filter {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.folder-filter label {
  font-weight: 500;
  color: #374151;
}
 
.folder-filter select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  min-width: 200px;
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
 
.dialog-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  max-width: 90vw;
}
 
.dialog-content h3 {
  margin: 0 0 1rem 0;
  color: #1f2937;
}
 
.dialog-content input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 1rem;
}
 
.dialog-content select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 1rem;
  background: white;
}
 
.new-folder {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
 
.new-folder input {
  flex: 1;
  margin-bottom: 0;
}
 
.new-folder button {
  padding: 0.75rem 1rem;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
 
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
 
.dialog-actions button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
 
.dialog-actions button.primary {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}
 
@media (max-width: 768px) {
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
  }
 
  .image-card img {
    height: 120px;
  }
 
  .image-preview-container {
    max-width: 95vw;
    max-height: 80vh;
  }
 
  .image-preview-container img {
    max-height: 80vh;
  }
 
  .close-preview {
    top: 10px;
    right: 10px;
    font-size: 30px;
  }
 
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
 
  .page-header h2 {
    font-size: 1.25rem;
    margin: 0;
  }
 
  .header-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
 
  .delete-selected-btn,
  .move-selected-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
 
  .select-all {
    order: 1;
  }
 
  .folder-filter {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
 
  .folder-filter select {
    width: 100%;
  }
 
  .dialog-content {
    min-width: 90vw;
    padding: 1.5rem;
  }
 
  .new-folder {
    flex-direction: column;
  }
 
  .new-folder button {
    width: 100%;
  }
}
</style>
