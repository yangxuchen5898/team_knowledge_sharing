const express = require('express');
const Document = require('../models/Document');
const Module = require('../models/Module');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取文档列表
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // 查找所有已发布的文档，按更新时间排序
    const documents = await Document.find({ isPublished: true })
      .populate('author', 'nickname')
      .select('title content author createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // 使用lean()提高性能

    // 转换为简化格式
    const simplifiedDocs = documents.map(doc => ({
      _id: doc._id,
      title: doc.title,
      content: doc.content,
      author: doc.author ? doc.author.nickname : 'Unknown',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));

    res.json({
      success: true,
      documents: simplifiedDocs,
      total: await Document.countDocuments({ isPublished: true })
    });
  } catch (error) {
    console.error('获取文档列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取文档列表失败'
    });
  }
});

// 获取单个文档
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('author', 'nickname')
      .lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    // 转换为简化格式
    const simplifiedDoc = {
      _id: document._id,
      title: document.title,
      content: document.content,
      author: document.author ? document.author.nickname : 'Unknown',
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    res.json({
      success: true,
      document: simplifiedDoc
    });
  } catch (error) {
    console.error('获取文档错误:', error);
    res.status(500).json({
      success: false,
      error: '获取文档失败'
    });
  }
});

// 创建文档
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: '文档标题不能为空'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: '文档内容不能为空'
      });
    }

    // 查找用户
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 查找或创建默认模块
    let defaultModule = await Module.findOne({ name: '知识共享' });
    if (!defaultModule) {
      defaultModule = new Module({
        name: '知识共享',
        description: '用户知识共享文档',
        creator: user._id,
        isActive: true,
        order: 0
      });
      await defaultModule.save();
    }

    const document = new Document({
      title: title.trim(),
      content,
      contentType: 'markdown',
      summary: content.substring(0, 150),
      module: defaultModule._id,
      author: user._id,
      isPublished: true,
      lastEditedBy: user._id,
      lastEditedAt: new Date()
    });

    await document.save();

    // 返回简化格式
    const simplifiedDoc = {
      _id: document._id,
      title: document.title,
      content: document.content,
      author: user.nickname || user.username,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    res.status(201).json({
      success: true,
      document: simplifiedDoc
    });
  } catch (error) {
    console.error('创建文档错误:', error);
    res.status(500).json({
      success: false,
      error: '创建文档失败'
    });
  }
});

// 更新文档
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: '文档标题不能为空'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: '文档内容不能为空'
      });
    }

    const document = await Document.findById(req.params.id).populate('author', 'username nickname');
    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    // 检查编辑权限：只有作者或管理员24zzjk1019可以编辑
    const authorUsername = document.author ? document.author.username : '';
    if (authorUsername !== req.user.username && req.user.username !== '24zzjk1019') {
      return res.status(403).json({
        success: false,
        error: '没有权限编辑此文档'
      });
    }

    // 查找当前用户
    const currentUser = await User.findOne({ username: req.user.username });

    document.title = title.trim();
    document.content = content;
    document.summary = content.substring(0, 150);
    document.lastEditedBy = currentUser._id;
    document.lastEditedAt = new Date();

    await document.save();

    // 返回简化格式
    const simplifiedDoc = {
      _id: document._id,
      title: document.title,
      content: document.content,
      author: document.author ? document.author.nickname || document.author.username : 'Unknown',
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    res.json({
      success: true,
      document: simplifiedDoc
    });
  } catch (error) {
    console.error('更新文档错误:', error);
    res.status(500).json({
      success: false,
      error: '更新文档失败'
    });
  }
});

// 删除文档
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate('author', 'username');
    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    // 检查删除权限：只有作者或管理员24zzjk1019可以删除
    const authorUsername = document.author ? document.author.username : '';
    if (authorUsername !== req.user.username && req.user.username !== '24zzjk1019') {
      return res.status(403).json({
        success: false,
        error: '没有权限删除此文档'
      });
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '文档删除成功'
    });
  } catch (error) {
    console.error('删除文档错误:', error);
    res.status(500).json({
      success: false,
      error: '删除文档失败'
    });
  }
});

module.exports = router;
