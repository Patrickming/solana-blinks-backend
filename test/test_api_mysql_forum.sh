#!/bin/bash

# 测试论坛社区API
# 此脚本测试话题、评论、标签和分类的CRUD功能

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
echo -e "${BLUE}  论坛社区API测试                             ${NC}"
echo -e "${BLUE}===============================================${NC}"

# 生成唯一用户名和邮箱，避免重复
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_forum_${TIMESTAMP}"
TEST_EMAIL="test_forum_${TIMESTAMP}@example.com"

# 测试用户注册和登录（获取令牌）
echo -e "${BLUE}▶ 1. 准备测试环境${NC}"
echo -e "  注册测试用户..."

# 预期响应：
# 状态码：201
# {
#   "id": 用户ID,
#   "username": "testuser_forum_xxx",
#   "email": "test_forum_xxx@example.com",
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

# 测试分类CRUD
echo -e "${BLUE}▶ 2. 测试分类功能${NC}"

# 获取分类列表
echo -e "  2.1 获取分类列表"
# 预期响应：
# 状态码：200
# {
#   "categories": [
#     {
#       "id": 分类ID,
#       "name": "分类名称",
#       "description": "分类描述",
#       "displayOrder": 显示顺序,
#       "topicsCount": 该分类下的话题数量,
#       "createdAt": "创建时间"
#     },
#     ...
#   ]
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/categories"
GET_CATEGORIES_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/categories")

echo "  获取分类列表响应: $GET_CATEGORIES_RESPONSE"

# 创建分类
echo -e "\n  2.2 创建新分类"
CATEGORY_NAME="测试分类_${TIMESTAMP}"
# 预期响应：
# 状态码：201
# {
#   "success": true,
#   "category": {
#     "id": 分类ID,
#     "name": "测试分类_xxx",
#     "description": "这是一个测试分类",
#     "displayOrder": 999,
#     "topicsCount": 0,
#     "createdAt": "创建时间"
#   }
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/categories"
CREATE_CATEGORY_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "'$CATEGORY_NAME'",
    "description": "这是一个测试分类",
    "displayOrder": 999
  }')

echo "  创建分类响应: $CREATE_CATEGORY_RESPONSE"

# 提取分类ID
CATEGORY_ID=$(echo $CREATE_CATEGORY_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d ':' -f 2)

if [ -z "$CATEGORY_ID" ]; then
  echo -e "${RED}✗ 创建分类失败${NC}"
  CATEGORY_ID=1  # 设置默认值继续测试
else
  echo -e "${GREEN}✓ 创建分类成功，分类ID: $CATEGORY_ID${NC}"
fi

# 获取分类详情
echo -e "\n  2.3 获取分类详情"
# 预期响应：
# 状态码：200
# {
#   "id": 分类ID,
#   "name": "测试分类_xxx",
#   "description": "这是一个测试分类",
#   "displayOrder": 999,
#   "topicsCount": 0,
#   "createdAt": "创建时间"
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/categories/$CATEGORY_ID"
GET_CATEGORY_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/categories/$CATEGORY_ID")

echo "  获取分类详情响应: $GET_CATEGORY_RESPONSE"

# 检查响应中是否包含分类名称
CATEGORY_NAME_CHECK=$(echo $GET_CATEGORY_RESPONSE | grep -o "\"name\":\"$CATEGORY_NAME\"")

if [ ! -z "$CATEGORY_NAME_CHECK" ]; then
  echo -e "${GREEN}✓ 获取分类详情成功${NC}"
else
  echo -e "${RED}✗ 获取分类详情失败${NC}"
fi

# 更新分类
echo -e "\n  2.4 更新分类"
NEW_CATEGORY_NAME="${CATEGORY_NAME}_updated"
# 预期响应：
# 状态码：200
# {
#   "success": true,
#   "category": {
#     "id": 分类ID,
#     "name": "测试分类_xxx_updated",
#     "description": "这是一个更新后的测试分类",
#     "displayOrder": 1000,
#     "topicsCount": 0,
#     "createdAt": "创建时间"
#   }
# }
echo -e "  发送请求: PUT $BASE_URL/api/forum/categories/$CATEGORY_ID"
UPDATE_CATEGORY_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X PUT "$BASE_URL/api/forum/categories/$CATEGORY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "'$NEW_CATEGORY_NAME'",
    "description": "这是一个更新后的测试分类",
    "displayOrder": 1000
  }')

