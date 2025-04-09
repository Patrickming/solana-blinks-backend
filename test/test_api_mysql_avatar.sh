#!/bin/bash

# 测试MySQL用户头像API
# 此脚本测试用户头像上传、获取和删除功能

# 设置基础URL
BASE_URL="https://dkynujeaxjjr.sealoshzh.site"

# 设置超时时间（秒）
CURL_TIMEOUT=10

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # 无颜色

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  MySQL用户头像API测试                        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# 生成唯一用户名和邮箱，避免重复
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_avatar_${TIMESTAMP}"
TEST_EMAIL="test_avatar_${TIMESTAMP}@example.com"

# 测试用户注册和登录（获取令牌）
echo -e "${BLUE}▶ 1. 准备测试环境${NC}"
echo -e "  注册测试用户..."

# 预期响应：
# 状态码：201
# {
#   "id": 用户ID,
#   "username": "testuser_avatar_xxx",
#   "email": "test_avatar_xxx@example.com",
#   "token": "JWT令牌"
# }
echo -e "  发送注册请求: POST $BASE_URL/api/users/register"
REGISTER_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$TEST_USERNAME'",
    "email": "'$TEST_EMAIL'",
    "password": "password123",
    "confirmPassword": "password123"
  }')

echo "  注册响应: $REGISTER_RESPONSE"

# 提取令牌和用户ID
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)
USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":[0-9]*' | cut -d ':' -f 2)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ 无法获取令牌，测试中止${NC}"
  echo -e "${YELLOW}  检查服务器是否运行正常，并确认API端点无误${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 注册成功，获取到令牌${NC}"
echo "  用户信息:"
echo "  • 用户名: $TEST_USERNAME"
echo "  • 邮箱: $TEST_EMAIL"
echo "  • 用户ID: $USER_ID"

echo -e "${BLUE}===============================================${NC}"

# 测试上传头像
echo -e "${BLUE}▶ 2. 测试上传头像功能${NC}"
echo "  创建测试图片文件..."

# 创建临时测试图片
TEMP_DIR=$(mktemp -d)
TEST_IMAGE="$TEMP_DIR/test_avatar.jpg"

# 创建简单的测试图片 (1x1像素的黑色JPEG)
echo -e "\x00\x00\x02\x11\x01\x01\x00\x00\x00\xff\x01\xd8\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xdb\x00\x43\x01\x09\x09\x09\x0c\x0b\x0c\x18\x0d\x0d\x18\x32\x21\x1c\x21\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\x32\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01\x22\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01\x7d\x01\x02\x03\x00\x04\x11\x05\x12\x21\x31\x41\x06\x13\x51\x61\x07\x22\x71\x14\x32\x81\x91\xa1\x08\x23\x42\xb1\xc1\x15\x52\xd1\xf0\x24\x33\x62\x72\x82\x09\x0a\x16\x17\x18\x19\x1a\x25\x26\x27\x28\x29\x2a\x34\x35\x36\x37\x38\x39\x3a\x43\x44\x45\x46\x47\x48\x49\x4a\x53\x54\x55\x56\x57\x58\x59\x5a\x63\x64\x65\x66\x67\x68\x69\x6a\x73\x74\x75\x76\x77\x78\x79\x7a\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xc4\x00\x1f\x01\x00\x03\x01\x01\x01\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x11\x00\x02\x01\x02\x04\x04\x03\x04\x07\x05\x04\x04\x00\x01\x02\x77\x00\x01\x02\x03\x11\x04\x05\x21\x31\x06\x12\x41\x51\x07\x61\x71\x13\x22\x32\x81\x08\x14\x42\x91\xa1\xb1\xc1\x09\x23\x33\x52\xf0\x15\x62\x72\xd1\x0a\x16\x24\x34\xe1\x25\xf1\x17\x18\x19\x1a\x26\x27\x28\x29\x2a\x35\x36\x37\x38\x39\x3a\x43\x44\x45\x46\x47\x48\x49\x4a\x53\x54\x55\x56\x57\x58\x59\x5a\x63\x64\x65\x66\x67\x68\x69\x6a\x73\x74\x75\x76\x77\x78\x79\x7a\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xf9\xfe\x8a\x28\xa0\x0f\xff\xd9" > $TEST_IMAGE

echo "  测试图片已创建: $TEST_IMAGE"

echo "  测试上传头像接口..."
echo -e "  发送上传请求: POST $BASE_URL/api/users/avatar"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_avatar_xxx",
#   "email": "test_avatar_xxx@example.com",
#   "avatar": "/uploads/avatars/avatar_xxx.jpg",
#   "message": "头像上传成功"
# }
UPLOAD_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/users/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@$TEST_IMAGE")

