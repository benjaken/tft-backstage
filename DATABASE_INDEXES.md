# 数据库索引说明

## ✅ 已添加的索引

### 1. team_comps 表
- `idx_team_comp_name`: 索引 `name` 字段 - 用于快速查找团队组合
- `idx_team_comp_last_crawl_time`: 索引 `last_crawl_time` 字段 - 用于按爬取时间排序

### 2. champions 表
- `idx_champion_name`: 索引 `name` 字段 - 用于快速查找英雄
- `idx_champion_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询
- `idx_champion_name_team_comp`: 复合索引 `(name, team_comp_id)` - 用于按名称和团队组合查找

### 3. items 表
- `idx_item_name`: 索引 `name` 字段 - 用于快速查找装备

### 4. power_ups 表
- `idx_power_up_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询

### 5. traits 表
- `idx_trait_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询

### 6. carousel_items 表
- `idx_carousel_item_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询

### 7. team_options 表
- `idx_team_option_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询

### 8. team_option_champions 表
- `idx_team_option_champion_team_option_id`: 索引 `team_option_id` 字段 - 用于关联查询
- `idx_team_option_champion_champion_id`: 索引 `champion_id` 字段 - 用于关联查询

### 9. positioned_champions 表
- `idx_positioned_champion_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询
- `idx_positioned_champion_champion_id`: 索引 `champion_id` 字段 - 用于关联查询

### 10. early_comp_champions 表
- `idx_early_comp_champion_team_comp_id`: 索引 `team_comp_id` 字段 - 用于 JOIN 查询
- `idx_early_comp_champion_champion_id`: 索引 `champion_id` 字段 - 用于关联查询

### 11. champion_items 表（关联表）
- 主键 `(champion_id, item_id)` 本身就是一个索引
- 如果需要，可以添加反向索引 `(item_id, champion_id)`

## 📊 索引效果

这些索引将显著提升以下查询的性能：

1. **按名称查找团队组合** - 使用 `idx_team_comp_name`
2. **按团队组合查找英雄** - 使用 `idx_champion_team_comp_id`
3. **按名称和团队组合查找英雄** - 使用 `idx_champion_name_team_comp`
4. **JOIN 查询** - 所有外键字段都有索引
5. **批量查询** - IN 查询会使用相关索引

## 🔄 同步索引

由于 `synchronize: true`（开发环境），TypeORM 会在应用启动时自动创建这些索引。

如果是在生产环境，建议：
1. 关闭 `synchronize`
2. 使用数据库迁移（Migrations）来管理索引

## ⚠️ 注意事项

- 索引会占用额外的存储空间
- 索引会略微降低写入性能（但查询性能提升明显）
- 对于经常查询的字段，索引是非常必要的

## 🚀 验证索引

重启应用后，索引会自动创建。可以通过以下 SQL 验证：

```sql
-- 查看 team_comps 表的索引
SHOW INDEX FROM team_comps;

-- 查看 champions 表的索引
SHOW INDEX FROM champions;
```

## 📈 性能提升

添加索引后，查询性能应该会有显著提升：
- 单表查询：提升 10-100 倍
- JOIN 查询：提升 5-50 倍
- 批量查询（IN）：提升 3-20 倍

预计接口响应时间将从数秒降低到数百毫秒以内。


