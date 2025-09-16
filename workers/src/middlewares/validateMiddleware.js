export const validateRequest = (schema) => {
    return async (c, next) => {
        try {
            // 添加调试日志
            console.log('开始验证请求体...')
            
            // 检查Content-Type
            const contentType = c.req.header('Content-Type')
            if (!contentType || !contentType.includes('application/json')) {
                return c.json({
                    success: false,
                    message: 'Content-Type 必须是 application/json'
                }, 400)
            }
 
            const body = await c.req.json()
            console.log('请求体:', body)
            
            const validatedData = await schema.parseAsync(body)
            console.log('验证通过:', validatedData)
            
            c.set('validatedBody', validatedData)
            await next()
        } catch (error) {
            console.error('验证错误:', error)
            
            // Zod 验证错误处理
            if (error.issues && error.issues.length > 0) {
                return c.json({
                    success: false,
                    message: error.issues[0].message
                }, 400)
            }
            
            // JSON 解析错误处理
            if (error instanceof SyntaxError) {
                return c.json({
                    success: false,
                    message: '无效的JSON格式'
                }, 400)
            }
            
            // 其他错误处理
            return c.json({
                success: false,
                message: error.message || '请求数据验证失败'
            }, 400)
        }
    }
}
