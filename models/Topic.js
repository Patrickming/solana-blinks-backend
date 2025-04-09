/**
 * 话题模型
 * 定义话题数据结构和相关数据库操作方法
 */
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const Tag = require('./Tag');
const Category = require('./Category');

// 设置查询超时时间（毫秒）
const QUERY_TIMEOUT = 15000;

class Topic {
  /**
   * 创建新话题
   * @param {Object} topicData - 话题数据
   * @returns {Promise<Object>} 新创建的话题
   */
  static async create(topicData) {
    try {
      const { title, content, category, authorId, tags = [] } = topicData;
      
      logger.info('尝试创建新话题', { title, category, authorId });
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        const [result] = await connection.execute(
          `INSERT INTO topics 
           (title, content, category, author_id, created_at) 
           VALUES (?, ?, ?, ?, NOW())`,
          [title, content, category, authorId]
        );
        
        const topicId = result.insertId;
        
        // 添加标签关联
        if (tags && tags.length > 0) {
          await Tag.addTagsToTopic(topicId, tags, connection); // Pass connection
        }
        
        await connection.commit();
        
        logger.info('话题创建成功', { topicId });
        return this.findById(topicId);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('创建话题失败', error);
      throw error;
    }
  }

  /**
   * 通过ID查找话题
   * @param {Number} id - 话题ID
   * @param {Number} userId - 当前用户ID（可选，用于检查是否点赞）
   * @returns {Promise<Object|null>} 话题对象或null
   */
  static async findById(id, userId = null) {
    try {
      logger.info('尝试通过ID查找话题', { topicId: id, userId });
      
      let query = `
        SELECT t.*, 
        (SELECT COUNT(*) FROM topic_likes WHERE topic_id = t.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE topic_id = t.id AND status = 'active') as comments_count
      `;
      const params = [id];

      if (userId) {
        query += `,
        (SELECT COUNT(*) > 0 FROM topic_likes WHERE topic_id = ? AND user_id = ?) as isLikedByCurrentUser
        `;
        params.push(id, userId); // Need topic id again for this subquery
      }

      query += `
        FROM topics t
        WHERE t.id = ? AND t.status = 'active'
      `;
      // The main WHERE condition uses the first 'id' param

      const [rows] = await Promise.race([
        pool.execute(query, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('未找到话题', { topicId: id });
        return null;
      } 
      
      const topic = rows[0];
      logger.info('成功找到话题', { topicId: id });
      
      // 获取话题标签
      const tags = await Tag.getTopicTags(id);

      // 格式化结果
      const formattedTopic = {
        id: topic.id,
        title: topic.title,
        content: topic.content,
        category: topic.category,
        authorId: topic.author_id,
        status: topic.status,
        views: topic.views,
        likesCount: topic.likes_count || 0,
        commentsCount: topic.comments_count || 0,
        isHot: topic.is_hot === 1,
        isOfficial: topic.is_official === 1,
        isLiked: userId ? (topic.isLikedByCurrentUser === 1) : false,
        createdAt: topic.created_at,
        updatedAt: topic.updated_at,
        tags: tags.map(tag => tag.name) // Map Tag objects to names
      };
      
      return formattedTopic;
    } catch (error) {
      logger.error('通过ID查找话题失败', { topicId: id, error });
      throw error;
    }
  }

  /**
   * 获取话题列表
   * @param {Object} options - 查询选项
   * @param {Number} options.page - 页码
   * @param {Number} options.limit - 每页数量
   * @param {String|Number} options.category - 分类ID或名称
   * @param {String|Number} options.tag - 标签ID或名称
   * @param {String} options.search - 搜索关键词
   * @param {String} options.sort - 排序方式(latest/hot/official)
   * @param {Number} options.userId - 当前用户ID（可选，用于检查是否点赞）
   * @returns {Promise<Object>} 包含话题列表和分页信息的对象
   */
  static async getList(options) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        tag, 
        search, 
        sort = 'latest',
        userId 
      } = options;
      
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const offset = (pageInt - 1) * limitInt;
      
      logger.info('尝试获取话题列表', { 
        page: pageInt, 
        limit: limitInt,
        category,
        tag,
        search,
        sort,
        userId
      });
      
      // Use arrays to build parts, easier to manage params
      let selectParts = [
        `t.*`, 
        `u.username as author_username`, 
        `u.avatar as author_avatar`,
        `(SELECT COUNT(*) FROM topic_likes WHERE topic_id = t.id) as likes_count`,
        `(SELECT COUNT(*) FROM comments WHERE topic_id = t.id AND status = 'active') as comments_count`
      ];
      let joinParts = [`JOIN users u ON t.author_id = u.id`];
      let whereParts = [`t.status = 'active'`];
      let params = [];
      let countParams = [];
      let groupByParts = [];

      if (tag) {
        joinParts.push(`LEFT JOIN topic_tags tt ON t.id = tt.topic_id LEFT JOIN tags tg ON tt.tag_id = tg.id`);
        whereParts.push(`(tg.id = ? OR tg.name = ?)'`);
        if (typeof tag === 'number' || /^\d+$/.test(tag)) {
          params.push(Number(tag), ''); 
          countParams.push(Number(tag), '');
        } else {
          params.push(0, tag); 
          countParams.push(0, tag);
        }
        groupByParts.push('t.id'); // Need group by when joining tags
      }
      
      if (category) {
        whereParts.push('t.category = ?');
        params.push(category);
        countParams.push(category);
      }
      
      if (search) {
        whereParts.push('(t.title LIKE ? OR t.content LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm);
      }
      
      // IMPORTANT: Add isLiked SELECT and its parameter *together*
      if (userId) {
        selectParts.push(`(SELECT COUNT(*) > 0 FROM topic_likes WHERE topic_id = t.id AND user_id = ?) as isLikedByCurrentUser`);
        // This param MUST be the last one BEFORE pagination params
      }
      
      // Construct final clauses
      const selectClause = `SELECT ${selectParts.join(', ')}`;
      const joinClause = joinParts.join(' ');
      const whereClause = `WHERE ${whereParts.join(' AND ')}`;
      const groupByClause = groupByParts.length > 0 ? `GROUP BY ${groupByParts.join(', ')}` : '';
      
      let orderByClause = ' ORDER BY t.created_at DESC'; // Default
      if (sort === 'hot') {
        orderByClause = ` ORDER BY t.is_hot DESC, likes_count DESC, t.created_at DESC`;
      } else if (sort === 'official') {
        orderByClause = ` ORDER BY t.is_official DESC, t.created_at DESC`;
      }

      const limitClause = ` LIMIT ${limitInt} OFFSET ${offset}`;

      // --- Build Final Queries --- 
      let query = `${selectClause} FROM topics t ${joinClause} ${whereClause}${groupByClause}${orderByClause}${limitClause}`;
      let countQuery = `SELECT COUNT(DISTINCT t.id) as total FROM topics t ${joinClause} ${whereClause}`;
       // Use COUNT(DISTINCT t.id) when grouping might inflate counts

      // --- Finalize Params (only WHERE clause params remain) --- 
      if (userId) {
          // Replace the placeholder for userId in selectParts directly
          selectParts = selectParts.map(part => part.includes('user_id = ?') ? part.replace('user_id = ?', `user_id = ${pool.escape(userId)}`) : part);
          // Rebuild selectClause with replaced placeholder
          const newSelectClause = `SELECT ${selectParts.join(', ')}`;
          query = `${newSelectClause} FROM topics t ${joinClause} ${whereClause}${groupByClause}${orderByClause}${limitClause}`;
          // Remove userId from params array as it's now in the query string
      }
      
      // Remove pagination params as they are now in limitClause
      // The params array should now only contain WHERE condition values
      // The countParams array remains unchanged as it only has WHERE values

      // --- Log and Execute --- 
      // Log before execution (params array now only contains WHERE values)
      logger.info('[Topic.getList] Final Query (Interpolated):', { query: query.replace(/\s+/g, ' ') }); 
      logger.info('[Topic.getList] Final Count Query:', { countQuery: countQuery.replace(/\s+/g, ' '), countParams: JSON.stringify(countParams) }); 

      try {
        // Execute query without pagination/userId params in the array
        const [rows] = await Promise.race([
          pool.execute(query, params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
          )
        ]);
        
        // Execute count query with its params
        const [countRows] = await Promise.race([
          pool.execute(countQuery, countParams),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
          )
        ]);

        const totalCount = countRows[0].total;
        const pageCount = Math.ceil(totalCount / limitInt);
        
        logger.info('成功获取话题列表', { 
          count: rows.length,
          totalCount,
          pageCount,
          page: pageInt
        });

        // Process results (rest is unchanged)
        const topics = await Promise.all(rows.map(async (topic) => {
            const tags = await Tag.getTopicTags(topic.id);
            const formattedTopic = {
                id: topic.id,
                title: topic.title,
                content: topic.content,
                category: topic.category,
                authorId: topic.author_id,
                authorName: topic.author_username,
                authorAvatar: topic.author_avatar,
                status: topic.status,
                createdAt: topic.created_at,
                updatedAt: topic.updated_at,
                views: topic.views,
                likesCount: topic.likes_count || 0,
                commentsCount: topic.comments_count || 0,
                isHot: topic.is_hot === 1,
                isOfficial: topic.is_official === 1,
                isLiked: userId ? (topic.isLikedByCurrentUser === 1) : false,
                tags: tags.map(tag => tag.name)
            };
            return formattedTopic;
        }));
        
        return {
          topics,
          totalCount,
          pageCount
        };
      } catch (execError) {
        logger.error('[Topic.getList] Query Execution Error:', { 
          message: execError.message, 
          query: query.replace(/\s+/g, ' '), 
          params: JSON.stringify(params), 
          countQuery: countQuery.replace(/\s+/g, ' '), 
          countParams: JSON.stringify(countParams), 
          error: execError 
        });
        throw execError;
      }
    } catch (error) {
      logger.error('获取话题列表失败 (Overall Error)', { 
        options, 
        constructedQuery: typeof query !== 'undefined' ? query.replace(/\s+/g, ' ') : 'N/A', 
        constructedParams: typeof params !== 'undefined' ? JSON.stringify(params) : 'N/A', 
        error 
      });
      throw error;
    }
  }

  /**
   * 更新话题信息
   * @param {Number} id - 话题ID
   * @param {Object} updateData - 要更新的数据
   * @returns {Promise<Object>} 更新后的话题
   */
  static async update(id, updateData) {
    try {
      const { title, content, category, tags } = updateData;
      
      logger.info('尝试更新话题', { topicId: id });
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // 构建更新字段
        const updateFields = [];
        const params = [];
        
        if (title !== undefined) {
          updateFields.push('title = ?');
          params.push(title);
        }
        
        if (content !== undefined) {
          updateFields.push('content = ?');
          params.push(content);
        }
        
        if (category !== undefined) {
          updateFields.push('category = ?');
          params.push(category);
        }
        
        if (updateFields.length > 0) {
          updateFields.push('updated_at = NOW()'); // Update timestamp
          params.push(id);
          
          await connection.execute(
            `UPDATE topics SET ${updateFields.join(', ')} WHERE id = ?`,
            params
          );
        }
        
        // 更新标签关联 (如果提供了tags)
        if (tags !== undefined) { // Check if tags array is provided (even if empty)
          await Tag.addTagsToTopic(id, tags, connection); // Pass connection
        }
        
        await connection.commit();
        
        logger.info('话题更新成功', { topicId: id });
        return this.findById(id);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('更新话题失败', { topicId: id, error });
      throw error;
    }
  }

  /**
   * 删除话题（标记为删除）
   * @param {Number} id - 话题ID
   * @returns {Promise<Boolean>} 是否成功删除
   */
  static async delete(id) {
    try {
      logger.info('尝试删除话题', { topicId: id });
      
      const [result] = await Promise.race([
        pool.execute(
          `UPDATE topics SET status = 'deleted' WHERE id = ?`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      // TODO: Consider deleting associated comments and likes, or handle them differently.
      
      logger.info('话题删除成功', { topicId: id, affected: result.affectedRows });
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('删除话题失败', { topicId: id, error });
      throw error;
    }
  }

  /**
   * 增加话题浏览次数
   * @param {Number} id - 话题ID
   */
  static async incrementViews(id) {
    try {
      await Promise.race([
        pool.execute(
          'UPDATE topics SET views = views + 1 WHERE id = ?',
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      logger.debug('话题浏览次数增加成功', { topicId: id });
    } catch (error) {
      // Log error but don't throw, as view increment failure is not critical
      logger.warn('增加话题浏览次数失败', { topicId: id, error });
    }
  }

  /**
   * 话题点赞
   * @param {Number} topicId - 话题ID
   * @param {Number} userId - 用户ID
   * @returns {Promise<Object>} 包含点赞数量的对象
   */
  static async like(topicId, userId) {
    try {
      logger.info('尝试话题点赞', { topicId, userId });
      
      // 检查用户是否已经点赞
      const [existingLike] = await Promise.race([
        pool.execute(
          `SELECT id FROM topic_likes WHERE topic_id = ? AND user_id = ?`,
          [topicId, userId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (existingLike.length > 0) {
        logger.info('用户已经点赞过该话题', { topicId, userId });
        return this.getLikesCount(topicId);
      }
      
      // 添加点赞记录
      await Promise.race([
        pool.execute(
          `INSERT INTO topic_likes (topic_id, user_id, created_at) VALUES (?, ?, NOW())`,
          [topicId, userId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('话题点赞成功', { topicId, userId });
      return this.getLikesCount(topicId);
    } catch (error) {
      logger.error('话题点赞失败', { topicId, userId, error });
      throw error;
    }
  }

  /**
   * 取消话题点赞
   * @param {Number} topicId - 话题ID
   * @param {Number} userId - 用户ID
   * @returns {Promise<Object>} 包含点赞数量的对象
   */
  static async unlike(topicId, userId) {
    try {
      logger.info('尝试取消话题点赞', { topicId, userId });
      
      await Promise.race([
        pool.execute(
          `DELETE FROM topic_likes WHERE topic_id = ? AND user_id = ?`,
          [topicId, userId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('取消话题点赞成功', { topicId, userId });
      return this.getLikesCount(topicId);
    } catch (error) {
      logger.error('取消话题点赞失败', { topicId, userId, error });
      throw error;
    }
  }

  /**
   * 获取话题点赞数量
   * @param {Number} topicId - 话题ID
   * @returns {Promise<Object>} 包含点赞数量的对象
   */
  static async getLikesCount(topicId) {
    try {
      const [rows] = await Promise.race([
        pool.execute(
          `SELECT COUNT(*) as count FROM topic_likes WHERE topic_id = ?`,
          [topicId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      const likesCount = rows[0].count;
      
      // 更新话题表中的点赞计数
      await Promise.race([
        pool.execute(
          `UPDATE topics SET likes_count = ? WHERE id = ?`,
          [likesCount, topicId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      return { likesCount };
    } catch (error) {
      logger.error('获取话题点赞数量失败', { topicId, error });
      throw error;
    }
  }

  /**
   * 检查用户是否有权限修改话题
   * @param {Number} topicId - 话题ID
   * @param {Number} userId - 用户ID
   * @returns {Promise<Boolean>} 是否有权限
   */
  static async checkPermission(topicId, userId) {
    try {
      logger.info('检查用户是否有权限修改话题', { topicId, userId });
      
      const [rows] = await Promise.race([
        pool.execute(
          `SELECT author_id FROM topics WHERE id = ?`,
          [topicId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('话题不存在', { topicId });
        return false;
      }
      
      const isAuthor = rows[0].author_id === userId;
      // TODO: Add logic for admin/moderator permissions if needed
      logger.info('用户权限检查结果', { 
        topicId, 
        userId, 
        isAuthor, 
        authorId: rows[0].author_id 
      });
      
      return isAuthor;
    } catch (error) {
      logger.error('检查用户权限失败', { topicId, userId, error });
      throw error;
    }
  }
}

module.exports = Topic;