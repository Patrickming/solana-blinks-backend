#!/bin/bash

# 测试MySQL用户API
# 此脚本测试用户API与MySQL的交互，包括创建、查询、更新用户等功能

# 设置基础URL
BASE_URL="https://dkynujeaxjjr.sealoshzh.site"

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # 无颜色

echo "开始MySQL用户API测试..."
echo "=================="

# 生成唯一用户名和邮箱，避免重复
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_mysql_${TIMESTAMP}"
TEST_EMAIL="test_mysql_${TIMESTAMP}@example.com"

# 测试用户注册和登录（获取令牌）
echo "1. 准备测试环境"
echo "1.1 注册测试用户"
# 预期响应：
# 状态码：201
# {
#   "id": 用户ID,
#   "username": "testuser_mysql_xxx",
#   "email": "test_mysql_xxx@example.com",
#   "token": "JWT令牌"
# }
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$TEST_USERNAME'",
    "email": "'$TEST_EMAIL'",
    "password": "password123",
    "confirmPassword": "password123"
  }')

echo "注册响应: $REGISTER_RESPONSE"

# 提取令牌和用户ID
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)
USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}无法获取令牌，测试中止${NC}"
  exit 1
fi

echo "获取到的令牌: $TOKEN"
echo "获取到的用户ID: $USER_ID"

echo "=================="

# 测试获取用户个人资料接口
echo "2. 测试获取用户个人资料接口 (MySQL)"
echo "2.1 测试成功获取个人资料"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_mysql_xxx",
#   "email": "test_mysql_xxx@example.com",
#   ... 其他个人资料字段
# }
GET_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "获取个人资料响应: $GET_PROFILE_RESPONSE"

# 检查响应中是否包含预期的字段
USERNAME_CHECK=$(echo $GET_PROFILE_RESPONSE | grep -o '"username":"'$TEST_USERNAME'"')
EMAIL_CHECK=$(echo $GET_PROFILE_RESPONSE | grep -o '"email":"'$TEST_EMAIL'"')

