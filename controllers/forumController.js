/**
 * 论坛控制器模块
 * 处理论坛话题和评论相关的业务逻辑
 */
const Topic = require('../models/Topic');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const logger = require('../utils/logger');
const { pool } = require('../config/database');

/**
 * @desc    获取话题列表
 * @route   GET /api/forum/topics
 * @access  Public
 */
exports.getTopics = async (req, res, next) => {
  try {
    logger.info('开始处理获取话题列表请求', { query: req.query });
    
    const { page = 1, limit = 10, category, tag, search, sort = 'latest' } = req.query;
    
    // 验证排序方式
    const validSortTypes = ['latest', 'hot', 'official'];
    if (sort && !validSortTypes.includes(sort)) {
      logger.warn('获取话题列表失败：无效的排序方式', { sort });
      return res.status(400).json({ error: '无效的排序方式' });
    }
    
    // 获取话题列表
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      tag,
      search,
      sort
    };
    
    // 如果用户已登录，添加用户ID以获取是否点赞信息
    if (req.user) {
      options.userId = req.user.id;
    }
    
    const result = await Topic.getList(options);
    
    logger.info('话题列表获取成功', { 
      topicsCount: result.topics.length,
      totalCount: result.totalCount,
      pageCount: result.pageCount
    });
    
    res.json(result);
  } catch (error) {
    logger.error('获取话题列表失败', error);
    next(error);
  }
};

/**
 * @desc    获取话题详情
 * @route   GET /api/forum/topics/:id
 * @access  Public
 */
exports.getTopicById = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    logger.info('开始处理获取话题详情请求', { topicId });
    
    // 增加浏览次数
    await Topic.incrementViews(topicId);
    
    // 获取话题信息，如果用户已登录，传入用户ID以获取是否点赞信息
    const topic = await Topic.findById(topicId, req.user?.id);
    
    if (!topic) {
      logger.warn('获取话题详情失败：话题不存在', { topicId });
      return res.status(404).json({ error: '话题不存在' });
    }
    
    // 获取作者信息
    const author = await User.findById(topic.authorId);
    
    if (!author) {
      logger.warn('获取话题详情失败：作者不存在', { authorId: topic.authorId });
      return res.status(404).json({ error: '作者不存在' });
    }
    
    // 格式化作者信息
    const formattedAuthor = {
      id: author.id,
      username: author.username,
      avatar: author.avatar,
      bio: author.bio || '',
      github: author.github || '',
      twitter: author.twitter || '',
      wallet_address: author.wallet_address || '',
      tech_stack: author.tech_stack || ''
    };
    
    logger.info('话题详情获取成功', { topicId });
    
    res.json({
      topic,
      author: formattedAuthor
    });
  } catch (error) {
    logger.error('获取话题详情失败', error);
    next(error);
  }
};

/**
 * @desc    创建话题
 * @route   POST /api/forum/topics
 * @access  Private
 */
exports.createTopic = async (req, res, next) => {
  try {
    logger.info('开始处理创建话题请求', { userId: req.user.id });
    
    const { title, content, category, tags } = req.body;
    
    // 输入验证
    if (!title || !content || !category) {
      logger.warn('创建话题失败：缺少必要字段', { title, category });
      return res.status(400).json({ error: '标题、内容和分类都是必需的' });
    }
    
    // 检查分类是否存在
    let categoryName = category;
    if (/^\d+$/.test(category)) {
      const categoryObj = await Category.findById(Number(category));
      if (!categoryObj) {
        logger.warn('创建话题失败：分类不存在', { category });
        return res.status(400).json({ error: '指定的分类不存在' });
      }
      categoryName = categoryObj.name;
    } else {
      const categoryObj = await Category.findByName(category);
      if (!categoryObj) {
        logger.warn('创建话题失败：分类不存在', { category });
        return res.status(400).json({ error: '指定的分类不存在' });
      }
    }
    
    // 创建话题
    const topicData = {
      title,
      content,
      category: categoryName,
      authorId: req.user.id,
      tags: tags || []
    };
    
    const topic = await Topic.create(topicData);
    
    logger.info('话题创建成功', { topicId: topic.id });
    
    res.status(201).json({
      success: true,
      topicId: topic.id
    });
  } catch (error) {
    logger.error('创建话题失败', error);
    next(error);
  }
};

