#!/bin/bash

# 测试MySQL用户认证API
# 此脚本测试用户注册、登录、认证等与MySQL交互的功能

# 设置基础URL
BASE_URL="https://dkynujeaxjjr.sealoshzh.site"

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # 无颜色

echo "开始MySQL用户认证API测试..."
echo "=================="

# 生成唯一用户名和邮箱，避免重复
TIMESTAMP=$(date +%s)
TEST_USERNAME="testauth_mysql_${TIMESTAMP}"
TEST_EMAIL="testauth_mysql_${TIMESTAMP}@example.com"
PASSWORD="password123"

# 测试用户注册
echo "1. 测试用户注册API (MySQL)"
echo "1.1 测试成功注册"
# 预期响应：
# 状态码：201
# {
#   "id": 用户ID,
#   "username": "testauth_mysql_xxx",
#   "email": "testauth_mysql_xxx@example.com",
#   "token": "JWT令牌"
# }
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$TEST_USERNAME'",
    "email": "'$TEST_EMAIL'",
    "password": "'$PASSWORD'",
    "confirmPassword": "'$PASSWORD'"
  }')

echo "注册响应: $REGISTER_RESPONSE"

# 检查响应中是否包含预期字段
USERNAME_CHECK=$(echo $REGISTER_RESPONSE | grep -o '"username":"'$TEST_USERNAME'"')
EMAIL_CHECK=$(echo $REGISTER_RESPONSE | grep -o '"email":"'$TEST_EMAIL'"')
TOKEN_CHECK=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*"')

if [ ! -z "$USERNAME_CHECK" ] && [ ! -z "$EMAIL_CHECK" ] && [ ! -z "$TOKEN_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功在MySQL中注册用户${NC}"
else
  echo -e "${RED}✗ 测试失败: 在MySQL中注册用户${NC}"
  echo -e "${YELLOW}预期: 响应应包含用户名、邮箱和令牌${NC}"
  echo -e "${YELLOW}实际: $REGISTER_RESPONSE${NC}"
  exit 1
fi

echo "=================="

# 测试用户重复注册
echo "1.2 测试重复注册（应失败）"
# 预期响应：
# 状态码：400
# {
#   "message": "用户已存在"
# }
DUPLICATE_REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$TEST_USERNAME'",
    "email": "'$TEST_EMAIL'",
    "password": "'$PASSWORD'",
    "confirmPassword": "'$PASSWORD'"
  }')

echo "重复注册响应: $DUPLICATE_REGISTER_RESPONSE"

# 检查响应中是否包含用户已存在的消息
DUPLICATE_CHECK=$(echo $DUPLICATE_REGISTER_RESPONSE | grep -o '"message":"用户已存在"')

if [ ! -z "$DUPLICATE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL正确处理重复用户${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL处理重复用户${NC}"
  echo -e "${YELLOW}预期: 响应应包含用户已存在消息${NC}"
  echo -e "${YELLOW}实际: $DUPLICATE_REGISTER_RESPONSE${NC}"
fi

echo "=================="

# 测试用户登录
echo "2. 测试用户登录API (MySQL)"
echo "2.1 测试成功登录"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testauth_mysql_xxx",
#   "email": "testauth_mysql_xxx@example.com",
#   "token": "JWT令牌"
# }
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$PASSWORD'"
  }')

echo "登录响应: $LOGIN_RESPONSE"

# 提取令牌用于后续测试
LOGIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

# 检查响应中是否包含预期字段
LOGIN_USERNAME_CHECK=$(echo $LOGIN_RESPONSE | grep -o '"username":"'$TEST_USERNAME'"')
LOGIN_EMAIL_CHECK=$(echo $LOGIN_RESPONSE | grep -o '"email":"'$TEST_EMAIL'"')
LOGIN_TOKEN_CHECK=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"')

if [ ! -z "$LOGIN_USERNAME_CHECK" ] && [ ! -z "$LOGIN_EMAIL_CHECK" ] && [ ! -z "$LOGIN_TOKEN_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL用户成功登录${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL用户登录${NC}"
  echo -e "${YELLOW}预期: 响应应包含用户名、邮箱和令牌${NC}"
  echo -e "${YELLOW}实际: $LOGIN_RESPONSE${NC}"
  exit 1
fi

echo "=================="

# 测试错误密码登录
echo "2.2 测试错误密码登录（应失败）"
# 预期响应：
# 状态码：401
# {
#   "message": "邮箱或密码不正确"
# }
WRONG_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "wrongpassword"
  }')

echo "错误密码登录响应: $WRONG_LOGIN_RESPONSE"

# 检查响应中是否包含密码错误消息
WRONG_PASSWORD_CHECK=$(echo $WRONG_LOGIN_RESPONSE | grep -o '"message":"邮箱或密码不正确"')

