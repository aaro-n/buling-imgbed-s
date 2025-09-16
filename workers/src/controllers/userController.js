import { signToken } from '../utils/jwt'  
import { hash } from '../utils/hash'  
  
const userController = {  
    async getAllUsers(c) {  
        try {  
            const { results } = await c.env.MY_DB.prepare(  
                'SELECT * FROM users'  
            ).all()  
            return c.json({  
                success: true,  
                message: '获取用户列表成功',  
                data: results  
            })  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500)  
        }  
    },  
  
    async getProfile(c) {  
        try {  
            const user = c.get('jwtPayload')  
            const { results } = await c.env.MY_DB.prepare(  
                'SELECT chat_id, username, r2_custom_url, enable_baidu_cdn, enable_image_optimization, enable_time_path FROM users WHERE id = ?'  
            ).bind(user.id).all()  
  
            if (results.length === 0) {  
                return c.json({  
                    success: false,  
                    message: '用户不存在'  
                }, 404)  
            }  
  
            return c.json({  
                success: true,  
                message: '获取用户信息成功',  
                data: results[0]  
            })  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500)  
        }  
    },  
  
    async updateUser(c) {  
        try {  
            const { id } = c.get('jwtPayload')  
            const body = await c.req.json()  
            const { field, value } = body  
  
            // 验证允许更新的字段  
            const allowedFields = ['chat_id', 'username', 'r2_custom_url', 'enable_baidu_cdn', 'enable_image_optimization', 'enable_time_path']  
            if (!allowedFields.includes(field)) {  
                return c.json({  
                    success: false,  
                    message: '不允许更新此字段'  
                }, 400)  
            }  
  
            let updateQuery  
            let bindValue = value  
  
            switch (field) {  
                case 'chat_id':  
                    // 检查 chat_id 是否为空或者不是纯数字，或者是纯数字字符串  
                    if (!value || isNaN(value) || typeof value === 'string') {  
                        return c.json({  
                            success: false,  
                            message: 'chat_id 必须是纯数字'  
                        }, 400)  
                    }  
                    // 检查是否已经被其他用户绑定  
                    const { results: existingChatId } = await c.env.MY_DB.prepare(  
                        'SELECT username FROM users WHERE chat_id = ?'  
                    ).bind(value).all();  
  
                    if (existingChatId && existingChatId.length > 0) {  
                        return c.json({  
                            success: false,  
                            message: `该Telegram账号已被${existingChatId[0].username}绑定`  
                        }, 400);  
                    }  
                    updateQuery = 'UPDATE users SET chat_id = ? WHERE id = ?'  
                    break;  
  
                case 'username':  
                    // 检查用户名长度  
                    if (value.length < 3) {  
                        return c.json({  
                            success: false,  
                            message: '用户名长度至少为3个字符'  
                        }, 400)  
                    }  
                    // 检查用户名是否已存在  
                    const { results: existingUser } = await c.env.MY_DB.prepare(  
                        'SELECT id FROM users WHERE username = ? AND id != ?'  
                    ).bind(value, id).all()  
  
                    if (existingUser.length > 0) {  
                        return c.json({  
                            success: false,  
                            message: '用户名已被使用'  
                        }, 400)  
                    }  
                    updateQuery = 'UPDATE users SET username = ? WHERE id = ?'  
                    break  
  
                case 'r2_custom_url':  
                    updateQuery = 'UPDATE users SET r2_custom_url = ? WHERE id = ?'  
                    break  
  
                case 'enable_baidu_cdn':  
                    updateQuery = 'UPDATE users SET enable_baidu_cdn = ? WHERE id = ?'  
                    bindValue = value ? 1 : 0  
                    break  
  
                case 'enable_image_optimization':  
                    updateQuery = 'UPDATE users SET enable_image_optimization = ? WHERE id = ?'  
                    bindValue = value ? 1 : 0  
                    break  
  
                case 'enable_time_path':  
                    updateQuery = 'UPDATE users SET enable_time_path = ? WHERE id = ?'  
                    bindValue = value ? 1 : 0  
                    break  
  
                default:  
                    return c.json({  
                        success: false,  
                        message: '无效的字段'  
                    }, 400)  
            }  
  
            await c.env.MY_DB.prepare(updateQuery).bind(bindValue, id).run()  
  
            // 获取更新后的用户信息  
            const { results } = await c.env.MY_DB.prepare(  
                'SELECT chat_id, username, r2_custom_url, enable_baidu_cdn, enable_image_optimization, enable_time_path FROM users WHERE id = ?'  
            ).bind(id).all()  
  
            return c.json({  
                success: true,  
                message: '用户信息更新成功',  
                data: results[0]  
            })  
        } catch (error) {  
            return c.json({  
                success: false,  
                message: error.message  
            }, 500)  
        }  
    }  
}  
  
export { userController }
