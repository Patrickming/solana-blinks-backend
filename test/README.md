# API 测试文件说明

本目录包含了各种API接口的测试脚本，用于验证API的功能和响应。每个测试文件都针对特定的API模块进行测试，确保接口的正确性和稳定性。

## 测试文件列表

### test_api_mysql_user.sh

MySQL用户数据操作API测试脚本，主要测试以下功能：

#### 1. 用户注册（MySQL版）
- 测试用户注册并存储到MySQL数据库

#### 2. 获取用户资料（MySQL版）
- 测试从MySQL获取用户资料

#### 3. 更新用户资料（MySQL版）
- 测试更新MySQL中的用户资料
- 验证更新后数据的正确性

#### 4. 删除用户账户（MySQL版）
- 测试删除MySQL用户
- 验证删除后无法访问

### test_api_mysql_auth.sh

MySQL用户认证API测试脚本，主要测试以下功能：

#### 1. 用户注册认证（MySQL版）
- 测试用户注册到MySQL
- 测试重复注册处理

#### 2. 用户登录认证（MySQL版）
- 测试正确凭据登录
- 测试错误密码处理

#### 3. 令牌认证（MySQL版）
- 测试基于MySQL的令牌验证

#### 4. 密码管理（MySQL版）
- 测试密码修改流程
- 测试新旧密码验证

### test_db_connection.sh

MySQL数据库连接测试脚本，主要测试以下功能：

#### 1. 数据库连接测试
- 测试MySQL连接是否成功

#### 2. 数据库存在性测试
- 测试指定的数据库是否存在
- 若不存在，尝试创建数据库

#### 3. 数据表测试
- 测试users表是否存在
- 检查users表结构是否符合预期

### test_mysql_crud.js

用户数据CRUD操作的JavaScript测试脚本，主要测试以下功能：

#### 1. 用户创建测试
- 测试创建新用户功能

#### 2. 用户查询测试
- 测试通过ID查找用户
- 测试通过邮箱查找用户

#### 3. 用户更新测试
- 测试更新用户信息

#### 4. 密码验证测试
- 测试正确密码验证
- 测试错误密码验证

#### 5. 数据清理测试
- 测试删除用户数据

每个测试用例都包含了预期的响应格式说明，包括HTTP状态码和JSON响应体的结构。

## 使用说明

1. 所有测试脚本都是基于bash shell编写，部分使用JavaScript
2. 测试前请确保API服务已经启动
3. 测试脚本会输出详细的测试过程和结果
4. 每个测试用例都有清晰的注释说明预期结果

## 运行MySQL API测试

要运行MySQL API相关测试，请按照以下步骤：

1. 确保应用服务器已启动
2. 确保MySQL服务器已连接配置成功
3. 运行API测试脚本：
   ```bash
   cd test
   chmod +x test_api_mysql_user.sh
   ./test_api_mysql_user.sh
   
   chmod +x test_api_mysql_auth.sh
   ./test_api_mysql_auth.sh
   ```

## 运行MySQL连接测试

要运行MySQL相关测试，请按照以下步骤：

1. 确保MySQL服务器已启动
2. 确保.env文件中的数据库配置正确
3. 运行数据库连接测试：
   ```bash
   cd test
   chmod +x test_db_connection.sh
   ./test_db_connection.sh
   ```
4. 运行CRUD操作测试：
   ```bash
   node test_mysql_crud.js
   ```

## 注意事项

- 测试前请确保环境变量和基础URL配置正确
- 测试过程中会创建测试用户数据，请注意数据清理
- 建议在测试环境中运行这些测试脚本
- API测试脚本中包含预期的响应格式，可用于前端开发参考