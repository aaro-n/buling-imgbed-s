import { toast } from '~/composables/useToast'
 
export default function useApi() {
  const config = useRuntimeConfig()
  const user = useState('user', () => null)
 
  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token')
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    }
 
    try {
      const response = await $fetch(`${config.public.apiBase}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      })
      return response
    } catch (error) {
      console.error('API调用失败:', error)
      throw error
    }
  }
 
  return {
    // 登录
    async login(username, password) {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
      
      if (response.success) {
        localStorage.setItem('token', response.data.token)
        user.value = response.data.user
      }
      
      return response.success
    },
 
    // 获取用户信息
    async getUserInfo() {
      const response = await apiCall('/auth/me')
      if (response.success) {
        user.value = response.data
      }
      return response.success
    },
 
    // 上传图片
    async uploadImage(formData) {
      const token = localStorage.getItem('token')
      const response = await $fetch(`${config.public.apiBase}/image/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })
      return response.success
    },
 
    // 获取图片列表
    async getImages(params = {}) {
      const response = await apiCall('/images/list', {
        method: 'POST',
        body: JSON.stringify(params)
      })
      return response
    },
 
    // 删除图片
    async deleteImage(files) {
      const response = await apiCall('/images/delete', {
        method: 'DELETE',
        body: JSON.stringify({ files })
      })
      return response.success
    },
 
    // 获取文件夹列表
    async getFolders() {
      const response = await apiCall('/images/folders')
      return response.success ? response.data : []
    },
 
    // 创建文件夹
    async createFolder(name) {
      const response = await apiCall('/images/create-folder', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      return response.success
    },
 
    // 移动图片到文件夹
    async moveImages(files, targetFolder) {
      const response = await apiCall('/images/move-images', {
        method: 'POST',
        body: JSON.stringify({ files, targetFolder })
      })
      return response.success
    },
 
    // 更新图片备注
    async updateImageDescription(filename, description) {
      const response = await apiCall('/images/update-description', {
        method: 'POST',
        body: JSON.stringify({ filename, description })
      })
      return response.success
    },
 
    // 重命名图片
    async renameImage(filename, originalFilename) {
      const response = await apiCall('/images/rename', {
        method: 'POST',
        body: JSON.stringify({ filename, originalFilename })
      })
      return response.success
    }
  }
}
