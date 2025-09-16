import { Hono } from 'hono'
import { imageController } from '../controllers/imageController'
import { authMiddleware } from '../middlewares/authMiddleware'
 
const imageRoutes = new Hono()
 
// 所有图片操作路由都需要认证
imageRoutes.use('*', (c, next) => authMiddleware(c.env)(c, next))
imageRoutes.post('/upload', imageController.uploadImage)
imageRoutes.delete('/delete', imageController.deleteImages)
imageRoutes.post('/list', imageController.listImages)
imageRoutes.get('/folders', imageController.getFolders)
imageRoutes.post('/create-folder', imageController.createFolder)
imageRoutes.post('/move-images', imageController.moveImages)
 
// 新增：更新图片备注路由
imageRoutes.post('/update-description', imageController.updateImageDescription)
 
// 新增：重命名图片路由
imageRoutes.post('/rename', imageController.renameImage)
 
export { imageRoutes }
