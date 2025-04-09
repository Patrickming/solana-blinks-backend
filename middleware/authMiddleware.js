/**
 * 身份验证中间件
 * 用于保护需要登录才能访问的API端点
 * 验证请求中的JWT令牌，并将解码后的用户ID添加到请求对象中
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * 保护路由中间件
 * 验证请求头中的Authorization令牌
 * 如果令牌有效，将用户信息添加到req.user
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const protect = async (req, res, next) => {
  let token;
  
  logger.info('开始身份验证', {
    path: req.originalUrl,
    method: req.method,
    hasAuthHeader: !!req.headers.authorization
  });

  // 检查请求头中是否包含Bearer令牌
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 获取令牌
      token = req.headers.authorization.split(' ')[1];
      logger.info('找到Bearer令牌', { tokenExists: !!token });

      // 验证令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('JWT令牌验证成功', { userId: decoded.id });

      // 查找用户并添加到请求对象中 - 使用MySQL方法
      const user = await User.findById(decoded.id);

      if (!user) {
        logger.warn('身份验证失败：用户不存在', { userId: decoded.id });
        return res.status(401).json({ message: '未授权，用户不存在' });
      }
      
      // 将user对象添加到req中
      req.user = user;

      logger.info('用户已通过身份验证', { 
        userId: user.id, 
        username: user.username,
        email: user.email
      });
      next();
    } catch (error) {
      logger.warn('身份验证失败：令牌无效', { 
        error: error.message,
        stack: error.stack
      });
      res.status(401).json({ message: '未授权，令牌无效' });
    }
  } else {
    logger.warn('身份验证失败：未提供令牌', {
      headers: Object.keys(req.headers),
      path: req.originalUrl
    });
    res.status(401).json({ message: '未授权，未提供令牌' });
  }
};

module.exports = { protect };