# Node.js 项目 - 使用 nodemon 自动重启服务器

## 项目说明

这是一个使用 Express 和 MongoDB 构建的用户 API 服务。项目已配置 nodemon 用于开发环境中的自动重启功能。

## 使用 nodemon 的优势

- **自动重启**: 当代码文件发生变化时，服务器会自动重启，无需手动操作
- **提高开发效率**: 让开发者专注于代码编写，而不是重复的手动重启操作
- **实时反馈**: 代码修改后立即生效，可以快速查看更改结果

## 如何使用

项目已经配置了以下 npm 脚本：

```bash
# 开发模式（使用 nodemon 自动重启）
npm run dev

# 生产模式（不使用 nodemon）
npm start
```

### 开发模式特性

- 监视所有 JavaScript 文件的变化
- 当文件被修改时自动重启服务器
- 控制台会显示重启信息
- 可以通过输入 `rs` 手动触发重启

## 测试自动重启功能

1. 使用 `npm run dev` 启动服务器
2. 修改任意 JavaScript 文件（如 app.js 或 routes 目录下的文件）
3. 观察控制台，你会看到类似以下输出：
   ```
   [nodemon] restarting due to changes...
   [nodemon] starting `node app.js`
   服务器运行在端口 3000
   MongoDB连接成功
   ```

## 提示

如果需要配置 nodemon 的行为，可以在项目根目录创建 `nodemon.json` 文件进行自定义配置。