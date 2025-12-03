# 多语言云顶之弈 API 与数据库开发手册

## 1. 手册目标
- 统一多语言 TFT 数据的建模、入库、对外 API 规范。
- 对接每日英文爬虫数据，确保 slug 映射准确并支撑多语言展示。
- 为服务端和小程序提供可扩展、可观测、易维护的 API 层。

## 2. 系统架构概览
1. **采集层**：爬虫定时抓取英文 JSON（英雄/装备/羁绊/阵容），写入 `crawler_payloads` 暂存表或对象存储。
2. **清洗与标准化**：数据服务读取 payload，校验字段，映射为内部 `slug`，落地 `*_staging` 表并生成差异报告。
3. **核心数据库**：MySQL/PostgreSQL，主表存语言无关字段，`*_locale` 表存各语言文本。
4. **API 层**：NestJS 等框架提供 `/{locale}` 路由，读取缓存或数据库返回 JSON。
5. **小程序**：携带 locale 与匿名 token 调用 API，负责界面语言切换与缓存。
6. **监控与防护**：限流、动态水印、日志分析参考《DATA_PROTECTION_MANUAL》执行。

## 3. 数据库设计
### 3.1 通用原则
- **slug 唯一**：所有实体使用英文 slug（只含 ASCII 与 `-`）作为业务主键，爬虫摒弃任何语言化字段。
- **主表 vs Locale 表**：主表保存结构化属性（数值、枚举），locale 表按 (`entity_id`,`locale`) 存文案。
- **版本字段**：所有与赛季/版本相关的表包含 `set_number`、`patch_version`、`released_at`。
- **软删除与审计**：`is_active`、`created_at`、`updated_at`、`source` 标准字段，重要写操作记入 `audit_log`。

### 3.2 核心表
| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| `champion` | `id` PK, `slug`, `cost`, `rarity`, `set_number` | 英雄基础属性 |
| `champion_locale` | `champion_id`, `locale`, `name`, `title`, `ability_name`, `ability_desc` | 多语言文本 |
| `item` / `item_locale` | `slug`, `stats`, `effects` | 装备与说明 |
| `trait` / `trait_locale` | `slug`, `type`, `breakpoints` | 羁绊与阈值描述 |
| `team_comp` | `id`, `slug`, `set_number`, `source`, `patch_version`, `crawl_time` | 阵容元数据 |
| `team_comp_unit` | `team_comp_id`, `champion_id`, `position`, `items` JSON | 阵容组成 |
| `slug_alias` | `entity_type`, `alias`, `target_slug`, `source` | 爬虫别名映射 |
| `crawler_payload` | `id`, `payload`, `source`, `status`, `error_message` | 原始 JSON 存档 |

### 3.3 关系与约束
- `champion_trait`、`champion_item` 等多对多表只存 ID；查询显示时 JOIN locale 表。
- 对 `slug`、(`locale`,`name`) 建唯一索引；`team_comp` 以 `slug+patch_version` 唯一，防止重复。
- 外键全部 `ON UPDATE CASCADE`、`ON DELETE RESTRICT`，避免误删导致孤儿记录。

### 3.4 数据导入流程
1. 将爬虫 JSON 写入 `crawler_payload`，状态为 `pending`。
2. 清洗作业解析 payload → 根据 `alias/slug` 找到 `entity_id`，写入 `*_staging`。
3. 校验差异（新增/更新/删除），生成报告并写 `audit_log`。
4. 事务性地把 staging 落入正式表：
   - 新实体：生成 ID，写主表 + locale 表 + alias。
   - 更新：比对字段，记录旧值。
   - 失效：`is_active=false`，保留历史。
5. 若任何 slug 未匹配，记录 `error_message` 并告警。

### 3.5 索引与性能
- 按照访问频率在 `champion`、`item` 等主表上建立 `(set_number, slug)` 复合索引。
- `team_comp` 需要 `(set_number, is_active)`、`(set_number, locale)`（通过 locale JOIN）利于筛选。
- JSON 字段（如 `team_comp_unit.items`）使用虚拟列或 JSON 索引以支撑特定查询。
- 定期 ANALYZE/OPTIMIZE，避免写入高峰时性能衰退。

### 3.6 数据维护
- 每日校验 slug 完整性：比对爬虫列表与 DB，缺失即入库或标红。
- 版本结束时，将相关 `set_number` 的阵容标记归档，避免对外返回。
- 建立 `data_quality_checks` 任务，验证：
  - 任何 `team_comp_unit` 引用的 `champion_id` 必须存在且激活。
  - locale 表必须覆盖 `default_locale`（如 en-US），缺失则 fallback。

## 4. API 设计
### 4.1 路由与版本
- 路由规范：`/api/v1/{locale}/{resource}`，`locale` 仅接受配置中的语言码（`en-US`,`zh-CN`,`ja-JP` 等）。
- 版本策略：
  - 破坏性升级新增 `/api/v2/...`。
  - 细节调整通过响应头 `X-API-Version` 标识子版本。

### 4.2 通用约定
- 请求头：`X-Client-Token`、`X-Timestamp`、`X-Nonce`、`X-Signature`（匿名安全策略）。
- 分页：`page`（默认 1）、`limit`（默认 20，最大 100）。响应携带 `meta = {page, limit, total}`。
- 过滤：统一 `?set=11&cost=3&search=jinx` 模式；search 在 locale 表执行模糊/全文索引。
- 返回结构：
  ```json
  {
    "data": [...],
    "meta": {...},
    "requestId": "uuid",
    "generatedAt": "2025-12-03T02:34:56Z"
  }
  ```
- 错误码：
  - `40001` 参数错误
  - `40100` 签名无效
  - `40401` 资源不存在
  - `42900` 触发限流
  - `50000` 服务端异常

