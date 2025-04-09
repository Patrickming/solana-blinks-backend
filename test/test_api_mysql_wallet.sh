#!/bin/bash

# 测试MySQL用户钱包地址API
# 此脚本测试钱包地址连接、登录和关联功能

# 设置基础URL
BASE_URL="https://dkynujeaxjjr.sealoshzh.site"

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # 无颜色

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Solana Wallet登录/注册/绑定流程测试          ${NC}"
echo -e "${BLUE}===============================================${NC}"

# 使用提供的Solana钱包地址示例
WALLET_ADDRESS="HekxQd1SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7hX3"
# 第二个测试地址用于测试绑定功能
SECOND_WALLET_ADDRESS="HhX31SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7ekxQd"

# 生成测试用户数据
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_wallet_${TIMESTAMP}"
TEST_EMAIL="test_wallet_${TIMESTAMP}@example.com"
TEST_PASSWORD="password123"
WALLET_USERNAME=""  # 用于存储钱包创建的用户名
WALLET_EMAIL=""     # 用于存储钱包创建的邮箱

# 预清理：尝试删除可能存在的测试用户以确保测试干净
echo -e "${BLUE}▶ 预清理环境${NC}"
# 连接钱包地址获取令牌
echo "  尝试清理使用第一个钱包地址的用户..."
PRE_CONNECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "'$WALLET_ADDRESS'"
  }')

PRE_TOKEN=$(echo $PRE_CONNECT_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [ ! -z "$PRE_TOKEN" ]; then
  echo "  发现之前的测试用户，删除中..."
  curl -s -X DELETE "$BASE_URL/api/users/profile" \
    -H "Authorization: Bearer $PRE_TOKEN" > /dev/null
  echo "  删除完成"
fi

# 预清理第二个钱包地址
echo "  尝试清理使用第二个钱包地址的用户..."
PRE_CONNECT_RESPONSE2=$(curl -s -X POST "$BASE_URL/api/users/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "'$SECOND_WALLET_ADDRESS'"
  }')

PRE_TOKEN2=$(echo $PRE_CONNECT_RESPONSE2 | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [ ! -z "$PRE_TOKEN2" ]; then
  echo "  发现之前的测试用户，删除中..."
  curl -s -X DELETE "$BASE_URL/api/users/profile" \
    -H "Authorization: Bearer $PRE_TOKEN2" > /dev/null
  echo "  删除完成"
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}▶ 路径一: 钱包优先路径${NC}"
echo -e "${BLUE}  用户先连接钱包创建账号，再使用其他登录方式${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}1. 通过钱包地址创建新用户${NC}"
# 预期响应：
# 状态码：201
# {
#   "id": 用户ID,
#   "username": "user_HekxQd1S_timestamp",
#   "email": "HekxQd1S_timestamp@wallet.user",
#   "walletAddress": "HekxQd1SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7hX3",
#   "token": "JWT令牌",
#   "isNewUser": true
# }
CONNECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "'$WALLET_ADDRESS'"
  }')

echo "  钱包连接响应: $CONNECT_RESPONSE"

# 提取令牌和用户ID，用于后续请求
WALLET_TOKEN=$(echo $CONNECT_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)
WALLET_USER_ID=$(echo $CONNECT_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)
IS_NEW_USER=$(echo $CONNECT_RESPONSE | grep -o '"isNewUser":true')
# 提取用户名和邮箱(用于后续测试邮箱登录)
WALLET_USERNAME=$(echo $CONNECT_RESPONSE | grep -o '"username":"[^"]*"' | cut -d '"' -f 4)
WALLET_EMAIL=$(echo $CONNECT_RESPONSE | grep -o '"email":"[^"]*"' | cut -d '"' -f 4)

if [ -z "$WALLET_TOKEN" ]; then
  echo -e "${RED}✗ 无法获取令牌，测试中止${NC}"
  exit 1
fi

if [ ! -z "$IS_NEW_USER" ]; then
  echo -e "${GREEN}✓ 成功通过钱包地址创建新用户${NC}"
  echo "  用户名: $WALLET_USERNAME"
  echo "  邮箱: $WALLET_EMAIL"
  echo "  钱包地址: $WALLET_ADDRESS"
else
  echo -e "${RED}✗ 钱包用户应被创建为新用户${NC}"
  echo -e "${YELLOW}  预期: 响应中isNewUser应为true${NC}"
  echo -e "${YELLOW}  实际: $CONNECT_RESPONSE${NC}"
fi