/**
 * @desc    更新话题
 * @route   PUT /api/forum/topics/:id
 * @access  Private
 */
exports.updateTopic = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理更新话题请求', { topicId, userId });
    
    // 检查话题是否存在
    const topic = await Topic.findById(topicId);
    
    if (!topic) {
      logger.warn('更新话题失败：话题不存在', { topicId });
      return res.status(404).json({ error: '话题不存在' });
    }
    
    // 检查用户是否有权限更新话题
    const hasPermission = await Topic.checkPermission(topicId, userId);
    
    if (!hasPermission) {
      logger.warn('更新话题失败：无权限', { topicId, userId });
      return res.status(403).json({ error: '无权更新此话题' });
    }
    
    const { title, content, category, tags } = req.body;
    
    // 检查分类是否存在（如果提供了分类）
    let categoryName;
    if (category) {
      if (/^\d+$/.test(category)) {
        const categoryObj = await Category.findById(Number(category));
        if (!categoryObj) {
          logger.warn('更新话题失败：分类不存在', { category });
          return res.status(400).json({ error: '指定的分类不存在' });
        }
        categoryName = categoryObj.name;
      } else {
        const categoryObj = await Category.findByName(category);
        if (!categoryObj) {
          logger.warn('更新话题失败：分类不存在', { category });
          return res.status(400).json({ error: '指定的分类不存在' });
        }
        categoryName = category;
      }
    }
    
    // 更新话题
    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (categoryName) updateData.category = categoryName;
    if (tags) updateData.tags = tags;
    
    await Topic.update(topicId, updateData);
    
    logger.info('话题更新成功', { topicId });
    
    res.json({
      success: true
    });
  } catch (error) {
    logger.error('更新话题失败', error);
    next(error);
  }
};

/**
 * @desc    删除话题
 * @route   DELETE /api/forum/topics/:id
 * @access  Private
 */
exports.deleteTopic = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理删除话题请求', { topicId, userId });
    
    // 检查用户是否有权限删除话题
    const hasPermission = await Topic.checkPermission(topicId, userId);
    
    if (!hasPermission) {
      logger.warn('删除话题失败：无权限', { topicId, userId });
      return res.status(403).json({ error: '无权删除此话题' });
    }
    
    await Topic.delete(topicId);
    
    logger.info('话题删除成功', { topicId });
    
    res.json({
      success: true
    });
  } catch (error) {
    logger.error('删除话题失败', error);
    next(error);
  }
};

/**
 * @desc    话题点赞
 * @route   POST /api/forum/topics/:id/like
 * @access  Private
 */
exports.likeTopic = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理话题点赞请求', { topicId, userId });
    
    // 检查话题是否存在
    const topic = await Topic.findById(topicId);
    
    if (!topic) {
      logger.warn('话题点赞失败：话题不存在', { topicId });
      return res.status(404).json({ error: '话题不存在' });
    }
    
    await Topic.like(topicId, userId);
    
    // 获取最新点赞数
    const likesCount = await Topic.getLikesCount(topicId);
    
    logger.info('话题点赞成功', { topicId, userId, likesCount });
    
    res.json({
      success: true,
      likesCount
    });
  } catch (error) {
    logger.error('话题点赞失败', error);
    next(error);
  }
};

/**
 * @desc    取消话题点赞
 * @route   DELETE /api/forum/topics/:id/like
 * @access  Private
 */
exports.unlikeTopic = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理取消话题点赞请求', { topicId, userId });
    
    await Topic.unlike(topicId, userId);
    
    // 获取最新点赞数
    const likesCount = await Topic.getLikesCount(topicId);
    
    logger.info('取消话题点赞成功', { topicId, userId, likesCount });
    
    res.json({
      success: true,
      likesCount
    });
  } catch (error) {
    logger.error('取消话题点赞失败', error);
    next(error);
  }
};

/**
 * @desc    获取评论列表
 * @route   GET /api/forum/topics/:id/comments
 * @access  Public
 */
