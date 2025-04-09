-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT '',
  qq VARCHAR(20) DEFAULT '',
  region VARCHAR(100) DEFAULT '',
  tech_stack VARCHAR(255) DEFAULT '',
  bio TEXT DEFAULT '',
  github VARCHAR(50) DEFAULT '',
  twitter VARCHAR(50) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  wallet_address VARCHAR(60) DEFAULT NULL,
  avatar VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建索引
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_wallet_address ON users(wallet_address); 