export default defineNuxtPlugin(() => {
    const { initTheme } = useTheme()
    const { initAuth } = useAuth()
    
    // 初始化主题和认证状态
    initTheme()
    initAuth()
})