exports.getComments = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    
    logger.info('开始处理获取评论列表请求', { topicId, page, limit });
    
    // 检查话题是否存在
    const topic = await Topic.findById(topicId);
    
    if (!topic) {
      logger.warn('获取评论列表失败：话题不存在', { topicId });
      return res.status(404).json({ error: '话题不存在' });
    }
    
    // 获取评论列表
    const options = {
      topicId,
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    // 如果用户已登录，添加用户ID以获取是否点赞信息
    if (req.user) {
      options.userId = req.user.id;
    }
    
    const result = await Comment.getList(options);
    
    logger.info('评论列表获取成功', { 
      topicId,
      commentsCount: result.comments.length,
      totalCount: result.totalCount,
      pageCount: result.pageCount
    });
    
    res.json(result);
  } catch (error) {
    logger.error('获取评论列表失败', error);
    next(error);
  }
};

/**
 * @desc    发表评论
 * @route   POST /api/forum/topics/:id/comments
 * @access  Private
 */
exports.createComment = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const userId = req.user.id;
    const { content, parentId } = req.body;
    
    logger.info('开始处理发表评论请求', { topicId, userId, parentId });
    
    // 输入验证
    if (!content) {
      logger.warn('发表评论失败：缺少评论内容', { topicId });
      return res.status(400).json({ error: '评论内容不能为空' });
    }
    
    // 检查话题是否存在
    const topic = await Topic.findById(topicId);
    
    if (!topic) {
      logger.warn('发表评论失败：话题不存在', { topicId });
      return res.status(404).json({ error: '话题不存在' });
    }
    
    // 如果有父评论ID，检查父评论是否存在
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      
      if (!parentComment) {
        logger.warn('发表评论失败：父评论不存在', { parentId });
        return res.status(404).json({ error: '父评论不存在' });
      }
      
      // 验证父评论所属的话题ID是否与当前话题ID一致
      if (parentComment.topic_id != topicId) {
        logger.warn('发表评论失败：父评论不属于当前话题', { 
          parentId, 
          parentTopicId: parentComment.topic_id, 
          currentTopicId: topicId 
        });
        return res.status(400).json({ error: '父评论不属于当前话题' });
      }
    }
    
    // 创建评论
    const commentData = {
      topicId,
      authorId: userId,
      content,
      parentId
    };
    
    const comment = await Comment.create(commentData);
    
    logger.info('评论发表成功', { commentId: comment.id });
    
    res.status(201).json({
      success: true,
      commentId: comment.id
    });
  } catch (error) {
    logger.error('发表评论失败', error);
    next(error);
  }
};

/**
 * @desc    评论点赞
 * @route   POST /api/forum/comments/:id/like
 * @access  Private
 */
exports.likeComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理评论点赞请求', { commentId, userId });
    
    // 检查评论是否存在
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      logger.warn('评论点赞失败：评论不存在', { commentId });
      return res.status(404).json({ error: '评论不存在' });
    }
    
    await Comment.like(commentId, userId);
    
    // 获取最新点赞数
    const likesCount = await Comment.getLikesCount(commentId);
    
    logger.info('评论点赞成功', { commentId, userId, likesCount });
    
    res.json({
      success: true,
      likesCount
    });
  } catch (error) {
    logger.error('评论点赞失败', error);
    next(error);
  }
};

/**
 * @desc    取消评论点赞
 * @route   DELETE /api/forum/comments/:id/like
 * @access  Private
 */
exports.unlikeComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理取消评论点赞请求', { commentId, userId });
    
    await Comment.unlike(commentId, userId);
    
    // 获取最新点赞数
    const likesCount = await Comment.getLikesCount(commentId);
    
    logger.info('取消评论点赞成功', { commentId, userId, likesCount });
    
    res.json({
      success: true,
      likesCount
    });
  } catch (error) {
    logger.error('取消评论点赞失败', error);
    next(error);
  }
};

/**
 * @desc    获取所有分类
 * @route   GET /api/forum/categories
 * @access  Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    logger.info('开始处理获取所有分类请求');
    
    const categories = await Category.getAll();
    
    logger.info('分类获取成功', { count: categories.length });
    
    res.json({ categories });
  } catch (error) {
    logger.error('获取分类失败', error);
    next(error);
  }
};

/**
 * @desc    获取分类详情
 * @route   GET /api/forum/categories/:id
 * @access  Public
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    logger.info('开始处理获取分类详情请求', { categoryId });
    
    const category = await Category.findById(categoryId);
    
    if (!category) {
      logger.warn('获取分类详情失败：分类不存在', { categoryId });
      return res.status(404).json({ error: '分类不存在' });
    }
    
    logger.info('分类详情获取成功', { categoryId });
    
    res.json(category);
  } catch (error) {
    logger.error('获取分类详情失败', error);
    next(error);
  }
};

/**
 * @desc    获取所有标签
 * @route   GET /api/forum/tags
 * @access  Public
 */
