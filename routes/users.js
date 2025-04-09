/**
 * 用户路由模块
 * 定义与用户相关的API路由，包括注册、登录、个人资料等
 */
const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  uploadUserAvatar,
  deleteUserAvatar,
  connectWallet,
  associateWallet
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// 记录所有用户相关请求
router.use((req, res, next) => {
  logger.info(`用户API请求: ${req.method} ${req.originalUrl}`, { 
    path: req.path,
    method: req.method,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

/**
 * @route   POST /api/users/register
 * @desc    注册新用户
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/users/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   POST /api/users/wallet
 * @desc    通过钱包地址连接/注册
 * @access  Public
 */
router.post('/wallet', connectWallet);

/**
 * @route   POST /api/users/profile/wallet
 * @desc    为现有用户关联钱包地址
 * @access  Private
 */
router.post('/profile/wallet', protect, associateWallet);

/**
 * @route   GET /api/users/profile
 * @desc    获取用户个人资料
 * @access  Private
 */
router.get('/profile', protect, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    更新用户个人资料
 * @access  Private
 */
router.put('/profile', protect, updateUserProfile);

/**
 * @route   PUT /api/users/password
 * @desc    更新用户密码
 * @access  Private
 */
router.put('/password', protect, updateUserPassword);

/**
 * @route   DELETE /api/users/profile
 * @desc    删除用户账户
 * @access  Private
 */
router.delete('/profile', protect, deleteUserAccount);

/**
 * @route   POST /api/users/avatar
 * @desc    上传用户头像
 * @access  Private
 */
router.post('/avatar', protect, uploadUserAvatar);

/**
 * @route   DELETE /api/users/profile/avatar
 * @desc    删除用户头像
 * @access  Private
 */
router.delete('/profile/avatar', protect, deleteUserAvatar);

module.exports = router;