### 4.3 主要资源接口
| 资源 | 方法 & 路径 | 说明 |
| --- | --- | --- |
| 英雄列表 | `GET /api/v1/{locale}/champions` | 支持 `set`, `cost`, `traits`, `search` | 
| 英雄详情 | `GET /api/v1/{locale}/champions/{slug}` | 返回主属性、技能、推荐装备、相关阵容 |
| 装备列表 | `GET /api/v1/{locale}/items` | 支持 `type`、`component` 过滤 |
| 羁绊 | `GET /api/v1/{locale}/traits` | 返回 breakpoints、加成描述 |
| 阵容列表 | `GET /api/v1/{locale}/team-comps` | 支持 `set`, `source`, `tier`, `updatedSince`；默认只返回活跃阵容 |
| 阵容详情 | `GET /api/v1/{locale}/team-comps/{slug}` | 包含站位、核心单位、符文/强化 |
| 搜索 | `GET /api/v1/{locale}/search?type=champion&keyword=` | 跨资源搜索 |
| 元数据 | `GET /api/v1/metadata` | 可用 locale、当前 set、数据更新时间 |

### 4.4 批量与增量接口
- `POST /api/v1/internal/imports/team-comps`：供爬虫/数据服务写入，带签名与 IP 白名单，写 `crawler_payload`。
- `GET /api/v1/{locale}/champions:bulk?slugs=a,b,c`：批量查询减少 RTT。
- `GET /api/v1/{locale}/diff`：提供自某时间以来更新的实体列表，方便客户端增量同步。

### 4.5 缓存与一致性
- 列表接口默认 `Cache-Control: public, max-age=60` 并携带 `ETag`，客户端可用 If-None-Match。
- Redis 缓存 key：`champion:{set}:{locale}:{slug}`，TTL 300s；失效策略：
  - 数据导入后发事件驱动失效。
  - 队列消费失败需重试，避免缓存脏数据。

### 4.6 多语言 JSON 返回策略
- **单 locale 请求**：统一接口 `/{locale}/resource` 或 `?locale=`，一次只返回当前语言，减少带宽与缓存污染。服务端根据 locale 拼装主表 + `*_locale` 数据或读取缓存。
- **fallback 机制**：当某语言缺字段时，后端自动回退到默认语言（如 `en-US`），并在响应中附 `fallbackLocale`，前端可提示用户。
- **缓存维度**：缓存 key 必须包含 `locale`，热门语言和冷门语言互不影响；导入完成后按 `resource+locale` 精确失效。
- **客户端行为**：小程序仅存储当前语言数据，切换语言重新请求；若需要预取，限制在常用语言列表并设置较短 TTL。
- **例外场景**：只有在离线/静态分发需求极强时，才考虑预生成“全语言大 JSON”并通过 CDN 发布；此时仍建议在文件中嵌入水印并限制可下载渠道。

### 4.7 观测性
- 统一记录 `requestId`，在日志与响应中输出。
- 指标：`latency`, `cache_hit_ratio`, `db_query_count`, `429_rate`, `error_rate`。
- Tracing：OpenTelemetry 注入 `traceparent` 到响应头，方便跨服务追踪。

## 5. 安全与访问控制（无需登录场景）
- Token/签名、限流、指纹、水印参见《DATA_PROTECTION_MANUAL》，此处需在 API 中间件落地：
  - 请求进入即校验签名与时间漂移。
  - 访问控制表定义按资源的 QPS/日配额。
  - 缺省返回 `429` 并在响应体附 `retryAfter`。
- 管理后台可动态添加黑名单/白名单，接口实时生效。

## 6. 开发与测试流程
1. **数据库迁移**：使用 ORM migration（如 Prisma/TypeORM）。每次 schema 变更需包含回滚脚本与样例数据。
2. **种子数据**：准备 `seed_en.json`、`seed_zh.json`，用于本地和 CI。导入时校验 slug 完整性。
3. **单元测试**：仓储层模拟多语言切换；API 层校验 locale、分页、限流逻辑。
4. **集成测试**：使用 e2e 测试覆盖 `/{locale}/champions`、`team-comps` 等核心路径；对匿名 token 过期、签名错误等异常做断言。
5. **性能测试**：关键列表接口需通过 95% 延迟 < 150ms（缓存命中）/< 400ms（缓存未命中）。

## 7. 运维与上线
- **发布节奏**：
  - 先执行 DB migration。
  - 部署数据导入服务。
  - 最后上线 API。必要时使用 feature flag 控制新字段返回。
- **回滚策略**：保留最近两版迁移脚本和 Docker 镜像；API 可通过 Env 标志关闭新 locale。
- **监控面板**：Grafana/Datadog 建立以下图表：
  - 各资源 QPS 与 95/99 延迟
  - 限流命中次数
  - 数据导入成功/失败数
  - DB 连接数与慢查询
- **应急**：
  - 出现数据错乱：暂停导入作业，回滚最新导入批次，触发缓存失效。
  - API 异常：根据 traceId 定位模块，必要时切回旧版本。

## 8. 附录
- Locale 代码表：`en-US`（默认）、`zh-CN`、`ko-KR`、`ja-JP`、`fr-FR`...
- slug 命名规范：`[a-z0-9-]`，示例 `ahri-star-guardian`，禁止空格与大写。
- 建议工具链：
  - ORM：TypeORM + NestJS
  - Migration：Nest CLI or npm script `npm run migration:run`
  - 文档：OpenAPI 3.1（`/swagger`）
  - 数据比对：自研 diff service 或 dbt tests

---
此手册建议与数据防护手册同时维护，任一变更需同步在项目 Wiki 记录并通知开发、数据、运维团队。
