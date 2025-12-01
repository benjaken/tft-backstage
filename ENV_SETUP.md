# 环境变量配置说明

## ⚠️ 当前错误

**错误信息**: `Access denied for user 'root'@'localhost' (using password: NO)`

**原因**: `.env` 文件中的 `DB_PASSWORD` 为空或未配置。

## ✅ 已完成的修复

1. ✅ 已创建 `.env` 文件
2. ✅ 已更新数据库配置使用 ConfigService
3. ✅ 已配置 ConfigModule 自动加载 `.env` 文件

## 📝 配置步骤

### 1. 编辑 `.env` 文件

打开项目根目录下的 `.env` 文件，填写你的 MySQL root 密码：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的MySQL密码
DB_DATABASE=tftactics

# 环境
NODE_ENV=development

# Puppeteer 配置（可选）
PUPPETEER_EXECUTABLE_PATH=
```

### 2. 如果 MySQL root 密码为空

如果你的 MySQL root 用户没有设置密码，将 `.env` 文件中的 `DB_PASSWORD` 留空：

```env
DB_PASSWORD=
```

但如果 MySQL 配置要求必须使用密码，你需要：

#### 选项 A: 设置 MySQL root 密码
```sql
-- 在 MySQL 中执行
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

#### 选项 B: 创建新用户（推荐用于开发）
```sql
-- 创建新用户
CREATE USER 'tftactics'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tftactics.* TO 'tftactics'@'localhost';
FLUSH PRIVILEGES;
```

然后在 `.env` 文件中使用新用户：
```env
DB_USERNAME=tftactics
DB_PASSWORD=your_password
```

### 3. 创建数据库

确保数据库已创建：
```sql
CREATE DATABASE IF NOT EXISTS tftactics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 🔍 验证配置

### 方法 1: 测试 MySQL 连接
```bash
# 如果有 MySQL 命令行工具
mysql -u root -p
# 输入密码，如果能连接说明配置正确
```

### 方法 2: 启动应用测试
```bash
pnpm start:dev
```

如果配置正确，应该看到：
- ✅ TypeORM 连接成功
- ✅ 表结构自动创建

如果仍有错误，检查：
- `.env` 文件中的密码是否正确
- MySQL 服务是否运行
- 数据库是否已创建

## 💡 常见问题

### Q: 忘记 MySQL root 密码怎么办？
A: 可以重置密码或使用其他有权限的用户。

### Q: `.env` 文件在哪里？
A: 在项目根目录，与 `package.json` 同级。

### Q: 如何确认密码是否正确？
A: 尝试使用 MySQL 客户端连接：
```bash
mysql -u root -p你的密码
```

## 📌 注意事项

- ⚠️ `.env` 文件包含敏感信息，不要提交到 Git
- ✅ `.env.example` 文件是模板，可以提交到 Git
- ✅ `.env` 文件应该在 `.gitignore` 中


