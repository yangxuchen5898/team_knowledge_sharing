const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// 导入用户模型
const User = require('../models/User');

function getMongoUri() {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/bug_knowledge_platform';
}

// CSV导入用户函数
async function importUsersFromCSV(csvFilePath, options = { truncate: false }) {
  try {
    // 连接数据库
    await mongoose.connect(getMongoUri());
    console.log('✅ 已连接到MongoDB数据库');

    // 可选：清空用户集合（谨慎使用，仅在明确传入 --truncate 时执行）
    if (options.truncate) {
      await User.deleteMany({});
      console.log('🗑️ 已清空现有用户数据（按 --truncate 指示）');
    }

    const users = [];
    
    // 读取CSV文件
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          const keys = Object.keys(row);
          
          // 动态获取字段值
          const accountsKey = keys.find(key => key.includes('accounts'));
          const pwdKey = keys.find(key => key.includes('pwd'));
          
          const accounts = row[accountsKey];
          const pwd = row[pwdKey];
          
          // 跳过空行
          if (accounts && accounts.trim() && pwd && pwd.trim()) {
            users.push({
              username: accounts.trim(),
              password: pwd.trim(),
              email: `${accounts.trim()}@example.com`, // 使用标准邮箱格式
              role: 'user',
              isActive: true,
              mustChangePassword: true, // 首次登录必须修改密码
              createdBy: 'admin',
              createdAt: new Date()
            });
          }
        })
        .on('end', async () => {
          try {
            console.log(`📊 从CSV文件读取到 ${users.length} 个用户`);
            
            // 批量插入用户
            let successCount = 0;
            let errorCount = 0;
            
            for (const userData of users) {
              try {
                // 检查用户是否已存在 (理论上不会，因为已经清空了)
                const existingUser = await User.findOne({ 
                  $or: [
                    { username: userData.username },
                    { email: userData.email }
                  ]
                });
                
                if (existingUser) {
                  console.log(`⚠️  用户 ${userData.username} 已存在，跳过`);
                  continue;
                }
                
                // 密码将在 User model 的 pre-save 钩子中自动加密，此处无需手动加密
                
                // 创建用户
                const newUser = new User(userData);
                await newUser.save();
                
                successCount++;
                console.log(`✅ 成功创建用户: ${userData.username}`);
                
              } catch (error) {
                errorCount++;
                console.error(`❌ 创建用户 ${userData.username} 失败:`, error.message);
              }
            }
            
            console.log(`\n📋 导入完成:`);
            console.log(`✅ 成功创建: ${successCount} 个用户`);
            console.log(`❌ 失败: ${errorCount} 个用户`);
            
            resolve({ successCount, errorCount, totalUsers: users.length });
          } catch (error) {
            reject(error);
          } finally {
            await mongoose.disconnect();
            console.log('🔌 已断开数据库连接');
          }
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ 导入用户失败:', error);
    throw error;
  }
}

/**
 * 查看所有用户凭据（管理员功能）
 */
async function viewAllUserCredentials() {
  try {
  await mongoose.connect(getMongoUri());
    console.log('✅ 已连接到MongoDB数据库');

    const users = await User.find({}, 'username email role isActive createdAt lastLogin mustChangePassword').sort({ username: 1 });
    
    console.log('\n📊 === 用户列表 ===');
    console.log('用户名\t\t邮箱\t\t\t\t角色\t状态\t强制改密\t创建时间\t\t最后登录');
    console.log('─'.repeat(140));
    
    users.forEach(user => {
      const username = user.username.padEnd(15);
      const email = user.email.padEnd(30);
      const role = user.role.padEnd(8);
      const status = (user.isActive ? '✅激活' : '❌禁用').padEnd(6);
      const mustChange = (user.mustChangePassword ? '⚠️是' : '✅否').padEnd(4);
      const created = user.createdAt.toISOString().slice(0, 16).replace('T', ' ');
      const lastLogin = user.lastLogin ? 
        user.lastLogin.toISOString().slice(0, 16).replace('T', ' ') : 
        '从未登录'.padEnd(16);
      
      console.log(`${username}\t${email}\t${role}\t${status}\t${mustChange}\t${created}\t${lastLogin}`);
    });
    
    console.log(`\n📋 总计: ${users.length} 个用户`);
    
  } catch (error) {
    console.error('❌ 查看用户列表失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开数据库连接');
  }
}

