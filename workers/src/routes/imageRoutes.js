import { Hono } from 'hono'
import { imageController } from '../controllers/imageController'
import { authMiddleware } from '../middlewares/authMiddleware'
 
const imageRoutes = new Hono()
 
// 所有图片操作路由都需要认证
imageRoutes.use('*', (c, next) => authMiddleware(c.env)(c, next))
imageRoutes.post('/upload', imageController.uploadImage)
imageRoutes.delete('/delete', imageController.deleteImages)
imageRoutes.post('/list', imageController.listImages)
// 添加新的路由
imageRoutes.put('/rename', imageController.renameImage)
imageRoutes.put('/move', imageController.moveImage)
imageRoutes.get('/folders', imageController.getFolders)
 
export { imageRoutes }
