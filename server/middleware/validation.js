const { body, param, query, validationResult } = require('express-validator');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    return res.status(400).json({
      success: false,
      error: errorMessages,
      details: errors.array()
    });
  }
  next();
};

// 用户注册验证
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  body('nickname')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('昵称长度在2-50个字符之间')
    .matches(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/)
    .withMessage('昵称只能包含中英文、数字、下划线和横线'),
  handleValidationErrors
];

// 用户登录验证
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  handleValidationErrors
];

// 密码修改验证
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  body('newPassword')
    .notEmpty()
    .withMessage('新密码不能为空'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不一致');
      }
      return true;
    }),
  handleValidationErrors
];

// 模块创建验证
const validateModule = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('模块名称长度在1-100个字符之间'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('模块描述长度在1-500个字符之间'),
  body('color')
    .optional()
    .matches(/^#([0-9A-F]{3}){1,2}$/i)
    .withMessage('请输入有效的颜色代码'),
  handleValidationErrors
];

// 文档创建验证（创建时必须指定模块）
const validateDocumentCreate = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('文档标题长度在1-200个字符之间'),
  body('content')
    .notEmpty()
    .withMessage('文档内容不能为空'),
  body('contentType')
    .optional()
    .isIn(['markdown', 'html'])
    .withMessage('内容类型必须是 markdown 或 html'),
  body('module')
    .isMongoId()
    .withMessage('请选择有效的模块'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('每个标签不能超过30个字符'),
  handleValidationErrors
];

// 文档更新验证（更新时模块可选）
const validateDocumentUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('文档标题长度在1-200个字符之间'),
  body('content')
    .optional()
    .notEmpty()
    .withMessage('文档内容不能为空'),
  body('contentType')
    .optional()
    .isIn(['markdown', 'html'])
    .withMessage('内容类型必须是 markdown 或 html'),
  body('module')
    .optional()
    .isMongoId()
    .withMessage('请选择有效的模块'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('每个标签不能超过30个字符'),
  handleValidationErrors
];

// 联系表单验证
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓名长度在1-50个字符之间'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('主题长度在1-200个字符之间'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('留言内容长度在1-2000个字符之间'),
  handleValidationErrors
];

// MongoDB ObjectId 验证
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} 必须是有效的ID`),
  handleValidationErrors
];

// 分页参数验证
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100的整数'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateModule,
  validateDocumentCreate,
  validateDocumentUpdate,
  validateContact,
  validateObjectId,
  validatePagination,
  handleValidationErrors
};
