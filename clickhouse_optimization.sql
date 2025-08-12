-- 优化后的ClickHouse表结构
-- pay.pc_account_flow_optimized definition

CREATE TABLE pay.pc_account_flow_optimized
(
    -- 时间字段放在前面，用于分区
    `create_time` DateTime64(3),  -- 降低精度到毫秒级，节省存储
    `op_time` DateTime64(3),
    
    -- 主键字段
    `id` String,
    
    -- 业务关键字段，使用更紧凑的数据类型
    `trade_type` UInt8,  -- 使用UInt8代替Int8，因为都是正数
    `trade_amount` Decimal64(2),  -- 使用Decimal64代替Decimal(16,2)，性能更好
    `refer_id` String,
    `balance` Decimal64(2),
    `remark` String,
    `book_id` String,
    `is_valid` UInt8 DEFAULT 1,
    
    -- 用户相关字段
    `create_user_id` Nullable(String),
    `created_by` Nullable(String),
    `update_user_id` Nullable(String),
    
    -- 交易双方信息，使用LowCardinality优化
    `payer_mch_no` LowCardinality(Nullable(String)),
    `payer_mch_name` LowCardinality(Nullable(String)),
    `payee_mch_no` LowCardinality(Nullable(String)),
    `payee_mch_name` LowCardinality(Nullable(String)),
    
    -- 其他字段
    `tx_sn` Nullable(String),
    `is_income` Nullable(UInt8),
    `ext_json` Nullable(String),
    `mch_order_no` Nullable(String),
    `buz_type` Nullable(UInt32) DEFAULT 0,
    `cause_type` Nullable(UInt32) DEFAULT 0,
    `order_amount` Nullable(Int64),
    `order_goods` Nullable(String),
    `pay_amount` Nullable(Int64),
    
    -- 布隆过滤器索引，适合等值查询
    INDEX idx_id id TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_mch_order_no mch_order_no TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_refer_id refer_id TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_tx_sn tx_sn TYPE bloom_filter(0.01) GRANULARITY 1,
    
    -- Set索引，适合枚举值
    INDEX idx_trade_type trade_type TYPE set(10) GRANULARITY 1,
    INDEX idx_is_valid is_valid TYPE set(2) GRANULARITY 1,
    INDEX idx_is_income is_income TYPE set(2) GRANULARITY 1,
    INDEX idx_buz_type buz_type TYPE set(100) GRANULARITY 1,
    
    -- MinMax索引，适合范围查询
    INDEX idx_create_time create_time TYPE minmax GRANULARITY 1,
    INDEX idx_book_id book_id TYPE minmax GRANULARITY 1,
    INDEX idx_trade_amount trade_amount TYPE minmax GRANULARITY 1
)
ENGINE = ReplacingMergeTree(op_time)  -- 使用op_time作为版本字段
PARTITION BY toYYYYMM(create_time)   -- 按月分区
ORDER BY (create_time, book_id, trade_type, id)  -- 优化排序键
PRIMARY KEY (create_time, book_id)    -- 主键只包含必要字段
TTL create_time + INTERVAL 2 YEAR     -- 设置2年数据保留期
SETTINGS 
    index_granularity = 8192,
    merge_with_ttl_timeout = 86400,   -- TTL合并超时24小时
    enable_mixed_granularity_parts = 1;

-- 创建物化视图，用于加速常见聚合查询
CREATE MATERIALIZED VIEW pay.pc_account_flow_daily_summary
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, book_id, trade_type, is_income)
AS
SELECT
    toDate(create_time) AS date,
    book_id,
    trade_type,
    is_income,
    count() AS trade_count,
    sum(trade_amount) AS total_amount,
    sum(order_amount) AS total_order_amount,
    sum(pay_amount) AS total_pay_amount
FROM pay.pc_account_flow_optimized
WHERE is_valid = 1
GROUP BY date, book_id, trade_type, is_income;

-- 创建针对商户的物化视图
CREATE MATERIALIZED VIEW pay.pc_account_flow_merchant_summary
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, payee_mch_no, trade_type)
AS
SELECT
    toDate(create_time) AS date,
    payee_mch_no,
    payee_mch_name,
    trade_type,
    count() AS trade_count,
    sum(trade_amount) AS total_amount,
    sum(CASE WHEN is_income = 1 THEN trade_amount ELSE 0 END) AS income_amount,
    sum(CASE WHEN is_income = 0 THEN trade_amount ELSE 0 END) AS expense_amount
FROM pay.pc_account_flow_optimized
WHERE is_valid = 1 AND payee_mch_no IS NOT NULL
GROUP BY date, payee_mch_no, payee_mch_name, trade_type;