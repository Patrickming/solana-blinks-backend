const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('../utils/logger');

// 远程数据库配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  connectTimeout: 10000  // 增加连接超时时间
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
(async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('MySQL连接成功');
    connection.release();
  } catch (error) {
    logger.error('MySQL连接失败', error);
    logger.error('请检查数据库连接配置是否正确');
  }
})();

// 添加错误处理
pool.on('error', (err) => {
  logger.error('MySQL连接池错误', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
    logger.info('MySQL连接中断，请检查网络状态和数据库服务');
  }
});

// 提供获取数据库状态的方法
const getDatabaseStatus = () => {
  return {
    connected: pool.pool?.config?.connectionConfig ? true : false,
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database
  };
};

module.exports = { 
  pool,
  getDatabaseStatus 
}; 