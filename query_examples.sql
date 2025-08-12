-- ClickHouse优化后的常用查询示例

-- 1. 按时间范围查询账户流水
-- 利用分区裁剪和排序键优化
SELECT 
    id,
    trade_type,
    trade_amount,
    balance,
    remark,
    create_time
FROM pay.pc_account_flow_optimized
WHERE create_time >= '2024-01-01 00:00:00'
  AND create_time < '2024-02-01 00:00:00'
  AND book_id = 'BOOK123'
  AND is_valid = 1
ORDER BY create_time DESC
LIMIT 100;

-- 2. 查询某个账本的当前余额
-- 利用排序键快速定位
SELECT 
    book_id,
    balance,
    create_time
FROM pay.pc_account_flow_optimized
WHERE book_id = 'BOOK123'
  AND is_valid = 1
ORDER BY create_time DESC
LIMIT 1;

-- 3. 统计某个商户的日收支汇总
-- 使用物化视图，查询速度极快
SELECT 
    date,
    payee_mch_no,
    payee_mch_name,
    sum(trade_count) as total_trades,
    sum(income_amount) as total_income,
    sum(expense_amount) as total_expense,
    sum(income_amount) - sum(expense_amount) as net_amount
FROM pay.pc_account_flow_merchant_summary
WHERE date >= '2024-01-01'
  AND date < '2024-02-01'
  AND payee_mch_no = 'MCH001'
GROUP BY date, payee_mch_no, payee_mch_name
ORDER BY date;

-- 4. 查询某笔订单的流水记录
-- 利用布隆过滤器索引加速
SELECT 
    *
FROM pay.pc_account_flow_optimized
WHERE mch_order_no = 'ORDER20240101001'
  AND is_valid = 1;

-- 5. 按交易类型统计月度汇总
-- 利用分区和索引优化
SELECT 
    toYYYYMM(create_time) as month,
    trade_type,
    count(*) as trade_count,
    sum(trade_amount) as total_amount,
    avg(trade_amount) as avg_amount
FROM pay.pc_account_flow_optimized
WHERE create_time >= '2024-01-01 00:00:00'
  AND create_time < '2024-07-01 00:00:00'
  AND is_valid = 1
GROUP BY month, trade_type
ORDER BY month, trade_type;

-- 6. 查询大额交易
-- 利用MinMax索引快速过滤
SELECT 
    id,
    trade_type,
    trade_amount,
    payer_mch_name,
    payee_mch_name,
    create_time
FROM pay.pc_account_flow_optimized
WHERE trade_amount > 10000
  AND create_time >= today() - INTERVAL 7 DAY
  AND is_valid = 1
ORDER BY trade_amount DESC
LIMIT 100;

-- 7. 实时查询最近的交易流水
-- 利用排序键优化
SELECT 
    id,
    trade_type,
    trade_amount,
    book_id,
    create_time
FROM pay.pc_account_flow_optimized
WHERE create_time >= now() - INTERVAL 1 HOUR
  AND is_valid = 1
ORDER BY create_time DESC
LIMIT 50;

-- 8. 账本日报表查询
-- 使用物化视图
SELECT 
    date,
    book_id,
    trade_type,
    is_income,
    trade_count,
    total_amount
FROM pay.pc_account_flow_daily_summary
WHERE date = today() - 1
  AND book_id IN ('BOOK001', 'BOOK002', 'BOOK003')
ORDER BY book_id, trade_type;

-- 9. 分页查询历史流水
-- 利用主键优化分页性能
SELECT 
    id,
    trade_type,
    trade_amount,
    create_time
FROM pay.pc_account_flow_optimized
WHERE create_time >= '2024-01-01 00:00:00'
  AND create_time < '2024-01-02 00:00:00'
  AND book_id = 'BOOK123'
  AND is_valid = 1
ORDER BY create_time, id
LIMIT 100 OFFSET 200;

-- 10. 交易对账查询
-- 组合使用多个索引
SELECT 
    a.id,
    a.mch_order_no,
    a.tx_sn,
    a.trade_amount,
    a.create_time
FROM pay.pc_account_flow_optimized a
WHERE a.create_time >= '2024-01-01 00:00:00'
  AND a.create_time < '2024-01-02 00:00:00'
  AND a.trade_type = 1
  AND a.is_valid = 1
  AND NOT EXISTS (
    SELECT 1 
    FROM pay.pc_account_flow_optimized b
    WHERE b.refer_id = a.id
      AND b.trade_type = 2
      AND b.is_valid = 1
  );