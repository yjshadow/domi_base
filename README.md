# RSS 翻译器

一个基于 NestJS 的 RSS 订阅服务，可以自动获取 RSS 源内容并进行翻译。

## 功能特点

- 支持添加、编辑和删除 RSS 源
- 自动定时获取 RSS 源更新
- 支持文章内容翻译
- RESTful API 接口
- 统一的响应格式和错误处理
- SQLite 数据存储

## 技术栈

- NestJS
- TypeORM
- SQLite
- TypeScript

## 安装

1. 克隆项目

```bash
git clone <repository-url>
cd rss-translator
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

复制 `.env.example` 文件为 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

主要配置项说明：

- `PORT`: 应用程序运行端口（默认：3000）
- `DATABASE_PATH`: SQLite 数据库文件路径
- `RSS_DEFAULT_UPDATE_INTERVAL`: RSS 源默认更新间隔（分钟）
- `RSS_MAX_ARTICLES_PER_SOURCE`: 每个源最多保存的文章数
- `TRANSLATION_API_KEY`: 翻译服务 API 密钥
- `TRANSLATION_API_URL`: 翻译服务 API 地址

## 运行

### 开发环境

```bash
npm run start:dev
```

### 生产环境

```bash
npm run build
npm run start:prod
```

## API 接口

### RSS 源管理

#### 添加 RSS 源

```http
POST /api/rss/sources
Content-Type: application/json

{
  "name": "示例源",
  "url": "https://example.com/feed.xml",
  "language": "en",
  "target_language": "zh",
  "update_interval": 60
}
```

#### 获取所有 RSS 源

```http
GET /api/rss/sources
```

#### 更新 RSS 源

```http
PUT /api/rss/sources/:id
Content-Type: application/json

{
  "name": "新名称",
  "active": false
}
```

#### 删除 RSS 源

```http
DELETE /api/rss/sources/:id
```

### 文章管理

#### 获取文章列表

```http
GET /api/rss/articles?source_id=1&page=1&limit=10
```

#### 获取文章详情

```http
GET /api/rss/articles/:id
```

### 调度器控制

#### 手动触发更新

```http
POST /api/rss/scheduler/trigger
```

#### 获取源状态统计

```http
GET /api/rss/sources/stats
```

## 响应格式

### 成功响应

```json
{
  "code": 200,
  "data": {
    // 响应数据
  },
  "message": "Success",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 错误响应

```json
{
  "code": 400,
  "error": {
    "code": "BAD_REQUEST",
    "message": "错误描述"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 开发

### 项目结构

```
src/
├── common/                 # 通用功能
│   ├── filters/           # 异常过滤器
│   └── interceptors/      # 拦截器
├── modules/               # 功能模块
│   ├── rss/              # RSS 模块
│   │   ├── dto/         # 数据传输对象
│   │   ├── entities/    # 数据库实体
│   │   └── ...
│   └── translation/      # 翻译模块
└── main.ts               # 应用入口
```

### 数据库迁移

项目使用 TypeORM 的自动迁移功能。在开发环境中，`synchronize: true` 会自动更新数据库架构。在生产环境中，应该使用迁移文件：

```bash
# 生成迁移
npm run typeorm:migration:generate -- -n MigrationName

# 运行迁移
npm run typeorm:migration:run
```

## 许可证

MIT