echo "  更新分类响应: $UPDATE_CATEGORY_RESPONSE"

# 检查响应中是否包含成功标志
UPDATE_SUCCESS_CHECK=$(echo $UPDATE_CATEGORY_RESPONSE | grep -o '"success":true')

if [ ! -z "$UPDATE_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 更新分类成功${NC}"
else
  echo -e "${RED}✗ 更新分类失败${NC}"
fi

# 测试删除分类
echo -e "\n  2.5 删除分类"
# 预期响应：
# 状态码：200
# {
#   "success": true
# }
# 
# 如果分类下有话题，则会失败：
# 状态码：400
# {
#   "error": "无法删除该分类，因为该分类下还有话题"
# }
echo -e "  发送请求: DELETE $BASE_URL/api/forum/categories/$CATEGORY_ID"
DELETE_CATEGORY_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/categories/$CATEGORY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除分类响应: $DELETE_CATEGORY_RESPONSE"

# 检查响应中是否包含成功标志
DELETE_SUCCESS_CHECK=$(echo $DELETE_CATEGORY_RESPONSE | grep -o '"success":true')

if [ ! -z "$DELETE_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 删除分类成功${NC}"
else
  echo -e "${RED}✗ 删除分类失败${NC}"
  echo -e "${YELLOW}  如果存在使用此分类的话题，删除会失败${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

# 测试标签CRUD
echo -e "${BLUE}▶ 3. 测试标签功能${NC}"

# 获取标签列表
echo -e "  3.1 获取标签列表"
# 预期响应：
# 状态码：200
# {
#   "tags": [
#     {
#       "id": 标签ID,
#       "name": "标签名称",
#       "topicsCount": 使用该标签的话题数量,
#       "createdAt": "创建时间"
#     },
#     ...
#   ]
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/tags"
GET_TAGS_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/tags")

echo "  获取标签列表响应: $GET_TAGS_RESPONSE"

# 创建标签
echo -e "\n  3.2 创建新标签"
TAG_NAME="测试标签_${TIMESTAMP}"
# 预期响应：
# 状态码：201
# {
#   "success": true,
#   "tag": {
#     "id": 标签ID,
#     "name": "测试标签_xxx",
#     "topicsCount": 0,
#     "createdAt": "创建时间"
#   }
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/tags"
CREATE_TAG_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/tags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "'$TAG_NAME'"
  }')

echo "  创建标签响应: $CREATE_TAG_RESPONSE"

# 提取标签ID
TAG_ID=$(echo $CREATE_TAG_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d ':' -f 2)

if [ -z "$TAG_ID" ]; then
  echo -e "${RED}✗ 创建标签失败${NC}"
  TAG_ID=1  # 设置默认值继续测试
else
  echo -e "${GREEN}✓ 创建标签成功，标签ID: $TAG_ID${NC}"
fi

# 获取标签详情
echo -e "\n  3.3 获取标签详情"
# 预期响应：
# 状态码：200
# {
#   "id": 标签ID,
#   "name": "测试标签_xxx",
#   "topicsCount": 0,
#   "createdAt": "创建时间"
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/tags/$TAG_ID"
GET_TAG_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/tags/$TAG_ID")

echo "  获取标签详情响应: $GET_TAG_RESPONSE"

# 检查响应中是否包含标签名称
TAG_NAME_CHECK=$(echo $GET_TAG_RESPONSE | grep -o "\"name\":\"$TAG_NAME\"")

if [ ! -z "$TAG_NAME_CHECK" ]; then
  echo -e "${GREEN}✓ 获取标签详情成功${NC}"
else
  echo -e "${RED}✗ 获取标签详情失败${NC}"
fi

# 更新标签
echo -e "\n  3.4 更新标签"
NEW_TAG_NAME="${TAG_NAME}_updated"
# 预期响应：
# 状态码：200
# {
#   "success": true,
#   "tag": {
#     "id": 标签ID,
#     "name": "测试标签_xxx_updated",
#     "topicsCount": 0,
#     "createdAt": "创建时间"
#   }
# }
echo -e "  发送请求: PUT $BASE_URL/api/forum/tags/$TAG_ID"
UPDATE_TAG_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X PUT "$BASE_URL/api/forum/tags/$TAG_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "'$NEW_TAG_NAME'"
  }')

echo "  更新标签响应: $UPDATE_TAG_RESPONSE"

