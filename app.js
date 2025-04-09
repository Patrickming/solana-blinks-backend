/**
 * 主应用入口文件
 * 配置Express应用、中间件、数据库连接和路由
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const logger = require('./utils/logger');
const { pool, getDatabaseStatus } = require('./config/database');
const path = require('path');

/**
 * 加载环境变量配置
 * 从.env文件中读取配置信息
 */
dotenv.config();

/**
 * 创建Express应用
 */
const app = express();

/**
 * 配置中间件
 */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 配置静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 请求日志中间件
app.use((req, res, next) => {
  // 记录请求开始
  const requestId = Date.now().toString();
  const requestData = {
    id: requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length ? req.query : undefined,
    params: Object.keys(req.params).length ? req.params : undefined
  };
  
  logger.info(`[请求开始] ${req.method} ${req.originalUrl}`, requestData);
  
  // 记录响应时间
  const startTime = Date.now();
  
  // 捕获响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseData = {
      id: requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`[请求结束] ${req.method} ${req.originalUrl}`, responseData);
    } else {
      logger.info(`[请求结束] ${req.method} ${req.originalUrl}`, responseData);
    }
  });
  
  next();
});

/**
 * 配置路由
 */
app.get('/', (req, res) => {
  res.json({ message: '欢迎使用用户管理API' });
});

// 数据库状态接口
app.get('/api/status', (req, res) => {
  const status = getDatabaseStatus();
  res.json({ 
    status: 'running',
    database: status,
    timestamp: new Date().toISOString()
  });
});

// 用户相关路由
app.use('/api/users', require('./routes/users'));

// 论坛相关路由
app.use('/api/forum', require('./routes/forum'));

// 404处理 - 当没有匹配的路由时
app.use((req, res) => {
  logger.warn(`路由未找到: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: '请求的资源不存在' });
});

/**
 * 全局错误处理中间件
 * 捕获并处理应用中的所有错误
 */
app.use((err, req, res, next) => {
  logger.error('服务器错误', err);
  
  // 设置默认状态码和错误消息
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const message = err.message || '服务器内部错误';
  
  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

/**
 * 启动服务器
 * 监听指定端口，等待客户端连接
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}`);
});

module.exports = app;