echo -e "${BLUE}2. 使用相同钱包地址重新连接${NC}"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "user_HekxQd1S_timestamp",
#   "email": "HekxQd1S_timestamp@wallet.user",
#   "walletAddress": "HekxQd1SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7hX3",
#   "token": "JWT令牌",
#   "isNewUser": false
# }
RECONNECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "'$WALLET_ADDRESS'"
  }')

echo "  钱包重新连接响应: $RECONNECT_RESPONSE"

# 检查用户是否被识别为现有用户
IS_EXISTING_USER=$(echo $RECONNECT_RESPONSE | grep -o '"isNewUser":false')
RECONNECT_USER_ID=$(echo $RECONNECT_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)

if [ ! -z "$IS_EXISTING_USER" ] && [ "$RECONNECT_USER_ID" = "$WALLET_USER_ID" ]; then
  echo -e "${GREEN}✓ 再次连接钱包返回相同用户账号${NC}"
  echo "  用户ID: $RECONNECT_USER_ID (与原ID: $WALLET_USER_ID 相同)"
else
  echo -e "${RED}✗ 钱包重连应返回相同用户账号${NC}"
  echo -e "${YELLOW}  预期: 相同用户ID且isNewUser为false${NC}"
  echo -e "${YELLOW}  实际: $RECONNECT_RESPONSE${NC}"
fi

echo -e "${BLUE}3. 查看钱包用户资料${NC}"
WALLET_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $WALLET_TOKEN")

echo "  钱包用户资料: $WALLET_PROFILE_RESPONSE"

# 检查钱包地址是否正确存储
WALLET_ADDRESS_CHECK=$(echo $WALLET_PROFILE_RESPONSE | grep -o "\"walletAddress\":\"$WALLET_ADDRESS\"")

if [ ! -z "$WALLET_ADDRESS_CHECK" ]; then
  echo -e "${GREEN}✓ 钱包地址正确存储在用户资料中${NC}"
else
  echo -e "${RED}✗ 用户资料中钱包地址不匹配${NC}"
  echo -e "${YELLOW}  预期: walletAddress字段应为 $WALLET_ADDRESS${NC}"
  echo -e "${YELLOW}  实际: $WALLET_PROFILE_RESPONSE${NC}"
fi

echo -e "${BLUE}4. 为钱包用户设置密码（前端需实现）${NC}"
echo -e "${YELLOW}  注意: 系统应提供为钱包创建的用户设置密码的功能${NC}"
echo -e "${YELLOW}  此步骤需要在前端实现，测试脚本无法直接测试${NC}"
echo -e "${YELLOW}  用户应能通过密码重置流程或个人资料设置初始密码${NC}"

echo -e "${BLUE}5. 使用邮箱登录钱包创建的账号（前端需实现）${NC}"
echo -e "${YELLOW}  注意: 一旦用户设置了密码，应可使用系统分配的邮箱登录${NC}"
echo -e "${YELLOW}  邮箱: $WALLET_EMAIL${NC}"
echo -e "${YELLOW}  登录成功后应返回与钱包用户相同的账号，包含钱包地址${NC}"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}▶ 路径二: 账号优先路径${NC}"
echo -e "${BLUE}  用户先通过邮箱注册账号，再绑定钱包地址${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}1. 通过邮箱注册新用户${NC}"
# 预期响应：
# 状态码：201
# {
#   "id": 用户ID,
#   "username": "testuser_wallet_xxx",
#   "email": "test_wallet_xxx@example.com",
#   "token": "JWT令牌"
# }
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$TEST_USERNAME'",
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "confirmPassword": "'$TEST_PASSWORD'"
  }')

echo "  用户注册响应: $REGISTER_RESPONSE"

# 提取令牌和用户ID
NORMAL_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)
NORMAL_USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)

if [ -z "$NORMAL_TOKEN" ]; then
  echo -e "${RED}✗ 无法获取令牌，测试中止${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 成功通过邮箱注册新用户${NC}"
echo "  用户名: $TEST_USERNAME"
echo "  邮箱: $TEST_EMAIL"
echo "  用户ID: $NORMAL_USER_ID"

echo -e "${BLUE}2. 关联钱包地址到邮箱注册的用户${NC}"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_wallet_xxx",
#   "email": "test_wallet_xxx@example.com",
#   "walletAddress": "HhX31SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7ekxQd",
#   "message": "钱包地址关联成功"
# }
ASSOCIATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/profile/wallet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  -d '{
    "walletAddress": "'$SECOND_WALLET_ADDRESS'"
  }')

echo "  钱包关联响应: $ASSOCIATE_RESPONSE"

# 检查关联是否成功
ASSOCIATION_CHECK=$(echo $ASSOCIATE_RESPONSE | grep -o '"message":"钱包地址关联成功"')
WALLET_MATCH_CHECK=$(echo $ASSOCIATE_RESPONSE | grep -o "\"walletAddress\":\"$SECOND_WALLET_ADDRESS\"")

