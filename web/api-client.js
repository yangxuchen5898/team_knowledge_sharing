// API 客户端配置
// 支持多环境配置
const API_CONFIG = {
  // 开发环境（本地开发）
  development: 'http://localhost:3000/api',
  
  // 生产环境（阿里云ECS）
  production: 'http://<公网IP>/api',
  
  // 如果配置了域名，可以使用域名
  domain: 'http://your-domain.com/api'
};

// 自动检测环境或手动指定：
// - 本地开发（页面运行在 localhost/127.0.0.1）时使用 http://localhost:3000/api
// - 生产环境（页面运行在服务器/域名）时使用同源路径 /api 由 Nginx 反代
// - 可通过 window.API_BASE_URL 在页面里手动覆盖
const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL)
  ? window.API_BASE_URL
  : (typeof window !== 'undefined' && window.location)
    ? ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : `${window.location.origin}/api`)
    : API_CONFIG.production;

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  // 设置认证令牌
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // 获取请求头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // 检查响应类型
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // GET 请求
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST 请求
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT 请求
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE 请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // --- 认证相关 ---

  // 登录（兼容两种调用方式：login({account, password}) 或 login(account, password)）
  async login(accountOrParams, password) {
    let payload;
    if (accountOrParams && typeof accountOrParams === 'object') {
      payload = { account: accountOrParams.account, password: accountOrParams.password };
    } else {
      payload = { account: accountOrParams, password };
    }

    const response = await this.post('/auth/login', payload);
    // 期望响应为 { success, message, data: { token, user } }
    if (response?.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  // 登出
  async logout() {
    this.setToken(null);
    // 可选：通知后端token已作废
  }

  // 修改密码
  async changePassword(oldPassword, newPassword) {
    return this.post('/auth/change-password', { oldPassword, newPassword });
  }

  // 获取当前用户信息
  async getMe() {
    return this.get('/auth/me');
  }

  // 验证令牌
  async verifyToken() {
    return this.get('/auth/verify');
  }

  // ============ 用户相关 ============
  
  // 更新个人资料
  async updateProfile(profileData) {
    return this.put('/users/profile', profileData);
  }

  // 获取用户信息
  async getUser(userId) {
    return this.get(`/users/${userId}`);
  }

  // ============ 知识管理 ============
  
  // 获取模块列表
  async getModules(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/knowledge/modules${queryString ? '?' + queryString : ''}`);
  }

  // 创建模块
  async createModule(moduleData) {
    return this.post('/knowledge/modules', moduleData);
  }

  // 获取指定模块
  async getModule(moduleId) {
    return this.get(`/knowledge/modules/${moduleId}`);
  }

  // 更新模块
  async updateModule(moduleId, moduleData) {
    return this.put(`/knowledge/modules/${moduleId}`, moduleData);
  }

  // 删除模块
  async deleteModule(moduleId) {
    return this.delete(`/knowledge/modules/${moduleId}`);
  }

  // 获取文档列表
  async getDocuments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/knowledge/documents${queryString ? '?' + queryString : ''}`);
  }

  // 创建文档
  async createDocument(documentData) {
    return this.post('/knowledge/documents', documentData);
  }

  // 获取文档详情
  async getDocument(documentId) {
    return this.get(`/knowledge/documents/${documentId}`);
  }

  // 更新文档
  async updateDocument(documentId, documentData) {
    return this.put(`/knowledge/documents/${documentId}`, documentData);
  }

  // 删除文档
  async deleteDocument(documentId) {
    return this.delete(`/knowledge/documents/${documentId}`);
  }

  // 点赞/取消点赞文档
  async toggleDocumentLike(documentId) {
    return this.post(`/knowledge/documents/${documentId}/like`);
  }

  // 获取我的文档
  async getMyDocuments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/knowledge/my-documents${queryString ? '?' + queryString : ''}`);
  }

  // 获取热门标签
  async getPopularTags(limit = 20) {
    return this.get(`/knowledge/tags/popular?limit=${limit}`);
  }

  // ============ 联系表单 ============
  
  // 提交联系表单
  async submitContact(contactData) {
    return this.post('/contact', contactData);
  }

  // ============ 管理员功能 ============
  
  // 获取系统概览
  async getAdminOverview() {
    return this.get('/admin/overview');
  }

  // 获取用户管理列表
  async getAdminUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/admin/users${queryString ? '?' + queryString : ''}`);
  }

  // 获取联系表单列表
  async getAdminContacts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/contact${queryString ? '?' + queryString : ''}`);
  }

  // 回复联系表单
  async replyContact(contactId, replyData) {
    return this.post(`/contact/${contactId}/reply`, replyData);
  }

  // 批量生成用户（新增）
  async generateUsers(userData) {
    return this.post('/admin/generate-users', userData);
  }

  // 重置用户密码（新增）
  async resetUserPassword(userId) {
    return this.post(`/admin/users/${userId}/reset-password`);
  }

  // 更新用户状态（新增）
  async updateUserStatus(userId, statusData) {
    return this.put(`/admin/users/${userId}/status`, statusData);
  }

  // 删除用户（新增）
  async deleteUser(userId) {
    return this.delete(`/admin/users/${userId}`);
  }

  // 导出用户列表（新增）
  async exportUsers() {
    const response = await fetch(`${this.baseURL}/admin/users/export`, {
      headers: this.getHeaders(),
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error('导出失败');
    }
    
    return response.blob(); // 返回文件流
  }

  // 移除注册功能（注释掉或删除）
  /*
  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }
  */
}

// 创建全局API实例
const api = new ApiClient();

// 导出API客户端
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
} else {
  window.ApiClient = ApiClient;
  window.api = api;
}

// 使用示例：
/*
// 用户登录
try {
  const result = await api.login({
    email: 'user@example.com',
    password: 'password123'
  });
  console.log('登录成功:', result.data.user);
} catch (error) {
  console.error('登录失败:', error.message);
}

// 获取文档列表
try {
  const result = await api.getDocuments({
    page: 1,
    limit: 20,
    search: '关键词'
  });
  console.log('文档列表:', result.data.documents);
} catch (error) {
  console.error('获取文档失败:', error.message);
}

// 创建文档
try {
  const result = await api.createDocument({
    title: '新文档',
    content: '# 标题\n\n内容...',
    module: 'moduleId',
    tags: ['标签1', '标签2']
  });
  console.log('文档创建成功:', result.data.document);
} catch (error) {
  console.error('创建文档失败:', error.message);
}
*/