# 检查响应中是否包含成功标志
UPDATE_TAG_SUCCESS_CHECK=$(echo $UPDATE_TAG_RESPONSE | grep -o '"success":true')

if [ ! -z "$UPDATE_TAG_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 更新标签成功${NC}"
else
  echo -e "${RED}✗ 更新标签失败${NC}"
fi

# 测试删除标签
echo -e "\n  3.5 删除标签"
# 预期响应：
# 状态码：200
# {
#   "success": true
# }
echo -e "  发送请求: DELETE $BASE_URL/api/forum/tags/$TAG_ID"
DELETE_TAG_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/tags/$TAG_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除标签响应: $DELETE_TAG_RESPONSE"

# 检查响应中是否包含成功标志
DELETE_TAG_SUCCESS_CHECK=$(echo $DELETE_TAG_RESPONSE | grep -o '"success":true')

if [ ! -z "$DELETE_TAG_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 删除标签成功${NC}"
else
  echo -e "${RED}✗ 删除标签失败${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

# 测试话题CRUD
echo -e "${BLUE}▶ 4. 测试话题功能${NC}"

# 创建新分类供话题使用
echo -e "  4.0 创建测试用分类"
TOPIC_CATEGORY_NAME="话题测试分类_${TIMESTAMP}"
# 预期响应与创建分类相同
CREATE_TOPIC_CATEGORY_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "'$TOPIC_CATEGORY_NAME'",
    "description": "用于测试话题的分类"
  }')

TOPIC_CATEGORY_ID=$(echo $CREATE_TOPIC_CATEGORY_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d ':' -f 2)

# 创建话题
echo -e "\n  4.1 创建新话题"
TOPIC_TITLE="测试话题_${TIMESTAMP}"
TOPIC_CONTENT="这是一个测试话题的内容"
# 预期响应：
# 状态码：201
# {
#   "success": true,
#   "topicId": 话题ID
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/topics"
CREATE_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/topics" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "'$TOPIC_TITLE'",
    "content": "'$TOPIC_CONTENT'",
    "category": "'$TOPIC_CATEGORY_NAME'"
  }')

echo "  创建话题响应: $CREATE_TOPIC_RESPONSE"

# 提取话题ID
TOPIC_ID=$(echo $CREATE_TOPIC_RESPONSE | grep -o '"topicId":[0-9]*' | cut -d ':' -f 2)

if [ -z "$TOPIC_ID" ]; then
  echo -e "${RED}✗ 创建话题失败${NC}"
  TOPIC_ID=1  # 设置默认值继续测试
else
  echo -e "${GREEN}✓ 创建话题成功，话题ID: $TOPIC_ID${NC}"
fi

# 获取话题列表
echo -e "\n  4.2 获取话题列表"
# 预期响应：
# 状态码：200
# {
#   "topics": [
#     {
#       "id": 话题ID,
#       "title": "话题标题",
#       "content": "话题内容",
#       "category": "分类名称",
#       "authorId": 作者ID,
#       "authorName": "作者用户名",
#       "authorAvatar": "作者头像URL",
#       "status": "active",
#       "views": 浏览次数,
#       "likesCount": 点赞数,
#       "commentsCount": 评论数,
#       "isHot": false,
#       "isOfficial": false,
#       "isLiked": false,
#       "createdAt": "创建时间",
#       "updatedAt": "更新时间"
#     },
#     ...
#   ],
#   "totalCount": 总话题数,
#   "pageCount": 总页数
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/topics"
GET_TOPICS_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/topics")

echo "  获取话题列表响应: $GET_TOPICS_RESPONSE"

# 获取话题详情
echo -e "\n  4.3 获取话题详情"
# 预期响应：
# 状态码：200
# {
#   "topic": {
#     "id": 话题ID,
#     "title": "测试话题_xxx",
#     "content": "这是一个测试话题的内容",
#     "category": "话题测试分类_xxx",
#     "authorId": 作者ID,
#     "status": "active",
#     "views": 浏览次数,
#     "likesCount": 点赞数,
#     "commentsCount": 评论数,
#     "isHot": false,
#     "isOfficial": false,
#     "isLiked": false,
#     "tags": [],
#     "createdAt": "创建时间",
#     "updatedAt": "更新时间"
#   },
#   "author": {
#     "id": 作者ID,
#     "username": "作者用户名",
#     "avatar": "作者头像URL",
#     ...其他作者信息
#   }
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/topics/$TOPIC_ID"
GET_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/topics/$TOPIC_ID")