/**
 * 预览CSV中的账号和原始密码（不会连接数据库，不会写入）
 */
async function previewCredentialsFromCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    try {
      const fullPath = path.resolve(__dirname, csvFilePath);
      if (!fs.existsSync(fullPath)) {
        return reject(new Error(`CSV文件不存在: ${fullPath}`));
      }

      const creds = [];
      fs.createReadStream(fullPath)
        .pipe(csv())
        .on('data', (row) => {
          const keys = Object.keys(row);
          const accountsKey = keys.find(key => key.includes('accounts'));
          const pwdKey = keys.find(key => key.includes('pwd'));
          const accounts = row[accountsKey];
          const pwd = row[pwdKey];
          if (accounts && accounts.trim() && pwd && pwd.trim()) {
            creds.push({ username: accounts.trim(), password: pwd.trim() });
          }
        })
        .on('end', () => {
          console.log('\n📄 CSV凭据预览（仅显示文件中的原始数据，不涉及数据库）：');
          creds.forEach(c => console.log(`👤 ${c.username}\t🔑 ${c.password}`));
          console.log(`\n总计: ${creds.length} 条`);
          resolve(creds);
        })
        .on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 创建管理员账户
 */
async function createAdmin() {
  try {
    await mongoose.connect(getMongoUri());
    console.log('✅ 已连接到MongoDB数据库');

    const adminUsername = 'admin';
    const adminPassword = 'admin123456';
    
    // 检查管理员是否已存在
    const existingAdmin = await User.findOne({ username: adminUsername });
    
    if (existingAdmin) {
      console.log('⚠️  管理员账户已存在');
      return;
    }

    // 创建管理员账户（交由 model 的 pre-save 钩子加密密码，避免二次加密）
    const admin = new User({
      username: adminUsername,
      email: 'admin@system.local',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      profile: {
        nickname: '系统管理员'
      }
    });

    await admin.save();
    console.log('✅ 管理员账户创建成功');
    console.log(`👤 用户名: ${adminUsername}`);
    console.log(`🔑 密码: ${adminPassword}`);
    console.log('⚠️  请及时修改默认密码！');

  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开数据库连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];
  const rawArgs = process.argv.slice(3);
  const hasFlag = (flag) => rawArgs.includes(flag);
  const getArgAfter = (flag) => {
    const idx = rawArgs.indexOf(flag);
    return idx >= 0 && rawArgs[idx + 1] ? rawArgs[idx + 1] : undefined;
  };
  // 支持 --uri 覆盖 MONGODB_URI
  const cliMongoUri = getArgAfter('--uri');
  if (cliMongoUri) process.env.MONGODB_URI = cliMongoUri;
  
  switch (command) {
    case 'import':
      const csvPath = rawArgs[0] || '../../accounts_pwd.csv';
      const fullPath = path.resolve(__dirname, csvPath);
      
      console.log(`📁 开始从 ${fullPath} 导入用户...`);
      const truncate = hasFlag('--truncate');
      
      importUsersFromCSV(fullPath, { truncate })
        .then((result) => {
          console.log('\n🎉 用户导入完成!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 用户导入失败:', error);
          process.exit(1);
        });
      break;
      
    case 'view':
      viewAllUserCredentials()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ 查看失败:', error);
          process.exit(1);
        });
      break;
    
    case 'preview':
      const csvPathPreview = rawArgs[0] || '../../accounts_pwd.csv';
      previewCredentialsFromCSV(csvPathPreview)
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ 预览失败:', error);
          process.exit(1);
        });
      break;
      
    case 'admin':
      createAdmin()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ 创建管理员失败:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('📖 使用方法:');
      console.log('  node importUsers.js import [csv文件路径] [--truncate] [--uri <mongoUri>]  # 从CSV导入用户，可选清空和指定URI');
      console.log('  node importUsers.js view                                  # 查看所有用户（不显示密码）');
      console.log('  node importUsers.js preview [csv文件路径]                 # 预览CSV中的用户名与原始密码');
      console.log('  node importUsers.js admin                                 # 创建管理员账户');
      process.exit(1);
  }
}

module.exports = { 
  importUsersFromCSV,
  viewAllUserCredentials,
  previewCredentialsFromCSV,
  createAdmin
};
