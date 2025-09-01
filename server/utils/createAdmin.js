const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('管理员账户已存在:', process.env.ADMIN_EMAIL);
      process.exit(0);
    }

    // 创建管理员账户
    const admin = new User({
      username: 'admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isActive: true,
      isFirstLogin: false,
      createdBy: null, // 系统创建
      profile: {
        firstName: 'System',
        lastName: 'Administrator'
      }
    });

    // 特殊处理：管理员账户的createdBy指向自己
    await admin.save();
    admin.createdBy = admin._id;
    await admin.save();

    console.log('管理员账户创建成功!');
    console.log('邮箱:', process.env.ADMIN_EMAIL);
    console.log('密码:', process.env.ADMIN_PASSWORD);
    console.log('请登录后立即修改密码!');

  } catch (error) {
    console.error('创建管理员失败:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// 如果直接运行此文件，则创建管理员
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;
