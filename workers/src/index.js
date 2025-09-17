import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/authRoutes'
import { imageRoutes } from './routes/imageRoutes'
import { userRoutes } from './routes/userRoutes'
import { folderRoutes } from './routes/folderRoutes'
 
const app = new Hono()
 
// CORS 中间件
app.use('*', async (c, next) => {
  // 允许的来源
  const origin = c.req.header('Origin') || '*';

  // 设置 CORS 响应头
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  c.header('Access-Control-Max-Age', '86400'); // 24小时
  c.header('Access-Control-Allow-Credentials', 'true'); // 如果前端使用了 withCredentials


  // 处理预检请求
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...c.res.headers,
        'Access-Control-Allow-Origin': origin, // 返回允许的源
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // 返回允许的请求方法
        'Access-Control-Allow-Headers': 'Authorization, Content-Type', // 返回允许的请求头
        'Access-Control-Allow-Credentials': 'true', // 返回允许携带凭证
      },
    });
  }

  await next();
});

// app.get('/', (c) => {
//   return c.text('Hello 布灵图床!')
// })
 
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
