import { toast } from '~/composables/useToast'

const useApi = () => {
  const config = useRuntimeConfig()
  const { token, logout } = useAuth()
  const router = useRouter()
 
  const baseHeaders = {
    'Content-Type': 'application/json',
  }

  const getAuthHeaders = () => ({
    ...baseHeaders,
    'Authorization': `Bearer ${token.value}`
  })

  // 添加统一的响应处理函数
  const handleResponse = async (response) => {
    if (response.status === 401) {
      logout()
      toast.showToast('登录已过期，请重新登录', 'error')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      return null
    }
    return response.json()
  }

  return {
    // 认证相关
    async login(credentials) {
      const response = await fetch(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(credentials)
      })
      return response.json()
    },

    // 列出所有图片
    async getImages(body) {
      const response = await fetch(`${config.public.apiBase}/image/list`, {
        headers: getAuthHeaders(),
        method: 'POST',
        body: JSON.stringify(body)
      })
      return handleResponse(response)
    },

    async deleteImage(files) {
      const response = await fetch(`${config.public.apiBase}/image/delete`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ files })
      })
      return handleResponse(response)
    },

    async uploadImage(formData) {
      const response = await fetch(`${config.public.apiBase}/image/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`
        },
        body: formData
      })
      return handleResponse(response)
    },

    // 个人资料相关
    async getProfile() {
      const response = await fetch(`${config.public.apiBase}/user/profile`, {
        headers: getAuthHeaders()
      })
      return handleResponse(response)
    },

    async updateProfile(profileData) {
      const response = await fetch(`${config.public.apiBase}/user/update`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      })
      return handleResponse(response)
    }
  }
}

export default useApi 