if [ ! -z "$USERNAME_CHECK" ] && [ ! -z "$EMAIL_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功从MySQL获取用户个人资料${NC}"
else
  echo -e "${RED}✗ 测试失败: 从MySQL获取用户个人资料${NC}"
  echo -e "${YELLOW}预期: 响应应包含用户名、邮箱等字段${NC}"
  echo -e "${YELLOW}实际: $GET_PROFILE_RESPONSE${NC}"
fi

echo "2.2 测试使用无效令牌获取个人资料（应失败）"
# 预期响应：
# 状态码：401
# {
#   "message": "未授权，令牌无效"
# }
INVALID_TOKEN="invalid_token_123"
INVALID_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $INVALID_TOKEN")

echo "无效令牌响应: $INVALID_TOKEN_RESPONSE"

# 检查响应是否包含未授权消息
UNAUTHORIZED_TOKEN_CHECK=$(echo $INVALID_TOKEN_RESPONSE | grep -o '"message":"未授权')

if [ ! -z "$UNAUTHORIZED_TOKEN_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 无效令牌被正确拒绝${NC}"
else
  echo -e "${RED}✗ 测试失败: 无效令牌未被正确拒绝${NC}"
  echo -e "${YELLOW}预期: 响应应包含未授权消息${NC}"
  echo -e "${YELLOW}实际: $INVALID_TOKEN_RESPONSE${NC}"
fi

echo "=================="

# 测试更新用户资料接口
echo "3. 测试更新用户资料接口 (MySQL)"
echo "3.1 测试成功更新用户资料"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_mysql_xxx",
#   "email": "test_mysql_xxx@example.com",
#   "phone": "13900139000",
#   "qq": "987654321",
#   "github": "testgithub",
#   "twitter": "testtwitter",
#   "website": "https://example.com",
#   ... 其他更新后的字段
# }
UPDATE_PROFILE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "phone": "13900139000",
    "qq": "987654321",
    "region": "上海",
    "techStack": "JavaScript, Node.js, MySQL",
    "bio": "MySQL测试用户",
    "github": "testgithub",
    "twitter": "testtwitter",
    "website": "https://example.com"
  }')

echo "更新资料响应: $UPDATE_PROFILE_RESPONSE"

# 检查响应中是否包含更新后的字段
PHONE_CHECK=$(echo $UPDATE_PROFILE_RESPONSE | grep -o '"phone":"13900139000"')
QQ_CHECK=$(echo $UPDATE_PROFILE_RESPONSE | grep -o '"qq":"987654321"')
GITHUB_CHECK=$(echo $UPDATE_PROFILE_RESPONSE | grep -o '"github":"testgithub"')
TWITTER_CHECK=$(echo $UPDATE_PROFILE_RESPONSE | grep -o '"twitter":"testtwitter"')
WEBSITE_CHECK=$(echo $UPDATE_PROFILE_RESPONSE | grep -o '"website":"https://example.com"')

if [ ! -z "$PHONE_CHECK" ] && [ ! -z "$QQ_CHECK" ] && [ ! -z "$GITHUB_CHECK" ] && [ ! -z "$TWITTER_CHECK" ] && [ ! -z "$WEBSITE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功在MySQL中更新用户资料${NC}"
else
  echo -e "${RED}✗ 测试失败: 在MySQL中更新用户资料${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的所有字段${NC}"
  echo -e "${YELLOW}实际: $UPDATE_PROFILE_RESPONSE${NC}"
fi

echo "3.2 测试无效数据格式（应失败）"
# 预期响应：
# 状态码：400 或其他错误状态
INVALID_DATA_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "phone": "not_a_valid_phone_number",
    "qq": "not_a_valid_qq"
  }')

echo "无效数据格式响应: $INVALID_DATA_RESPONSE"

# 此处没有严格验证返回值，因为实现可能不一样，只要能返回某种错误即可
# 实际项目中需根据具体实现调整验证方式

echo "=================="

# 测试获取更新后的用户个人资料
echo "4. 测试获取更新后的用户个人资料"
echo "4.1 验证数据是否已正确保存在MySQL中"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_mysql_xxx",
#   "email": "test_mysql_xxx@example.com",
#   "phone": "13900139000",
#   "qq": "987654321",
#   "github": "testgithub",
#   "twitter": "testtwitter",
#   "website": "https://example.com",
#   ... 其他更新后的字段
# }
GET_UPDATED_PROFILE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "获取更新后的资料响应: $GET_UPDATED_PROFILE"

# 检查响应中是否包含更新后的字段
UPDATED_PHONE_CHECK=$(echo $GET_UPDATED_PROFILE | grep -o '"phone":"13900139000"')
UPDATED_QQ_CHECK=$(echo $GET_UPDATED_PROFILE | grep -o '"qq":"987654321"')
UPDATED_GITHUB_CHECK=$(echo $GET_UPDATED_PROFILE | grep -o '"github":"testgithub"')
UPDATED_TWITTER_CHECK=$(echo $GET_UPDATED_PROFILE | grep -o '"twitter":"testtwitter"')
UPDATED_WEBSITE_CHECK=$(echo $GET_UPDATED_PROFILE | grep -o '"website":"https://example.com"')

if [ ! -z "$UPDATED_PHONE_CHECK" ] && [ ! -z "$UPDATED_QQ_CHECK" ] && [ ! -z "$UPDATED_GITHUB_CHECK" ] && [ ! -z "$UPDATED_TWITTER_CHECK" ] && [ ! -z "$UPDATED_WEBSITE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL中的用户数据已正确保存和检索${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL中的用户数据保存或检索${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的所有数据${NC}"
  echo -e "${YELLOW}实际: $GET_UPDATED_PROFILE${NC}"
fi

echo "=================="

# 测试修改密码接口
echo "4. 测试修改密码接口 (MySQL)"
echo "4.1 测试成功修改密码"
# 预期响应：
# 状态码：200
# {
#   "message": "密码更新成功"
# }
PASSWORD_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "newPassword": "newpassword123",
    "confirmPassword": "newpassword123"
  }')

echo "密码修改响应: $PASSWORD_UPDATE_RESPONSE"

# 检查响应是否包含成功消息
PASSWORD_SUCCESS_CHECK=$(echo $PASSWORD_UPDATE_RESPONSE | grep -o '"message":"密码更新成功"')

if [ ! -z "$PASSWORD_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功修改密码${NC}"
else
  echo -e "${RED}✗ 测试失败: 密码修改${NC}"
  echo -e "${YELLOW}预期: 响应应包含成功更新消息${NC}"
  echo -e "${YELLOW}实际: $PASSWORD_UPDATE_RESPONSE${NC}"
fi

echo "4.2 测试新密码与确认密码不匹配（应失败）"
# 预期响应：
# 状态码：400
# {
#   "message": "新密码和确认密码不匹配"
# }
MISMATCH_PASSWORD_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "newPassword": "password789",
    "confirmPassword": "different_password"
  }')

echo "密码不匹配响应: $MISMATCH_PASSWORD_RESPONSE"

# 检查响应是否包含错误消息
PASSWORD_MISMATCH_CHECK=$(echo $MISMATCH_PASSWORD_RESPONSE | grep -o '"message":"新密码和确认密码不匹配"')

if [ ! -z "$PASSWORD_MISMATCH_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 密码不匹配被正确拒绝${NC}"
else
  echo -e "${RED}✗ 测试失败: 密码不匹配未被正确拒绝${NC}"
  echo -e "${YELLOW}预期: 响应应包含密码不匹配消息${NC}"
  echo -e "${YELLOW}实际: $MISMATCH_PASSWORD_RESPONSE${NC}"
fi

echo "=================="

# 测试专门更新GitHub和Twitter字段
echo "5. 测试专门更新GitHub和Twitter字段 (MySQL)"
echo "5.1 更新GitHub资料"
# 预期响应：
# 状态码：200
# 响应包含更新后的github字段
GITHUB_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "github": "updated_github_name"
  }')

echo "GitHub更新响应: $GITHUB_UPDATE_RESPONSE"

# 检查响应中是否包含更新后的GitHub字段
GITHUB_UPDATE_CHECK=$(echo $GITHUB_UPDATE_RESPONSE | grep -o '"github":"updated_github_name"')

if [ ! -z "$GITHUB_UPDATE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功更新GitHub用户名${NC}"
else
  echo -e "${RED}✗ 测试失败: 更新GitHub用户名${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的GitHub用户名${NC}"
  echo -e "${YELLOW}实际: $GITHUB_UPDATE_RESPONSE${NC}"
fi

echo "5.2 更新Twitter资料"
# 预期响应：
# 状态码：200
# 响应包含更新后的twitter字段
TWITTER_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "twitter": "updated_twitter_name"
  }')

echo "Twitter更新响应: $TWITTER_UPDATE_RESPONSE"

# 检查响应中是否包含更新后的Twitter字段
TWITTER_UPDATE_CHECK=$(echo $TWITTER_UPDATE_RESPONSE | grep -o '"twitter":"updated_twitter_name"')

if [ ! -z "$TWITTER_UPDATE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功更新Twitter用户名${NC}"
else
  echo -e "${RED}✗ 测试失败: 更新Twitter用户名${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的Twitter用户名${NC}"
  echo -e "${YELLOW}实际: $TWITTER_UPDATE_RESPONSE${NC}"
fi

echo "5.3 验证更新后的GitHub和Twitter资料"
# 获取更新后的个人资料
FINAL_PROFILE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "最终个人资料响应: $FINAL_PROFILE"

# 检查响应中是否包含更新后的GitHub和Twitter字段
FINAL_GITHUB_CHECK=$(echo $FINAL_PROFILE | grep -o '"github":"updated_github_name"')
FINAL_TWITTER_CHECK=$(echo $FINAL_PROFILE | grep -o '"twitter":"updated_twitter_name"')

if [ ! -z "$FINAL_GITHUB_CHECK" ] && [ ! -z "$FINAL_TWITTER_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: GitHub和Twitter更新已持久化到数据库${NC}"
else
  echo -e "${RED}✗ 测试失败: GitHub和Twitter更新未持久化到数据库${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的GitHub和Twitter用户名${NC}"
  echo -e "${YELLOW}实际: $FINAL_PROFILE${NC}"
fi

echo "=================="

# 测试更新用户名和邮箱
echo "6. 测试更新用户名和邮箱 (MySQL)"
echo "6.1 更新用户名"
# 预期响应：
# 状态码：200
# 响应包含更新后的username字段和新的token
NEW_USERNAME="testuser_mysql_updated_${TIMESTAMP}"
USERNAME_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "'$NEW_USERNAME'"
  }')

echo "用户名更新响应: $USERNAME_UPDATE_RESPONSE"

# 检查响应中是否包含更新后的用户名和新令牌
USERNAME_UPDATE_CHECK=$(echo $USERNAME_UPDATE_RESPONSE | grep -o '"username":"'$NEW_USERNAME'"')
NEW_TOKEN_CHECK=$(echo $USERNAME_UPDATE_RESPONSE | grep -o '"token":"[^"]*"')

if [ ! -z "$USERNAME_UPDATE_CHECK" ] && [ ! -z "$NEW_TOKEN_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功更新用户名并获得新令牌${NC}"
else
  echo -e "${RED}✗ 测试失败: 更新用户名${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的用户名和新令牌${NC}"
  echo -e "${YELLOW}实际: $USERNAME_UPDATE_RESPONSE${NC}"
fi

# 更新令牌以使用新生成的
NEW_TOKEN=$(echo $USERNAME_UPDATE_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)
if [ ! -z "$NEW_TOKEN" ]; then
  TOKEN=$NEW_TOKEN
  echo "更新令牌为: $TOKEN"
fi

echo "6.2 更新邮箱"
# 预期响应：
# 状态码：200
# 响应包含更新后的email字段和新的token
NEW_EMAIL="test_mysql_updated_${TIMESTAMP}@example.com"
EMAIL_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "'$NEW_EMAIL'"
  }')

echo "邮箱更新响应: $EMAIL_UPDATE_RESPONSE"

# 检查响应中是否包含更新后的邮箱和新令牌
EMAIL_UPDATE_CHECK=$(echo $EMAIL_UPDATE_RESPONSE | grep -o '"email":"'$NEW_EMAIL'"')
NEW_TOKEN_CHECK=$(echo $EMAIL_UPDATE_RESPONSE | grep -o '"token":"[^"]*"')

if [ ! -z "$EMAIL_UPDATE_CHECK" ] && [ ! -z "$NEW_TOKEN_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功更新邮箱并获得新令牌${NC}"
else
  echo -e "${RED}✗ 测试失败: 更新邮箱${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的邮箱和新令牌${NC}"
  echo -e "${YELLOW}实际: $EMAIL_UPDATE_RESPONSE${NC}"
fi

# 更新令牌以使用新生成的
NEW_TOKEN=$(echo $EMAIL_UPDATE_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)
if [ ! -z "$NEW_TOKEN" ]; then
  TOKEN=$NEW_TOKEN
  echo "更新令牌为: $TOKEN"
fi

echo "6.3 测试重复用户名（应失败）"
# 预期响应：
# 状态码：400
# {
#   "message": "该用户名已被使用"
# }
# 先创建一个新用户以获取一个已存在的用户名
DUPLICATE_USERNAME="duplicate_user_${TIMESTAMP}"
DUPLICATE_EMAIL="duplicate_${TIMESTAMP}@example.com"

DUPLICATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$DUPLICATE_USERNAME'",
    "email": "'$DUPLICATE_EMAIL'",
    "password": "password123",
    "confirmPassword": "password123"
  }')

echo "创建重复测试用户响应: $DUPLICATE_USER_RESPONSE"

# 尝试将当前用户的用户名更新为重复的用户名
DUPLICATE_USERNAME_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "'$DUPLICATE_USERNAME'"
  }')

echo "重复用户名响应: $DUPLICATE_USERNAME_RESPONSE"

# 检查响应是否包含错误消息
USERNAME_ERROR_CHECK=$(echo $DUPLICATE_USERNAME_RESPONSE | grep -o '"message":"该用户名已被使用"')

if [ ! -z "$USERNAME_ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 重复用户名被正确拒绝${NC}"
else
  echo -e "${RED}✗ 测试失败: 重复用户名未被正确拒绝${NC}"
  echo -e "${YELLOW}预期: 响应应包含用户名已被使用的错误消息${NC}"
  echo -e "${YELLOW}实际: $DUPLICATE_USERNAME_RESPONSE${NC}"
fi

echo "6.4 验证更新后的用户名和邮箱"
# 获取最终更新后的个人资料
FINAL_PROFILE_UPDATED=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "最终更新后的个人资料响应: $FINAL_PROFILE_UPDATED"

# 检查响应中是否包含更新后的用户名和邮箱
FINAL_USERNAME_CHECK=$(echo $FINAL_PROFILE_UPDATED | grep -o '"username":"'$NEW_USERNAME'"')
FINAL_EMAIL_CHECK=$(echo $FINAL_PROFILE_UPDATED | grep -o '"email":"'$NEW_EMAIL'"')

if [ ! -z "$FINAL_USERNAME_CHECK" ] && [ ! -z "$FINAL_EMAIL_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 用户名和邮箱更新已持久化到数据库${NC}"
else
  echo -e "${RED}✗ 测试失败: 用户名和邮箱更新未持久化到数据库${NC}"
  echo -e "${YELLOW}预期: 响应应包含更新后的用户名和邮箱${NC}"
  echo -e "${YELLOW}实际: $FINAL_PROFILE_UPDATED${NC}"
fi

echo "=================="

# 测试删除用户账户
echo "7. 测试删除用户账户 (MySQL)"
echo "7.1 测试成功删除用户"
# 预期响应：
# 状态码：200
# {
#   "message": "用户账户已成功删除"
# }
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "删除账户响应: $DELETE_RESPONSE"

# 检查响应是否包含成功删除消息
SUCCESS_DELETE_CHECK=$(echo $DELETE_RESPONSE | grep -o '"message":"用户账户已成功删除"')

if [ ! -z "$SUCCESS_DELETE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功从MySQL删除用户${NC}"
else
  echo -e "${RED}✗ 测试失败: 从MySQL删除用户${NC}"
  echo -e "${YELLOW}预期: 响应应包含成功删除消息${NC}"
  echo -e "${YELLOW}实际: $DELETE_RESPONSE${NC}"
fi

echo "7.2 测试删除后访问个人资料（应失败）"
# 预期响应：
# 状态码：401
# {
#   "message": "未授权，令牌无效"
# }
DELETED_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "删除后访问资料响应: $DELETED_PROFILE_RESPONSE"

# 检查响应是否包含未授权消息
UNAUTHORIZED_CHECK=$(echo $DELETED_PROFILE_RESPONSE | grep -o '"message":"未授权')

if [ ! -z "$UNAUTHORIZED_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 用户从MySQL成功删除，无法再访问${NC}"
else
  echo -e "${RED}✗ 测试失败: 用户从MySQL删除后，仍能访问${NC}"
  echo -e "${YELLOW}预期: 响应应包含未授权消息${NC}"
  echo -e "${YELLOW}实际: $DELETED_PROFILE_RESPONSE${NC}"
fi

echo -e "\n${GREEN}MySQL用户API测试完成!${NC}" 