exports.getTags = async (req, res, next) => {
  try {
    logger.info('开始处理获取所有标签请求');
    
    const tags = await Tag.getAll();
    
    logger.info('标签获取成功', { count: tags.length });
    
    res.json({ tags });
  } catch (error) {
    logger.error('获取标签失败', error);
    next(error);
  }
};

/**
 * @desc    获取标签详情
 * @route   GET /api/forum/tags/:id
 * @access  Public
 */
exports.getTagById = async (req, res, next) => {
  try {
    const tagId = req.params.id;
    logger.info('开始处理获取标签详情请求', { tagId });
    
    const tag = await Tag.findById(tagId);
    
    if (!tag) {
      logger.warn('获取标签详情失败：标签不存在', { tagId });
      return res.status(404).json({ error: '标签不存在' });
    }
    
    logger.info('标签详情获取成功', { tagId });
    
    res.json(tag);
  } catch (error) {
    logger.error('获取标签详情失败', error);
    next(error);
  }
};

/**
 * @desc    获取用户发布的话题
 * @route   GET /api/forum/users/:id/topics
 * @access  Public
 */
exports.getUserTopics = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    
    logger.info('开始处理获取用户话题列表请求', { userId, page, limit });
    
    // 检查用户是否存在
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn('获取用户话题列表失败：用户不存在', { userId });
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 将页码和每页数量转换为整数
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;
    
    // 查询用户的话题
    const [rows] = await pool.execute(
      `SELECT t.id, t.title, t.category, t.views, 
       (SELECT COUNT(*) FROM topic_likes WHERE topic_id = t.id) as likes_count,
       (SELECT COUNT(*) FROM comments WHERE topic_id = t.id AND status = 'active') as comments_count,
       t.created_at
       FROM topics t
       WHERE t.author_id = ? AND t.status = 'active'
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limitInt, offset]
    );
    
    // 获取总话题数
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM topics WHERE author_id = ? AND status = 'active'`,
      [userId]
    );
    
    const totalCount = countRows[0].total;
    const pageCount = Math.ceil(totalCount / limitInt);
    
    const topics = rows.map(topic => ({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      views: topic.views,
      likes_count: topic.likes_count,
      comments_count: topic.comments_count,
      created_at: topic.created_at
    }));
    
    logger.info('用户话题列表获取成功', { 
      userId,
      topicsCount: topics.length,
      totalCount,
      pageCount
    });
    
    res.json({
      topics,
      totalCount,
      pageCount
    });
  } catch (error) {
    logger.error('获取用户话题列表失败', error);
    next(error);
  }
};

/**
 * @desc    获取用户的评论
 * @route   GET /api/forum/users/:id/comments
 * @access  Public
 */
exports.getUserComments = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    
    logger.info('开始处理获取用户评论列表请求', { userId, page, limit });
    
    // 检查用户是否存在
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn('获取用户评论列表失败：用户不存在', { userId });
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 将页码和每页数量转换为整数
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;
    
    // 查询用户的评论
    const [rows] = await pool.execute(
      `SELECT c.id, c.content, c.topic_id, t.title as topic_title,
       (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
       c.created_at
       FROM comments c
       JOIN topics t ON c.topic_id = t.id
       WHERE c.author_id = ? AND c.status = 'active'
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limitInt, offset]
    );
    
    // 获取总评论数
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM comments WHERE author_id = ? AND status = 'active'`,
      [userId]
    );
    
    const totalCount = countRows[0].total;
    const pageCount = Math.ceil(totalCount / limitInt);
    
    const comments = rows.map(comment => ({
      id: comment.id,
      content: comment.content,
      topic_id: comment.topic_id,
      topic_title: comment.topic_title,
      likes_count: comment.likes_count,
      created_at: comment.created_at
    }));
    
    logger.info('用户评论列表获取成功', { 
      userId,
      commentsCount: comments.length,
      totalCount,
      pageCount
    });
    
    res.json({
      comments,
      totalCount,
      pageCount
    });
  } catch (error) {
    logger.error('获取用户评论列表失败', error);
    next(error);
  }
};

