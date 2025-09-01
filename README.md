# 知识共享平台 - 部署指南和使用方法

这是一个基于 Node.js + Express + MongoDB 的知识共享平台，我们致力于打造一个以知识共享为核心、以AI赋能为驱动的创新型平台。

## 🎯 核心特性

- 🔐 **企业级用户管理**: 管理员统一生成账号，不支持自主注册
- 🚫 **受控访问**: 不支持用户自主注册和密码找回，确保系统安全
- 📚 **知识管理系统**: 模块化文档管理，支持 Markdown 和 LaTeX
- 💬 **联系反馈系统**: 留言板功能，管理员后台统一管理
- 👥 **严格权限控制**: 用户和管理员角色，细粒度权限管理，用户只能管理自己创建的内容，管理员可以管理所有内容

## 📁 目录结构

```
CentOS 8.5 服务器目录布局:
/
├── opt/
│   └── bug-platform-backend/            # 后端应用目录
│       ├── app.js                       # 主应用文件
│       ├── package.json                 # 项目配置
│       ├── .env                         # 环境变量 (权限644)
│       ├── ecosystem.config.js          # PM2配置
│       ├── models/                      # 数据模型
│       ├── routes/                      # API路由
│       ├── middleware/                  # 中间件
│       ├── utils/                       # 工具函数
│       ├── accounts_pwd.csv             # 账号密码 (导入后可删除)
│       ├── app-simple.js                # 后端的精简启动入口
│       ├── deploy.sh                    # Linux 服务器上的部署脚本
│       ├── package-lock.json            # NPM 锁定文件
│       ├── test-api.js                  # 后端接口冒烟测试脚本
│       └── node_modules/                # 依赖包
├── usr/
│   └── share/
│       └── nginx/
│           └── html/                    # 前端静态文件 (CentOS 8.5标准)
│               ├── index.html           # 主页
│               ├── knowledge.html       # 知识库页面
│               ├── ai.html              # AI页面
│               ├── contact.html         # 联系页面
│               ├── change-password.html # 修改密码
│               ├── styles.css           # 样式文件
│               ├── app.js               # 前端逻辑
│               ├── api-client.js        # API客户端
│               ├── logo.png             # 图标文件
│               ├── images.json          # 导入图片
│               └── pictures/            # 图片资源
├── var/
│   └── log/
│       ├── bug-platform/                # 应用日志
│       ├── nginx/                       # Nginx日志
│       │   ├── bug-platform-access.log
│       │   └── bug-platform-error.log
│       └── mongodb/                     # MongoDB日志
├── etc/
│   ├── nginx/
│   │   ├── nginx.conf                   # 主配置文件
│   │   └── conf.d/
│   │       └── bug-platform.conf        # 项目配置文件
│   ├── mongod.conf                      # MongoDB配置文件
│   └── systemd/system/                  # 系统服务
└── backup/                              # 数据备份目录
    ├── mongodb/                         # 数据库备份
    ├── uploads/                         # 文件备份
    └── config/                          # 配置备份
```

## 🕹 工具

[FileZilla](https://dl3.cdn.filezilla-project.org/client/FileZilla_3.69.3_win64-setup.exe?h=Gu-cxv6d5qF9OKPqUy0ocA&x=1756743004) ：一个 **FTP/SFTP 客户端** 程序，可以连接到远程的服务器（比如阿里云 ECS），上传和下载文件

[阿里云](https://www.aliyun.com/) ：用于申请域名、申请服务器和域名备案

## 🚀 配置文件

### 配置环境变量 `server/.env`

其中，`JWT_SECRET` 、 `ADMIN_EMAIL` 、 `ADMIN_PASSWORD` 需要自己设定，

`FRONTEND_URL=http://<公网IP>` 、 `FRONTEND_URLS=http://<公网IP>,https://<公网IP>` 需要设定为自己的公网IP

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/bug_knowledge_platform
MONGODB_ADMIN_URI=mongodb://dbadmin:YourStrongDbPassword123!@localhost:27017/admin
JWT_SECRET=StrongPssword
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=your_email
ADMIN_PASSWORD=your_password
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/opt/bug-platform-backend/uploads
FRONTEND_URL=http://<公网IP>
LOG_LEVEL=info
FRONTEND_URLS=http://<公网IP>,https://<公网IP>
```

### 配置 Nginx 站点 `nginx/bug-platform.conf`

其中， `server_name <公网IP> localhost your-domain.com;` 需要设定为自己的公网IP

```bash
server {
    listen 80;
    server_name <公网IP> localhost your-domain.com;
    
    # 前端静态文件 (CentOS 8.5标准目录)
    root /usr/share/nginx/html;
    index index.html index.htm;

    # 安全头设置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # 明确处理独立 HTML 文件，避免被 SPA 回退吞掉
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store";
        try_files $uri =404;
    }

    # 独立页面直出（精确匹配，优先级最高）
    location = /change-password.html {
        expires -1;
        add_header Cache-Control "no-store";
        try_files $uri =404;
    }

    # 前端路由 (SPA支持)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 缓冲区配置
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # CORS支持
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
        
        # 对OPTIONS请求的响应
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }

    # 文件上传代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }

    # 错误页面
    # 取消将所有 404 回退到 index.html，避免独立 HTML 被吞掉
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
    
    # 日志配置
    access_log /var/log/nginx/bug-platform-access.log;
    error_log /var/log/nginx/bug-platform-error.log;
}
```

### 配置 `server/accounts_pwd.csv`

```
accounts,pwd
testaccount1,testpwd1
testaccount2,testpwd2
testaccount3,testpwd3
testaccount4,testpwd4
testaccount5,testpwd5
admin,adminpwd
```

### 配置 `web/pictures/`

将首页轮播图放在该文件夹下

### 配置 `web/images.json`

将首页轮播图的文件名放在该文件内

```json
[ "pictures/1.png", "pictures/2.png", "pictures/3.png"]
```

### 配置 `web/logo.png`

将首页左上角的图标命名为 `logo.png` 并替换原有文件

### 配置 `web/index.html`

在文件中找到“团队名称”字样，替换为自己的团队名称

在最后几行找到

```html
    <script>
        window.API_BASE_URL = 'http://<公网IP>/api';
    </script>
