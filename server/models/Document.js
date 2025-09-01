const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '文档标题是必需的'],
    trim: true,
    maxlength: [200, '文档标题不能超过200个字符']
  },
  content: {
    type: String,
    required: [true, '文档内容是必需的']
  },
  contentType: {
    type: String,
    enum: ['markdown', 'html'],
    default: 'markdown'
  },
  summary: {
    type: String,
    maxlength: [300, '文档摘要不能超过300个字符'],
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, '标签不能超过30个字符']
  }],
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastEditedAt: {
    type: Date,
    default: Date.now
  },
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

// 全文搜索索引
documentSchema.index({ 
  title: 'text', 
  content: 'text', 
  summary: 'text',
  tags: 'text'
});

// 其他索引
documentSchema.index({ module: 1, createdAt: -1 });
documentSchema.index({ author: 1, createdAt: -1 });
documentSchema.index({ isPublished: 1, createdAt: -1 });
documentSchema.index({ isPinned: -1, createdAt: -1 });
documentSchema.index({ tags: 1 });

// 增加浏览量
documentSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// 切换点赞状态
documentSchema.methods.toggleLike = function(userId) {
  const userIndex = this.likedBy.indexOf(userId);
  if (userIndex > -1) {
    this.likedBy.splice(userIndex, 1);
    this.likeCount = Math.max(0, this.likeCount - 1);
  } else {
    this.likedBy.push(userId);
    this.likeCount += 1;
  }
  return this.save();
};

// 获取摘要（如果没有摘要则从内容中提取）
documentSchema.methods.getSummary = function() {
  if (this.summary) return this.summary;
  
  // 从 markdown 内容中提取纯文本作为摘要
  let text = this.content.replace(/[#*`\[\]()]/g, '').trim();
  return text.length > 150 ? text.substring(0, 150) + '...' : text;
};

module.exports = mongoose.model('Document', documentSchema);
