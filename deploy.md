# 微信小程序京东支付方案部署指南

## 环境准备

### 1. 服务器环境
- **操作系统**: Linux (推荐 Ubuntu 18.04+)
- **Web服务器**: Apache/Nginx
- **PHP版本**: 7.0+
- **必需扩展**: OpenSSL, cURL, JSON

### 2. 京东支付账户
- 注册京东支付商户账户
- 获取商户号(Merchant ID)
- 获取应用ID(App ID)  
- 生成RSA密钥对
- 配置回调地址

### 3. 微信小程序
- 微信开发者账户
- 小程序AppID
- 开发者工具

## 详细部署步骤

### 第一步：服务器配置

1. **上传代码**
```bash
# 上传backend目录到服务器
scp -r backend/ user@server:/var/www/html/

# 设置权限
chmod 755 /var/www/html/backend/
chmod 755 /var/www/html/backend/logs/
chmod 755 /var/www/html/backend/orders/
```

2. **配置Web服务器**

**Apache配置** (在.htaccess或虚拟主机配置中):
```apache
<Directory "/var/www/html/backend">
    Options -Indexes
    AllowOverride All
    
    # 隐藏敏感文件
    <Files "*.log">
        Deny from all
    </Files>
    
    # 启用CORS
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "POST, GET, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
</Directory>
```

**Nginx配置**:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl.crt;
    ssl_certificate_key /path/to/ssl.key;
    
    location /backend/ {
        root /var/www/html;
        index index.php;
        
        # 处理OPTIONS请求
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "POST, GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            return 204;
        }
        
        # PHP处理
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
        
        # 隐藏日志文件
        location ~* \.(log)$ {
            deny all;
        }
    }
}
```

### 第二步：京东支付配置

1. **生成RSA密钥对**
```bash
# 生成私钥
openssl genrsa -out private_key.pem 2048

# 生成公钥
openssl rsa -in private_key.pem -pubout -out public_key.pem

# 查看私钥内容(用于配置)
cat private_key.pem

# 查看公钥内容(上传给京东)
cat public_key.pem
```

2. **配置支付参数**

编辑 `backend/jd_payment.php`:
```php
private $config = [
    'merchant_id' => '1234567890',  // 替换为您的京东商户号
    'app_id' => 'APP123456',        // 替换为您的京东应用ID
    'private_key' => '-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----',  // 您的完整私钥
    'public_key' => '-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA...
-----END PUBLIC KEY-----',       // 京东提供的公钥
    'gateway_url' => 'https://paygate.jd.com/service/unified.trade.query',
    'notify_url' => 'https://your-domain.com/backend/jd_notify.php',
    'return_url' => 'https://your-domain.com/backend/jd_return.php'
];
```

3. **在京东后台配置**
- 登录京东支付商户后台
- 上传您的公钥文件
- 配置回调地址: `https://your-domain.com/backend/jd_notify.php`
- 设置支付方式和限额

### 第三步：小程序配置

1. **导入项目**
- 打开微信开发者工具
- 选择导入项目
- 选择 `miniprogram` 目录
- 输入您的小程序AppID

2. **配置服务器域名**

在微信公众平台小程序后台设置:
```
request合法域名:
- https://your-domain.com

uploadFile合法域名:
- https://your-domain.com

downloadFile合法域名:
- https://your-domain.com

web-view业务域名:
- https://h5pay.jd.com
```

3. **修改配置文件**

编辑 `miniprogram/app.js`:
```javascript
globalData: {
    userInfo: null,
    serverUrl: 'https://your-domain.com/backend'  // 修改为您的域名
}
```

### 第四步：数据库配置(可选)

如果要使用数据库存储订单信息，创建数据表:

