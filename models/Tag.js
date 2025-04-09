/**
 * 话题标签模型
 * 定义标签数据结构和相关数据库操作方法
 */
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// 设置查询超时时间（毫秒）
const QUERY_TIMEOUT = 15000;

class Tag {
  /**
   * 获取所有标签
   * @returns {Promise<Array>} 标签列表
   */
  static async getAll() {
    try {
      logger.info('尝试获取所有标签');
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT t.*,
          (SELECT COUNT(*) FROM topic_tags tt 
           INNER JOIN topics top ON tt.topic_id = top.id 
           WHERE tt.tag_id = t.id AND top.status = 'active') AS topics_count
          FROM tags t
          ORDER BY t.name ASC
        `),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('成功获取所有标签', { count: rows.length });
      
      return rows.map(tag => ({
        id: tag.id,
        name: tag.name,
        topicsCount: tag.topics_count,
        createdAt: tag.created_at
      }));
    } catch (error) {
      logger.error('获取所有标签失败', error);
      throw error;
    }
  }

  /**
   * 通过ID查找标签
   * @param {Number} id - 标签ID
   * @returns {Promise<Object|null>} 标签对象或null
   */
  static async findById(id) {
    try {
      logger.info('尝试通过ID查找标签', { tagId: id });
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT t.*,
          (SELECT COUNT(*) FROM topic_tags tt 
           INNER JOIN topics top ON tt.topic_id = top.id 
           WHERE tt.tag_id = t.id AND top.status = 'active') AS topics_count
          FROM tags t
          WHERE t.id = ?
        `, [id]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('未找到标签', { tagId: id });
        return null;
      } 
      
      logger.info('成功找到标签', { tagId: id });
      
      const tag = rows[0];
      return {
        id: tag.id,
        name: tag.name,
        topicsCount: tag.topics_count,
        createdAt: tag.created_at
      };
    } catch (error) {
      logger.error('通过ID查找标签失败', { tagId: id, error });
      throw error;
    }
  }

  /**
   * 通过名称查找标签
   * @param {String} name - 标签名称
   * @returns {Promise<Object|null>} 标签对象或null
   */
  static async findByName(name) {
    try {
      logger.info('尝试通过名称查找标签', { name });
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT t.*,
          (SELECT COUNT(*) FROM topic_tags tt 
           INNER JOIN topics top ON tt.topic_id = top.id 
           WHERE tt.tag_id = t.id AND top.status = 'active') AS topics_count
          FROM tags t
          WHERE t.name = ?
        `, [name]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('未找到标签', { name });
        return null;
      } 
      
      logger.info('成功找到标签', { name });
      
      const tag = rows[0];
      return {
        id: tag.id,
        name: tag.name,
        topicsCount: tag.topics_count,
        createdAt: tag.created_at
      };
    } catch (error) {
      logger.error('通过名称查找标签失败', { name, error });
      throw error;
    }
  }

  /**
   * 创建新标签
   * @param {Object} tagData - 标签数据
   * @returns {Promise<Object>} 新创建的标签
   */
  static async create(tagData) {
    try {
      const { name } = tagData;
      
      logger.info('尝试创建新标签', { name });
      
      const [result] = await Promise.race([
        pool.execute(
          `INSERT INTO tags (name, created_at) VALUES (?, NOW())`,
          [name]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('标签创建成功', { tagId: result.insertId });
      return this.findById(result.insertId);
    } catch (error) {
      logger.error('创建标签失败', error);
      throw error;
    }
  }

  /**
   * 删除标签
   * @param {Number} id - 标签ID
   * @returns {Promise<Boolean>} 是否成功删除
   */
  static async delete(id) {
    try {
      logger.info('尝试删除标签', { tagId: id });
      
      // 先删除标签与话题的关联
      await Promise.race([
        pool.execute(
          `DELETE FROM topic_tags WHERE tag_id = ?`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      // 然后删除标签
      const [result] = await Promise.race([
        pool.execute(
          `DELETE FROM tags WHERE id = ?`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      const success = result.affectedRows > 0;
      logger.info('标签删除' + (success ? '成功' : '失败，可能不存在'), { tagId: id });
      
      return success;
    } catch (error) {
      logger.error('删除标签失败', { tagId: id, error });
      throw error;
    }
  }

  /**
   * 获取话题的标签
   * @param {Number} topicId - 话题ID
   * @returns {Promise<Array>} 标签列表
   */
  static async getTopicTags(topicId) {
    try {
      logger.info('尝试获取话题的标签', { topicId });
      
      const [rows] = await Promise.race([
        pool.execute(`
          SELECT t.* 
          FROM tags t
          INNER JOIN topic_tags tt ON t.id = tt.tag_id
          WHERE tt.topic_id = ?
          ORDER BY t.name ASC
        `, [topicId]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('成功获取话题的标签', { topicId, count: rows.length });
      
      return rows.map(tag => ({
        id: tag.id,
        name: tag.name,
        createdAt: tag.created_at
      }));
    } catch (error) {
      logger.error('获取话题的标签失败', { topicId, error });
      throw error;
    }
  }

  /**
   * 添加标签到话题
   * @param {Number} topicId - 话题ID
   * @param {Array<Number|String>} tags - 标签ID或名称数组
   * @returns {Promise<Array>} 已添加的标签列表
   */
  static async addTagsToTopic(topicId, tags) {
    try {
      logger.info('尝试为话题添加标签', { topicId, tags });
      
      const addedTags = [];
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // 清除话题现有标签
        await connection.execute(
          `DELETE FROM topic_tags WHERE topic_id = ?`,
          [topicId]
        );
        
        // 添加新标签
        for (const tag of tags) {
          let tagId;
          
          // 如果是数字，直接使用作为标签ID
          if (typeof tag === 'number' || /^\d+$/.test(tag)) {
            tagId = Number(tag);
            
            // 检查标签是否存在
            const [tagRows] = await connection.execute(
              `SELECT id FROM tags WHERE id = ?`,
              [tagId]
            );
            
            if (tagRows.length === 0) {
              logger.warn('标签不存在，跳过', { tagId });
              continue;
            }
          } else {
            // 否则，根据名称查找或创建标签
            const [tagRows] = await connection.execute(
              `SELECT id FROM tags WHERE name = ?`,
              [tag]
            );
            
            if (tagRows.length > 0) {
              tagId = tagRows[0].id;
            } else {
              // 创建新标签
              const [result] = await connection.execute(
                `INSERT INTO tags (name, created_at) VALUES (?, NOW())`,
                [tag]
              );
              tagId = result.insertId;
            }
          }
          
          // 添加标签与话题的关联
          await connection.execute(
            `INSERT INTO topic_tags (topic_id, tag_id) VALUES (?, ?)`,
            [topicId, tagId]
          );
          
          addedTags.push(tagId);
        }
        
        await connection.commit();
        
        logger.info('成功为话题添加标签', { topicId, addedTags });
        
        // 获取添加的标签详情
        return this.getTopicTags(topicId);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('为话题添加标签失败', { topicId, error });
      throw error;
    }
  }
}

module.exports = Tag; 