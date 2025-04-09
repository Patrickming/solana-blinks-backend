/**
 * 文件上传中间件
 * 处理头像上传和其他文件上传功能
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * 确保上传目录存在
 * 如果不存在则创建目录
 */
const uploadDir = path.join(__dirname, '../public/uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`创建上传目录: ${uploadDir}`);
}

/**
 * 配置文件存储
 * 定义上传文件的目标路径和文件命名规则
 */
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // 生成唯一文件名: 用户ID_时间戳.扩展名
    const userId = req.user ? req.user.id : 'unknown';
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    cb(null, `avatar_${userId}_${timestamp}${fileExt}`);
  }
});

/**
 * 文件类型过滤器
 * 只允许上传图片文件
 * @param {Object} req - 请求对象
 * @param {Object} file - 上传的文件对象
 * @param {Function} cb - 回调函数
 */
const fileFilter = (req, file, cb) => {
  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('文件上传失败: 不支持的文件类型', { 
      userId: req.user ? req.user.id : 'unknown',
      mimetype: file.mimetype 
    });
    cb(new Error('只支持JPG, PNG, GIF和WEBP格式的图片'), false);
  }
};

/**
 * 上传限制配置
 * 限制文件大小和数量
 */
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 1
};

/**
 * 创建multer上传中间件
 */
const upload = multer({ 
  storage, 
  fileFilter,
  limits
});

/**
 * 头像上传中间件
 * 处理单个头像文件上传
 */
const avatarUpload = upload.single('avatar');

/**
 * 包装为Promise的中间件函数
 * 便于在控制器中使用async/await语法
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise} 包含上传文件结果的Promise
 */
const uploadAvatar = (req, res) => {
  return new Promise((resolve, reject) => {
    avatarUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer错误（如文件过大）
          logger.error('Multer头像上传错误', { 
            error: err.message, 
            code: err.code,
            userId: req.user ? req.user.id : 'unknown'
          });
          
          if (err.code === 'LIMIT_FILE_SIZE') {
            reject(new Error('文件大小不能超过5MB'));
          } else {
            reject(err);
          }
        } else {
          // 其他错误
          logger.error('头像上传失败', { 
            error: err.message,
            userId: req.user ? req.user.id : 'unknown'
          });
          reject(err);
        }
      } else {
        logger.info('头像上传成功', { 
          userId: req.user.id,
          file: req.file ? req.file.filename : null 
        });
        resolve(req.file);
      }
    });
  });
};

module.exports = {
  uploadAvatar
}; 