echo "  上传头像响应: $UPLOAD_RESPONSE"

# 检查响应中是否包含avatar字段
AVATAR_URL_CHECK=$(echo $UPLOAD_RESPONSE | grep -o '"avatar":"[^"]*"')
SUCCESS_MESSAGE_CHECK=$(echo $UPLOAD_RESPONSE | grep -o '"message":"头像上传成功"')

if [ ! -z "$AVATAR_URL_CHECK" ] && [ ! -z "$SUCCESS_MESSAGE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功上传用户头像${NC}"
else
  echo -e "${RED}✗ 测试失败: 上传用户头像${NC}"
  echo -e "${YELLOW}  预期: 响应应包含avatar字段和成功消息${NC}"
  echo -e "${YELLOW}  实际: $UPLOAD_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 上传接口问题、权限问题或超时${NC}"
fi

# 提取头像URL用于后续验证
AVATAR_URL=$(echo $UPLOAD_RESPONSE | grep -o '"avatar":"[^"]*"' | cut -d'"' -f 4)
echo "  头像URL: $AVATAR_URL"

echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}▶ 3. 测试获取带有头像的用户个人资料${NC}"
echo "  获取用户个人资料验证头像字段..."
echo -e "  发送请求: GET $BASE_URL/api/users/profile"
# 预期响应：
# 状态码：200
# {
#   "id": 用户ID,
#   "username": "testuser_avatar_xxx",
#   "email": "test_avatar_xxx@example.com",
#   "avatar": "/uploads/avatars/avatar_xxx.jpg",
#   ... 其他字段
# }
GET_PROFILE_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "  获取个人资料响应: $GET_PROFILE_RESPONSE"

# 检查响应中是否包含预期的头像URL
PROFILE_AVATAR_CHECK=$(echo $GET_PROFILE_RESPONSE | grep -o "\"avatar\":\"$AVATAR_URL\"")

