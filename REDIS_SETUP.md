# Redis 缓存配置

本项目已集成 Redis 缓存以提升接口响应速度。

## 环境变量配置

在 `.env` 文件中添加以下 Redis 配置：

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # 如果 Redis 设置了密码，填写密码；否则留空
```

## 安装和启动 Redis

### Windows

1. 下载 Redis for Windows:
   - 访问 https://github.com/microsoftarchive/redis/releases
   - 或使用 WSL2 安装 Redis

2. 启动 Redis 服务器：
   ```bash
   redis-server
   ```

### Linux/macOS

1. 安装 Redis:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server

   # macOS
   brew install redis
   ```

2. 启动 Redis 服务器：
   ```bash
   redis-server
   ```

## 缓存策略

### 缓存键

- `team_comps_all`: 存储所有团队组合数据，缓存时间 1 小时
- `update_time`: 存储最后更新时间，缓存时间 10 分钟

### 缓存失效

当执行爬虫任务并成功保存数据到数据库后，会自动清除相关缓存，确保数据一致性。

## 性能优化

1. **团队组合列表接口** (`GET /crawler/tftactics/list`):
   - 首次请求从数据库加载，耗时较长
   - 后续请求从 Redis 缓存返回，响应时间 < 10ms

2. **更新时间接口** (`GET /crawler/tftactics/update-time`):
   - 首次请求从数据库查询
   - 后续请求从 Redis 缓存返回，响应时间 < 5ms

## 故障排除

### Redis 连接失败

如果应用启动时出现 Redis 连接错误：

1. 检查 Redis 服务是否运行：
   ```bash
   redis-cli ping
   ```
   应该返回 `PONG`

2. 检查环境变量配置是否正确

3. 如果 Redis 未安装或无法启动，应用仍可正常运行，但不会使用缓存（首次查询会较慢）

### 缓存不生效

1. 检查 Redis 是否正常连接
2. 检查缓存键是否存在：
   ```bash
   redis-cli
   > keys team_comps_all
   > keys update_time
   ```
3. 查看应用日志，确认缓存操作是否执行

## 测试缓存

```bash
# 清除所有缓存
redis-cli FLUSHALL

# 查看缓存键
redis-cli KEYS "*"

# 查看特定缓存值
redis-cli GET team_comps_all
```