if [ ! -z "$ASSOCIATION_CHECK" ] && [ ! -z "$WALLET_MATCH_CHECK" ]; then
  echo -e "${GREEN}✓ 成功关联钱包地址到邮箱注册用户${NC}"
else
  echo -e "${RED}✗ 关联钱包地址失败${NC}"
  echo -e "${YELLOW}  预期: 响应中应包含成功消息和钱包地址${NC}"
  echo -e "${YELLOW}  实际: $ASSOCIATE_RESPONSE${NC}"
fi

echo -e "${BLUE}3. 使用已关联的钱包地址登录${NC}"
# 预期响应：
# 状态码：200
# {
#   "id": 相同的用户ID,
#   "username": "testuser_wallet_xxx",
#   "email": "test_wallet_xxx@example.com",
#   "walletAddress": "HhX31SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7ekxQd",
#   "token": "JWT令牌",
#   "isNewUser": false
# }
WALLET_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "'$SECOND_WALLET_ADDRESS'"
  }')

echo "  钱包登录响应: $WALLET_LOGIN_RESPONSE"

# 检查登录返回的是否为同一用户
WALLET_LOGIN_USER_ID=$(echo $WALLET_LOGIN_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)
WALLET_LOGIN_USERNAME=$(echo $WALLET_LOGIN_RESPONSE | grep -o '"username":"[^"]*"' | cut -d '"' -f 4)
WALLET_LOGIN_EMAIL=$(echo $WALLET_LOGIN_RESPONSE | grep -o '"email":"[^"]*"' | cut -d '"' -f 4)

if [ "$WALLET_LOGIN_USER_ID" = "$NORMAL_USER_ID" ] && \
   [ "$WALLET_LOGIN_USERNAME" = "$TEST_USERNAME" ] && \
   [ "$WALLET_LOGIN_EMAIL" = "$TEST_EMAIL" ]; then
  echo -e "${GREEN}✓ 使用钱包地址登录返回关联的邮箱注册账号${NC}"
  echo "  用户ID: $WALLET_LOGIN_USER_ID (与邮箱注册ID: $NORMAL_USER_ID 相同)"
  echo "  用户名和邮箱与邮箱注册时相同"
else
  echo -e "${RED}✗ 使用钱包地址登录应返回关联的邮箱注册账号${NC}"
  echo -e "${YELLOW}  预期: 与邮箱注册的相同用户ID、用户名和邮箱${NC}"
  echo -e "${YELLOW}  实际: $WALLET_LOGIN_RESPONSE${NC}"
fi

echo -e "${BLUE}4. 测试邮箱登录${NC}"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_wallet_xxx",
#   "email": "test_wallet_xxx@example.com",
#   "walletAddress": "HhX31SGHP33Pg8y2u1SVM3iE39mDnj5kBJQN3c7ekxQd", // 应包含钱包地址
#   "token": "JWT令牌"
# }
EMAIL_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

echo "  邮箱登录响应: $EMAIL_LOGIN_RESPONSE"

# 检查邮箱登录是否返回钱包地址
EMAIL_LOGIN_USER_ID=$(echo $EMAIL_LOGIN_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)
WALLET_IN_RESPONSE=$(echo $EMAIL_LOGIN_RESPONSE | grep -o "\"walletAddress\":\"$SECOND_WALLET_ADDRESS\"")

if [ "$EMAIL_LOGIN_USER_ID" = "$NORMAL_USER_ID" ] && [ ! -z "$WALLET_IN_RESPONSE" ]; then
  echo -e "${GREEN}✓ 邮箱登录成功并包含关联的钱包地址信息${NC}"
else
  echo -e "${RED}✗ 邮箱登录应返回包含钱包地址信息的账号${NC}"
  echo -e "${YELLOW}  预期: 响应中应包含用户信息及钱包地址${NC}"
  echo -e "${YELLOW}  实际: $EMAIL_LOGIN_RESPONSE${NC}"
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}▶ 安全限制测试${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}1. 测试尝试更改已设置的钱包地址（应失败）${NC}"
# 预期响应：
# 状态码：400
# {
#   "message": "您已关联钱包地址，不支持修改"
# }
CHANGE_WALLET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/profile/wallet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  -d '{
    "walletAddress": "TestNewWalletAddressXXXXXXXXXXXXXXXXXXXXXX"
  }')

echo "  更改钱包地址响应: $CHANGE_WALLET_RESPONSE"