if [ ! -z "$PROFILE_AVATAR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 头像URL正确存储在用户资料中${NC}"
else
  echo -e "${RED}✗ 测试失败: 获取的用户资料中头像URL不匹配${NC}"
  echo -e "${YELLOW}  预期: 响应中avatar字段应为 $AVATAR_URL${NC}"
  echo -e "${YELLOW}  实际: $GET_PROFILE_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 头像未正确保存或获取用户信息接口问题${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}▶ 4. 测试删除用户头像${NC}"
echo "  删除头像接口..."
echo -e "  发送请求: DELETE $BASE_URL/api/users/profile/avatar"
# 预期响应：
# 状态码：200
# {
#   "message": "头像已删除"
# }
DELETE_AVATAR_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/users/profile/avatar" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除头像响应: $DELETE_AVATAR_RESPONSE"

# 检查响应是否包含成功删除的消息
DELETE_SUCCESS_CHECK=$(echo $DELETE_AVATAR_RESPONSE | grep -o '"message":"头像已删除"')

if [ ! -z "$DELETE_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功删除用户头像${NC}"
else
  echo -e "${RED}✗ 测试失败: 删除用户头像${NC}"
  echo -e "${YELLOW}  预期: 响应应包含成功删除的消息${NC}"
  echo -e "${YELLOW}  实际: $DELETE_AVATAR_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 删除接口问题或权限问题${NC}"
fi

echo "  验证头像删除后的用户资料..."
echo -e "  发送请求: GET $BASE_URL/api/users/profile"
# 预期响应：
# 状态码：200
# 响应中avatar字段应为空
DELETE_PROFILE_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除头像后的个人资料响应: $DELETE_PROFILE_RESPONSE"

# 检查响应中avatar字段是否为空
EMPTY_AVATAR_CHECK=$(echo $DELETE_PROFILE_RESPONSE | grep -o '"avatar":""')

if [ ! -z "$EMPTY_AVATAR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 删除后用户资料中的头像为空${NC}"
else
  echo -e "${RED}✗ 测试失败: 删除后用户资料中的头像不为空${NC}"
  echo -e "${YELLOW}  预期: 响应中avatar字段应为空字符串${NC}"
  echo -e "${YELLOW}  实际: $DELETE_PROFILE_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 头像未成功删除或资料未正确更新${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}▶ 5. 测试不同格式和大小的头像上传${NC}"
echo "  创建过大的测试图片 (>5MB)..."

# 创建超出大小限制的测试图片 (5MB以上)
LARGE_TEST_IMAGE="$TEMP_DIR/large_test_avatar.jpg"
dd if=/dev/urandom of=$LARGE_TEST_IMAGE bs=1M count=6 2>/dev/null

echo "  大图片已创建: $LARGE_TEST_IMAGE (约6MB)"

echo "  测试上传过大图片 (应失败)..."
echo -e "  发送请求: POST $BASE_URL/api/users/avatar"
# 预期响应：
# 状态码：400
# {
#   "message": "文件大小不能超过5MB"
# }
LARGE_UPLOAD_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/users/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@$LARGE_TEST_IMAGE")

echo "  上传大图片响应: $LARGE_UPLOAD_RESPONSE"

# 检查响应是否包含错误消息
SIZE_ERROR_CHECK=$(echo $LARGE_UPLOAD_RESPONSE | grep -o '"message":"文件大小不能超过5MB"')

if [ ! -z "$SIZE_ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 超大图片上传被正确拒绝${NC}"
else
  echo -e "${RED}✗ 测试失败: 超大图片上传未被拒绝${NC}"
  echo -e "${YELLOW}  预期: 响应应包含文件大小超限的错误消息${NC}"
  echo -e "${YELLOW}  实际: $LARGE_UPLOAD_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 文件大小限制未实施或错误处理不正确${NC}"
fi

echo "  创建非图片格式测试文件..."

# 创建文本文件
TEXT_TEST_FILE="$TEMP_DIR/test_text.txt"
echo "This is not an image file" > $TEXT_TEST_FILE

echo "  文本文件已创建: $TEXT_TEST_FILE"

echo "  测试上传非图片文件 (应失败)..."
echo -e "  发送请求: POST $BASE_URL/api/users/avatar"
# 预期响应：
# 状态码：400
# {
#   "message": "只支持JPG, PNG, GIF和WEBP格式的图片"
# }
TEXT_UPLOAD_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/users/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@$TEXT_TEST_FILE")

echo "  上传文本文件响应: $TEXT_UPLOAD_RESPONSE"

# 检查响应是否包含错误消息
FORMAT_ERROR_CHECK=$(echo $TEXT_UPLOAD_RESPONSE | grep -o '"message":"只支持JPG, PNG, GIF和WEBP格式的图片"')

if [ ! -z "$FORMAT_ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 非图片文件上传被正确拒绝${NC}"
else
  echo -e "${RED}✗ 测试失败: 非图片文件上传未被拒绝${NC}"
  echo -e "${YELLOW}  预期: 响应应包含文件格式错误的消息${NC}"
  echo -e "${YELLOW}  实际: $TEXT_UPLOAD_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 文件类型验证未实施或错误处理不正确${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

echo -e "${BLUE}▶ 6. 清理测试环境${NC}"
echo "  删除测试用户..."
echo -e "  发送请求: DELETE $BASE_URL/api/users/profile"
# 预期响应：
# 状态码：200
# {
#   "message": "用户账户已成功删除"
# }
DELETE_USER_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除用户响应: $DELETE_USER_RESPONSE"

# 检查响应是否包含成功删除消息
USER_DELETE_CHECK=$(echo $DELETE_USER_RESPONSE | grep -o '"message":"用户账户已成功删除"')

if [ ! -z "$USER_DELETE_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 成功删除测试用户${NC}"
else
  echo -e "${RED}✗ 测试失败: 删除测试用户${NC}"
  echo -e "${YELLOW}  预期: 响应应包含成功删除用户的消息${NC}"
  echo -e "${YELLOW}  实际: $DELETE_USER_RESPONSE${NC}"
  echo -e "${YELLOW}  错误可能原因: 删除用户接口问题或权限问题${NC}"
fi

# 清理临时文件
rm -rf $TEMP_DIR
echo "  临时测试文件已清理"

echo -e "\n${GREEN}✓ MySQL用户头像API测试完成!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}测试总结：${NC}"
echo -e "${YELLOW}1. 如果测试中有任何步骤卡住，检查：${NC}"
echo -e "${YELLOW}   - 后端服务是否正常运行${NC}"
echo -e "${YELLOW}   - 数据库连接是否正常${NC}"
echo -e "${YELLOW}   - 上传目录是否有正确的写入权限${NC}"
echo -e "${YELLOW}2. 如果遇到超时错误，考虑：${NC}"
echo -e "${YELLOW}   - 增加CURL_TIMEOUT值（当前：$CURL_TIMEOUT秒）${NC}"
echo -e "${YELLOW}   - 检查服务器负载情况${NC}"
echo -e "${YELLOW}   - 检查日志中是否有错误${NC}"
echo -e "${BLUE}===============================================${NC}" 