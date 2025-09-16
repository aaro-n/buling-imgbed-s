import { Hono } from 'hono'
import { userRoutes } from './routes/userRoutes'
import { authRoutes } from './routes/authRoutes'
import { imageRoutes } from './routes/imageRoutes'
import { tgbotRoutes } from './routes/tgbotRoutes'
 
const app = new Hono()
 
// 允许的前端域名
const ALLOWED_ORIGINS = [
  'https://buling-imgbed-frontend-90s.pages.dev',
  'http://localhost:3000',
  'http://localhost:5173'
]
 
// CORS 中间件
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin')
  const referer = c.req.header('Referer')
  
  // 检查来源是否在允许列表中
  let allowedOrigin = '*'
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    allowedOrigin = origin
  } else if (referer) {
    const refererOrigin = new URL(referer).origin
    if (ALLOWED_ORIGINS.includes(refererOrigin)) {
      allowedOrigin = refererOrigin
    }
  }
 
  // 设置 CORS 响应头
  c.header('Access-Control-Allow-Origin', allowedOrigin)
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')
  c.header('Access-Control-Max-Age', '86400')
  c.header('Access-Control-Allow-Credentials', 'true')
 
  // 处理预检请求
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }
 
  await next()
})
 
// 注册路由组
app.route('/user', userRoutes)
app.route('/auth', authRoutes)
app.route('/image', imageRoutes)
app.route('/tgbot', tgbotRoutes)
 
app.notFound((c) => {
  return c.json({ 
    success: false, 
    message: '接口不存在' 
  }, 404)
})
 
export default app
