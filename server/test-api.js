const axios = require('axios');

// 测试配置
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123456',
  nickname: '测试用户'
};

let authToken = '';

// 测试函数
async function runTests() {
  console.log('🧪 开始 API 测试...\n');

  try {
    // 1. 健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${API_BASE.replace('/api', '')}/health`);
    console.log('✅ 健康检查通过:', healthResponse.data.status);

    // 2. 用户注册
    console.log('\n2. 测试用户注册...');
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, TEST_USER);
      authToken = registerResponse.data.data.token;
      console.log('✅ 用户注册成功:', registerResponse.data.data.user.nickname);
    } catch (error) {
      if (error.response?.data?.error?.includes('已被注册')) {
        console.log('⚠️ 用户已存在，尝试登录...');
        
        // 3. 用户登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: TEST_USER.email,
          password: TEST_USER.password
        });
        authToken = loginResponse.data.data.token;
        console.log('✅ 用户登录成功:', loginResponse.data.data.user.nickname);
      } else {
        throw error;
      }
    }

    // 4. 获取用户信息
    console.log('\n3. 测试获取用户信息...');
    const userResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 获取用户信息成功:', userResponse.data.data.user.nickname);

    // 5. 创建模块
    console.log('\n4. 测试创建模块...');
    const moduleData = {
      name: '测试模块',
      description: '这是一个测试模块',
      color: '#3b82f6',
      icon: 'folder'
    };
    const moduleResponse = await axios.post(`${API_BASE}/knowledge/modules`, moduleData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const moduleId = moduleResponse.data.data.module._id;
    console.log('✅ 模块创建成功:', moduleResponse.data.data.module.name);

    // 6. 获取模块列表
    console.log('\n5. 测试获取模块列表...');
    const modulesResponse = await axios.get(`${API_BASE}/knowledge/modules`);
    console.log('✅ 获取模块列表成功，共', modulesResponse.data.data.modules.length, '个模块');

    // 7. 创建文档
    console.log('\n6. 测试创建文档...');
    const documentData = {
      title: '测试文档',
      content: '# 测试文档\n\n这是一个测试文档的内容。\n\n## 功能特性\n\n- 支持 Markdown\n- 支持标签\n- 支持搜索',
      contentType: 'markdown',
      summary: '这是一个测试文档',
      tags: ['测试', 'API'],
      module: moduleId
    };
    const documentResponse = await axios.post(`${API_BASE}/knowledge/documents`, documentData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const documentId = documentResponse.data.data.document._id;
    console.log('✅ 文档创建成功:', documentResponse.data.data.document.title);

    // 8. 获取文档列表
    console.log('\n7. 测试获取文档列表...');
    const documentsResponse = await axios.get(`${API_BASE}/knowledge/documents`);
    console.log('✅ 获取文档列表成功，共', documentsResponse.data.data.documents.length, '个文档');

    // 9. 获取文档详情
    console.log('\n8. 测试获取文档详情...');
    const documentDetailResponse = await axios.get(`${API_BASE}/knowledge/documents/${documentId}`);
    console.log('✅ 获取文档详情成功:', documentDetailResponse.data.data.document.title);

    // 10. 点赞文档
    console.log('\n9. 测试点赞文档...');
    const likeResponse = await axios.post(`${API_BASE}/knowledge/documents/${documentId}/like`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 点赞成功，点赞数:', likeResponse.data.data.likeCount);

    // 11. 提交联系表单
    console.log('\n10. 测试提交联系表单...');
    const contactData = {
      name: '测试用户',
      email: 'test@example.com',
      subject: '测试联系表单',
      message: '这是一个测试联系表单的内容。'
    };
    const contactResponse = await axios.post(`${API_BASE}/contact`, contactData);
    console.log('✅ 联系表单提交成功:', contactResponse.data.data.contact.subject);

    // 12. 获取热门标签
    console.log('\n11. 测试获取热门标签...');
    const tagsResponse = await axios.get(`${API_BASE}/knowledge/tags/popular`);
    console.log('✅ 获取热门标签成功，共', tagsResponse.data.data.tags.length, '个标签');

    console.log('\n🎉 所有测试通过！\n');
    
    // 显示测试结果摘要
    console.log('📊 测试结果摘要:');
    console.log('- ✅ 健康检查');
    console.log('- ✅ 用户注册/登录');
    console.log('- ✅ 用户信息获取');
    console.log('- ✅ 模块创建和获取');
    console.log('- ✅ 文档创建和获取');
    console.log('- ✅ 文档点赞');
    console.log('- ✅ 联系表单提交');
    console.log('- ✅ 热门标签获取');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
      console.error('响应状态:', error.response.status);
    }
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = runTests;