```sql
CREATE TABLE `jd_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trade_no` varchar(64) NOT NULL COMMENT '订单号',
  `trade_name` varchar(255) DEFAULT NULL COMMENT '订单名称',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '金额',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态',
  `jd_trade_no` varchar(64) DEFAULT NULL COMMENT '京东交易号',
  `paid_amount` decimal(10,2) DEFAULT NULL COMMENT '实付金额',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trade_no` (`trade_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

然后在 `jd_payment.php` 和 `jd_notify.php` 中取消数据库操作的注释。

### 第五步：测试验证

1. **本地测试**
```bash
# 测试创建订单接口
curl -X POST https://your-domain.com/backend/jd_payment.php/create_order \
  -H "Content-Type: application/json" \
  -d '{
    "out_trade_no": "TEST001",
    "subject": "测试商品",
    "total_amount": 0.01,
    "user_id": "test_user"
  }'

# 测试查询接口
curl "https://your-domain.com/backend/jd_payment.php/query_status?trade_no=TEST001"
```

2. **小程序测试**
- 在开发者工具中预览
- 选择商品进行支付
- 检查WebView是否正常加载
- 测试支付流程

3. **回调测试**
```bash
# 模拟京东回调
curl -X POST https://your-domain.com/backend/jd_notify.php \
  -d "tradeNum=TEST001&amount=0.01&status=2&sign=..."
```

## 生产环境注意事项

### 1. 安全配置

**隐藏敏感信息**:
- 私钥不要放在web可访问目录
- 使用环境变量存储敏感配置
- 定期更新密钥

**防护措施**:
```php
// 添加IP白名单验证
$allowedIPs = ['211.151.180.0/24']; // 京东回调IP段
if (!in_array($_SERVER['REMOTE_ADDR'], $allowedIPs)) {
    exit('Forbidden');
}

// 添加频率限制
$redis = new Redis();
$key = 'rate_limit:' . $_SERVER['REMOTE_ADDR'];
if ($redis->incr($key) > 100) {
    exit('Rate limit exceeded');
}
$redis->expire($key, 60);
```

### 2. 性能优化

**缓存配置**:
```php
// 使用Redis缓存订单状态
$redis = new Redis();
$redis->setex("order:$tradeNo", 3600, json_encode($orderData));
```

**日志轮转**:
```bash
# 配置logrotate
cat > /etc/logrotate.d/jd-payment << EOF
/var/www/html/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
EOF
```

### 3. 监控告警

**错误监控**:
```php
// 添加错误报告
if ($paymentFailed) {
    mail('admin@example.com', '支付失败告警', "订单 $tradeNo 支付失败");
}
```

**健康检查**:
```bash
# 监控脚本
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/backend/health_check.php)
if [ $response != "200" ]; then
    echo "支付服务异常" | mail -s "告警" admin@example.com
fi
```

## 故障排查

### 1. 常见问题

**问题**: WebView加载失败
```bash
# 检查域名配置
curl -I https://h5pay.jd.com
# 确认小程序后台web-view域名配置
```

**问题**: 签名验证失败
```bash
# 检查私钥格式
openssl rsa -in private_key.pem -text -noout
# 确认签名算法一致
```

**问题**: 回调接收不到
```bash
# 检查服务器日志
tail -f /var/log/nginx/access.log
tail -f /var/www/html/backend/logs/jd_notify_*.log
```

### 2. 调试工具

**开启调试模式**:
```php
// 在jd_payment.php中添加
define('DEBUG_MODE', true);
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}
```

**请求日志**:
```php
// 记录所有请求
file_put_contents('debug.log', date('Y-m-d H:i:s') . ' ' . $_SERVER['REQUEST_URI'] . ' ' . file_get_contents('php://input') . "\n", FILE_APPEND);
```

## 维护建议

1. **定期备份**
   - 数据库数据
   - 日志文件  
   - 配置文件

2. **安全更新**
   - 定期更新PHP版本
   - 更新SSL证书
   - 检查安全漏洞

3. **性能监控**
   - 监控响应时间
   - 检查错误率
   - 分析支付成功率

4. **文档维护**
   - 更新API文档
   - 记录配置变更
   - 维护故障处理手册