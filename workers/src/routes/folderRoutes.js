import { Hono } from 'hono'
import { folderController } from '../controllers/folderController'
import { authMiddleware } from '../middlewares/authMiddleware'
 
const folderRoutes = new Hono()
 
// 所有文件夹操作路由都需要认证
folderRoutes.use('*', (c, next) => authMiddleware(c.env)(c, next))
folderRoutes.post('/create', folderController.createFolder)
folderRoutes.get('/list', folderController.listFolders)
folderRoutes.delete('/delete', folderController.deleteFolder)
 
export { folderRoutes }
