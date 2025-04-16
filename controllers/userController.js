/**
 * 用户控制器模块
 * 处理用户相关的业务逻辑，包括注册、登录、更新个人资料和修改密码
 */
const User = require('../models/User');
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

/**
 * 生成JWT令牌
 * @param {string} id - 用户ID
 * @returns {string} 生成的JWT令牌
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

/**
 * @desc    注册新用户
 * @route   POST /api/users/register
 * @access  Public
 */
exports.registerUser = async (req, res, next) => {
  try {
    logger.info('开始处理用户注册请求', { requestBody: req.body });
    const { username, email, password, confirmPassword } = req.body;

    // 输入验证
    if (!username || !email || !password || !confirmPassword) {
      logger.warn('注册失败：缺少必要字段', { username, email });
      return res.status(400).json({ message: '所有字段都是必需的' });
    }

    // 检查密码和确认密码是否匹配
    if (password !== confirmPassword) {
      logger.warn('注册失败：密码不匹配', { username, email });
      return res.status(400).json({ message: '密码和确认密码不匹配' });
    }

    // 检查用户是否已存在 - 使用MySQL方法
    const existingEmailUser = await User.findByEmail(email);
    const existingUsernameUser = await User.findByUsername(username);
    
    if (existingEmailUser || existingUsernameUser) {
      logger.warn('注册失败：用户已存在', { username, email });
      return res.status(400).json({ message: '用户已存在' });
    }

    // 创建新用户 - 使用MySQL方法
    const userData = {
      username,
      email,
      password,
      phone: '',
      qq: '',
      region: '',
      techStack: '',
      bio: '',
      github: '',
      twitter: '',
      website: ''
    };
    
    const user = await User.create(userData);

    if (user) {
      logger.info('用户注册成功', { 
        userId: user.id, 
        username: user.username,
        email: user.email
      });
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id)
      });
    } else {
      logger.warn('注册失败：无效的用户数据');
      res.status(400).json({ message: '无效的用户数据' });
    }
  } catch (error) {
    logger.error('注册过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    用户登录
 * @route   POST /api/users/login
 * @access  Public
 */
exports.loginUser = async (req, res, next) => {
  try {
    logger.info('开始处理用户登录请求', { email: req.body.email });
    const { email, password } = req.body;

    // 输入验证
    if (!email || !password) {
      logger.warn('登录失败：缺少必要字段', { email });
      return res.status(400).json({ message: '请提供邮箱和密码' });
    }

    // 查找用户 - 使用MySQL方法
    const user = await User.findByEmail(email);

    if (!user) {
      logger.warn('登录失败：用户不存在', { email });
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }

    // 验证密码 - 使用MySQL方法
    const isMatch = await User.verifyPassword(password, user.password);
    
    if (isMatch) {
      logger.info('用户登录成功', { 
        userId: user.id, 
        username: user.username,
        email: user.email,
        hasWallet: !!user.wallet_address
      });
      
      // 返回用户信息，包括钱包地址（如果存在）
      const response = {
        id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id)
      };
      
      // 如果用户已关联钱包地址，则一并返回
      if (user.wallet_address) {
        response.walletAddress = user.wallet_address;
        logger.info('用户已关联钱包地址，已包含在响应中', { 
          userId: user.id, 
          walletAddress: user.wallet_address 
        });
      }
      
      res.json(response);
    } else {
      logger.warn('登录失败：密码不正确', { email });
      res.status(401).json({ message: '邮箱或密码不正确' });
    }
  } catch (error) {
    logger.error('登录过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    更新用户个人资料
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateUserProfile = async (req, res, next) => {
  try {
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    logger.info('开始处理用户资料更新请求', { 
      userId, 
      username: req.user.username, 
      requestBody: req.body 
    });
    
    // 获取要更新的字段
    const {
      username,
      email,
      phone,
      qq,
      region,
      techStack,
      bio,
      github,
      twitter,
      website
    } = req.body;
    
    // 查找用户 - 使用MySQL方法
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn('更新个人资料失败：用户不存在', { userId });
      return res.status(404).json({ message: '用户不存在' });
    }

    // 更新用户信息 - 使用MySQL方法
    const updateData = {
      username: username !== undefined ? username : user.username,
      email: email !== undefined ? email : user.email,
      phone: phone !== undefined ? phone : user.phone,
      qq: qq !== undefined ? qq : user.qq,
      region: region !== undefined ? region : user.region,
      techStack: techStack !== undefined ? techStack : user.tech_stack,
      bio: bio !== undefined ? bio : user.bio,
      github: github !== undefined ? github : user.github,
      twitter: twitter !== undefined ? twitter : user.twitter,
      website: website !== undefined ? website : user.website
    };
    
    try {
      const updatedUser = await User.update(userId, updateData);
      
      logger.info('用户资料更新成功', { 
        userId: updatedUser.id, 
        username: updatedUser.username,
        email: updatedUser.email,
        updatedFields: Object.keys(req.body)
      });
      
      // 如果用户名或邮箱更新成功，需要生成新的令牌
      let newToken = null;
      if ((username && username !== user.username) || (email && email !== user.email)) {
        newToken = generateToken(userId);
        logger.info('用户名或邮箱更新，生成新令牌');
      }
      
      // 返回更新后的用户信息
      const response = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        qq: updatedUser.qq,
        region: updatedUser.region,
        techStack: updatedUser.tech_stack,
        bio: updatedUser.bio,
        github: updatedUser.github,
        twitter: updatedUser.twitter,
        website: updatedUser.website,
        created_at: updatedUser.created_at
      };
      
      // 如果生成了新令牌，添加到响应中
      if (newToken) {
        response.token = newToken;
      }
      
      res.json(response);
    } catch (error) {
      if (error.message === '该用户名已被使用' || error.message === '该邮箱已被使用') {
        logger.warn('更新个人资料失败：' + error.message, { 
          userId,
          username: req.body.username,
          email: req.body.email
        });
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    logger.error('更新个人资料过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    获取用户个人资料
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    logger.info('开始处理获取用户资料请求', { userId, username: req.user.username });
    
    // 查找用户 - 使用MySQL方法
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn('获取个人资料失败：用户不存在', { userId });
      return res.status(404).json({ message: '用户不存在' });
    }
    
    logger.info('用户资料获取成功', { userId: user.id, username: user.username });
    
    // 返回用户信息
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      qq: user.qq,
      region: user.region,
      techStack: user.tech_stack,
      bio: user.bio,
      github: user.github,
      twitter: user.twitter,
      website: user.website,
      avatar: user.avatar || '', // 确保返回avatar字段，如果为null则返回空字符串
      walletAddress: user.wallet_address || '',
      created_at: user.created_at
    });
  } catch (error) {
    logger.error('获取个人资料过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    更新用户密码
 * @route   PUT /api/users/password
 * @access  Private
 */
exports.updateUserPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    
    // 输入验证
    if (!newPassword || !confirmPassword) {
      logger.warn('更新密码失败：缺少必要字段');
      return res.status(400).json({ message: '所有字段都是必需的' });
    }
    
    // 检查新密码和确认密码是否匹配
    if (newPassword !== confirmPassword) {
      logger.warn('更新密码失败：新密码不匹配');
      return res.status(400).json({ message: '新密码和确认密码不匹配' });
    }
    
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    logger.info('开始处理用户密码更新请求', { userId });
    
    // 查找用户 - 使用MySQL方法
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    const user = rows[0];
    
    if (!user) {
      logger.warn('更新密码失败：用户不存在', { userId });
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 更新密码 - 使用MySQL方法
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    logger.info('用户密码更新成功', { userId });
    res.json({ message: '密码更新成功' });
  } catch (error) {
    logger.error('更新密码过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    删除用户账户
 * @route   DELETE /api/users/profile
 * @access  Private
 */
exports.deleteUserAccount = async (req, res, next) => {
  try {
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    logger.info('开始处理删除用户账户请求', { userId });
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. 将用户的评论标记为已删除
      logger.info('将用户的评论标记为已删除', { userId });
      await connection.execute(
        'UPDATE comments SET status = "deleted", content = "[已删除]" WHERE author_id = ?',
        [userId]
      );
      
      // 2. 更新相关话题的评论计数
      logger.info('更新相关话题的评论计数', { userId });
      await connection.execute(`
        UPDATE topics t 
        JOIN (
            SELECT topic_id, COUNT(*) as deleted_count 
            FROM comments 
            WHERE author_id = ? AND status = 'deleted' 
            GROUP BY topic_id
        ) c_deleted ON t.id = c_deleted.topic_id
        SET t.comments_count = GREATEST(0, t.comments_count - c_deleted.deleted_count)
      `, [userId]);

      // 3. 删除用户在所有话题上的点赞记录 (无论话题作者是谁)
      logger.info('删除用户在所有话题上的点赞', { userId });
      await connection.execute(
        'DELETE FROM topic_likes WHERE user_id = ?',
        [userId]
      );
      
      // 4. 删除用户在所有评论上的点赞记录 (无论评论作者是谁)
      logger.info('删除用户在所有评论上的点赞', { userId });
      await connection.execute(
        'DELETE FROM comment_likes WHERE user_id = ?',
        [userId]
      );

      // 5. 删除其他用户对该用户话题的点赞
      logger.info('删除其他用户对该用户话题的点赞', { userId });
      await connection.execute(
        'DELETE FROM topic_likes WHERE topic_id IN (SELECT id FROM topics WHERE author_id = ?)',
        [userId]
      );

      // 6. 删除其他用户对该用户评论的点赞
      logger.info('删除其他用户对该用户评论的点赞', { userId });
      await connection.execute(
        'DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE author_id = ?)',
        [userId]
      );
      
      // 7. 将用户的话题标记为已删除
      logger.info('将用户的话题标记为已删除', { userId });
      await connection.execute(
        'UPDATE topics SET status = "deleted" WHERE author_id = ?',
        [userId]
      );
      
      // 8. 最后删除用户
      logger.info('删除用户记录', { userId });
      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );
      
      await connection.commit();
      
      if (result.affectedRows > 0) {
        logger.info('用户账户已删除', { userId });
        res.json({ message: '用户账户已成功删除' });
      } else {
        logger.warn('删除账户失败：用户不存在', { userId });
        res.status(404).json({ message: '用户不存在' });
      }
    } catch (error) {
      await connection.rollback();
      // 检查是否是外键约束错误
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
        logger.error('删除用户失败：外键约束冲突，可能仍有未处理的关联数据', { userId, error });
        return res.status(400).json({ message: '删除用户失败，可能存在关联数据，请联系管理员' });
      }
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('删除账户过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    上传用户头像
 * @route   POST /api/users/avatar
 * @access  Private
 */
exports.uploadUserAvatar = async (req, res, next) => {
  try {
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    logger.info('开始处理用户头像上传请求', { userId, username: req.user.username });
    
    // 使用上传中间件处理文件上传
    let uploadedFile;
    try {
      uploadedFile = await uploadAvatar(req, res);
    } catch (uploadError) {
      logger.error('头像上传过程中发生错误', uploadError);
      return res.status(400).json({ message: uploadError.message || '文件上传失败' });
    }
    
    // 检查文件是否成功上传
    if (!uploadedFile) {
      logger.warn('头像上传失败：没有文件被上传', { userId });
      return res.status(400).json({ message: '请选择要上传的图片' });
    }
    
    // 构建头像URL
    const avatarUrl = `/uploads/avatars/${uploadedFile.filename}`;
    logger.info('头像文件已保存', { userId, avatarUrl });
    
    // 更新用户头像信息
    const updatedUser = await User.updateAvatar(userId, avatarUrl);
    
    if (!updatedUser) {
      logger.warn('头像上传成功但更新用户信息失败', { userId });
      return res.status(500).json({ message: '头像上传成功但更新用户信息失败' });
    }
    
    logger.info('用户头像更新成功', { userId, avatarUrl });
    
    // 返回更新后的用户信息
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      message: '头像上传成功'
    });
  } catch (error) {
    logger.error('上传头像过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    删除用户头像
 * @route   DELETE /api/users/avatar
 * @access  Private
 */
exports.deleteUserAvatar = async (req, res, next) => {
  try {
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    logger.info('开始处理删除用户头像请求', { userId, username: req.user.username });
    
    // 查找用户
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn('删除头像失败：用户不存在', { userId });
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 如果用户没有头像，返回成功
    if (!user.avatar) {
      logger.info('用户没有头像可删除', { userId });
      return res.json({ message: '操作成功' });
    }
    
    // 更新用户头像为空
    await User.updateAvatar(userId, '');
    
    // 尝试删除头像文件（如果存在）
    try {
      const fs = require('fs');
      const path = require('path');
      const avatarPath = path.join(__dirname, '..', 'public', user.avatar);
      
      // 判断文件是否存在
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
        logger.info('头像文件已删除', { userId, avatarPath });
      }
    } catch (fsError) {
      // 文件删除失败不影响API响应
      logger.warn('头像文件删除失败，但用户头像信息已更新', { userId, error: fsError.message });
    }
    
    logger.info('用户头像已移除', { userId });
    res.json({ message: '头像已删除' });
  } catch (error) {
    logger.error('删除头像过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    通过钱包地址注册/登录用户
 * @route   POST /api/users/wallet
 * @access  Public
 */
exports.connectWallet = async (req, res, next) => {
  try {
    const { walletAddress, signature } = req.body;
    
    // 验证请求数据
    if (!walletAddress) {
      logger.warn('钱包连接失败：缺少钱包地址');
      return res.status(400).json({ message: '钱包地址是必需的' });
    }
    
    // 移除钱包地址格式验证，接受任何非空字符串
    // 原验证代码：if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    //  logger.warn('钱包连接失败：无效的Solana钱包地址', { walletAddress });
    //  return res.status(400).json({ message: '无效的Solana钱包地址格式' });
    // }
    
    // TODO: 在实际生产环境中，应验证签名以确保请求者拥有该钱包
    
    logger.info('尝试查找或创建钱包用户', { walletAddress });
    
    // 查找是否存在关联该钱包地址的用户
    let user = await User.findByWalletAddress(walletAddress);
    
    // 如果用户存在，直接登录
    if (user) {
      logger.info('钱包地址已关联到现有用户，生成令牌', { 
        userId: user.id, 
        username: user.username 
      });
      
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        token: generateToken(user.id),
        isNewUser: false
      });
    }
    
    // 如果用户不存在，创建一个新用户
    const timestamp = Date.now();
    // 从钱包地址中提取部分字符作为用户名
    const walletPrefix = walletAddress.substring(0, 8);
    const username = `user_${walletPrefix}_${timestamp}`;
    const email = `${walletPrefix}_${timestamp}@wallet.user`;
    // 生成随机密码
    const password = await bcrypt.hash(walletAddress + timestamp, 10);
    
    // 确保保存原始钱包地址
    const userData = {
      username,
      email,
      password, // 实际加密发生在User.create内部
      walletAddress, // 保存完整的钱包地址
      phone: '',
      qq: '',
      region: '',
      techStack: '',
      bio: '',
      github: '',
      twitter: '',
      website: ''
    };
    
    user = await User.create(userData);
    
    logger.info('钱包用户创建成功', { 
      userId: user.id, 
      username: user.username,
      walletAddress
    });
    
    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.wallet_address,
      token: generateToken(user.id),
      isNewUser: true
    });
  } catch (error) {
    logger.error('钱包连接过程中发生错误', error);
    next(error);
  }
};

/**
 * @desc    为现有用户关联钱包地址
 * @route   POST /api/users/profile/wallet
 * @access  Private
 */
exports.associateWallet = async (req, res, next) => {
  try {
    // 获取用户ID（从身份验证中间件中）
    const userId = req.user.id;
    const { walletAddress, signature } = req.body;
    
    logger.info('开始处理钱包地址关联请求', { 
      userId, 
      username: req.user.username,
      walletAddress
    });
    
    // 验证请求数据
    if (!walletAddress) {
      logger.warn('钱包关联失败：缺少钱包地址', { userId });
      return res.status(400).json({ message: '钱包地址是必需的' });
    }
    
    // 移除钱包地址格式验证，接受任何非空字符串
    // 原验证代码：if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    //   logger.warn('钱包关联失败：无效的Solana钱包地址', { userId, walletAddress });
    //   return res.status(400).json({ message: '无效的Solana钱包地址格式' });
    // }
    
    // TODO: 在实际生产环境中，应验证签名以确保请求者拥有该钱包
    
    // 检查用户是否已有钱包地址（用户界面层面的限制，而非数据模型层面）
    const user = await User.findById(userId);
    if (user && user.wallet_address) {
      logger.warn('钱包关联失败：用户已有钱包地址', { userId, existingWallet: user.wallet_address });
      return res.status(400).json({ message: '您已关联钱包地址，不支持修改' });
    }
    
    try {
      // 关联钱包地址到用户
      const updatedUser = await User.connectWalletAddress(userId, walletAddress);
      
      logger.info('钱包地址关联成功', { 
        userId, 
        username: updatedUser.username,
        walletAddress
      });
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        walletAddress: updatedUser.wallet_address,
        message: '钱包地址关联成功'
      });
    } catch (error) {
      if (error.message === '该钱包地址已被其他用户使用') {
        logger.warn(`钱包关联失败：${error.message}`, { userId, walletAddress });
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    logger.error('关联钱包地址过程中发生错误', error);
    next(error);
  }
};