const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('错误详情:', err);

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} 已存在`;
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose 类型转换错误
  if (err.name === 'CastError') {
    const message = '资源未找到';
    error = {
      message,
      statusCode: 404
    };
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    const message = '令牌无效';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = '令牌已过期';
    error = {
      message,
      statusCode: 401
    };
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超出限制';
    error = {
      message,
      statusCode: 400
    };
  }

  // 默认错误
  const statusCode = error.statusCode || 500;
  const message = error.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
