-- 检查并添加twitter字段
SELECT COUNT(*) INTO @twitter_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'twitter';

SET @add_twitter = CONCAT('ALTER TABLE users ADD COLUMN twitter VARCHAR(50) DEFAULT ""');

SET @alter_twitter = CONCAT('ALTER TABLE users CHANGE COLUMN twitter_username twitter VARCHAR(50) DEFAULT ""');

SELECT IF(@twitter_exists = 0, @add_twitter, 'SELECT 1') INTO @twitter_sql;
PREPARE twitter_stmt FROM @twitter_sql;
EXECUTE twitter_stmt;
DEALLOCATE PREPARE twitter_stmt;

-- 检查并添加website字段
SELECT COUNT(*) INTO @website_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'website';

SET @add_website = CONCAT('ALTER TABLE users ADD COLUMN website VARCHAR(255) DEFAULT ""');

SELECT IF(@website_exists = 0, @add_website, 'SELECT 1') INTO @website_sql;
PREPARE website_stmt FROM @website_sql;
EXECUTE website_stmt;
DEALLOCATE PREPARE website_stmt;

-- 检查并添加avatar字段
SELECT COUNT(*) INTO @avatar_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'avatar';

SET @add_avatar = CONCAT('ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT ""');

SELECT IF(@avatar_exists = 0, @add_avatar, 'SELECT 1') INTO @avatar_sql;
PREPARE avatar_stmt FROM @avatar_sql;
EXECUTE avatar_stmt;
DEALLOCATE PREPARE avatar_stmt;

-- 检查并修改github_username为github
SELECT COUNT(*) INTO @github_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'github';

SELECT COUNT(*) INTO @github_username_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'github_username';

SET @add_github = CONCAT('ALTER TABLE users ADD COLUMN github VARCHAR(50) DEFAULT ""');
SET @change_github = CONCAT('ALTER TABLE users CHANGE COLUMN github_username github VARCHAR(50) DEFAULT ""');

SELECT 
  CASE 
    WHEN @github_exists = 0 AND @github_username_exists = 1 THEN @change_github
    WHEN @github_exists = 0 AND @github_username_exists = 0 THEN @add_github
    ELSE 'SELECT 1'
  END 
INTO @github_sql;

PREPARE github_stmt FROM @github_sql;
EXECUTE github_stmt;
DEALLOCATE PREPARE github_stmt;

-- 检查twitter_username是否需要重命名为twitter
SELECT COUNT(*) INTO @twitter_username_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'twitter_username';

SELECT IF(@twitter_username_exists > 0, @alter_twitter, 'SELECT 1') INTO @twitter_rename_sql;
PREPARE twitter_rename_stmt FROM @twitter_rename_sql;
EXECUTE twitter_rename_stmt;
DEALLOCATE PREPARE twitter_rename_stmt;

-- 添加钱包地址字段（如果不存在）
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(60) DEFAULT '';

-- 添加唯一索引（确保钱包地址唯一）
ALTER TABLE users ADD UNIQUE INDEX idx_wallet_address (wallet_address);

-- 验证字段是否存在
SELECT 
  COLUMN_NAME, 
  DATA_TYPE,
  COLUMN_KEY
FROM 
  INFORMATION_SCHEMA.COLUMNS 
WHERE 
  TABLE_SCHEMA = DATABASE() AND 
  TABLE_NAME = 'users' AND
  COLUMN_NAME = 'wallet_address'; 