/**
 * @desc    综合搜索
 * @route   GET /api/forum/search
 * @access  Public
 */
exports.search = async (req, res, next) => {
  try {
    const { query, type = 'all', page = 1, limit = 10 } = req.query;
    
    logger.info('开始处理综合搜索请求', { query, type, page, limit });
    
    if (!query) {
      logger.warn('搜索失败：缺少搜索关键词');
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }
    
    // 将页码和每页数量转换为整数
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;
    const searchTerm = `%${query}%`;
    
    let topics = [];
    let users = [];
    let totalTopics = 0;
    let totalUsers = 0;
    
    if (type === 'all' || type === 'topics') {
      // 搜索话题
      const [topicRows] = await pool.execute(
        `SELECT t.id, t.title, t.content, t.created_at,
         u.id as author_id, u.username as author_username
         FROM topics t
         JOIN users u ON t.author_id = u.id
         WHERE (t.title LIKE ? OR t.content LIKE ?) AND t.status = 'active'
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [searchTerm, searchTerm, limitInt, offset]
      );
      
      // 获取话题总数
      const [topicCountRows] = await pool.execute(
        `SELECT COUNT(*) as total 
         FROM topics 
         WHERE (title LIKE ? OR content LIKE ?) AND status = 'active'`,
        [searchTerm, searchTerm]
      );
      
      totalTopics = topicCountRows[0].total;
      
      topics = topicRows.map(topic => ({
        id: topic.id,
        title: topic.title,
        content_excerpt: topic.content.length > 100 ? 
          topic.content.substring(0, 100) + '...' : topic.content,
        author: {
          id: topic.author_id,
          username: topic.author_username
        },
        created_at: topic.created_at
      }));
    }
    
    if (type === 'all' || type === 'users') {
      // 搜索用户
      const [userRows] = await pool.execute(
        `SELECT u.id, u.username, u.avatar,
         (SELECT COUNT(*) FROM topics WHERE author_id = u.id AND status = 'active') as topics_count
         FROM users u
         WHERE u.username LIKE ?
         ORDER BY topics_count DESC
         LIMIT ? OFFSET ?`,
        [searchTerm, limitInt, offset]
      );
      
      // 获取用户总数
      const [userCountRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM users WHERE username LIKE ?`,
        [searchTerm]
      );
      
      totalUsers = userCountRows[0].total;
      
      users = userRows.map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        topics_count: user.topics_count
      }));
    }
    
    logger.info('搜索成功', { 
      query,
      topicsCount: topics.length,
      usersCount: users.length,
      totalTopics,
      totalUsers
    });
    
    res.json({
      topics,
      users,
      totalTopics,
      totalUsers
    });
  } catch (error) {
    logger.error('搜索失败', error);
    next(error);
  }
};

/**
 * @desc    获取社区统计数据
 * @route   GET /api/forum/stats
 * @access  Public
 */
