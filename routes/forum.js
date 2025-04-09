/**
 * 论坛路由模块
 * 定义与论坛相关的API路由，包括话题和评论
 */
const express = require('express');
const router = express.Router();
const { 
  getTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
  likeTopic,
  unlikeTopic,
  getComments,
  createComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCategories,
  getCategoryById,
  getTags,
  getTagById,
  getUserTopics,
  getUserComments,
  search,
  getStats,
  createTag,
  updateTag,
  deleteTag,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/forumController');
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// 记录所有论坛相关请求
router.use((req, res, next) => {
  logger.info(`论坛API请求: ${req.method} ${req.originalUrl}`, { 
    path: req.path,
    method: req.method,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// 话题相关路由
/**
 * @route   GET /api/forum/topics
 * @desc    获取话题列表
 * @access  Public
 */
router.get('/topics', getTopics);

/**
 * @route   GET /api/forum/topics/:id
 * @desc    获取话题详情
 * @access  Public
 */
router.get('/topics/:id', getTopicById);

/**
 * @route   POST /api/forum/topics
 * @desc    创建话题
 * @access  Private
 */
router.post('/topics', protect, createTopic);

/**
 * @route   PUT /api/forum/topics/:id
 * @desc    更新话题
 * @access  Private
 */
router.put('/topics/:id', protect, updateTopic);

/**
 * @route   DELETE /api/forum/topics/:id
 * @desc    删除话题
 * @access  Private
 */
router.delete('/topics/:id', protect, deleteTopic);

/**
 * @route   POST /api/forum/topics/:id/like
 * @desc    话题点赞
 * @access  Private
 */
router.post('/topics/:id/like', protect, likeTopic);

/**
 * @route   DELETE /api/forum/topics/:id/like
 * @desc    取消话题点赞
 * @access  Private
 */
router.delete('/topics/:id/like', protect, unlikeTopic);

// 评论相关路由
/**
 * @route   GET /api/forum/topics/:id/comments
 * @desc    获取话题评论列表
 * @access  Public
 */
router.get('/topics/:id/comments', getComments);

/**
 * @route   POST /api/forum/topics/:id/comments
 * @desc    创建评论
 * @access  Private
 */
router.post('/topics/:id/comments', protect, createComment);

/**
 * @route   DELETE /api/forum/comments/:id
 * @desc    删除评论
 * @access  Private
 */
router.delete('/comments/:id', protect, deleteComment);

/**
 * @route   POST /api/forum/comments/:id/like
 * @desc    评论点赞
 * @access  Private
 */
router.post('/comments/:id/like', protect, likeComment);

/**
 * @route   DELETE /api/forum/comments/:id/like
 * @desc    取消评论点赞
 * @access  Private
 */
router.delete('/comments/:id/like', protect, unlikeComment);

// 分类相关路由
/**
 * @route   GET /api/forum/categories
 * @desc    获取所有分类
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   GET /api/forum/categories/:id
 * @desc    获取分类详情
 * @access  Public
 */
router.get('/categories/:id', getCategoryById);

/**
 * @route   POST /api/forum/categories
 * @desc    创建分类
 * @access  Private/Admin
 */
router.post('/categories', protect, createCategory);

/**
 * @route   PUT /api/forum/categories/:id
 * @desc    更新分类
 * @access  Private/Admin
 */
router.put('/categories/:id', protect, updateCategory);

/**
 * @route   DELETE /api/forum/categories/:id
 * @desc    删除分类
 * @access  Private/Admin
 */
router.delete('/categories/:id', protect, deleteCategory);

// 标签相关路由
/**
 * @route   GET /api/forum/tags
 * @desc    获取所有标签
 * @access  Public
 */
router.get('/tags', getTags);

/**
 * @route   GET /api/forum/tags/:id
 * @desc    获取标签详情
 * @access  Public
 */
router.get('/tags/:id', getTagById);

/**
 * @route   POST /api/forum/tags
 * @desc    创建标签
 * @access  Private/Admin
 */
router.post('/tags', protect, createTag);

/**
 * @route   PUT /api/forum/tags/:id
 * @desc    更新标签
 * @access  Private/Admin
 */
router.put('/tags/:id', protect, updateTag);

/**
 * @route   DELETE /api/forum/tags/:id
 * @desc    删除标签
 * @access  Private/Admin
 */
router.delete('/tags/:id', protect, deleteTag);

// 用户相关路由（社区部分）
/**
 * @route   GET /api/forum/users/:id/topics
 * @desc    获取用户发布的话题
 * @access  Public
 */
router.get('/users/:id/topics', getUserTopics);

/**
 * @route   GET /api/forum/users/:id/comments
 * @desc    获取用户的评论
 * @access  Public
 */
router.get('/users/:id/comments', getUserComments);

// 搜索路由
/**
 * @route   GET /api/forum/search
 * @desc    综合搜索
 * @access  Public
 */
router.get('/search', search);

// 统计路由
/**
 * @route   GET /api/forum/stats
 * @desc    获取社区统计数据
 * @access  Public
 */
router.get('/stats', getStats);

module.exports = router; 