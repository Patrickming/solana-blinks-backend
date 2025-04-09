/**
 * 初始化论坛分类数据
 * 运行方式: node scripts/init-categories.js
 */
require('dotenv').config();
const { pool } = require('../config/database');

async function initializeCategories() {
  try {
    console.log('开始初始化论坛分类数据...');
    
    // 检查是否已有分类数据
    const [existing] = await pool.execute('SELECT COUNT(*) as count FROM categories');
    
    if (existing[0].count > 0) {
      console.log(`数据库中已有 ${existing[0].count} 个分类，跳过初始化。`);
      return;
    }
    
    // 默认分类数据
    const categories = [
      { name: '技术讨论', description: '讨论技术问题和解决方案', display_order: 1 },
      { name: '产品设计', description: '探讨产品设计理念和方法', display_order: 2 },
      { name: '求职招聘', description: '发布和查找工作机会', display_order: 3 },
      { name: '站务公告', description: '官方公告和网站动态', display_order: 0 }
    ];
    
    // 插入分类数据
    const insertPromises = categories.map(category => {
      return pool.execute(
        'INSERT INTO categories (name, description, display_order) VALUES (?, ?, ?)',
        [category.name, category.description, category.display_order]
      );
    });
    
    await Promise.all(insertPromises);
    
    console.log(`成功初始化 ${categories.length} 个论坛分类。`);
    
    // 检查是否成功插入
    const [result] = await pool.execute('SELECT * FROM categories ORDER BY display_order');
    
    console.log('已创建的分类:');
    result.forEach(category => {
      console.log(`ID: ${category.id}, 名称: ${category.name}, 排序: ${category.display_order}`);
    });
    
  } catch (error) {
    console.error('初始化分类数据失败:', error);
  } finally {
    // 关闭连接池
    pool.end();
  }
}

// 执行初始化
initializeCategories(); 