exports.getStats = async (req, res, next) => {
  try {
    logger.info('开始处理获取社区统计数据请求');
    
    // 获取总话题数
    const [topicsCountRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM topics WHERE status = 'active'`
    );
    
    // 获取总评论数
    const [commentsCountRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM comments WHERE status = 'active'`
    );
    
    // 获取总用户数
    const [usersCountRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM users`
    );
    
    // 获取最活跃用户
    const [topUsersRows] = await pool.execute(
      `SELECT u.id, u.username, u.avatar,
       (SELECT COUNT(*) FROM topics WHERE author_id = u.id AND status = 'active') as topics_count,
       (SELECT COUNT(*) FROM comments WHERE author_id = u.id AND status = 'active') as comments_count
       FROM users u
       ORDER BY (topics_count + comments_count) DESC
       LIMIT 5`
    );
    
    // 获取热门话题
    const [popularTopicsRows] = await pool.execute(
      `SELECT id, title, views, 
       (SELECT COUNT(*) FROM topic_likes WHERE topic_id = topics.id) as likes_count
       FROM topics 
       WHERE status = 'active'
       ORDER BY views DESC, likes_count DESC
       LIMIT 5`
    );
    
    // 获取最新注册用户
    const [latestUsersRows] = await pool.execute(
      `SELECT id, username, avatar, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 5`
    );
    
    const topicsCount = topicsCountRows[0].total;
    const commentsCount = commentsCountRows[0].total;
    const usersCount = usersCountRows[0].total;
    
    const topUsers = topUsersRows.map(user => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      topics_count: user.topics_count,
      comments_count: user.comments_count
    }));
    
    const popularTopics = popularTopicsRows.map(topic => ({
      id: topic.id,
      title: topic.title,
      views: topic.views,
      likes_count: topic.likes_count
    }));
    
    const latestUsers = latestUsersRows.map(user => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      created_at: user.created_at
    }));
    
    logger.info('社区统计数据获取成功');
    
    res.json({
      topicsCount,
      commentsCount,
      usersCount,
      topUsers,
      popularTopics,
      latestUsers
    });
  } catch (error) {
    logger.error('获取社区统计数据失败', error);
    next(error);
  }
};

/**
 * @desc    删除评论
 * @route   DELETE /api/forum/comments/:id
 * @access  Private
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    
    logger.info('开始处理删除评论请求', { commentId, userId });
    
    // 检查评论是否存在
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      logger.warn('删除评论失败：评论不存在', { commentId });
      return res.status(404).json({ error: '评论不存在' });
    }
    
    // 检查用户是否有权限删除评论
    const hasPermission = await Comment.checkPermission(commentId, userId);
    
    if (!hasPermission) {
      logger.warn('删除评论失败：无权限', { commentId, userId });
      return res.status(403).json({ error: '无权删除此评论' });
    }
    
    await Comment.delete(commentId);
    
    logger.info('评论删除成功', { commentId });
    
    res.json({
      success: true
    });
  } catch (error) {
    logger.error('删除评论失败', error);
    next(error);
  }
};

/**
 * @desc    创建标签
 * @route   POST /api/forum/tags
 * @access  Private/Admin
 */
exports.createTag = async (req, res, next) => {
  try {
    logger.info('开始处理创建标签请求');
    
    const { name } = req.body;
    
    // 输入验证
    if (!name) {
      logger.warn('创建标签失败：缺少必要字段');
      return res.status(400).json({ error: '标签名称是必需的' });
    }
    
    // 检查标签是否已存在
    const existingTag = await Tag.findByName(name);
    if (existingTag) {
      logger.warn('创建标签失败：标签已存在', { name });
      return res.status(400).json({ error: '该标签已存在' });
    }
    
    // 创建标签
    const tag = await Tag.create({ name });
    
    logger.info('标签创建成功', { tagId: tag.id });
    
    res.status(201).json({
      success: true,
      tag
    });
  } catch (error) {
    logger.error('创建标签失败', error);
    next(error);
  }
};

/**
 * @desc    更新标签
 * @route   PUT /api/forum/tags/:id
 * @access  Private/Admin
 */
exports.updateTag = async (req, res, next) => {
  try {
    const tagId = req.params.id;
    logger.info('开始处理更新标签请求', { tagId });
    
    const { name } = req.body;
    
    // 输入验证
    if (!name) {
      logger.warn('更新标签失败：缺少必要字段');
      return res.status(400).json({ error: '标签名称是必需的' });
    }
    
    // 检查标签是否存在
    const tag = await Tag.findById(tagId);
    if (!tag) {
      logger.warn('更新标签失败：标签不存在', { tagId });
      return res.status(404).json({ error: '标签不存在' });
    }
    
    // 检查新名称是否已被其他标签使用
    if (name !== tag.name) {
      const existingTag = await Tag.findByName(name);
      if (existingTag && existingTag.id !== parseInt(tagId)) {
        logger.warn('更新标签失败：标签名称已存在', { name });
        return res.status(400).json({ error: '该标签名称已被使用' });
      }
    }
    
    // 由于Tag模型没有update方法，需要创建一个新标签并处理所有关联
    const pool = require('../config/database').pool;
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. 更新标签记录而不是删除后创建
      await connection.execute(
        `UPDATE tags SET name = ? WHERE id = ?`,
        [name, tagId]
      );
      
      // 获取更新后的标签
      const updatedTag = await Tag.findById(tagId);
      
      await connection.commit();
      
      logger.info('标签更新成功', { tagId });
      
      res.json({
        success: true,
        tag: updatedTag
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('更新标签失败', { tagId: req.params.id, error });
    next(error);
  }
};

/**
 * @desc    删除标签
 * @route   DELETE /api/forum/tags/:id
 * @access  Private/Admin
 */
exports.deleteTag = async (req, res, next) => {
  try {
    const tagId = req.params.id;
    logger.info('开始处理删除标签请求', { tagId });
    
    // 检查标签是否存在
    const tag = await Tag.findById(tagId);
    if (!tag) {
      logger.warn('删除标签失败：标签不存在', { tagId });
      return res.status(404).json({ error: '标签不存在' });
    }
    
    // 删除标签
    const success = await Tag.delete(tagId);
    
    if (!success) {
      logger.warn('删除标签失败：操作未成功', { tagId });
      return res.status(500).json({ error: '删除标签失败' });
    }
    
    logger.info('标签删除成功', { tagId });
    
    res.json({
      success: true
    });
  } catch (error) {
    logger.error('删除标签失败', { tagId: req.params.id, error });
    next(error);
  }
};

/**
 * @desc    创建分类
 * @route   POST /api/forum/categories
 * @access  Private/Admin
 */
exports.createCategory = async (req, res, next) => {
  try {
    logger.info('开始处理创建分类请求');
    
    const { name, description, displayOrder } = req.body;
    
    // 输入验证
    if (!name) {
      logger.warn('创建分类失败：缺少必要字段');
      return res.status(400).json({ error: '分类名称是必需的' });
    }
    
    // 检查分类是否已存在
    const existingCategory = await Category.findByName(name);
    if (existingCategory) {
      logger.warn('创建分类失败：分类已存在', { name });
      return res.status(400).json({ error: '该分类已存在' });
    }
    
    // 创建分类
    const category = await Category.create({ 
      name, 
      description, 
      displayOrder: displayOrder || 0 
    });
    
    logger.info('分类创建成功', { categoryId: category.id });
    
    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    logger.error('创建分类失败', error);
    next(error);
  }
};

/**
 * @desc    更新分类
 * @route   PUT /api/forum/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    logger.info('开始处理更新分类请求', { categoryId });
    
    const { name, description, displayOrder } = req.body;
    
    // 检查分类是否存在
    const category = await Category.findById(categoryId);
    if (!category) {
      logger.warn('更新分类失败：分类不存在', { categoryId });
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 检查新名称是否已被其他分类使用
    if (name && name !== category.name) {
      const existingCategory = await Category.findByName(name);
      if (existingCategory && existingCategory.id !== parseInt(categoryId)) {
        logger.warn('更新分类失败：分类名称已存在', { name });
        return res.status(400).json({ error: '该分类名称已被使用' });
      }
    }
    
    // 更新分类
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    
    const updatedCategory = await Category.update(categoryId, updateData);
    
    logger.info('分类更新成功', { categoryId });
    
    res.json({
      success: true,
      category: updatedCategory
    });
  } catch (error) {
    logger.error('更新分类失败', { categoryId: req.params.id, error });
    next(error);
  }
};

/**
 * @desc    删除分类
 * @route   DELETE /api/forum/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    logger.info('开始处理删除分类请求', { categoryId });
    
    // 检查分类是否存在
    const category = await Category.findById(categoryId);
    if (!category) {
      logger.warn('删除分类失败：分类不存在', { categoryId });
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 检查是否有话题使用此分类
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM topics WHERE category = ?',
      [category.name]
    );
    
    if (rows[0].count > 0) {
      logger.warn('删除分类失败：该分类下还有话题', { categoryId, topicsCount: rows[0].count });
      return res.status(400).json({ error: '无法删除该分类，因为该分类下还有话题' });
    }
    
    // 删除分类
    const success = await Category.delete(categoryId);
    
    if (!success) {
      logger.warn('删除分类失败：操作未成功', { categoryId });
      return res.status(500).json({ error: '删除分类失败' });
    }
    
    logger.info('分类删除成功', { categoryId });
    
    res.json({
      success: true
    });
  } catch (error) {
    logger.error('删除分类失败', { categoryId: req.params.id, error });
    next(error);
  }
}; 