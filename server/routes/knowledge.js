const express = require('express');
const Module = require('../models/Module');
const Document = require('../models/Document');
const { auth, optionalAuth } = require('../middleware/auth');
const { 
  validateModule, 
  validateDocumentCreate, 
  validateDocumentUpdate, 
  validateObjectId, 
  validatePagination 
} = require('../middleware/validation');

const router = express.Router();

// ============ 模块相关路由 ============

// 获取所有模块
router.get('/modules', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    const [modules, total] = await Promise.all([
      Module.find(query)
        .populate('creator', 'nickname email avatar')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Module.countDocuments(query)
    ]);

    // 获取每个模块的文档数量
    for (let module of modules) {
      const documentCount = await Document.countDocuments({ 
        module: module._id, 
        isPublished: true 
      });
      module.documentCount = documentCount;
    }

    res.json({
      success: true,
      data: {
        modules,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取模块列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取模块列表失败'
    });
  }
});

// 创建模块
router.post('/modules', auth, validateModule, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // 检查模块名是否已存在
    const existingModule = await Module.findOne({ name, isActive: true });
    if (existingModule) {
      return res.status(400).json({
        success: false,
        error: '该模块名称已存在'
      });
    }

    const module = new Module({
      name,
      description,
      color,
      icon,
      creator: req.user._id
    });

    await module.save();
    await module.populate('creator', 'nickname email avatar');

    res.status(201).json({
      success: true,
      message: '模块创建成功',
      data: { module }
    });
  } catch (error) {
    console.error('创建模块错误:', error);
    res.status(500).json({
      success: false,
      error: '创建模块失败'
    });
  }
});

// 获取指定模块
router.get('/modules/:moduleId', validateObjectId('moduleId'), async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.moduleId,
      isActive: true
    }).populate('creator', 'nickname email avatar');

    if (!module) {
      return res.status(404).json({
        success: false,
        error: '模块不存在'
      });
    }

    // 获取模块的文档数量
    const documentCount = await Document.countDocuments({ 
      module: module._id, 
      isPublished: true 
    });
    module.documentCount = documentCount;

    res.json({
      success: true,
      data: { module }
    });
  } catch (error) {
    console.error('获取模块错误:', error);
    res.status(500).json({
      success: false,
      error: '获取模块失败'
    });
  }
});

// 更新模块
router.put('/modules/:moduleId', auth, validateObjectId('moduleId'), validateModule, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    const moduleId = req.params.moduleId;

    const module = await Module.findOne({
      _id: moduleId,
      isActive: true
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        error: '模块不存在'
      });
    }

    // 检查权限（只有创建者或管理员可以修改）
    if (module.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '权限不足，只能修改自己创建的模块'
      });
    }

    // 检查模块名是否与其他模块重复
    if (name && name !== module.name) {
      const existingModule = await Module.findOne({ 
        name, 
        isActive: true,
        _id: { $ne: moduleId }
      });
      if (existingModule) {
        return res.status(400).json({
          success: false,
          error: '该模块名称已存在'
        });
      }
    }

    // 更新模块
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const updatedModule = await Module.findByIdAndUpdate(
      moduleId,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'nickname email avatar');

    res.json({
      success: true,
      message: '模块更新成功',
      data: { module: updatedModule }
    });
  } catch (error) {
    console.error('更新模块错误:', error);
    res.status(500).json({
      success: false,
      error: '更新模块失败'
    });
  }
});

// 删除模块（软删除）
router.delete('/modules/:moduleId', auth, validateObjectId('moduleId'), async (req, res) => {
  try {
    const moduleId = req.params.moduleId;

    const module = await Module.findOne({
      _id: moduleId,
      isActive: true
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        error: '模块不存在'
      });
    }

    // 检查权限（只有创建者或管理员可以删除）
    if (module.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '权限不足，只能删除自己创建的模块'
      });
    }

    // 检查模块是否有文档
    const documentCount = await Document.countDocuments({ 
      module: moduleId, 
      isPublished: true 
    });
    
    if (documentCount > 0) {
      return res.status(400).json({
        success: false,
        error: '该模块下还有文档，请先删除所有文档'
      });
    }

    // 软删除模块
    await Module.findByIdAndUpdate(moduleId, { isActive: false });

    res.json({
      success: true,
      message: '模块删除成功'
    });
  } catch (error) {
    console.error('删除模块错误:', error);
    res.status(500).json({
      success: false,
      error: '删除模块失败'
    });
  }
});

// ============ 文档相关路由 ============

// 获取文档列表
router.get('/documents', optionalAuth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { isPublished: true };

    // 模块筛选
    if (req.query.module) {
      query.module = req.query.module;
    }

    // 作者筛选
    if (req.query.author) {
      query.author = req.query.author;
    }

    // 标签筛选
    if (req.query.tags) {
      const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
      query.tags = { $in: tags };
    }

    // 搜索条件
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // 排序
    let sort = { isPinned: -1, createdAt: -1 };
    if (req.query.sort === 'popular') {
      sort = { isPinned: -1, viewCount: -1, likeCount: -1 };
    } else if (req.query.sort === 'latest') {
      sort = { isPinned: -1, updatedAt: -1 };
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('module', 'name color icon')
        .populate('author', 'nickname email avatar')
        .select('title summary tags viewCount likeCount isPinned createdAt updatedAt')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Document.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取文档列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取文档列表失败'
    });
  }
});

