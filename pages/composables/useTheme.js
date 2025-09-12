export const useTheme = () => {
    // 使用useState确保状态在客户端和服务端之间同步
    const theme = useState('theme', () => 'light')
    // 切换主题的方法
    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light'
        // 更新HTML的data-theme属性
        if (process.client) {
            document.documentElement.setAttribute('data-theme', theme.value)
            // 保存到localStorage
            localStorage.setItem('theme', theme.value)
        }
    }
    // 初始化主题
    const initTheme = () => {
        if (process.client) {
            const savedTheme = localStorage.getItem('theme') || 'light'
            theme.value = savedTheme
            document.documentElement.setAttribute('data-theme', savedTheme)
        }
    }
    return {
        theme,
        toggleTheme,
        initTheme
    }
}