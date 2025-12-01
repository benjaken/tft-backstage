# 启动问题排查指南

## 🔍 启动卡死问题排查

如果应用启动时卡死，可能的原因和解决方案：

### 1. 数据库连接问题

**症状**: 启动时卡在数据库连接阶段

**解决方案**:
- 检查 MySQL 服务是否运行
- 检查 `.env` 文件中的数据库配置是否正确
- 检查数据库是否存在
- 检查用户名和密码是否正确

**测试数据库连接**:
```bash
mysql -u root -p -h localhost
```

### 2. 索引创建卡住

**症状**: 启动时卡在同步表结构/创建索引阶段

**临时解决方案**:
在 `.env` 文件中临时禁用同步：
```env
NODE_ENV=production
```

或者修改 `src/config/database.config.ts`，临时设置：
```typescript
synchronize: false,
```

**注意**: 禁用同步后，需要手动创建表结构或使用迁移。

### 3. 连接超时

**已添加的配置**:
- 连接超时: 10秒
- 查询超时: 10秒
- 重试机制: 3次，每次延迟3秒

如果仍然超时，可以增加超时时间：
```typescript
connectTimeout: 30000, // 30秒
```

### 4. 数据库不存在

**解决方案**:
```sql
CREATE DATABASE IF NOT EXISTS tftactics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 权限问题

**解决方案**:
确保数据库用户有足够的权限：
```sql
GRANT ALL PRIVILEGES ON tftactics.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## 🚀 快速诊断步骤

### 步骤 1: 检查日志
启动时查看控制台输出，找到卡住的位置。

### 步骤 2: 测试数据库连接
```bash
mysql -u root -p -h localhost -e "SELECT 1"
```

### 步骤 3: 检查数据库
```sql
SHOW DATABASES;
USE tftactics;
SHOW TABLES;
```

### 步骤 4: 临时禁用同步
如果怀疑是同步问题，临时禁用：
```env
NODE_ENV=production
```

### 步骤 5: 检查端口占用
```bash
netstat -ano | findstr :3000
```

## 🔧 已优化的配置

### 连接超时
- `connectTimeout: 10000` - 10秒连接超时
- `acquireTimeout: 10000` - 10秒获取连接超时
- `timeout: 10000` - 10秒查询超时

### 连接池
- `connectionLimit: 10` - 最大10个连接

### 重试机制
- `retryAttempts: 3` - 重试3次
- `retryDelay: 3000` - 每次延迟3秒

### 日志
- 已添加详细的启动日志
- 可以看到每个启动步骤的进度

## 📝 启动日志示例

正常启动应该看到：
```
[Bootstrap] 正在启动应用...
[Bootstrap] 应用模块已创建
[Bootstrap] 验证管道已配置
[Bootstrap] Swagger 文档已配置
[Bootstrap] 应用已启动，监听端口: 3000
```

如果卡在某个步骤，日志会显示具体位置。

## ⚠️ 如果仍然卡死

1. **检查数据库连接**: 确保 MySQL 服务运行且可访问
2. **检查 .env 文件**: 确保配置正确
3. **临时禁用同步**: 设置 `NODE_ENV=production`
4. **查看详细日志**: 启用 `logging: true` 查看数据库操作
5. **手动创建表**: 如果同步有问题，可以手动创建表结构

## 💡 建议

如果经常遇到启动问题，建议：
1. 使用数据库迁移（Migrations）替代 `synchronize`
2. 添加健康检查接口
3. 使用连接池监控工具