echo "  获取话题详情响应: $GET_TOPIC_RESPONSE"

# 检查响应中是否包含话题标题
TOPIC_TITLE_CHECK=$(echo $GET_TOPIC_RESPONSE | grep -o "\"title\":\"$TOPIC_TITLE\"")

if [ ! -z "$TOPIC_TITLE_CHECK" ]; then
  echo -e "${GREEN}✓ 获取话题详情成功${NC}"
else
  echo -e "${RED}✗ 获取话题详情失败${NC}"
fi

# 更新话题
echo -e "\n  4.4 更新话题"
NEW_TOPIC_TITLE="${TOPIC_TITLE}_updated"
NEW_TOPIC_CONTENT="这是更新后的话题内容"
# 预期响应：
# 状态码：200
# {
#   "success": true
# }
echo -e "  发送请求: PUT $BASE_URL/api/forum/topics/$TOPIC_ID"
UPDATE_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X PUT "$BASE_URL/api/forum/topics/$TOPIC_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "'$NEW_TOPIC_TITLE'",
    "content": "'$NEW_TOPIC_CONTENT'"
  }')

echo "  更新话题响应: $UPDATE_TOPIC_RESPONSE"

# 检查响应中是否包含成功标志
UPDATE_TOPIC_SUCCESS_CHECK=$(echo $UPDATE_TOPIC_RESPONSE | grep -o '"success":true')

