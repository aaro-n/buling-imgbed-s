import { isValidImageType } from '../utils/imageUtils';  
  
export const imageController = {  
    async uploadImage(c) {  
        try {  
            const userId = c.get('jwtPayload').id;  
  
            const formData = await c.req.formData();  
            let imgfile = formData.get('imgfile');  
            const description = formData.get('description') || '';  
            const folderPath = formData.get('folderPath') || '';  
            const enableTimePath = formData.get('enableTimePath') === 'true';  
            const originalFilename = formData.get('originalFilename') || imgfile.name;  
  
            if (!imgfile || !isValidImageType(imgfile.type)) {  
                return c.json({ success: false, message: '请选择有效的图片文件' }, 400)  
            }  
  
            if (imgfile.size > 10 * 1024 * 1024) {  
                return c.json({ success: false, message: '文件大小不能超过10MB' }, 400)  
            }  
  
            // 生成时间路径  
            let timePath = '';  
            if (enableTimePath) {  
                const now = new Date();  
                const year = now.getFullYear();  
                const month = String(now.getMonth() + 1).padStart(2, '0');  
                const day = String(now.getDate()).padStart(2, '0');  
                timePath = `${year}/${month}/${day}/`;  
            }  
  
            // 生成完整路径  
            let fullPath = '';  
            if (folderPath) {  
                fullPath = `${folderPath}/${timePath}`;  
            } else {  
                fullPath = timePath;  
            }  
  
            // 生成原始文件名（基于时间戳和文件名）  
            const timestampFilename = `${Date.now()}-${imgfile.name}`;  
  
            // 生成MD5哈希值  
            const encoder = new TextEncoder();  
            const data = encoder.encode(timestampFilename);  
            const hashBuffer = await crypto.subtle.digest('MD5', data);  
            const hashArray = Array.from(new Uint8Array(hashBuffer));  
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');  
  
            // 获取文件扩展名  
            const extension = imgfile.name.split('.').pop();  
            const filename = `${hashHex}.${extension}`;  
              
            // 完整的存储路径  
            const storageKey = fullPath ? `${fullPath}${filename}` : filename;  
  
            // 先保存到数据库  
            await c.env.MY_DB.prepare(  
                'INSERT INTO images (user_id, filename, original_filename, description, folder_path, full_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'  
            ).bind(  
                userId,   
                filename,   
                originalFilename,   
                description,   
                folderPath,   
                storageKey,   
                imgfile.size,   
                imgfile.type  
            ).run();  
  
            // 数据库保存成功后，再上传到R2  
            await c.env.MY_BUCKET.put(storageKey, imgfile.stream(), {  
                httpMetadata: { contentType: imgfile.type }  
            });  
  
            return c.json({  
                success: true,  
                message: '图片上传成功',  
                data: {  
                    filename: storageKey,  
                    originalFilename,  
                    description,  
                    folderPath,  
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
  
            // 获取要删除的图片信息（包含完整路径）  
            const placeholders = files.map(() => '?').join(',');  
            const { results } = await c.env.MY_DB.prepare(  
                `SELECT full_path FROM images WHERE filename IN (${placeholders}) AND user_id = ?`  
            ).bind(...files, userId).all();  
  
            const fullPaths = results.map(row => row.full_path);  
  
            // 先从 R2 删除文件  
            try {  
                await c.env.MY_BUCKET.delete(fullPaths);  
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
            const prefix = c.req.query('prefix') || '';  
  
            const options = {  
                limit,  
                cursor,  
                prefix  
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
            const { page = 1, pageSize = 10, search = '', folderPath = '' } = await c.req.json();    
            const offset = (page - 1) * pageSize;  
  
            // 构建搜索条件  
            let whereClause = 'WHERE user_id = ?';  
            let params = [userId];  
  
            if (folderPath) {  
                whereClause += ' AND folder_path = ?';  
                params.push(folderPath);  
            }  
  
            if (search) {  
                whereClause += ' AND (description LIKE ? OR original_filename LIKE ? OR filename LIKE ?)';  
                const searchPattern = `%${search}%`;  
                params.push(searchPattern, searchPattern, searchPattern);  
            }  
  
            // 获取总数  
            const countQuery = `SELECT COUNT(*) as total FROM images ${whereClause}`;  
            const { total } = await c.env.MY_DB.prepare(countQuery).bind(...params).first();  
  
            // 分页查询  
            const listQuery = `  
                SELECT filename, original_filename, description, folder_path, full_path, file_size, mime_type, created_at   
                FROM images ${whereClause}   
                ORDER BY created_at DESC   
                LIMIT ? OFFSET ?  
            `;  
            const { results } = await c.env.MY_DB.prepare(listQuery)  
                .bind(...params, pageSize, offset).all();  
  
            const imageList = results.map(img => ({  
                filename: img.filename,  
                originalFilename: img.original_filename,  
                description: img.description,  
                folderPath: img.folder_path,  
                fullPath: img.full_path,  
                fileSize: img.file_size,  
                mimeType: img.mime_type,  
                url: img.full_path || img.filename,  
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
  
    // 新增：获取文件夹列表  
    async getFolders(c) {  
        try {  
            const userId = c.get('jwtPayload').id;  
  
            const { results } = await c.env.MY_DB.prepare(  
                'SELECT DISTINCT folder_path FROM images WHERE user_id = ? AND folder_path != "" ORDER BY folder_path'  
            ).bind(userId).all();  
  
            const folders = results.map(row => row.folder_path);  
  
            return c.json({  
                success: true,  
                message: '获取文件夹列表成功',  
                data: folders  
            });  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500);  
        }  
    },  
  
    // 新增：创建文件夹  
    async createFolder(c) {  
        try {  
            const userId = c.get('jwtPayload').id;  
            const { name } = await c.req.json();  
  
            if (!name || !name.trim()) {  
                return c.json({  
                    success: false,  
                    message: '文件夹名称不能为空'  
                }, 400);  
            }  
  
            // 检查文件夹是否已存在  
            const existing = await c.env.MY_DB.prepare(  
                'SELECT COUNT(*) as count FROM images WHERE user_id = ? AND folder_path = ?'  
            ).bind(userId, name.trim()).first();  
  
            if (existing.count > 0) {  
                return c.json({  
                    success: false,  
                    message: '文件夹已存在'  
                }, 400);  
            }  
  
            return c.json({  
                success: true,  
                message: '文件夹创建成功',  
                data: { name: name.trim() }  
            });  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500);  
        }  
    },  
  
    // 新增：移动图片到文件夹  
    async moveImages(c) {  
        try {  
            const userId = c.get('jwtPayload').id;  
            const { files, targetFolder } = await c.req.json();  
  
            if (!Array.isArray(files)) {  
                return c.json({  
                    success: false,  
                    message: '无效的图片请求'  
                }, 400);  
            }  
  
            // 获取要移动的图片信息  
            const placeholders = files.map(() => '?').join(',');  
            const { results } = await c.env.MY_DB.prepare(  
                `SELECT filename, full_path, folder_path FROM images WHERE filename IN (${placeholders}) AND user_id = ?`  
            ).bind(...files, userId).all();  
  
            // 更新数据库中的文件夹路径  
            for (const file of results) {  
                const oldPath = file.full_path;  
                const filename = file.filename;  
                  
                // 生成新的完整路径  
                const newFullPath = targetFolder ? `${targetFolder}/${filename}` : filename;  
  
                // 在R2中移动文件  
                const object = await c.env.MY_BUCKET.get(oldPath);  
                if (object) {  
                    await c.env.MY_BUCKET.put(newFullPath, object.body, {  
                        httpMetadata: object.httpMetadata  
                    });  
                    await c.env.MY_BUCKET.delete(oldPath);  
                }  
  
                // 更新数据库记录  
                await c.env.MY_DB.prepare(  
                    'UPDATE images SET folder_path = ?, full_path = ? WHERE filename = ? AND user_id = ?'  
                ).bind(targetFolder || '', newFullPath, filename, userId).run();  
            }  
  
            return c.json({  
                success: true,  
                message: '图片移动成功',  
                data: { files, targetFolder }  
            });  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500);  
        }  
    },  
  
    // 新增：更新图片备注  
    async updateImageDescription(c) {  
        try {  
            const userId = c.get('jwtPayload').id;  
            const { filename, description } = await c.req.json();  
  
            await c.env.MY_DB.prepare(  
                'UPDATE images SET description = ? WHERE filename = ? AND user_id = ?'  
            ).bind(description || '', filename, userId).run();  
  
            return c.json({  
                success: true,  
                message: '备注更新成功',  
                data: { filename, description }  
            });  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500);  
        }  
    }  
}
