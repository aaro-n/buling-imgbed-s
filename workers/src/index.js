import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/authRoutes'
import { imageRoutes } from './routes/imageRoutes'
import { userRoutes } from './routes/userRoutes'
import { folderRoutes } from './routes/folderRoutes'
 
const app = new Hono()
 
// 启用 CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'], // 替换为你的前端域名
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))
 
// 路由注册
app.route('/auth', authRoutes)
app.route('/image', imageRoutes)
app.route('/user', userRoutes)
app.route('/folder', folderRoutes)
 
// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})
 
export default app
