/**
 * 日志工具模块
 * 提供应用程序的日志记录功能
 * 支持不同级别的日志：info, warn, error
 */

// 获取当前时间戳的格式化字符串
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * 信息级别日志
 * @param {string} message - 日志消息
 * @param {Object} [data] - 可选的附加数据
 */
const info = (message, data = null) => {
  const logObject = {
    level: 'INFO',
    timestamp: getTimestamp(),
    message
  };
  
  if (data) {
    logObject.data = data;
  }
  
  console.log(JSON.stringify(logObject));
};

/**
 * 警告级别日志
 * @param {string} message - 日志消息
 * @param {Object} [data] - 可选的附加数据
 */
const warn = (message, data = null) => {
  const logObject = {
    level: 'WARN',
    timestamp: getTimestamp(),
    message
  };
  
  if (data) {
    logObject.data = data;
  }
  
  console.warn(JSON.stringify(logObject));
};

/**
 * 错误级别日志
 * @param {string} message - 日志消息
 * @param {Error|Object} [error] - 错误对象或附加数据
 */
const error = (message, error = null) => {
  const logObject = {
    level: 'ERROR',
    timestamp: getTimestamp(),
    message
  };
  
  if (error) {
    if (error instanceof Error) {
      logObject.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else {
      logObject.data = error;
    }
  }
  
  console.error(JSON.stringify(logObject));
};

module.exports = {
  info,
  warn,
  error
};