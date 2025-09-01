const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Document = require('../models/Document');
const Module = require('../models/Module');
const Contact = require('../models/Contact');
const { auth, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { importUsersFromCSV } = require('../utils/importUsers');

const router = express.Router();

// 所有路由都需要管理员权限
router.use(auth, requireAdmin);

// 系统概览
router.get('/overview', async (req, res) => {
  try {
    const [usersCount, documentsCount, modulesCount, contactsCount] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Document.countDocuments(),
      Module.countDocuments(),
      Contact.countDocuments({ status: 'pending' })
    ]);

    const recentUsers = await User.find({ role: 'user' })
      .select('username email createdAt lastLogin isActive')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          users: usersCount,
          documents: documentsCount,
          modules: modulesCount,
          pendingContacts: contactsCount
        },
        recentUsers
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({
      success: false,
      message: '获取系统概览失败'
    });
  }
});

// 获取所有用户信息（包含原始密码，仅供管理员查看）
router.get('/users/credentials', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', showPasswords = false } = req.query;
    
    let query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('username email isActive mustChangePassword lastLogin createdAt createdBy')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // 如果请求显示密码，需要额外的安全验证
    let userCredentials = users;
    
    if (showPasswords === 'true') {
      // ⚠️ 安全警告：这是高权限操作，仅在必要时使用
      console.warn(`管理员 ${req.user.username} 查看了用户密码信息`);
      
      // 这里我们返回提示信息，实际密码需要通过其他安全方式获取
      userCredentials = users.map(user => ({
        ...user.toObject(),
        passwordNote: '原始密码已加密存储，如需重置请使用重置功能'
      }));
    }

    res.json({
      success: true,
      data: {
        users: userCredentials,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('获取用户凭据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 重置用户密码为默认值（可以设置为原始密码）
router.post('/users/:userId/reset-password', [
  body('newPassword').optional().isLength({ min: 3 }).withMessage('密码至少3位')
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: '用户不存在或无权操作'
      });
    }

    // 如果没有提供新密码，生成一个随机密码
    const password = newPassword || Math.random().toString(36).slice(-8);
    
    // 加密密码
    const saltRounds = 12;
    user.password = await bcrypt.hash(password, saltRounds);
    user.mustChangePassword = true;  // 强制用户下次登录修改密码
    user.lastPasswordChange = new Date();
    
    await user.save();

    // 记录操作日志
    console.log(`管理员 ${req.user.username} 重置了用户 ${user.username} 的密码`);

    res.json({
      success: true,
      message: '密码重置成功',
      data: {
        username: user.username,
        temporaryPassword: password,  // 返回临时密码，供管理员告知用户
        mustChangePassword: true
      }
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
});

// 批量生成用户账号
router.post('/generate-users', [
  body('count').isInt({ min: 1, max: 100 }),
  body('prefix').optional().isLength({ min: 1, max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { count, prefix = 'user' } = req.body;
    const generatedUsers = [];

    for (let i = 1; i <= count; i++) {
      // 生成随机密码
      const password = crypto.randomBytes(4).toString('hex'); // 8位随机密码
      
      // 生成用户名
      const timestamp = Date.now().toString().slice(-4);
      const username = `${prefix}_${timestamp}_${i.toString().padStart(3, '0')}`;
      const email = `${username}@system.local`;

      try {
        const user = new User({
          username,
          email,
          password,
          role: 'user',
          createdBy: req.userId,
          isActive: true,
          isFirstLogin: true
        });

        await user.save();

        generatedUsers.push({
          username,
          email,
          password, // 明文密码，仅在生成时返回
          userId: user._id
        });
      } catch (userError) {
        console.error(`Error creating user ${username}:`, userError);
        // 如果单个用户创建失败，继续创建其他用户
      }
    }

    res.json({
      success: true,
      message: `成功生成 ${generatedUsers.length} 个用户账号`,
      users: generatedUsers
    });

  } catch (error) {
    console.error('Generate users error:', error);
    res.status(500).json({
      success: false,
      message: '生成用户账号失败'
    });
  }
});

// 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email isActive isFirstLogin lastLogin createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 重置用户密码
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: '用户不存在或无权限操作'
      });
    }

    // 生成新密码
    const newPassword = crypto.randomBytes(4).toString('hex');
    
    user.password = newPassword;
    user.isFirstLogin = true;
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功',
      newPassword // 仅在重置时返回明文密码
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: '密码重置失败'
    });
  }
});

// 启用/禁用用户
router.put('/users/:userId/status', [
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: '用户不存在或无权限操作'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `用户已${isActive ? '启用' : '禁用'}`
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: '更新用户状态失败'
    });
  }
});

// 删除用户
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: '用户不存在或无权限操作'
      });
    }

    // 删除用户的所有文档
    await Document.deleteMany({ author: userId });
    
    // 删除用户
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: '用户已删除'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

// 导出用户账号列表
router.get('/users/export', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('username email isActive isFirstLogin createdAt')
      .sort({ createdAt: -1 });

    // 转换为CSV格式
    const csvHeader = 'Username,Email,Status,First Login,Created At\n';
    const csvContent = users.map(user => 
      `${user.username},${user.email},${user.isActive ? 'Active' : 'Inactive'},${user.isFirstLogin ? 'Yes' : 'No'},${user.createdAt.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csvHeader + csvContent);

  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: '导出用户列表失败'
    });
  }
});

module.exports = router;
