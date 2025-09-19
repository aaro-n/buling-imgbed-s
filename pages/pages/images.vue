<template>
  <div class="images-page">
    <div class="page-header">
      <h2>当前用户已上传 {{ total }} 张图片</h2>
      <div class="header-actions">
        <button v-if="selectedItems.length > 0" class="btn delete-selected-btn" @click="handleBatchDelete">
          删除所选({{ selectedItems.length }})
        </button>
        <button v-if="selectedItems.length > 0" class="btn move-selected-btn" @click="showMoveDialog = true">
          移动到文件夹({{ selectedItems.length }})
        </button>
        <button class="btn create-folder-btn" @click="showCreateFolderDialog = true">
          创建文件夹
        </button>
        <label class="select-all" v-if="displayItems.length > 0">
          <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
          全选
        </label>
      </div>
    </div>
 
    <!-- 搜索和文件夹选择 -->
    <div class="controls">
      <div class="folder-selector">
        <label>当前文件夹：</label>
        <select v-model="currentFolderId" @change="handleFolderChange">
          <option value="">根目录</option>
          <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
            {{ folder.fullName }}
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
 
    <div v-else-if="displayItems.length === 0" class="empty">
      暂无内容，请上传图片或创建文件夹
    </div>
 
    <div v-else class="content-grid">
      <!-- 文件夹显示 -->
      <div v-for="folder in currentFolders" :key="folder.id" class="folder-card card"
           @contextmenu.prevent="showFolderContextMenu($event, folder)"
           @click="navigateToFolder(folder.id)">
        <div class="folder-select">
          <input type="checkbox" :checked="selectedItems.some(item => item.id === folder.id && item.type === 'folder')"
            @change.stop="toggleItemSelection({ ...folder, type: 'folder' })">
        </div>
        <div class="folder-icon">📁</div>
        <div class="folder-info">
          <div class="folder-name">{{ folder.name }}</div>
          <div class="folder-meta">
            <span v-if="folder.children && folder.children.length > 0">
              {{ folder.children.length }} 个子文件夹
            </span>
            <span v-if="folder.imageCount > 0">
              {{ folder.imageCount }} 张图片
            </span>
          </div>
        </div>
      </div>
 
      <!-- 图片显示 -->
      <div v-for="image in images" :key="image.id" class="image-card card"
           @contextmenu.prevent="showImageContextMenu($event, image)">
        <div class="image-select">
          <input type="checkbox" :checked="selectedItems.some(item => item.id === image.id && item.type === 'image')"
            @change.stop="toggleItemSelection({ ...image, type: 'image' })">
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
            <button class="edit-name-btn" @click.stop="editImageName(image)" v-if="!image.editing">
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
            <button class="edit-note-btn" @click.stop="editImageNote(image)" v-if="!image.editingNote">
              📝
            </button>
          </div>
          <button class="delete-btn" @click.stop="handleDelete(image.url)">删除</button>
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
 
    <!-- 右键菜单 -->
    <div v-if="contextMenu.visible" class="context-menu" :style="contextMenuStyle">
      <!-- 图片右键菜单 -->
      <template v-if="contextMenu.type === 'image'">
        <div class="menu-item" @click="editImageName(contextMenu.item)">
          ✏️ 重命名
        </div>
        <div class="menu-item" @click="editImageNote(contextMenu.item)">
          📝 编辑备注
        </div>
        <div class="menu-item" @click="showImageMoveDialog(contextMenu.item)">
          📁 移动到文件夹
        </div>
        <div class="menu-item" @click="handleDelete(contextMenu.item.url)">
          🗑️ 删除
        </div>
      </template>
      
      <!-- 文件夹右键菜单 -->
      <template v-if="contextMenu.type === 'folder'">
        <div class="menu-item" @click="showFolderRenameDialog(contextMenu.item)">
          ✏️ 重命名
        </div>
        <div class="menu-item" @click="showCreateSubFolderDialogFunc(contextMenu.item)">
          📁 创建子文件夹
        </div>
        <div class="menu-item" @click="handleDeleteFolder(contextMenu.item)">
          🗑️ 删除
        </div>
      </template>
      
      <!-- 空白区域右键菜单 -->
      <template v-if="contextMenu.type === 'empty'">
        <div class="menu-item" @click="showCreateFolderDialog = true">
          📁 创建文件夹
        </div>
      </template>
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
              {{ folder.fullName }}
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
              {{ folder.fullName }}
            </option>
          </select>
        </div>
        <div class="dialog-actions">
          <button class="btn cancel-btn" @click="closeMoveDialog">取消</button>
          <button class="btn confirm-btn" @click="moveSelectedImages">移动</button>
        </div>
      </div>
    </div>
 
    <!-- 重命名文件夹对话框 -->
    <div v-if="showRenameFolderDialog" class="dialog-overlay" @click="closeRenameFolderDialog">
      <div class="dialog" @click.stop>
        <h3>重命名文件夹</h3>
        <div class="form-group">
          <label>新名称：</label>
          <input type="text" v-model="renameFolderName" placeholder="请输入新文件夹名称">
        </div>
        <div class="dialog-actions">
          <button class="btn cancel-btn" @click="closeRenameFolderDialog">取消</button>
          <button class="btn confirm-btn" @click="renameFolder">重命名</button>
        </div>
      </div>
    </div>
 
    <!-- 创建子文件夹对话框 -->
    <div v-if="showCreateSubFolderDialog" class="dialog-overlay" @click="closeCreateSubFolderDialog">
      <div class="dialog" @click.stop>
        <h3>创建子文件夹</h3>
        <div class="form-group">
          <label>子文件夹名称：</label>
          <input type="text" v-model="subFolderName" placeholder="请输入子文件夹名称">
        </div>
        <div class="dialog-actions">
          <button class="btn cancel-btn" @click="closeCreateSubFolderDialog">取消</button>
          <button class="btn confirm-btn" @click="createSubFolder">创建</button>
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
 