```

将 `<公网IP>` 设定为自己的公网IP

### 配置 `web/knowledge.html`

在文件中找到“团队名称”字样，替换为自己的团队名称

在约第 440 行找到

```html
    <script>
    	window.API_BASE_URL = 'http://<公网IP>/api';
    // marked 的配置将放到其库脚本加载之后执行
        // 创建兼容的apiRequest函数
        async function apiRequest(endpoint, method = 'GET', data = null) {
            try {
                if (method === 'GET') {
                	return await api.get(endpoint);
                } else if (method === 'POST') {
                	return await api.post(endpoint, data);
                } else if (method === 'PUT') {
                	return await api.put(endpoint, data);
                } else if (method === 'DELETE') {
                	return await api.delete(endpoint);
                }
            } catch (error) {
            	throw new Error(error.message || '请求失败');
            }
        }
    </script>
```

将 `<公网IP>` 设定为自己的公网IP

### 配置 `web/ai.html`

在文件中找到“团队名称”字样，替换为自己的团队名称

在最后几行找到

```html
    <script>
        window.API_BASE_URL = 'http://<公网IP>/api';
    </script>
```

将 `<公网IP>` 设定为自己的公网IP

### 配置 `web/contact.html`

在文件中找到“团队名称”字样，替换为自己的团队名称

### 配置 `web/change-password.html`

在约第 50 行找到

```html
    <script>
        // 关键改动：直接硬编码 API 地址，确保在 api-client.js 加载前生效
        window.API_BASE_URL = 'http://<公网IP>/api';
    </script>
```

将 `<公网IP>` 设定为自己的公网IP

### 配置 `web/api-client.js`

在开头几行找到

```javascript
const API_CONFIG = {
    // 开发环境（本地开发）
    development: 'http://localhost:3000/api',
    // 生产环境（阿里云ECS）
    production: 'http://<公网IP>/api',
    // 如果配置了域名，可以使用域名
    domain: 'http://your-domain.com/api'
};
```

将 `<公网IP>` 设定为自己的公网IP

### 在服务器上的部署流程

创建实例，使用阿里云 ECS 服务器，操作系统选择 CentOS 8.5 64 位

```bash
# 安装基础工具
dnf install -y wget curl vim git htop unzip

# CentOS 8.5 支持最新 Node.js 版本，获得更好性能
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs

# 验证安装
node --version  # 应显示 v18.x.x
npm --version   # 应显示 10.x.x

