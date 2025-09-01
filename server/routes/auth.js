const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const router = express.Router();

// 验证中间件
const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少为6位'),
  body('nickname')
    .isLength({ min: 2, max: 20 })
    .withMessage('昵称长度为2-20个字符')
];

const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

// 用户注册
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '该邮箱已被注册'
      });
    }

    // 检查昵称是否已存在
    const existingNickname = await User.findOne({ nickname });
    if (existingNickname) {
      return res.status(400).json({
        success: false,
        error: '该昵称已被使用'
      });
    }

    // 创建用户
    const user = new User({
      email,
      password,
      nickname
    });

    await user.save();

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: user.getPublicInfo()
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: '注册失败，请稍后重试'
    });
  }
});

// 用户登录（支持用户名、邮箱；兼容 account/username/email 字段）
router.post('/login', async (req, res) => {
  try {
    console.log('登录请求:', req.body);
    const account = String(req.body?.account || req.body?.username || req.body?.email || '').trim();
    const password = req.body?.password;

    if (!account || !password) {
      return res.status(400).json({ success: false, message: '请输入账号和密码' });
    }

    console.log('查找用户:', account);

    // 查找用户（支持用户名或邮箱登录）
    let user;
    
    // 先尝试用户名查找
    user = await User.findOne({ username: account }).select('+password');
    console.log('用户名查找结果:', user ? '找到用户' : '未找到用户');
    
    // 如果没找到，且account包含@符号，则尝试邮箱查找
    if (!user && account.includes('@')) {
      user = await User.findOne({ email: account }).select('+password');
      console.log('邮箱查找结果:', user ? '找到用户' : '未找到用户');
    }

  if (!user) {
      console.log('用户不存在:', account);
      return res.status(400).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    // 检查账号是否激活
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    // 更新最后登录时间
    await user.updateLastLogin();

    // 生成JWT令牌
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

  res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        lastLogin: user.lastLogin,
        profile: user.profile,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 验证令牌有效性
router.get('/verify', auth, (req, res) => {
  res.json({
    success: true,
    message: '令牌有效',
    data: {
      user: req.user.getPublicInfo()
    }
  });
});

// 修改密码
router.post('/change-password', auth, [
  body('oldPassword').notEmpty().withMessage('当前密码不能为空'),
  body('newPassword').notEmpty().withMessage('新密码不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '输入验证失败', errors: errors.array() });
    }

    const { oldPassword, newPassword } = req.body;
    
    // 从数据库中获取完整的用户信息，包括密码
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '当前密码不正确' });
    }

    // 更新密码
    user.password = newPassword;
    // 如果有强制修改密码的标记，可以一并更新
    if (user.mustChangePassword) {
      user.mustChangePassword = false;
    }
    await user.save();

    res.json({ success: true, message: '密码修改成功' });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
  }
});


module.exports = router;
