# 部署指南

## 前置准备

### 1. 京东支付账号
- 在京东金融开放平台注册商户账号
- 获取以下信息：
  - 商户ID (MERCHANT_ID)
  - 应用ID (APP_ID)
  - RSA私钥和公钥

### 2. 微信小程序配置
- 在微信公众平台配置业务域名
- 添加 H5 中转页的域名到小程序的业务域名白名单

### 3. 服务器要求
- Node.js 14.0+
- HTTPS 证书（必须）
- 域名备案（如果在中国大陆部署）

## 部署步骤

### 1. 部署后端服务

#### 1.1 配置环境变量
```bash
cd backend
cp .env .env.production

# 编辑 .env.production 文件，填入真实的配置信息
vim .env.production
```

#### 1.2 安装依赖
```bash
npm install
```

#### 1.3 启动服务
```bash
# 生产环境
NODE_ENV=production npm start

# 或使用 PM2
npm install -g pm2
pm2 start server.js --name jd-payment-backend
```

### 2. 部署 H5 中转页

#### 2.1 配置 Nginx
```nginx
server {
    listen 443 ssl;
    server_name your-h5-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    root /var/www/h5-bridge;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 2.2 上传文件
```bash
# 将 h5-bridge 目录下的文件上传到服务器
scp -r h5-bridge/* user@server:/var/www/h5-bridge/
```

### 3. 配置微信小程序

#### 3.1 更新配置
修改 `miniprogram/app.js` 中的配置：
```javascript
globalData: {
    baseUrl: 'https://your-api-domain.com',
    h5BridgeUrl: 'https://your-h5-domain.com'
}
```

#### 3.2 上传代码
使用微信开发者工具上传小程序代码

### 4. 测试流程

#### 4.1 测试支付流程
1. 在小程序中选择商品
2. 点击购买，创建订单
3. 选择京东支付
4. 跳转到 H5 中转页
5. 复制链接在浏览器中打开
6. 完成京东支付
7. 返回小程序查看支付结果

#### 4.2 测试回调
使用后端提供的测试接口模拟支付成功：
```bash
curl -X POST https://your-api-domain.com/api/payment/test/success \
  -H "Content-Type: application/json" \
  -d '{"orderId": "JD123456789"}'
```

## 安全建议

1. **签名验证**：确保所有支付回调都进行签名验证
2. **HTTPS**：所有接口必须使用 HTTPS
3. **参数校验**：严格校验所有输入参数
4. **日志记录**：记录所有支付相关操作
5. **金额校验**：支付回调时必须校验金额是否正确

## 监控和维护

1. **错误监控**：使用 Sentry 或类似工具监控错误
2. **日志分析**：定期分析支付失败原因
3. **性能监控**：监控接口响应时间
4. **定期更新**：及时更新依赖包

## 常见问题

### Q: 小程序无法打开 H5 页面
A: 检查 H5 域名是否已添加到小程序的业务域名白名单

### Q: 支付回调没有收到
A: 
1. 检查回调地址是否正确
2. 检查服务器防火墙设置
3. 查看京东支付后台的回调日志

### Q: 签名验证失败
A: 
1. 检查公私钥配置是否正确
2. 确认签名算法是否一致
3. 检查参数排序是否正确

## 联系支持

- 京东支付技术支持：[京东金融开放平台](https://open.jd.com)
- 微信小程序支持：[微信开放社区](https://developers.weixin.qq.com)