/**
 * 数据库头像字段更新脚本
 * 用于添加avatar字段到users表
 */
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../../config/database');
const logger = require('../logger');

/**
 * 执行SQL文件中的命令
 * @param {string} sqlFilePath - SQL文件路径
 */
const updateAvatarField = async (sqlFilePath) => {
  try {
    logger.info('开始添加头像字段到数据库...', { file: sqlFilePath });
    
    // 读取SQL文件内容
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // 按分号分割SQL语句（忽略注释）
    const sqlStatements = sqlContent
      .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') // 移除注释
      .split(';')
      .filter(statement => statement.trim());
    
    // 逐个执行SQL语句
    for (const statement of sqlStatements) {
      if (statement.trim()) {
        logger.info(`执行SQL: ${statement.trim().substring(0, 100)}...`);
        await pool.query(statement);
      }
    }
    
    logger.info('头像字段添加成功!');
  } catch (error) {
    logger.error('头像字段添加失败', error);
    throw error;
  }
};

// 执行更新
(async () => {
  try {
    // 获取SQL文件的绝对路径
    const sqlFilePath = path.resolve(__dirname, '../../config/update_avatar.sql');
    await updateAvatarField(sqlFilePath);
  } catch (error) {
    process.exit(1);
  }
})(); 