if [ ! -z "$UPDATE_TOPIC_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 更新话题成功${NC}"
else
  echo -e "${RED}✗ 更新话题失败${NC}"
fi

# 测试话题点赞功能
echo -e "\n  4.5 话题点赞"
# 预期响应：
# 状态码：200
# {
#   "success": true,
#   "likesCount": 点赞数量
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/topics/$TOPIC_ID/like"
LIKE_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/topics/$TOPIC_ID/like" \
  -H "Authorization: Bearer $TOKEN")

echo "  话题点赞响应: $LIKE_TOPIC_RESPONSE"

# 检查响应中是否包含成功标志
LIKE_TOPIC_SUCCESS_CHECK=$(echo $LIKE_TOPIC_RESPONSE | grep -o '"success":true')

if [ ! -z "$LIKE_TOPIC_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 话题点赞成功${NC}"
else
  echo -e "${RED}✗ 话题点赞失败${NC}"
fi

# 测试取消话题点赞功能
echo -e "\n  4.6 取消话题点赞"
# 预期响应：
# 状态码：200
# {
#   "success": true,
#   "likesCount": 点赞数量
# }
echo -e "  发送请求: DELETE $BASE_URL/api/forum/topics/$TOPIC_ID/like"
UNLIKE_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/topics/$TOPIC_ID/like" \
  -H "Authorization: Bearer $TOKEN")

echo "  取消话题点赞响应: $UNLIKE_TOPIC_RESPONSE"

# 检查响应中是否包含成功标志
UNLIKE_TOPIC_SUCCESS_CHECK=$(echo $UNLIKE_TOPIC_RESPONSE | grep -o '"success":true')

if [ ! -z "$UNLIKE_TOPIC_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 取消话题点赞成功${NC}"
else
  echo -e "${RED}✗ 取消话题点赞失败${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

# 测试评论功能
echo -e "${BLUE}▶ 5. 测试评论功能${NC}"

# 创建评论
echo -e "  5.1 创建评论"
COMMENT_CONTENT="这是一条测试评论_${TIMESTAMP}"
# 预期响应：
# 状态码：201
# {
#   "success": true,
#   "commentId": 评论ID
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/topics/$TOPIC_ID/comments"
CREATE_COMMENT_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/topics/$TOPIC_ID/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "'$COMMENT_CONTENT'"
  }')

echo "  创建评论响应: $CREATE_COMMENT_RESPONSE"

# 提取评论ID
COMMENT_ID=$(echo $CREATE_COMMENT_RESPONSE | grep -o '"commentId":[0-9]*' | cut -d ':' -f 2)

if [ -z "$COMMENT_ID" ]; then
  echo -e "${RED}✗ 创建评论失败${NC}"
  COMMENT_ID=1  # 设置默认值继续测试
else
  echo -e "${GREEN}✓ 创建评论成功，评论ID: $COMMENT_ID${NC}"
fi

# 获取评论列表
echo -e "\n  5.2 获取评论列表"
# 预期响应：
# 状态码：200
# {
#   "comments": [
#     {
#       "id": 评论ID,
#       "topicId": 话题ID,
#       "authorId": 作者ID,
#       "authorName": "作者用户名",
#       "authorAvatar": "作者头像URL",
#       "content": "评论内容",
#       "parentId": 父评论ID或null,
#       "status": "active",
#       "likesCount": 点赞数,
#       "isLiked": false,
#       "createdAt": "创建时间",
#       "updatedAt": "更新时间",
#       "replies": [] // 回复列表
#     },
#     ...
#   ],
#   "totalCount": 总评论数
# }
echo -e "  发送请求: GET $BASE_URL/api/forum/topics/$TOPIC_ID/comments"
GET_COMMENTS_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X GET "$BASE_URL/api/forum/topics/$TOPIC_ID/comments")

echo "  获取评论列表响应: $GET_COMMENTS_RESPONSE"

# 测试评论点赞功能
echo -e "\n  5.3 评论点赞"
# 预期响应：
# 状态码：200
# {
#   "success": true,
#   "likesCount": 点赞数量
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/comments/$COMMENT_ID/like"
LIKE_COMMENT_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/comments/$COMMENT_ID/like" \
  -H "Authorization: Bearer $TOKEN")

echo "  评论点赞响应: $LIKE_COMMENT_RESPONSE"

# 检查响应中是否包含成功标志
LIKE_COMMENT_SUCCESS_CHECK=$(echo $LIKE_COMMENT_RESPONSE | grep -o '"success":true')

if [ ! -z "$LIKE_COMMENT_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 评论点赞成功${NC}"
else
  echo -e "${RED}✗ 评论点赞失败${NC}"
fi

# 测试取消评论点赞功能
echo -e "\n  5.4 取消评论点赞"
# 预期响应：
# 状态码：200
# {
#   "success": true,
#   "likesCount": 点赞数量
# }
echo -e "  发送请求: DELETE $BASE_URL/api/forum/comments/$COMMENT_ID/like"
UNLIKE_COMMENT_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/comments/$COMMENT_ID/like" \
  -H "Authorization: Bearer $TOKEN")

echo "  取消评论点赞响应: $UNLIKE_COMMENT_RESPONSE"

# 检查响应中是否包含成功标志
UNLIKE_COMMENT_SUCCESS_CHECK=$(echo $UNLIKE_COMMENT_RESPONSE | grep -o '"success":true')

if [ ! -z "$UNLIKE_COMMENT_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 取消评论点赞成功${NC}"
else
  echo -e "${RED}✗ 取消评论点赞失败${NC}"
fi

# 测试删除评论
echo -e "\n  5.5 删除评论"
# 预期响应：
# 状态码：200
# {
#   "success": true
# }
echo -e "  发送请求: DELETE $BASE_URL/api/forum/comments/$COMMENT_ID"
DELETE_COMMENT_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/comments/$COMMENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除评论响应: $DELETE_COMMENT_RESPONSE"

# 检查响应中是否包含成功标志
DELETE_COMMENT_SUCCESS_CHECK=$(echo $DELETE_COMMENT_RESPONSE | grep -o '"success":true')

if [ ! -z "$DELETE_COMMENT_SUCCESS_CHECK" ]; then
  echo -e "${GREEN}✓ 删除评论成功${NC}"
else
  echo -e "${RED}✗ 删除评论失败${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

# 测试错误情况
echo -e "${BLUE}▶ 6. 测试错误情况${NC}"

# 测试创建无效话题（缺少必要字段）
echo -e "  6.1 测试创建无效话题（缺少必要字段）"
# 预期响应：
# 状态码：400
# {
#   "error": "标题、内容和分类都是必需的"
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/topics"
INVALID_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/topics" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "无效话题"
  }')

echo "  创建无效话题响应: $INVALID_TOPIC_RESPONSE"

# 检查响应中是否包含错误消息
INVALID_TOPIC_ERROR_CHECK=$(echo $INVALID_TOPIC_RESPONSE | grep -o '"error":"[^"]*"')

if [ ! -z "$INVALID_TOPIC_ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 系统正确拒绝了无效话题${NC}"
else
  echo -e "${RED}✗ 测试失败: 系统未正确处理无效话题${NC}"
fi

# 测试创建重复标签
echo -e "\n  6.2 测试创建重复标签"
# 预期响应 (第一次):
# 状态码：201
# {
#   "success": true,
#   "tag": {
#     "id": 标签ID,
#     "name": "重复标签",
#     "topicsCount": 0,
#     "createdAt": "创建时间"
#   }
# }
#
# 预期响应 (第二次):
# 状态码：400
# {
#   "error": "该标签已存在"
# }
echo -e "  发送请求: POST $BASE_URL/api/forum/tags"
DUPLICATE_TAG_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/tags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "重复标签"
  }')

# 再次创建相同标签
DUPLICATE_TAG_RESPONSE2=$(curl -s -m $CURL_TIMEOUT -X POST "$BASE_URL/api/forum/tags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "重复标签"
  }')

echo "  创建重复标签响应: $DUPLICATE_TAG_RESPONSE2"

# 检查响应中是否包含错误消息
DUPLICATE_TAG_ERROR_CHECK=$(echo $DUPLICATE_TAG_RESPONSE2 | grep -o '"error":"[^"]*"')

if [ ! -z "$DUPLICATE_TAG_ERROR_CHECK" ]; then
  echo -e "${GREEN}✓ 测试通过: 系统正确拒绝了重复标签${NC}"
else
  echo -e "${RED}✗ 测试失败: 系统未正确处理重复标签${NC}"
fi

echo -e "${BLUE}===============================================${NC}"

# 清理资源
echo -e "${BLUE}▶ 7. 清理测试环境${NC}"

# 删除话题
echo -e "  7.1 删除测试话题"
# 预期响应：
# 状态码：200
# {
#   "success": true
# }
echo -e "  发送请求: DELETE $BASE_URL/api/forum/topics/$TOPIC_ID"
DELETE_TOPIC_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/topics/$TOPIC_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除话题响应: $DELETE_TOPIC_RESPONSE"

# 删除分类
echo -e "\n  7.2 删除测试分类"
# 预期响应：
# 状态码：200
# {
#   "success": true
# }
# 或 400 如果分类下有话题
echo -e "  发送请求: DELETE $BASE_URL/api/forum/categories/$TOPIC_CATEGORY_ID"
DELETE_TOPIC_CATEGORY_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/forum/categories/$TOPIC_CATEGORY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "  删除分类响应: $DELETE_TOPIC_CATEGORY_RESPONSE"

# # 删除测试用户 (根据要求移除此步骤)
# echo -e "\n  7.3 删除测试用户"
# # 预期响应：
# # 状态码：200
# # {
# #   "message": "用户账户已成功删除"
# # }
# echo -e "  发送请求: DELETE $BASE_URL/api/users/profile"
# DELETE_USER_RESPONSE=$(curl -s -m $CURL_TIMEOUT -X DELETE "$BASE_URL/api/users/profile" \
#   -H "Authorization: Bearer $TOKEN")
# 
# echo "  删除用户响应: $DELETE_USER_RESPONSE"
# 
# # 检查响应是否包含成功删除消息
# USER_DELETE_CHECK=$(echo $DELETE_USER_RESPONSE | grep -o '"message":"用户账户已成功删除"')
# 
# if [ ! -z "$USER_DELETE_CHECK" ]; then
#   echo -e "${GREEN}✓ 测试通过: 成功删除测试用户${NC}"
# else
#   echo -e "${RED}✗ 测试失败: 删除测试用户${NC}"
#   echo -e "${YELLOW}  注意: 此步骤现在已被禁用。如果需要测试用户删除，请取消注释。${NC}"
# fi

echo -e "\n${GREEN}✓ 论坛社区API测试完成!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}测试总结：${NC}"
echo -e "${YELLOW}1. 如果测试中有任何步骤卡住，检查：${NC}"
echo -e "${YELLOW}   - 后端服务是否正常运行${NC}"
echo -e "${YELLOW}   - 数据库连接是否正常${NC}"
echo -e "${YELLOW}2. 如果遇到超时错误，考虑：${NC}"
echo -e "${YELLOW}   - 增加CURL_TIMEOUT值（当前：$CURL_TIMEOUT秒）${NC}"
echo -e "${YELLOW}   - 检查服务器负载情况${NC}"
echo -e "${YELLOW}   - 检查日志中是否有错误${NC}"
echo -e "${BLUE}===============================================${NC}"