# 创建MongoDB 5.0 仓库文件 (CentOS 8.5 优化)
cat > /etc/yum.repos.d/mongodb-org-5.0.repo << 'EOF'
[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc
EOF

# 安装 MongoDB 5.0
dnf install -y mongodb-org

# 启动并设置开机自启
systemctl enable mongod
systemctl start mongod

# 验证 MongoDB 状态，应当看到绿色的 active (running)
systemctl status mongod

# 安装 Nginx (CentOS 8.5 使用 dnf)
dnf install -y nginx

# 启动并设置开机自启
systemctl enable nginx
systemctl start nginx

# 验证 Nginx 状态，应当看到绿色的 active (running)
systemctl status nginx

# 全局安装 PM2 (如果让输入 npm install -g npm@11.5.2 更新，请忽略)
npm install -g pm2

# 验证 PM2 安装
pm2 --version

# 创建应用目录
mkdir -p /opt/bug-platform-backend
cd /opt/bug-platform-backend

# 设置目录权限
chown -R nginx:nginx /opt/bug-platform-backend

# 用 FileZilla 上传 /server 中的后端代码至 /opt/bug-platform-backend/

# 安装依赖
cd /opt/bug-platform-backend
npm install --omit=dev

# 创建上传目录
mkdir -p /opt/bug-platform-backend/uploads/{images,documents,others}

# 创建日志目录
mkdir -p /var/log/bug-platform

# 设置权限
chown -R nginx:nginx /opt/bug-platform-backend
chown -R nginx:nginx /var/log/bug-platform
chmod 755 -R /opt/bug-platform-backend
chmod 644 /opt/bug-platform-backend/.env

# 将 /nginx/bug-platform.conf 上传至 /etc/nginx/conf.d

# 测试 Nginx 配置
nginx -t

# 如果测试通过，重载配置
systemctl reload nginx

# 查看 Nginx 状态，应当看到绿色的 active (running)
systemctl status nginx
cd /opt/bug-platform-backend

# 启动应用
pm2 start ecosystem.config.js --env production

# 查看应用状态
pm2 status

# 查看日志
pm2 logs bug-platform-backend

# 预览 CSV 中的用户名与原始密码（不连接数据库、不写入，仅用于人工校验）
cd /opt/bug-platform-backend
node utils/importUsers.js preview ../accounts_pwd.csv

# 从 CSV 导入用户（默认增量导入：已存在的用户会跳过）
# 说明：导入时密码不会在脚本中手动加密，而是由 User 模型的 pre-save 钩子加密，避免二次加密导致登录失败。
cd /opt/bug-platform-backend
node utils/importUsers.js import ../accounts_pwd.csv

# 查看已导入用户的基础信息
cd /opt/bug-platform-backend
node utils/importUsers.js view

# 将 admin 的 role 字段设为管理员，管理员将拥有删除和编辑所有知识文档的权限
db.users.updateOne({ username: "admin" }, { $set: { role: "admin" } })

# 也可以将其他人设为管理员
db.users.updateOne({ username: "testaccount1" }, { $set: { role: "admin" } })

# 启动防火墙
sudo systemctl start firewalld

# 开放必要端口
firewall-cmd --permanent --add-service=http     # 80端口
firewall-cmd --permanent --add-service=https    # 443端口

# 重载防火墙配置
firewall-cmd --reload

# 查看已开放端口
firewall-cmd --list-all

# 用 FileZilla 上传 /web 中的前端代码至 /usr/share/nginx/html/

# 设置正确权限
sudo chown -R nginx:nginx /usr/share/nginx/html/
sudo chmod -R 755 /usr/share/nginx/html/

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# 检查Nginx状态，应当看到绿色的active (running)
sudo systemctl status nginx

# 检查Nginx进程和端口
ps aux | grep nginx
netstat -tlnp | grep :80
```

## 🔑 功能说明

### 首页
- 轮播图展示团队特色照片（自动播放，支持手动切换，建议将图片裁剪为16:9）
- 通过简要文字介绍团队理念与亮点

### 知识共享
- 登录后可创建与查看文档（未登录不可查看共享文档）
- 支持 Markdown 与 LaTeX 实时渲染，编辑体验类似 Typora
- 文档显示作者
- 权限：
  - 非管理员用户：可查看所有文档，仅能编辑/删除自己的文档
  - 管理员用户：可查看、编辑、删除所有文档

### AI 赋能
- 功能策划中，页面结构已搭建，后续将持续完善

### 联系我们
- 任何访客（无需登录）均可提交留言（姓名/邮箱/主题/内容）
- 留言将保存至数据库，便于管理员后续查看与跟进

### 重置密码

- 系统使用 bcrypt 加密，即使管理员也无法查看用户的明文密码
- 当用户忘记密码时，只能通过重置为临时密码的方式解决
- 重置后的用户会被标记为"必须修改密码"，首次登录时会提示修改

为了帮助管理员处理用户忘记密码的情况，系统提供了以下工具：

```bash
# 为用户生成随机临时密码
node utils/resetUserPassword.js <用户名>
# 为用户设置指定的临时密码
node utils/resetUserPassword.js <用户名> <临时密码>
# 示例
node utils/resetUserPassword.js 24zzjk1001 temp123456
```

### 查看留言

在阿里云 ECS 服务器命令行输入以下两条命令可以查看所有留言

```bash
cd /opt/bug-platform-backend
npm run list-contacts
```

