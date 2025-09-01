#!/usr/bin/env node

/**
 * 用户密码重置工具
 * 用法: node utils/resetUserPassword.js <username> [临时密码]
 * 示例: node utils/resetUserPassword.js john123 temp123456
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function resetUserPassword(username, tempPassword = null) {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bug_knowledge_platform');
    console.log('数据库连接成功');

    // 查找用户
    const user = await User.findOne({ username: username });
    if (!user) {
      console.log(`❌ 用户 "${username}" 不存在`);
      process.exit(1);
    }

    // 生成临时密码（如果没有提供）
    if (!tempPassword) {
      tempPassword = `temp${Math.random().toString(36).substring(2, 8)}`;
    }

    // 更新用户密码
    user.password = tempPassword;
    user.mustChangePassword = true; // 强制用户下次登录时修改密码
    await user.save();

    console.log('✅ 密码重置成功!');
    console.log(`用户: ${user.username}`);
    console.log(`邮箱: ${user.email}`);
    console.log(`临时密码: ${tempPassword}`);
    console.log(`⚠️  请告知用户使用临时密码登录，并立即修改为新密码。`);

  } catch (error) {
    console.error('❌ 重置密码失败:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('用法: node utils/resetUserPassword.js <username> [临时密码]');
  console.log('示例: node utils/resetUserPassword.js john123 temp123456');
  process.exit(1);
}

const username = args[0];
const tempPassword = args[1] || null;

resetUserPassword(username, tempPassword);
