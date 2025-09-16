<template>
  <div class="images-page">
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
          <span class="image-name">{{ image.name }}</span>
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

// 获取图片列表
const fetchImages = async () => {
  try {
    loading.value = true
    const api = useApi()
    const data = await api.getImages({
      page: currentPage.value,
      pageSize: pageSize.value
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
  justify-content: space-between;
  align-items: center;
}

.delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
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
    /* 稍微减小标题大小 */
    margin: 0;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
    /* 让操作按钮分散对齐 */
  }

  .delete-selected-btn {
    padding: 0.5rem 1rem;
    /* 调整按钮大小更适合触摸 */
    font-size: 0.875rem;
    order: 2;
  }

  .select-all {
    order: 1;
  }
}
</style>