const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '模块名称是必需的'],
    trim: true,
    maxlength: [100, '模块名称不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '模块描述是必需的'],
    trim: true,
    maxlength: [500, '模块描述不能超过500个字符']
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: [/^#([0-9A-F]{3}){1,2}$/i, '请输入有效的颜色代码']
  },
  icon: {
    type: String,
    default: 'folder'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  documentCount: {
    type: Number,
    default: 0
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

// 索引
moduleSchema.index({ name: 1 });
moduleSchema.index({ creator: 1 });
moduleSchema.index({ createdAt: -1 });
moduleSchema.index({ order: 1 });

module.exports = mongoose.model('Module', moduleSchema);
