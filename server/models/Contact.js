const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '姓名是必需的'],
    trim: true,
    maxlength: [50, '姓名不能超过50个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  subject: {
    type: String,
    required: [true, '主题是必需的'],
    trim: true,
    maxlength: [200, '主题不能超过200个字符']
  },
  message: {
    type: String,
    required: [true, '留言内容是必需的'],
    trim: true,
    maxlength: [2000, '留言内容不能超过2000个字符']
  },
  status: {
    type: String,
    enum: ['pending', 'read', 'replied', 'closed'],
    default: 'pending'
  },
  reply: {
    content: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: Date
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  isSpam: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, '标签不能超过30个字符']
  }],
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// 索引
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ priority: 1, createdAt: -1 });
contactSchema.index({ isSpam: 1 });
contactSchema.index({ createdAt: -1 });

// 标记为已读
contactSchema.methods.markAsRead = function() {
  this.status = 'read';
  return this.save();
};

// 添加回复
contactSchema.methods.addReply = function(content, repliedBy) {
  this.reply = {
    content,
    repliedBy,
    repliedAt: new Date()
  };
  this.status = 'replied';
  return this.save();
};

// 添加备注
contactSchema.methods.addNote = function(content, createdBy) {
  this.notes.push({
    content,
    createdBy,
    createdAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);