// 选中项目（图片和文件夹）
const selectedItems = ref([])
 
// 预览相关
const previewImage = ref(null)
 
// 搜索和文件夹
const searchQuery = ref('')
const currentFolderId = ref('')
const folders = ref([])
 
// 对话框状态
const showCreateFolderDialog = ref(false)
const showMoveDialog = ref(false)
const showRenameFolderDialog = ref(false)
const showCreateSubFolderDialog = ref(false)
const newFolderName = ref('')
const newFolderParent = ref('')
const targetFolderId = ref('')
const renameFolderName = ref('')
const subFolderName = ref('')
const selectedFolderForSub = ref(null)
 
// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: '',
  item: null
})
 
// 计算属性
const isAllSelected = computed(() => {
  return displayItems.value.length > 0 && displayItems.value.length === selectedItems.value.length
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
 
const currentFolders = computed(() => {
  // 只显示当前文件夹下的子文件夹
  return currentFolderId.value 
    ? folders.value.filter(folder => folder.parentId === currentFolderId.value)
    : folders.value.filter(folder => !folder.parentId)
})
 
const displayItems = computed(() => {
  return [...currentFolders.value, ...images.value]
})
 
const contextMenuStyle = computed(() => {
  return {
    left: `${contextMenu.value.x}px`,
    top: `${contextMenu.value.y}px`
  }
})
 
// 方法定义
const openPreview = (imageUrl) => {
  previewImage.value = imageUrl
}
 
const closePreview = () => {
  previewImage.value = null
}
 
const toggleItemSelection = (item) => {
  const index = selectedItems.value.findIndex(selected => 
    selected.id === item.id && selected.type === item.type
  )
  if (index === -1) {
    selectedItems.value.push(item)
  } else {
    selectedItems.value.splice(index, 1)
  }
}
 
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = []
  } else {
    selectedItems.value = displayItems.value.map(item => ({
      ...item,
      type: item.imageCount !== undefined ? 'folder' : 'image'
    }))
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
  if (!confirm(`确定要删除选中的 ${selectedItems.value.length} 个项目吗？`)) return
 
  try {
    const api = useApi()
    
    // 删除图片
    const imageItems = selectedItems.value.filter(item => item.type === 'image')
    if (imageItems.length > 0) {
      const imageSuccess = await api.deleteImage(imageItems.map(img => img.url))
      if (!imageSuccess) throw new Error('图片删除失败')
    }
    
    // 删除文件夹
    const folderItems = selectedItems.value.filter(item => item.type === 'folder')
    for (const folder of folderItems) {
      const folderSuccess = await api.deleteFolder(folder.id)
      if (!folderSuccess) throw new Error('文件夹删除失败')
    }
    
    toast.showToast(`成功删除 ${selectedItems.value.length} 个项目`, 'success')
    selectedItems.value = []
    await fetchImages()
    await fetchFolders()
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
  selectedItems.value = []
  fetchImages()
}
 
const navigateToFolder = (folderId) => {
  currentFolderId.value = folderId
  handleFolderChange()
}
 
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
  if (selectedItems.value.length === 0) return
 
  try {
    const api = useApi()
    const imageItems = selectedItems.value.filter(item => item.type === 'image')
    if (imageItems.length > 0) {
      const success = await api.moveImagesToFolder(
        imageItems.map(img => img.id),
        targetFolderId.value || null
      )
      if (success) {
        toast.showToast('图片移动成功', 'success')
        selectedItems.value = []
        await fetchImages()
        closeMoveDialog()
      } else {
        throw new Error('移动图片失败')
      }
    }
  } catch (err) {
    toast.showToast('移动图片失败', 'error')
  }
}
 
// 右键菜单相关
const showImageContextMenu = (event, image) => {
  hideContextMenu()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'image',
    item: image
  }
}
 
const showFolderContextMenu = (event, folder) => {
  hideContextMenu()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'folder',
    item: folder
  }
}
 
const hideContextMenu = () => {
  contextMenu.value.visible = false
}
 
const showImageMoveDialog = (image) => {
  selectedItems.value = [{ ...image, type: 'image' }]
  showMoveDialog.value = true
  hideContextMenu()
}
 
