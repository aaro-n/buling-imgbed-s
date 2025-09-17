import { isValidImageType } from '../utils/imageUtils';
 
export const imageController = {
    async uploadImage(c) {
        try {
            const userId = c.get('jwtPayload').id;
            const formData = await c.req.formData();
            let imgfile = formData.get('imgfile');
            const folderId = formData.get('folderId') || null;
 
            if (!imgfile || !isValidImageType(imgfile.type)) {
                return c.json({ success: false, message: '请选择有效的图片文件' }, 400)
            }
 
            if (imgfile.size > 10 * 1024 * 1024) {
                return c.json({ success: false, message: '文件大小不能超过10MB' }, 400)
            }
 
            // 生成原始文件名（基于时间戳和文件名）
            const originalFilename = `${Date.now()}-${imgfile.name}`;
 
            // 生成MD5哈希值
            const encoder = new TextEncoder();
            const data = encoder.encode(originalFilename);
            const hashBuffer = await crypto.subtle.digest('MD5', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
 
            // 获取文件扩展名
            const extension = imgfile.name.split('.').pop();
            const filename = `${hashHex}.${extension}`;
 
            // 先保存到数据库
            await c.env.MY_DB.prepare(
                'INSERT INTO images (user_id, filename, display_name, folder_id) VALUES (?, ?, ?, ?)'
            ).bind(userId, filename, imgfile.name, folderId).run();
 
            // 数据库保存成功后，再上传到R2
            await c.env.MY_BUCKET.put(filename, imgfile.stream(), {
                httpMetadata: { contentType: imgfile.type }
            });
 
            return c.json({
                success: true,
                message: '图片上传成功',
                data: {
                    filename,
                    userId
                }
            });
        } catch (error) {
            return c.json({
                success: false,
                message: `上传失败: ${error.message}`
            }, 500);
        }
    },
 
    async deleteImages(c) {
        try {
            const { files } = await c.req.json()
            const userId = c.get('jwtPayload').id;
 
            if (!Array.isArray(files)) {
                return c.json({
                    success: false,
                    message: '无效的图片请求'
                }, 400)
            }
 
            // 先从 R2 删除文件
            try {
                await c.env.MY_BUCKET.delete(files);
            } catch (error) {
                return c.json({
                    success: false,
                    message: '从存储中删除文件失败'
                }, 500);
            }
 
            // R2 删除成功后，再从数据库中删除记录
            const stmt = await c.env.MY_DB.prepare(
                'DELETE FROM images WHERE filename IN (' + files.map(() => '?').join(',') + ') AND user_id = ?'
            ).bind(...files, userId).run();
 
            return c.json({
                success: true,
                message: '图片删除成功',
                data: {
                    files
                }
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500)
        }
    },
 
    async listR2Images(c) {
        try {
            const cursor = c.req.query('cursor');
            const limit = parseInt(c.req.query('limit')) || 10;
 
            const options = {
                limit,
                cursor
            }
 
            const list = await c.env.MY_BUCKET.list(options)
            const images = list.objects.map((obj, index) => ({
                index: index + 1,
                filename: obj.key,
                size: obj.size / 1024 + 'KB',
                rawSize: obj.size,
                uploaded: obj.uploaded,
                type: obj.httpMetadata?.contentType,
                etag: obj.etag,
                httpEtag: obj.httpEtag,
                checksums: {
                    md5: obj.checksums?.md5,
                    sha1: obj.checksums?.sha1,
                    sha256: obj.checksums?.sha256
                },
                customMetadata: obj.customMetadata || {},
                version: obj.version,
                lastModified: new Date(obj.uploaded).toLocaleString(),
                cursor: obj.cursor,
                prefix: obj.prefix,
                delimiter: obj.delimiter,
                range: obj.range,
                writeHttpMetadata: obj.writeHttpMetadata,
                httpMetadataJSON: JSON.stringify(obj.httpMetadata || {})
            }))
 
            return c.json({
                success: true,
                message: '获取图片列表成功',
                size: images.length,
                data: {
                    images,
                    truncated: list.truncated,
                    cursor: list.cursor
                }
            })
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500)
        }
    },
 
    async listImages(c) {
        try {
            const userId = c.get('jwtPayload').id;
            const { page = 1, pageSize = 10, folderId = null, search = '' } = await c.req.json();
            const offset = (page - 1) * pageSize;
 
            // 构建查询条件
            let whereConditions = ['user_id = ?'];
            let params = [userId];
 
            if (folderId !== null && folderId !== '') {
                whereConditions.push('folder_id = ?');
                params.push(folderId);
            }
 
            if (search && search.trim() !== '') {
                whereConditions.push('(display_name LIKE ? OR note LIKE ?)');
                const searchPattern = `%${search.trim()}%`;
                params.push(searchPattern, searchPattern);
            }
 
            const whereClause = whereConditions.join(' AND ');
 
            // 获取总数
            const { total } = await c.env.MY_DB.prepare(
                `SELECT COUNT(*) as total FROM images WHERE ${whereClause}`
            ).bind(...params).first();
 
            // 分页查询
            const { results } = await c.env.MY_DB.prepare(
                `SELECT id, filename, display_name, note, folder_id, created_at FROM images WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
            ).bind(...params, pageSize, offset).all();
 
            const imageList = results.map(img => ({
                id: img.id,
                filename: img.filename,
                url: img.filename,
                name: img.display_name || img.filename,
                note: img.note,
                folder_id: img.folder_id,
                created_at: img.created_at
            }));
 
            return c.json({
                success: true,
                message: '获取图片列表成功',
                data: {
                    list: imageList,
                    pagination: {
                        current: page,
                        pageSize,
                        total,
                        totalPages: Math.ceil(total / pageSize)
                    }
                }
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    },
 
    async renameImage(c) {
        try {
            const { imageId, newName } = await c.req.json();
            const userId = c.get('jwtPayload').id;
 
            if (!imageId || !newName) {
                return c.json({
                    success: false,
                    message: '参数不完整'
                }, 400);
            }
 
            const result = await c.env.MY_DB.prepare(
                'UPDATE images SET display_name = ? WHERE id = ? AND user_id = ?'
            ).bind(newName, imageId, userId).run();
 
            if (result.changes === 0) {
                return c.json({
                    success: false,
                    message: '图片不存在或无权限'
                }, 404);
            }
 
            return c.json({
                success: true,
                message: '图片重命名成功'
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    },
 
    async updateImageNote(c) {
        try {
            const { imageId, note } = await c.req.json();
            const userId = c.get('jwtPayload').id;
 
            if (!imageId) {
                return c.json({
                    success: false,
                    message: '参数不完整'
                }, 400);
            }
 
            const result = await c.env.MY_DB.prepare(
                'UPDATE images SET note = ? WHERE id = ? AND user_id = ?'
            ).bind(note, imageId, userId).run();
 
            if (result.changes === 0) {
                return c.json({
                    success: false,
                    message: '图片不存在或无权限'
                }, 404);
            }
 
            return c.json({
                success: true,
                message: '备注更新成功'
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    },
 
    async moveImageToFolder(c) {
        try {
            const { imageIds, folderId } = await c.req.json();
            const userId = c.get('jwtPayload').id;
 
            if (!Array.isArray(imageIds) || imageIds.length === 0) {
                return c.json({
                    success: false,
                    message: '参数不完整'
                }, 400);
            }
 
            // 构建更新语句
            const placeholders = imageIds.map(() => '?').join(',');
            const result = await c.env.MY_DB.prepare(
                `UPDATE images SET folder_id = ? WHERE id IN (${placeholders}) AND user_id = ?`
            ).bind(folderId, ...imageIds, userId).run();
 
            return c.json({
                success: true,
                message: `成功移动 ${result.changes} 张图片到文件夹`
            });
        } catch (error) {
            return c.json({
                success: false,
                message: error.message
            }, 500);
        }
    }
}
