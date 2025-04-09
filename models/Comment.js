/**
 * 评论模型
 * 定义评论数据结构和相关数据库操作方法
 */
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// 设置查询超时时间（毫秒）
const QUERY_TIMEOUT = 15000;

class Comment {
  /**
   * 创建新评论
   * @param {Object} commentData - 评论数据
   * @returns {Promise<Object>} 新创建的评论
   */
  static async create(commentData) {
    try {
      const { topicId, authorId, content, parentId = null } = commentData;
      
      logger.info('尝试创建新评论', { topicId, authorId, parentId });
      
      const [result] = await Promise.race([
        pool.execute(
          `INSERT INTO comments 
           (topic_id, author_id, content, parent_id, created_at) 
           VALUES (?, ?, ?, ?, NOW())`,
          [topicId, authorId, content, parentId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      // 更新话题评论计数
      await Promise.race([
        pool.execute(
          `UPDATE topics SET comments_count = 
           (SELECT COUNT(*) FROM comments WHERE topic_id = ? AND status = 'active') 
           WHERE id = ?`,
          [topicId, topicId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('评论创建成功', { commentId: result.insertId });
      return this.findById(result.insertId);
    } catch (error) {
      logger.error('创建评论失败', error);
      throw error;
    }
  }

  /**
   * 通过ID查找评论
   * @param {Number} id - 评论ID
   * @returns {Promise<Object|null>} 评论对象或null
   */
  static async findById(id) {
    try {
      logger.info('尝试通过ID查找评论', { commentId: id });
      
      const [rows] = await Promise.race([
        pool.execute(
          `SELECT c.*, 
           (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
           FROM comments c
           WHERE c.id = ? AND c.status = 'active'`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('未找到评论', { commentId: id });
        return null;
      } 
      
      logger.info('成功找到评论', { commentId: id });
      return rows[0];
    } catch (error) {
      logger.error('通过ID查找评论失败', { commentId: id, error });
      throw error;
    }
  }

  /**
   * 获取话题评论列表
   * @param {Object} options - 查询选项
   * @param {Number} options.topicId - 话题ID
   * @param {Number} options.page - 页码
   * @param {Number} options.limit - 每页数量
   * @param {Number} options.userId - 当前用户ID（可选，用于检查是否点赞）
   * @returns {Promise<Object>} 包含评论列表和分页信息的对象
   */
  static async getList(options) {
    try {
      const { topicId, page = 1, limit = 10, userId } = options;
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit); 
      const offset = (pageInt - 1) * limitInt;
      
      logger.info('尝试获取话题评论列表', { topicId, page: pageInt, limit: limitInt, userId });
      
      // Use arrays to build parts
      let selectParts = [
        `c.*`, 
        `u.username as author_username`, 
        `u.avatar as author_avatar`,
        `(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count`
      ];
      const joinClause = 'JOIN users u ON c.author_id = u.id';
      let whereParts = ['c.topic_id = ?', 'c.status = \'active\''];
      // Ensure topicId is treated as a number for the query parameter
      const topicIdNum = Number(topicId); 
      let params = [topicIdNum]; // Start with topicId (as number) for WHERE
      const countParams = [topicIdNum]; // Count also needs topicId as number

      // Add isLiked SELECT and its parameter *together*
      if (userId) {
        selectParts.push(`(SELECT COUNT(*) > 0 FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as isLikedByCurrentUser`);
        // Param added later, just before pagination params
      }
      
      // Construct clauses
      const selectClause = `SELECT ${selectParts.join(', ')}`;
      const whereClause = `WHERE ${whereParts.join(' AND ')}`;
      const orderByClause = ' ORDER BY c.created_at DESC';
      const limitClause = ` LIMIT ${limitInt} OFFSET ${offset}`;

      // --- Build Final Queries --- 
      let query = `${selectClause} FROM comments c ${joinClause} ${whereClause}${orderByClause}${limitClause}`;
      let countQuery = `SELECT COUNT(*) as total FROM comments c ${whereClause}`;

      // --- Finalize Params (only WHERE clause params remain) --- 
      if (userId) {
          // Replace the placeholder for userId in selectParts directly
          selectParts = selectParts.map(part => part.includes('user_id = ?') ? part.replace('user_id = ?', `user_id = ${pool.escape(userId)}`) : part);
          // Rebuild selectClause with replaced placeholder
          const newSelectClause = `SELECT ${selectParts.join(', ')}`;
          query = `${newSelectClause} FROM comments c ${joinClause} ${whereClause}${orderByClause}${limitClause}`;
          // Remove userId from params array as it's now in the query string
      }
      
      // Remove pagination params as they are now in limitClause
      // The params array should now only contain WHERE condition values (topicId)
      // The countParams array remains unchanged as it only has WHERE values (topicId)

      // --- Log and Execute --- 
      logger.info('[Comment.getList] Final Query (Interpolated):', { query: query.replace(/\s+/g, ' ') }); 
      logger.info('[Comment.getList] Final Count Query:', { countQuery: countQuery.replace(/\s+/g, ' '), countParams: JSON.stringify(countParams) }); 

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
        
        logger.info('成功获取评论列表', { 
          topicId,
          count: rows.length,
          totalCount,
          pageCount,
          page: pageInt
        });
        
        // Process results
        const comments = rows.map(comment => {
          const formattedComment = {
            id: comment.id,
            topicId: comment.topic_id,
            authorId: comment.author_id,
            authorName: comment.author_username,
            authorAvatar: comment.author_avatar,
            content: comment.content,
            parentId: comment.parent_id,
            status: comment.status,
            likesCount: comment.likes_count || 0,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            isLiked: userId ? (comment.isLikedByCurrentUser === 1) : false
          };
          return formattedComment;
        });
        
        return {
          comments,
          totalCount,
          pageCount
        };
      } catch (execError) {
        logger.error('[Comment.getList] Query Execution Error:', { 
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
      logger.error('获取评论列表失败 (Overall Error)', { 
        topicId: options.topicId, 
        constructedQuery: typeof query !== 'undefined' ? query.replace(/\s+/g, ' ') : 'N/A', 
        constructedParams: typeof params !== 'undefined' ? JSON.stringify(params) : 'N/A', 
        error 
      });
      throw error;
    }
  }

  /**
   * 删除评论（标记为删除）
   * @param {Number} id - 评论ID
   * @returns {Promise<Boolean>} 是否成功删除
   */
  static async delete(id) {
    try {
      logger.info('尝试删除评论', { commentId: id });
      
      // 先获取评论的话题ID，用于后续更新话题评论计数
      const [commentRows] = await Promise.race([
        pool.execute(
          `SELECT topic_id FROM comments WHERE id = ?`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (commentRows.length === 0) {
        logger.warn('评论不存在，无法删除', { commentId: id });
        return false;
      }
      
      const topicId = commentRows[0].topic_id;
      
      const [result] = await Promise.race([
        pool.execute(
          `UPDATE comments SET status = 'deleted' WHERE id = ?`,
          [id]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      // 更新话题评论计数
      if (result.affectedRows > 0) {
        await Promise.race([
          pool.execute(
            `UPDATE topics SET comments_count = 
             (SELECT COUNT(*) FROM comments WHERE topic_id = ? AND status = 'active') 
             WHERE id = ?`,
            [topicId, topicId]
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
          )
        ]);
      }
      
      logger.info('评论删除成功', { commentId: id, affected: result.affectedRows });
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('删除评论失败', { commentId: id, error });
      throw error;
    }
  }

  /**
   * 评论点赞
   * @param {Number} commentId - 评论ID
   * @param {Number} userId - 用户ID
   * @returns {Promise<Object>} 包含点赞数量的对象
   */
  static async like(commentId, userId) {
    try {
      logger.info('尝试评论点赞', { commentId, userId });
      
      // 检查用户是否已经点赞
      const [existingLike] = await Promise.race([
        pool.execute(
          `SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
          [commentId, userId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (existingLike.length > 0) {
        logger.info('用户已经点赞过该评论', { commentId, userId });
        return this.getLikesCount(commentId);
      }
      
      // 添加点赞记录
      await Promise.race([
        pool.execute(
          `INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES (?, ?, NOW())`,
          [commentId, userId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('评论点赞成功', { commentId, userId });
      return this.getLikesCount(commentId);
    } catch (error) {
      logger.error('评论点赞失败', { commentId, userId, error });
      throw error;
    }
  }

  /**
   * 取消评论点赞
   * @param {Number} commentId - 评论ID
   * @param {Number} userId - 用户ID
   * @returns {Promise<Object>} 包含点赞数量的对象
   */
  static async unlike(commentId, userId) {
    try {
      logger.info('尝试取消评论点赞', { commentId, userId });
      
      await Promise.race([
        pool.execute(
          `DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
          [commentId, userId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      logger.info('取消评论点赞成功', { commentId, userId });
      return this.getLikesCount(commentId);
    } catch (error) {
      logger.error('取消评论点赞失败', { commentId, userId, error });
      throw error;
    }
  }

  /**
   * 获取评论点赞数量
   * @param {Number} commentId - 评论ID
   * @returns {Promise<Object>} 包含点赞数量的对象
   */
  static async getLikesCount(commentId) {
    try {
      const [rows] = await Promise.race([
        pool.execute(
          `SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?`,
          [commentId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      const likesCount = rows[0].count;
      
      // 更新评论表中的点赞计数
      await Promise.race([
        pool.execute(
          `UPDATE comments SET likes_count = ? WHERE id = ?`,
          [likesCount, commentId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      return { likesCount };
    } catch (error) {
      logger.error('获取评论点赞数量失败', { commentId, error });
      throw error;
    }
  }

  /**
   * 检查用户是否有权限修改评论
   * @param {Number} commentId - 评论ID
   * @param {Number} userId - 用户ID
   * @returns {Promise<Boolean>} 是否有权限
   */
  static async checkPermission(commentId, userId) {
    try {
      logger.info('检查用户是否有权限修改评论', { commentId, userId });
      
      const [rows] = await Promise.race([
        pool.execute(
          `SELECT author_id FROM comments WHERE id = ?`,
          [commentId]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('数据库操作超时')), QUERY_TIMEOUT)
        )
      ]);
      
      if (rows.length === 0) {
        logger.info('评论不存在', { commentId });
        return false;
      }
      
      const isAuthor = rows[0].author_id === userId;
      logger.info('用户权限检查结果', { 
        commentId, 
        userId, 
        isAuthor, 
        authorId: rows[0].author_id 
      });
      
      return isAuthor;
    } catch (error) {
      logger.error('检查用户权限失败', { commentId, userId, error });
      throw error;
    }
  }
}

module.exports = Comment; 