# 检查是否正确拒绝更改
ERROR_CHECK=$(echo $CHANGE_WALLET_RESPONSE | grep -o '"message":"您已关联钱包地址，不支持修改"')

if [ ! -z "$ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 系统正确拒绝用户更改已设置的钱包地址${NC}"
else
  echo -e "${RED}✗ 系统应拒绝用户更改已设置的钱包地址${NC}"
  echo -e "${YELLOW}  预期: 响应应包含不支持修改的消息${NC}"
  echo -e "${YELLOW}  实际: $CHANGE_WALLET_RESPONSE${NC}"
fi

echo -e "${BLUE}2. 测试使用已关联的钱包地址（应失败）${NC}"
# 预期响应：
# 状态码：400
# {
#   "message": "该钱包地址已被其他用户使用"
# }
DUPLICATE_WALLET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/profile/wallet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WALLET_TOKEN" \
  -d '{
    "walletAddress": "'$SECOND_WALLET_ADDRESS'"
  }')

echo "  使用已关联钱包地址响应: $DUPLICATE_WALLET_RESPONSE"

# 检查是否正确拒绝使用重复钱包
DUP_ERROR_CHECK=$(echo $DUPLICATE_WALLET_RESPONSE | grep -o '"message":"该钱包地址已被其他用户使用"')

if [ ! -z "$DUP_ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 系统正确拒绝使用已被其他用户关联的钱包地址${NC}"
else
  echo -e "${RED}✗ 系统应拒绝使用已被其他用户关联的钱包地址${NC}"
  echo -e "${YELLOW}  预期: 响应应包含地址已被使用的消息${NC}"
  echo -e "${YELLOW}  实际: $DUPLICATE_WALLET_RESPONSE${NC}"
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}▶ 清理测试环境${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}1. 删除钱包用户${NC}"
WALLET_DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $WALLET_TOKEN")

echo "  删除钱包用户响应: $WALLET_DELETE_RESPONSE"

WALLET_DELETE_CHECK=$(echo $WALLET_DELETE_RESPONSE | grep -o '"message":"用户账户已成功删除"')

if [ ! -z "$WALLET_DELETE_CHECK" ]; then
  echo -e "${GREEN}✓ 成功删除钱包用户${NC}"
else
  echo -e "${RED}✗ 删除钱包用户失败${NC}"
  echo -e "${YELLOW}  预期: 响应应包含成功删除消息${NC}"
  echo -e "${YELLOW}  实际: $WALLET_DELETE_RESPONSE${NC}"
fi

echo -e "${BLUE}2. 删除邮箱注册用户${NC}"
NORMAL_DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $NORMAL_TOKEN")

echo "  删除邮箱注册用户响应: $NORMAL_DELETE_RESPONSE"

NORMAL_DELETE_CHECK=$(echo $NORMAL_DELETE_RESPONSE | grep -o '"message":"用户账户已成功删除"')

if [ ! -z "$NORMAL_DELETE_CHECK" ]; then
  echo -e "${GREEN}✓ 成功删除邮箱注册用户${NC}"
else
  echo -e "${RED}✗ 删除邮箱注册用户失败${NC}"
  echo -e "${YELLOW}  预期: 响应应包含成功删除消息${NC}"
  echo -e "${YELLOW}  实际: $NORMAL_DELETE_RESPONSE${NC}"
fi

echo -e "\n${GREEN}✓ Solana钱包登录/注册/绑定流程测试完成！${NC}"
echo -e "${BLUE}===============================================${NC}"
# 登录的逻辑继续修改：
# 1.如果我先连接钱包，那么直接创造用户，其他所有信息数据全部等待用户更新（之前写的api），后续不管是钱包连接还是邮箱密码登录都是同一个账号了（也就是说前端逻辑应该是，只要一个用户的地址不为空，那么就算登录成功，不管是连接钱包还是邮箱密码登录）
# 2.如果我先用邮箱用户名密码注册登录，也是直接创造用户（之前的逻辑），这个时候再连接钱包，钱包地址再被写入数据库并且永久绑定这个用户（所以钱包地址字段不应该为无法修改，而是不给用户修改）。
# 请根据具体逻辑修改代码
# 总结来说就是我使用钱包连接=自动创建用户，增加邮箱密码。下次登录如果连接钱包=登录成功=不再需要邮箱密码、如果邮箱密码登录=登录成功=可以选择再连接钱包（如果是别的钱包地址那么是连接失败的）。如果我先邮箱密码用户名注册，下次登录如果连接钱包=登录成功（自动绑定这个地址）=不再需要邮箱密码、如果邮箱密码登录=登录成功=可以选择再连接钱包（绑定这个连接的钱包地址（如果是其他在数据库里绑定过的地址那么会连接失败））