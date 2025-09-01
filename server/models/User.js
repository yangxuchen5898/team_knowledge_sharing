const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true  // 添加索引提高查询性能
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: true,
    minlength: 3,  // 降低最小长度，适应CSV中的简单密码
    select: false // 默认不返回密码字段
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // 账号状态管理
  isActive: {
    type: Boolean,
    default: true
  },
  mustChangePassword: {
    type: Boolean,
    default: true  // 强制首次登录修改密码
  },
  isFirstLogin: {
    type: Boolean,
    default: true  // 首次登录标记
  },
  createdBy: {
    type: String,  // 改为字符串类型，记录创建者
    default: 'system'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 更新最后登录时间
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  if (this.isFirstLogin) {
    this.isFirstLogin = false;
  }
  return this.save();
};

// 获取公开信息
userSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    email: this.email,
    nickname: this.nickname,
    avatar: this.avatar,
    bio: this.bio,
    role: this.role,
    createdAt: this.createdAt
  };
};

// 索引
userSchema.index({ email: 1 });
userSchema.index({ nickname: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
