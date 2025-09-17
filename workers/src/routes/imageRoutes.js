import { Hono } from 'hono'
import { imageController } from '../controllers/imageController'
import { authMiddleware } from '../middlewares/authMiddleware'
 
const imageRoutes = new Hono()
 
// 所有图片操作路由都需要认证
imageRoutes.use('*', (c, next) => authMiddleware(c.env)(c, next))
imageRoutes.post('/upload', imageController.uploadImage)
imageRoutes.delete('/delete', imageController.deleteImages)
imageRoutes.post('/list', imageController.listImages)
imageRoutes.put('/rename', imageController.renameImage)
imageRoutes.put('/note', imageController.updateImageNote)
imageRoutes.put('/move', imageController.moveImageToFolder)
 
export { imageRoutes }
