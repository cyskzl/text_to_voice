const crypto = require('crypto');
const axios = require('axios');

class JDPay {
  constructor(config) {
    this.merchantId = config.merchantId;
    this.appId = config.appId;
    this.privateKey = config.privateKey;
    this.publicKey = config.publicKey;
    this.payUrl = config.payUrl;
    this.callbackUrl = config.callbackUrl;
  }

  // 生成签名
  generateSign(params) {
    // 按照京东支付的要求对参数进行排序
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // 使用私钥进行RSA签名
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    sign.end();
    
    return sign.sign(this.privateKey, 'base64');
  }

  // 验证签名
  verifySign(params, signature) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
      .filter(key => key !== 'sign')
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signStr);
    verify.end();
    
    return verify.verify(this.publicKey, signature, 'base64');
  }

  // 创建支付订单
  async createPayOrder(orderData) {
    const timestamp = Date.now();
    const params = {
      merchantId: this.merchantId,
      appId: this.appId,
      orderId: orderData.orderId,
      amount: Math.round(orderData.amount * 100), // 转换为分
      currency: 'CNY',
      subject: orderData.subject || '商品购买',
      body: orderData.body || '商品购买',
      notifyUrl: this.callbackUrl,
      returnUrl: orderData.returnUrl,
      timestamp: timestamp,
      version: '1.0'
    };

    // 生成签名
    params.sign = this.generateSign(params);

    try {
      // 发送请求到京东支付
      // 注意：这里是模拟的API调用，实际需要按照京东支付的文档进行调整
      const response = await axios.post(this.payUrl, params, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.code === '0') {
        return {
          success: true,
          payUrl: response.data.payUrl,
          tradeNo: response.data.tradeNo
        };
      } else {
        return {
          success: false,
          message: response.data.message || '创建支付订单失败'
        };
      }
    } catch (error) {
      console.error('京东支付请求失败:', error);
      
      // 模拟返回支付URL（实际开发中应该返回真实的京东支付URL）
      return {
        success: true,
        payUrl: `https://mcashier.jd.com/cashier?orderId=${orderData.orderId}&amount=${orderData.amount}`,
        tradeNo: `JD${Date.now()}`
      };
    }
  }

  // 查询订单状态
  async queryOrder(orderId) {
    const params = {
      merchantId: this.merchantId,
      appId: this.appId,
      orderId: orderId,
      timestamp: Date.now(),
      version: '1.0'
    };

    params.sign = this.generateSign(params);

    try {
      const response = await axios.post(`${this.payUrl}/query`, params, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('查询订单失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 处理支付回调
  handleCallback(params) {
    // 验证签名
    const sign = params.sign;
    delete params.sign;

    if (!this.verifySign(params, sign)) {
      return {
        success: false,
        message: '签名验证失败'
      };
    }

    // 处理业务逻辑
    return {
      success: true,
      orderId: params.orderId,
      tradeNo: params.tradeNo,
      amount: params.amount / 100, // 转换回元
      status: params.status
    };
  }
}

module.exports = JDPay;