# ClickHouse表结构优化和数据迁移策略

## 一、优化要点总结

### 1. 数据类型优化
- 使用 `UInt8` 替代 `Int8` 用于非负整数
- 使用 `Decimal64(2)` 替代 `Decimal(16,2)` 提升性能
- 使用 `LowCardinality` 包装低基数字符串字段（商户号、商户名称）
- 时间精度从6位降低到3位（毫秒级），节省存储空间

### 2. 表引擎和分区策略
- 使用 `ReplacingMergeTree(op_time)` 引擎，自动处理重复数据
- 按月分区 `PARTITION BY toYYYYMM(create_time)`
- 设置TTL策略，自动清理2年前的数据

### 3. 索引优化
- **排序键优化**：`ORDER BY (create_time, book_id, trade_type, id)`
  - 将时间字段放在首位，优化时间范围查询
  - 按book_id分组，优化账本查询
  - trade_type用于快速过滤交易类型
- **主键简化**：只包含 `(create_time, book_id)`，减少内存占用
- **二级索引策略**：
  - 布隆过滤器：用于ID类字段的等值查询
  - Set索引：用于枚举值字段
  - MinMax索引：用于范围查询字段

### 4. 物化视图
- 日汇总视图：按日期、账本、交易类型预聚合
- 商户汇总视图：按商户维度预聚合收支数据

## 二、数据迁移方案

### 方案A：停机迁移（推荐用于小数据量）
```sql
-- 1. 创建新表
CREATE TABLE pay.pc_account_flow_optimized ...

-- 2. 从旧表导入数据
INSERT INTO pay.pc_account_flow_optimized
SELECT 
    create_time,
    op_time,
    id,
    CAST(trade_type AS UInt8),
    trade_amount,
    refer_id,
    balance,
    remark,
    book_id,
    CAST(is_valid AS UInt8),
    create_user_id,
    created_by,
    update_user_id,
    payer_mch_no,
    payer_mch_name,
    payee_mch_no,
    payee_mch_name,
    tx_sn,
    CAST(is_income AS Nullable(UInt8)),
    ext_json,
    mch_order_no,
    CAST(buz_type AS Nullable(UInt32)),
    CAST(cause_type AS Nullable(UInt32)),
    order_amount,
    order_goods,
    pay_amount
FROM pay.pc_account_flow;

-- 3. 验证数据
SELECT count(*) FROM pay.pc_account_flow_optimized;

-- 4. 切换表名
RENAME TABLE pay.pc_account_flow TO pay.pc_account_flow_old;
RENAME TABLE pay.pc_account_flow_optimized TO pay.pc_account_flow;
```

### 方案B：在线迁移（推荐用于大数据量）

1. **创建新表和同步配置**
```sql
-- 创建新表
CREATE TABLE pay.pc_account_flow_new ...

-- 配置CloudCanal双写
-- 将MySQL数据同时同步到旧表和新表
```

2. **历史数据迁移脚本**
```bash
#!/bin/bash
# 分批迁移历史数据的脚本

START_DATE="2022-01-01"
END_DATE=$(date +%Y-%m-%d)

current_date=$START_DATE
while [[ "$current_date" < "$END_DATE" ]]; do
    next_date=$(date -d "$current_date + 1 month" +%Y-%m-%d)
    
    echo "Migrating data from $current_date to $next_date"
    
    clickhouse-client --query="
    INSERT INTO pay.pc_account_flow_new
    SELECT * FROM pay.pc_account_flow
    WHERE create_time >= '$current_date' 
      AND create_time < '$next_date'
    "
    
    current_date=$next_date
    sleep 5
done
```

3. **数据一致性校验**
```sql
-- 校验总记录数
SELECT 
    'old_table' as table_name,
    count(*) as total_count,
    sum(trade_amount) as total_amount
FROM pay.pc_account_flow
UNION ALL
SELECT 
    'new_table' as table_name,
    count(*) as total_count,
    sum(trade_amount) as total_amount
FROM pay.pc_account_flow_new;

-- 按月校验数据
SELECT 
    toYYYYMM(create_time) as month,
    count(*) as count_diff,
    sum(trade_amount) as amount_diff
FROM (
    SELECT create_time, trade_amount, 1 as flag
    FROM pay.pc_account_flow
    UNION ALL
    SELECT create_time, -trade_amount, -1 as flag
    FROM pay.pc_account_flow_new
)
GROUP BY month
HAVING count_diff != 0 OR amount_diff != 0;
```

## 三、CloudCanal同步优化建议

### 1. 同步配置优化
```yaml
# CloudCanal配置建议
sync_config:
  # 批量大小
  batch_size: 10000
  # 并行度
  parallelism: 4
  # 数据转换
  transformations:
    - field: trade_type
      type: CAST
      target_type: UInt8
    - field: is_valid
      type: CAST
      target_type: UInt8
    - field: create_time
      type: PRECISION
      precision: 3
```

### 2. 监控指标
- 同步延迟：目标 < 5秒
- 错误率：目标 < 0.01%
- 吞吐量：根据业务量调整

### 3. 故障处理
- 配置自动重试机制
- 设置死信队列处理异常数据
- 建立告警机制监控同步状态

## 四、查询性能对比

### 优化前后性能对比预估

| 查询场景 | 优化前 | 优化后 | 提升比例 |
|---------|--------|--------|----------|
| 按时间范围查询 | 500ms | 50ms | 10x |
| 按账本统计 | 800ms | 100ms | 8x |
| 商户日报表 | 2000ms | 10ms（物化视图） | 200x |
| 单笔流水查询 | 100ms | 20ms | 5x |

## 五、后续优化建议

1. **监控和调优**
   - 监控查询性能，识别慢查询
   - 根据实际查询模式调整索引
   - 定期执行 OPTIMIZE TABLE 合并分区

2. **扩展优化**
   - 考虑使用分布式表架构
   - 实施冷热数据分离
   - 增加更多业务相关的物化视图

3. **维护计划**
   - 每月检查分区合并情况
   - 每季度评估索引使用率
   - 每年审查TTL策略是否需要调整