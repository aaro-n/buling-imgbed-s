export const useAuth = () => {
    const user = useState('user', () => null)
    const token = useState('buling-token', () => null)

    const setUser = (tokenData) => {
        const payload = JSON.parse(atob(tokenData.split('.')[1]))
        user.value = {
            chat_id: payload.chat_id,
            username: payload.username,
            r2_custom_url: payload.r2_custom_url,
            enable_baidu_cdn: payload.enable_baidu_cdn,
            enable_image_optimization: payload.enable_image_optimization,
        }
    }

    const setToken = (tokenData) => {
        token.value = tokenData
        if (process.client) {
            localStorage.setItem('buling-token', tokenData)
            try {
                setUser(tokenData)
            } catch (error) {
                console.error('Token 解析失败:', error)
            }
        }
    }

    const getUser = () => {
        if (!user.value && localStorage.getItem('buling-token')) {
            setUser(localStorage.getItem('buling-token'))
        }
    }


    const logout = () => {
        user.value = null
        token.value = null
        localStorage.removeItem('buling-token')
    }

    const initAuth = () => {
        if (process.client) {
            const savedToken = localStorage.getItem('buling-token')
            if (savedToken) {
                token.value = savedToken
                setUser(savedToken)
            }
        }
    }

    return {
        user,
        token,
        setUser,
        setToken,
        logout,
        initAuth,
        getUser
    }
} 