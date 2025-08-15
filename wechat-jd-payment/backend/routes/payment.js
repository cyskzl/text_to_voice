const express = require('express');
const router = express.Router();
const JDPay = require('../utils/jdPay');
const OrderModel = require('../models/order');

// 初始化京东支付
const jdPay = new JDPay({
  merchantId: process.env.JD_MERCHANT_ID,
  appId: process.env.JD_APP_ID,
  privateKey: process.env.JD_PRIVATE_KEY,
  publicKey: process.env.JD_PUBLIC_KEY,
  payUrl: process.env.JD_PAY_URL,
  callbackUrl: process.env.CALLBACK_URL
});

// 创建京东支付订单
router.post('/jd/create', async (req, res) => {
  try {
    const { orderId, amount, returnUrl } = req.body;
    
    // 验证参数
    if (!orderId || !amount) {
      return res.json({
        code: -1,
        message: '参数不完整'
      });
    }
    
    // 查找订单
    const order = OrderModel.findById(orderId);
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    // 创建京东支付订单
    const payResult = await jdPay.createPayOrder({
      orderId: orderId,
      amount: amount,
      subject: order.productName,
      body: `购买商品：${order.productName}`,
      returnUrl: returnUrl
    });
    
    if (payResult.success) {
      // 保存交易号
      order.tradeNo = payResult.tradeNo;
      OrderModel.save(order);
      
      res.json({
        code: 0,
        message: '创建支付订单成功',
        data: {
          payUrl: payResult.payUrl,
          tradeNo: payResult.tradeNo
        }
      });
    } else {
      res.json({
        code: -1,
        message: payResult.message || '创建支付订单失败'
      });
    }
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.json({
      code: -1,
      message: '创建支付订单失败',
      error: error.message
    });
  }
});

// 京东支付回调
router.post('/jd/callback', async (req, res) => {
  try {
    console.log('收到京东支付回调:', req.body);
    
    // 处理回调
    const result = jdPay.handleCallback(req.body);
    
    if (result.success) {
      // 更新订单状态
      const order = OrderModel.findById(result.orderId);
      if (order) {
        if (result.status === 'SUCCESS') {
          OrderModel.updateStatus(result.orderId, 'paid');
        } else if (result.status === 'FAILED') {
          OrderModel.updateStatus(result.orderId, 'failed');
        }
      }
      
      // 返回成功响应给京东
      res.send('SUCCESS');
    } else {
      res.send('FAIL');
    }
  } catch (error) {
    console.error('处理支付回调失败:', error);
    res.send('FAIL');
  }
});

// 查询支付状态
router.post('/jd/query', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.json({
        code: -1,
        message: '订单号不能为空'
      });
    }
    
    // 查询京东支付状态
    const queryResult = await jdPay.queryOrder(orderId);
    
    res.json({
      code: 0,
      message: '查询成功',
      data: queryResult
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.json({
      code: -1,
      message: '查询支付状态失败',
      error: error.message
    });
  }
});

// 模拟支付成功（测试用）
router.post('/test/success', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.json({
        code: -1,
        message: '订单号不能为空'
      });
    }
    
    // 更新订单状态为已支付
    const updated = OrderModel.updateStatus(orderId, 'paid');
    
    if (updated) {
      res.json({
        code: 0,
        message: '模拟支付成功',
        data: { orderId }
      });
    } else {
      res.json({
        code: -1,
        message: '订单不存在'
      });
    }
  } catch (error) {
    res.json({
      code: -1,
      message: '操作失败',
      error: error.message
    });
  }
});

module.exports = router;