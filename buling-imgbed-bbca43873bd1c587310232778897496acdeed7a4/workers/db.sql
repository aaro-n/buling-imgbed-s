-- 创建用户表（统一版本）  
CREATE TABLE IF NOT EXISTS users (  
    id INTEGER PRIMARY KEY AUTOINCREMENT,  
    chat_id INTEGER UNIQUE,  
    username TEXT NOT NULL UNIQUE,  
    password TEXT NOT NULL,  
    email TEXT UNIQUE,  
    r2_custom_url TEXT DEFAULT NULL,  
    enable_baidu_cdn INTEGER NOT NULL CHECK (enable_baidu_cdn IN (0,1)) DEFAULT 0,  
    enable_image_optimization INTEGER NOT NULL CHECK (enable_image_optimization IN (0,1)) DEFAULT 0,  
    enable_time_path INTEGER NOT NULL CHECK (enable_time_path IN (0,1)) DEFAULT 0,  
    default_folder_id INTEGER DEFAULT NULL,  
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  
);  
  
-- 创建文件夹表  
CREATE TABLE IF NOT EXISTS folders (  
    id INTEGER PRIMARY KEY AUTOINCREMENT,  
    user_id INTEGER NOT NULL,  
    name TEXT NOT NULL,  
    path TEXT NOT NULL,  
    parent_id INTEGER DEFAULT NULL,  
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,  
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,  
    UNIQUE(user_id, path)  
);  
  
-- 创建图片表（扩展版本）  
CREATE TABLE IF NOT EXISTS images (  
    id INTEGER PRIMARY KEY AUTOINCREMENT,  
    user_id INTEGER NOT NULL,  
    filename TEXT NOT NULL,  
    original_filename TEXT DEFAULT '',  
    description TEXT DEFAULT '',  
    folder_path TEXT DEFAULT '',  
    full_path TEXT DEFAULT '',  
    file_size INTEGER DEFAULT 0,  
    mime_type TEXT DEFAULT '',  
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE  
);  
  
-- 创建索引  
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);  
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);  
CREATE INDEX IF NOT EXISTS idx_images_description ON images(description);  
CREATE INDEX IF NOT EXISTS idx_images_folder_path ON images(folder_path);  
CREATE INDEX IF NOT EXISTS idx_images_original_filename ON images(original_filename);  
CREATE INDEX IF NOT EXISTS idx_images_user_folder ON images(user_id, folder_path);  
  
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);  
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);  
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);  
  
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);  
  
-- 插入默认用户数据，用户名admin，密码admin，请登录后台修改用户名和密码  
INSERT OR IGNORE INTO users (username, password) VALUES   
('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918');
