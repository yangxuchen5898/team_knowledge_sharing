const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// 获取用户个人资料
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicInfo()
      }
    });
  } catch (error) {
    console.error('获取个人资料错误:', error);
    res.status(500).json({
      success: false,
      error: '获取个人资料失败'
    });
  }
});

// 更新用户个人资料
router.put('/profile', auth, [
  body('nickname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('昵称长度在2-50个字符之间')
    .matches(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/)
    .withMessage('昵称只能包含中英文、数字、下划线和横线'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('个人简介不能超过200个字符'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('头像必须是有效的URL地址')
], async (req, res) => {
  try {
    const { nickname, bio, avatar } = req.body;
    const userId = req.user._id;

    // 如果要更新昵称，检查是否与其他用户重复
    if (nickname && nickname !== req.user.nickname) {
      const existingUser = await User.findOne({ 
        nickname, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: '该昵称已被使用'
        });
      }
    }

    // 更新用户信息
    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: '个人资料更新成功',
      data: {
        user: updatedUser.getPublicInfo()
      }
    });
  } catch (error) {
    console.error('更新个人资料错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    res.status(500).json({
      success: false,
      error: '更新个人资料失败'
    });
  }
});

// 获取指定用户的公开信息
router.get('/:userId', validateObjectId('userId'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicInfo()
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

// 获取用户列表（分页）
router.get('/', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { isActive: true };
    
    // 搜索条件
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { nickname: searchRegex },
        { email: searchRegex }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('nickname email avatar bio role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

module.exports = router;
