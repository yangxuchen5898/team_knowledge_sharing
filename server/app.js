const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const knowledgeRoutes = require('./routes/knowledge');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const documentsRoutes = require('./routes/documents');

// 导入中间件
const errorHandler = require('./middleware/errorHandler');

// 导入工具函数
const createAdmin = require('./utils/createAdmin');

const app = express();

// 安全中间件
app.use(helmet());

// CORS配置（支持多个前端域名，使用 FRONTEND_URLS="https://a.com,https://b.com"）
// 规范化 Origin，去掉尾部斜杠并小写，避免误判
const normalizeOrigin = (s) => {
  if (!s) return '';
  const t = String(s).trim().toLowerCase();
  return t.endsWith('/') ? t.slice(0, -1) : t;
};

const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => normalizeOrigin(s))
  .filter(Boolean);

// 允许列表（环境优先，其次是常见本地端口与公网IP兜底）
const allowedOrigins = Array.from(new Set([
  ...envOrigins,
  'http://localhost:3000',
  'http://localhost:8080',
  // 允许 VS Code Live Server 等本地开发端口
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  // 生产环境公网上的访问IP（作为兜底，优先使用 FRONTEND_URLS 配置）
  'http://8.155.160.151',
  'https://8.155.160.151'
]));

const corsOptions = {
  origin: function (origin, callback) {
    const o = normalizeOrigin(origin);
    // 无 Origin（如同源、curl 默认）直接放行；否则在白名单内才放行
    if (!o || allowedOrigins.includes(o)) {
      callback(null, true);
    } else {
      // 不抛错，返回 false，避免 500，浏览器将因无 CORS 头而拦截
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// 处理所有路由的预检请求
app.options('*', cors(corsOptions));

// 启动时打印关键信息，便于排障
console.log('CORS 允许来源列表:', allowedOrigins);

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

app.use('/api/', limiter);

// 登录限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP最多5次登录尝试
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试'
  }
});

app.use('/api/auth/login', loginLimiter);

// 解析JSON和URL编码的数据
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// API文档路由
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'BUG终结智创营 - 知识共享平台 API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        changePassword: 'POST /api/auth/change-password',
        verify: 'GET /api/auth/verify'
      },
      users: {
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile'
      },
      knowledge: {
        modules: 'GET /api/knowledge/modules',
        createModule: 'POST /api/knowledge/modules',
        documents: 'GET /api/knowledge/documents',
        createDocument: 'POST /api/knowledge/documents',
        document: 'GET /api/knowledge/documents/:id',
        updateDocument: 'PUT /api/knowledge/documents/:id',
        deleteDocument: 'DELETE /api/knowledge/documents/:id'
      },
      contact: {
        submit: 'POST /api/contact',
        list: 'GET /api/contact (admin)',
        reply: 'POST /api/contact/:id/reply (admin)'
      },
      admin: {
        overview: 'GET /api/admin/overview',
        generateUsers: 'POST /api/admin/generate-users',
        users: 'GET /api/admin/users',
        resetPassword: 'POST /api/admin/users/:userId/reset-password',
        userStatus: 'PUT /api/admin/users/:userId/status',
        deleteUser: 'DELETE /api/admin/users/:userId',
        exportUsers: 'GET /api/admin/users/export'
      }
    },
    note: '注意：本系统不支持用户注册，账号由管理员统一生成'
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 错误处理中间件
app.use(errorHandler);

// 数据库连接和服务器启动
const PORT = process.env.PORT || 3000;

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bug_knowledge_platform';
console.log('准备连接 MongoDB:', mongoUri);

// 使用 IPv4 回退，避免某些系统上 localhost 解析到 ::1 导致连接失败
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  family: 4
})
  .then(async () => {
    console.log('✅ MongoDB连接成功');
    
    // 创建管理员账户（如果不存在）
    // await createAdmin(); // 临时禁用，避免重复连接错误
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log('⚠️  注意: 本系统不支持用户注册，请使用管理员账户生成用户');
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  mongoose.connection.close(() => {
    console.log('MongoDB连接已关闭');
    process.exit(0);
  });
});
