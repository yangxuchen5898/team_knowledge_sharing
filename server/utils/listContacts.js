require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../models/Contact');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bug_knowledge_platform';

async function main() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000, family: 4 });
    const status = process.argv[2];
    const query = {};
    if (status) {
      query.status = status;
    }
    const list = await Contact.find(query).sort({ createdAt: -1 }).lean();
    if (!list.length) {
      console.log('暂无联系表单记录');
    } else {
      console.log(`共 ${list.length} 条联系表单记录`);
      for (const item of list) {
        console.log('-------------------------------');
        console.log(`时间: ${new Date(item.createdAt).toISOString()}`);
        console.log(`姓名: ${item.name}`);
        console.log(`邮箱: ${item.email}`);
        console.log(`主题: ${item.subject}`);
        console.log(`状态: ${item.status}`);
        console.log(`内容:\n${item.message}`);
        if (item.ipAddress) console.log(`IP: ${item.ipAddress}`);
        if (item.userAgent) console.log(`UA: ${item.userAgent}`);
      }
    }
  } catch (err) {
    console.error('读取失败:', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
