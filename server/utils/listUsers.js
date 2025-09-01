#!/usr/bin/env node

/**
 * 用户信息查看工具
 * 用法: node utils/listUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listAllUsers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bug_knowledge_platform');
    console.log('数据库连接成功\n');

    // 获取所有用户（不包含密码字段）
    const users = await User.find({}, '-password').sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('📝 暂无用户数据');
      return;
    }

    console.log(`📋 共找到 ${users.length} 个用户:\n`);
    console.log('用户名'.padEnd(20) + '邮箱'.padEnd(30) + '角色'.padEnd(10) + '状态'.padEnd(10) + '最后登录');
    console.log('-'.repeat(80));

    users.forEach(user => {
      const username = user.username || 'N/A';
      const email = user.email || 'N/A';
      const role = user.role || 'user';
      const status = user.isActive ? '正常' : '禁用';
      const lastLogin = user.lastLogin ? user.lastLogin.toLocaleDateString('zh-CN') : '从未登录';
      const needsPasswordChange = user.mustChangePassword ? ' 🔑' : '';
      
      console.log(
        username.padEnd(20) + 
        email.padEnd(30) + 
        role.padEnd(10) + 
        status.padEnd(10) + 
        lastLogin + 
        needsPasswordChange
      );
    });

    console.log('\n说明:');
    console.log('🔑 = 需要修改密码');
    console.log('\n💡 如需重置用户密码，请使用: node utils/resetUserPassword.js <用户名>');

  } catch (error) {
    console.error('❌ 查询用户列表失败:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listAllUsers();