if [ ! -z "$WRONG_PASSWORD_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL正确处理错误密码${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL处理错误密码${NC}"
  echo -e "${YELLOW}预期: 响应应包含密码错误消息${NC}"
  echo -e "${YELLOW}实际: $WRONG_LOGIN_RESPONSE${NC}"
fi

echo "=================="

# 测试验证令牌
echo "3. 测试令牌验证 (MySQL)"
echo "3.1 测试有效令牌访问受保护资源"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testauth_mysql_xxx",
#   "email": "testauth_mysql_xxx@example.com",
#   ... 其他资料字段
# }
PROTECTED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $LOGIN_TOKEN")

echo "有效令牌访问响应: $PROTECTED_RESPONSE"

# 检查响应中是否包含预期字段
PROTECTED_USERNAME_CHECK=$(echo $PROTECTED_RESPONSE | grep -o '"username":"'$TEST_USERNAME'"')
PROTECTED_EMAIL_CHECK=$(echo $PROTECTED_RESPONSE | grep -o '"email":"'$TEST_EMAIL'"')

if [ ! -z "$PROTECTED_USERNAME_CHECK" ] && [ ! -z "$PROTECTED_EMAIL_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL用户令牌验证成功${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL用户令牌验证${NC}"
  echo -e "${YELLOW}预期: 响应应包含用户信息${NC}"
  echo -e "${YELLOW}实际: $PROTECTED_RESPONSE${NC}"
fi

echo "=================="

# 测试修改密码
echo "4. 测试修改密码 (MySQL)"
echo "4.1 测试成功修改密码"

NEW_PASSWORD="newpassword123"

# 预期响应：
# 状态码：200
# {
#   "message": "密码更新成功"
# }
CHANGE_PASSWORD_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LOGIN_TOKEN" \
  -d '{
    "currentPassword": "'$PASSWORD'",
    "newPassword": "'$NEW_PASSWORD'",
    "confirmPassword": "'$NEW_PASSWORD'"
  }')

echo "修改密码响应: $CHANGE_PASSWORD_RESPONSE"

# 检查响应中是否包含成功消息
PASSWORD_CHANGE_SUCCESS=$(echo $CHANGE_PASSWORD_RESPONSE | grep -o '"message":"密码更新成功"')

if [ ! -z "$PASSWORD_CHANGE_SUCCESS" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL中密码修改成功${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL中密码修改${NC}"
  echo -e "${YELLOW}预期: 响应应包含密码更新成功消息${NC}"
  echo -e "${YELLOW}实际: $CHANGE_PASSWORD_RESPONSE${NC}"
fi

echo "=================="

# 测试用旧密码登录（应失败）
echo "4.2 测试旧密码登录（应失败）"
# 预期响应：
# 状态码：401
# {
#   "message": "邮箱或密码不正确"
# }
OLD_PASSWORD_LOGIN=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$PASSWORD'"
  }')

echo "旧密码登录响应: $OLD_PASSWORD_LOGIN"

# 检查响应中是否包含密码错误消息
OLD_PASSWORD_FAIL=$(echo $OLD_PASSWORD_LOGIN | grep -o '"message":"邮箱或密码不正确"')

if [ ! -z "$OLD_PASSWORD_FAIL" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL中旧密码已失效${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL中旧密码失效${NC}"
  echo -e "${YELLOW}预期: 响应应包含密码错误消息${NC}"
  echo -e "${YELLOW}实际: $OLD_PASSWORD_LOGIN${NC}"
fi

echo "=================="

# 测试新密码登录（应成功）
echo "4.3 测试新密码登录（应成功）"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testauth_mysql_xxx",
#   "email": "testauth_mysql_xxx@example.com",
#   "token": "JWT令牌"
# }
NEW_PASSWORD_LOGIN=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$NEW_PASSWORD'"
  }')

echo "新密码登录响应: $NEW_PASSWORD_LOGIN"

# 检查响应中是否包含预期字段
NEW_LOGIN_SUCCESS=$(echo $NEW_PASSWORD_LOGIN | grep -o '"token":"[^"]*"')

if [ ! -z "$NEW_LOGIN_SUCCESS" ]; then
  echo -e "${GREEN}✓ 测试通过: MySQL中新密码有效${NC}"
else
  echo -e "${RED}✗ 测试失败: MySQL中新密码有效性${NC}"
  echo -e "${YELLOW}预期: 响应应包含令牌${NC}"
  echo -e "${YELLOW}实际: $NEW_PASSWORD_LOGIN${NC}"
fi

echo "=================="

# 清理测试数据
echo "5. 清理测试数据"
# 获取新令牌用于删除账户
NEW_TOKEN=$(echo $NEW_PASSWORD_LOGIN | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

# 删除测试用户
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $NEW_TOKEN")

echo "删除用户响应: $DELETE_RESPONSE"

# 检查响应是否包含成功删除消息
DELETE_SUCCESS=$(echo $DELETE_RESPONSE | grep -o '"message":"用户账户已成功删除"')

if [ ! -z "$DELETE_SUCCESS" ]; then
  echo -e "${GREEN}✓ 测试数据清理成功${NC}"
else
  echo -e "${YELLOW}⚠ 测试数据可能未成功清理${NC}"
fi

echo -e "\n${GREEN}MySQL用户认证API测试完成!${NC}" 