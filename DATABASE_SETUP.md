# 数据库配置说明

## 1. 安装依赖

首先需要安装 TypeORM 和 MySQL2：

```bash
npm install @nestjs/typeorm typeorm mysql2
```

如果遇到 Puppeteer 下载问题，可以设置环境变量跳过：

```bash
set PUPPETEER_SKIP_DOWNLOAD=true
npm install @nestjs/typeorm typeorm mysql2
```

## 2. 创建数据库

在 MySQL 中创建数据库：

```sql
CREATE DATABASE tftactics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=tftactics
NODE_ENV=development
```

## 4. 数据库表结构

项目使用 TypeORM，在开发环境下会自动同步表结构（`synchronize: true`）。

### 主要表结构：

- **team_comps**: 团队组合主表
- **champions**: 英雄表
- **items**: 装备表
- **champion_items**: 英雄装备关联表（多对多）
- **power_ups**: PowerUp 表
- **traits**: 特征表
- **carousel_items**: 轮盘装备表
- **team_options**: 选项表
- **team_option_champions**: 选项英雄关联表
- **early_comp_champions**: 早期组合英雄表
- **positioned_champions**: 站位英雄表

## 5. 使用说明

启动应用后，调用爬虫接口会自动将数据保存到数据库：

```bash
GET http://localhost:3000/crawler/tftactics
```

数据会自动保存到 MySQL 数据库中。

## 6. 生产环境配置

在生产环境中，建议：

1. 设置 `NODE_ENV=production`
2. 将 `synchronize` 设置为 `false`，使用迁移（migrations）来管理数据库结构
3. 使用连接池配置优化性能


