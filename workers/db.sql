-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    r2_custom_url TEXT DEFAULT NULL,
    enable_baidu_cdn INTEGER NOT NULL CHECK (enable_baidu_cdn IN (0,1)) DEFAULT 0,
    enable_image_optimization INTEGER NOT NULL CHECK (enable_image_optimization IN (0,1)) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
 
-- 创建文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES folders(id)
);
 
-- 创建图片表（添加备注和文件夹字段）
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    display_name TEXT DEFAULT NULL,
    note TEXT DEFAULT NULL,
    folder_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (folder_id) REFERENCES folders(id)
);
 
-- 插入用户数据，用户名admin，密码admin，请登陆后台修改用户名和密码
INSERT INTO users (username, password) VALUES 
('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'); 
