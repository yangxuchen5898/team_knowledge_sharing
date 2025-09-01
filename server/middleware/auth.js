const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 基础认证中间件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供令牌'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查用户是否仍然存在且处于活跃状态
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: '令牌无效或用户已被禁用'
      });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: '令牌无效'
    });
  }
};

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
};

// 用户权限中间件（普通用户或管理员）
const requireUser = (req, res, next) => {
  if (!['user', 'admin'].includes(req.userRole)) {
    return res.status(403).json({
      success: false,
      message: '需要用户权限'
    });
  }
  next();
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.userId = user._id;
        req.user = user;
      }
    }
    // 不管是否有token都继续执行
    next();
  } catch (error) {
    // 如果token无效，也继续执行（不影响访问）
    next();
  }
};

module.exports = {
  auth,
  requireAdmin,
  requireUser,
  optionalAuth
};