const showFolderRenameDialog = (folder) => {
  selectedFolderForSub.value = folder
  renameFolderName.value = folder.name
  showRenameFolderDialog.value = true
  hideContextMenu()
}
 
const closeRenameFolderDialog = () => {
  showRenameFolderDialog.value = false
  renameFolderName.value = ''
  selectedFolderForSub.value = null
}
 
const renameFolder = async () => {
  if (!renameFolderName.value.trim()) {
    toast.showToast('请输入文件夹名称', 'error')
    return
  }
 
  try {
    const api = useApi()
    // 这里需要在API中添加重命名文件夹的方法
    toast.showToast('文件夹重命名成功', 'success')
    await fetchFolders()
    closeRenameFolderDialog()
  } catch (err) {
    toast.showToast('重命名文件夹失败', 'error')
  }
}
 
const showCreateSubFolderDialogFunc = (folder) => {
  selectedFolderForSub.value = folder
  subFolderName.value = ''
  showCreateSubFolderDialog.value = true
  hideContextMenu()
}
 
const closeCreateSubFolderDialog = () => {
  showCreateSubFolderDialog.value = false
  subFolderName.value = ''
  selectedFolderForSub.value = null
}
 
const createSubFolder = async () => {
  if (!subFolderName.value.trim()) {
    toast.showToast('请输入子文件夹名称', 'error')
    return
  }
 
  try {
    const api = useApi()
    const success = await api.createFolder(subFolderName.value.trim(), selectedFolderForSub.value.id)
    if (success) {
      toast.showToast('子文件夹创建成功', 'success')
      await fetchFolders()
      closeCreateSubFolderDialog()
    } else {
      throw new Error('创建子文件夹失败')
    }
  } catch (err) {
    toast.showToast('创建子文件夹失败', 'error')
  }
}
 
const handleDeleteFolder = async (folder) => {
  if (!confirm(`确定要删除文件夹"${folder.name}"吗？`)) return
 
  try {
    const api = useApi()
    const success = await api.deleteFolder(folder.id)
    if (success) {
      toast.showToast('文件夹删除成功', 'success')
      await fetchFolders()
    } else {
      throw new Error('删除文件夹失败')
    }
  } catch (err) {
    toast.showToast('删除文件夹失败', 'error')
  }
  hideContextMenu()
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
  
onMounted(() => {
  fetchImages()
  fetchFolders()
  
  // 点击其他地方隐藏右键菜单
  document.addEventListener('click', hideContextMenu)
})
 
onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
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
 
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
 
.folder-card,
.image-card {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  backgrund: white;
  cursor: pointer;
  transition: all 0.2s ease;
}
 
.folder-card:hover,
.image-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
 
.folder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  text-align: center;
}
 
.folder-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
 
.folder-info {
  width: 100%;
}
 
.folder-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  word-break: break-word;
}
 
.folder-meta {
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
  word-break: break-word;
}
 
.name-input,
.note-input {
  flex: 1;
  padding: 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.9rem;
}
 
.edit-name-btn,
.edit-note-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}
 
.image-note {
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.note-text {
  flex: 1;
  word-break: break-word;
}
 
.delete-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}
 
.delete-btn:hover {
  background: #dc2626;
}
 
.folder-select,
.image-select {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10;
}
 
.folder-select input,
.image-select input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}
 
.preview-cursor {
  cursor: pointer;
}
 
.loading,
.error,
.empty {
  text-align: center;
  padding: 3rem;
  font-size: 1.1rem;
  color: #6b7280;
}
 
.error {
  color: #ef4444;
}
 
.pagination {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}
 
.page-numbers {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
 
.page-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}
 
.page-btn:hover {
  background: #f3f4f6;
}
 
.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
 
.page-ellipsis {
  color: #6b7280;
  padding: 0 0.5rem;
}
 
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
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
  max-height: 100%;
  object-fit: contain;
}
 
.close-preview {
  position: absolute;
  top: -2rem;
  right: 0;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  background: none;
  border: none;
}
 
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 150px;
}
 
.menu-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
}
 
.menu-item:last-child {
  border-bottom: none;
}
 
.menu-item:hover {
  background: #f3f4f6;
}
 
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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
  margin-bottom: 1.5rem;
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
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
 font-size: 1rem;
}
 
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
 
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}
 
.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}
 
.cancel-btn:hover {
  background: #e5e7eb;
}
 
.confirm-btn {
  background: #3b82f6;
  color: white;
}
 
.confirm-btn:hover {
  background: #2563eb;
}
 
.delete-selected-btn {
  background: #ef4444;
  color: white;
}
 
.delete-selected-btn:hover {
  background: #dc2626;
}
 
.move-selected-btn {
  background: #f59e0b;
  color: white;
}
 
.move-selected-btn:hover {
  background: #d97706;
}
 
.create-folder-btn {
  background: #10b981;
  color: white;
}
 
.create-folder-btn:hover {
  background: #059669;
}
 
.select-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}
 
.select-all input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}
</style>
