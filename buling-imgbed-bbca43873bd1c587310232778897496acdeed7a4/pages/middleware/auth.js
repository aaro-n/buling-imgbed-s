export default defineNuxtRouteMiddleware((to, from) => {
  const { getUser } = useAuth()
  const token = useState('buling-token')
  const user = useState('user', () => null)

  if (!user.value && token.value) {
    getUser()
  }

  if (!token.value && !['/login', '/'].includes(to.path)) {
    return navigateTo('/login')
  }

  // 已登录用户访问首页时重定向到上传页面
  if (user.value && to.path === '/') {
    return navigateTo('/upload')
  }
}) 