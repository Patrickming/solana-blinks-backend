/**
 * 话题分类模型
 * 定义分类数据结构和相关数据库操作方法
 */
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// 设置查询超时时间（毫秒）
const QUERY_TIMEOUT = 15000;

class Category {
  /**
   * 获取所有分类
   * @returns {Promise<Array>} 分类列表
   */
  static async getAll() {
    try {
      logger.info('尝试获取所有分类');
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT c.*,
          (SELECT COUNT(*) FROM topics WHERE category = c.name AND status = 'active') AS topics_count
          FROM categories c
          ORDER BY c.display_order ASC, c.name ASC
        `),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('成功获取所有分类', { count: rows.length });
      
      return rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        displayOrder: category.display_order,
        topicsCount: category.topics_count,
        createdAt: category.created_at
      }));
    } catch (error) {
      logger.error('获取所有分类失败', error);
      throw error;
    }
  }

  /**
   * 通过ID查找分类
   * @param {Number} id - 分类ID
   * @returns {Promise<Object|null>} 分类对象或null
   */
  static async findById(id) {
    try {
      logger.info('尝试通过ID查找分类', { categoryId: id });
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT c.*,
          (SELECT COUNT(*) FROM topics WHERE category = c.name AND status = 'active') AS topics_count
          FROM categories c
          WHERE c.id = ?
        `, [id]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('未找到分类', { categoryId: id });
        return null;
      } 
      
      logger.info('成功找到分类', { categoryId: id });
      
      const category = rows[0];
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        displayOrder: category.display_order,
        topicsCount: category.topics_count,
        createdAt: category.created_at
      };
    } catch (error) {
      logger.error('通过ID查找分类失败', { categoryId: id, error });
      throw error;
    }
  }

  /**
   * 通过名称查找分类
   * @param {String} name - 分类名称
   * @returns {Promise<Object|null>} 分类对象或null
   */
  static async findByName(name) {
    try {
      logger.info('尝试通过名称查找分类', { name });
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT c.*,
          (SELECT COUNT(*) FROM topics WHERE category = c.name AND status = 'active') AS topics_count
          FROM categories c
          WHERE c.name = ?
        `, [name]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('未找到分类', { name });
        return null;
      } 
      
      logger.info('成功找到分类', { name });
      
      const category = rows[0];
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        displayOrder: category.display_order,
        topicsCount: category.topics_count,
        createdAt: category.created_at
      };
    } catch (error) {
      logger.error('通过名称查找分类失败', { name, error });
      throw error;
    }
  }

  /**
   * 创建新分类
   * @param {Object} categoryData - 分类数据
   * @returns {Promise<Object>} 新创建的分类
   */
  static async create(categoryData) {
    try {
      const { name, description, displayOrder = 0 } = categoryData;
      
      logger.info('尝试创建新分类', { name });
      
      const [result] = await Promise.race([
        pool.execute(
          `INSERT INTO categories 
           (name, description, display_order, created_at) 
           VALUES (?, ?, ?, NOW())`,
          [name, description, displayOrder]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('分类创建成功', { categoryId: result.insertId });
      return this.findById(result.insertId);
    } catch (error) {
      logger.error('创建分类失败', error);
      throw error;
    }
  }

  /**
   * 更新分类
   * @param {Number} id - 分类ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的分类
   */
  static async update(id, updateData) {
    try {
      const { name, description, displayOrder } = updateData;
      
      logger.info('尝试更新分类', { categoryId: id });
      
      // 构建更新字段
      const updateFields = [];
      const params = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        params.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        params.push(description);
      }
      
      if (displayOrder !== undefined) {
        updateFields.push('display_order = ?');
        params.push(displayOrder);
      }
      
      if (updateFields.length === 0) {
        logger.warn('更新分类失败：没有提供更新数据', { categoryId: id });
        throw new Error('没有提供更新数据');
      }
      
      params.push(id);
      
      await Promise.race([
        pool.execute(
          `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
          params
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('分类更新成功', { categoryId: id });
      return this.findById(id);
    } catch (error) {
      logger.error('更新分类失败', { categoryId: id, error });
      throw error;
    }
  }

  /**
   * 删除分类
   * @param {Number} id - 分类ID
   * @returns {Promise<Boolean>} 是否成功删除
   */
  static async delete(id) {
    try {
      logger.info('尝试删除分类', { categoryId: id });
      
      const [result] = await Promise.race([
        pool.execute(
          `DELETE FROM categories WHERE id = ?`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      const success = result.affectedRows > 0;
      logger.info('分类删除' + (success ? '成功' : '失败，可能不存在'), { categoryId: id });
      
      return success;
    } catch (error) {
      logger.error('删除分类失败', { categoryId: id, error });
      throw error;
    }
  }
}

module.exports = Category; 