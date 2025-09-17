export const folderController = {
    async createFolder(c) {
        try {
            const { name, parentId = null } = await c.req.json();
            const userId = c.get('jwtPayload').id;
 
            if (!name || name.trim() === '') {
                return c.json({
                    success: false,
                    message: '文件夹名称不能为空'
                }, 400);
            }
 
            // 检查同级目录下是否有重名文件夹
            let checkQuery = 'SELECT COUNT(*) as count FROM folders WHERE user_id = ? AND name = ?';
            let checkParams = [userId, name.trim()];
            
            if (parentId !== null) {
                checkQuery += ' AND parent_id = ?';
                checkParams.push(parentId);
            } else {
                checkQuery += ' AND parent_id IS NULL';
            }
 
            const { count } = await c.env.MY_DB.prepare(checkQuery).bind(...checkParams).first();
 
            if (count > 0) {
                return c.json({
                    success: false,
                    message: '同级目录下已存在同名文件夹'
                }, 400);
            }
 
            const result = await c.env.MY_DB.prepare(
                'INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)'
            ).bind(userId, name.trim(), parentId).run();
 
            return c.json({
                success: true,
                message: '文件夹创建成功',
                data: {
                    folderId: result.lastInsertRowid
                }
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    },
 
    async listFolders(c) {
        try {
            const userId = c.get('jwtPayload').id;
 
            const { results } = await c.env.MY_DB.prepare(
                'SELECT id, name, parent_id, created_at FROM folders WHERE user_id = ? ORDER BY parent_id NULLS FIRST, name'
            ).bind(userId).all();
 
            // 构建文件夹树结构
            const folderMap = {};
            const rootFolders = [];
 
            results.forEach(folder => {
                folder.children = [];
                folderMap[folder.id] = folder;
 
                if (folder.parent_id === null) {
                    rootFolders.push(folder);
                } else if (folderMap[folder.parent_id]) {
                    folderMap[folder.parent_id].children.push(folder);
                }
            });
 
            return c.json({
                success: true,
                message: '获取文件夹列表成功',
                data: {
                    folders: rootFolders,
                    flatList: results
                }
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    },
 
    async deleteFolder(c) {
        try {
            const { folderId } = await c.req.json();
            const userId = c.get('jwtPayload').id;
 
            // 检查文件夹是否存在且属于当前用户
            const folder = await c.env.MY_DB.prepare(
                'SELECT id FROM folders WHERE id = ? AND user_id = ?'
            ).bind(folderId, userId).first();
 
            if (!folder) {
                return c.json({
                    success: false,
                    message: '文件夹不存在或无权限'
                }, 404);
            }
 
            // 检查文件夹是否为空（没有子文件夹和图片）
            const { childCount } = await c.env.MY_DB.prepare(
                'SELECT COUNT(*) as childCount FROM folders WHERE parent_id = ?'
            ).bind(folderId).first();
 
            const { imageCount } = await c.env.MY_DB.prepare(
                'SELECT COUNT(*) as imageCount FROM images WHERE folder_id = ?'
            ).bind(folderId).first();
 
            if (childCount > 0 || imageCount > 0) {
                return c.json({
                    success: false,
                    message: '文件夹不为空，无法删除'
                }, 400);
            }
 
            const result = await c.env.MY_DB.prepare(
                'DELETE FROM folders WHERE id = ? AND user_id = ?'
            ).bind(folderId, userId).run();
 
            return c.json({
                success: true,
                message: '文件夹删除成功'
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    }
}