// 创建文档
router.post('/documents', auth, validateDocumentCreate, async (req, res) => {
  try {
    const { title, content, contentType, summary, tags, module: moduleId, isPublished } = req.body;

    // 验证模块是否存在
    const module = await Module.findOne({ _id: moduleId, isActive: true });
    if (!module) {
      return res.status(400).json({
        success: false,
        error: '指定的模块不存在'
      });
    }

    const document = new Document({
      title,
      content,
      contentType,
      summary,
      tags,
      module: moduleId,
      author: req.user._id,
      isPublished: isPublished !== false, // 默认发布
      lastEditedBy: req.user._id,
      lastEditedAt: new Date()
    });

    await document.save();
    await document.populate([
      { path: 'module', select: 'name color icon' },
      { path: 'author', select: 'nickname email avatar' }
    ]);

    res.status(201).json({
      success: true,
      message: '文档创建成功',
      data: { document }
    });
  } catch (error) {
    console.error('创建文档错误:', error);
    res.status(500).json({
      success: false,
      error: '创建文档失败'
    });
  }
});

// 继续文档相关路由...
// 获取指定文档
router.get('/documents/:documentId', optionalAuth, validateObjectId('documentId'), async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      isPublished: true
    }).populate([
      { path: 'module', select: 'name color icon' },
      { path: 'author', select: 'nickname email avatar' },
      { path: 'lastEditedBy', select: 'nickname email' }
    ]);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    // 增加浏览量（异步进行，不影响响应）
    Document.findByIdAndUpdate(req.params.documentId, { $inc: { viewCount: 1 } }).exec();

    // 检查当前用户是否点赞了这篇文档
    let isLiked = false;
    if (req.user) {
      isLiked = document.likedBy.includes(req.user._id);
    }

    const responseData = {
      ...document.toJSON(),
      isLiked
    };

    res.json({
      success: true,
      data: { document: responseData }
    });
  } catch (error) {
    console.error('获取文档错误:', error);
    res.status(500).json({
      success: false,
      error: '获取文档失败'
    });
  }
});

// 更新文档
router.put('/documents/:documentId', auth, validateObjectId('documentId'), validateDocumentUpdate, async (req, res) => {
  try {
    const { title, content, contentType, summary, tags, module: moduleId, isPublished } = req.body;
    const documentId = req.params.documentId;

    const document = await Document.findOne({
      _id: documentId,
      isPublished: true
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    // 检查权限（只有作者或管理员可以修改）
    if (document.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '权限不足，只能修改自己的文档'
      });
    }

    // 验证模块是否存在
    if (moduleId && moduleId !== document.module.toString()) {
      const module = await Module.findOne({ _id: moduleId, isActive: true });
      if (!module) {
        return res.status(400).json({
          success: false,
          error: '指定的模块不存在'
        });
      }
    }

    // 更新文档
    const updateData = {
      lastEditedBy: req.user._id,
      lastEditedAt: new Date(),
      version: document.version + 1
    };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (contentType !== undefined) updateData.contentType = contentType;
    if (summary !== undefined) updateData.summary = summary;
    if (tags !== undefined) updateData.tags = tags;
    if (moduleId !== undefined) updateData.module = moduleId;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'module', select: 'name color icon' },
      { path: 'author', select: 'nickname email avatar' },
      { path: 'lastEditedBy', select: 'nickname email' }
    ]);

    res.json({
      success: true,
      message: '文档更新成功',
      data: { document: updatedDocument }
    });
  } catch (error) {
    console.error('更新文档错误:', error);
    res.status(500).json({
      success: false,
      error: '更新文档失败'
    });
  }
});

// 删除文档（软删除）
router.delete('/documents/:documentId', auth, validateObjectId('documentId'), async (req, res) => {
  try {
    const documentId = req.params.documentId;

    const document = await Document.findOne({
      _id: documentId,
      isPublished: true
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    // 检查权限（只有作者或管理员可以删除）
    if (document.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '权限不足，只能删除自己的文档'
      });
    }

    // 软删除文档
    await Document.findByIdAndUpdate(documentId, { isPublished: false });

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

// 点赞/取消点赞文档
router.post('/documents/:documentId/like', auth, validateObjectId('documentId'), async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      isPublished: true
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: '文档不存在'
      });
    }

    await document.toggleLike(req.user._id);

    const isLiked = document.likedBy.includes(req.user._id);

    res.json({
      success: true,
      message: isLiked ? '点赞成功' : '取消点赞成功',
      data: {
        isLiked,
        likeCount: document.likeCount
      }
    });
  } catch (error) {
    console.error('点赞操作错误:', error);
    res.status(500).json({
      success: false,
      error: '点赞操作失败'
    });
  }
});

// 获取用户自己的文档
router.get('/my-documents', auth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { author: req.user._id };

    // 状态筛选
    if (req.query.status === 'published') {
      query.isPublished = true;
    } else if (req.query.status === 'draft') {
      query.isPublished = false;
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('module', 'name color icon')
        .select('title summary tags viewCount likeCount isPinned isPublished createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Document.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取我的文档错误:', error);
    res.status(500).json({
      success: false,
      error: '获取我的文档失败'
    });
  }
});

// 获取热门标签
router.get('/tags/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const tags = await Document.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    console.error('获取热门标签错误:', error);
    res.status(500).json({
      success: false,
      error: '获取热门标签失败'
    });
  }
});

module.exports = router;
