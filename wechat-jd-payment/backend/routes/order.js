const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const OrderModel = require('../models/order');

// 创建订单
router.post('/create', async (req, res) => {
  try {
    const { productId, productName, price, payMethod } = req.body;
    
    // 生成订单号
    const orderId = `JD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // 创建订单数据
    const orderData = {
      orderId,
      productId,
      productName,
      price,
      payMethod,
      status: 'pending', // pending, paid, failed, cancelled
      createTime: new Date(),
      updateTime: new Date()
    };
    
    // 保存订单（这里使用内存存储，实际应该使用数据库）
    OrderModel.save(orderData);
    
    res.json({
      code: 0,
      message: '订单创建成功',
      data: {
        orderId: orderData.orderId
      }
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.json({
      code: -1,
      message: '创建订单失败',
      error: error.message
    });
  }
});

// 查询订单状态
router.post('/status', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.json({
        code: -1,
        message: '订单号不能为空'
      });
    }
    
    // 查询订单
    const order = OrderModel.findById(orderId);
    
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    res.json({
      code: 0,
      message: '查询成功',
      data: {
        orderId: order.orderId,
        status: order.status,
        productName: order.productName,
        price: order.price,
        createTime: order.createTime,
        updateTime: order.updateTime,
        payTime: order.payTime
      }
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.json({
      code: -1,
      message: '查询订单失败',
      error: error.message
    });
  }
});

// 更新订单状态
router.post('/update-status', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    
    if (!orderId || !status) {
      return res.json({
        code: -1,
        message: '参数不完整'
      });
    }
    
    // 更新订单状态
    const updated = OrderModel.updateStatus(orderId, status);
    
    if (!updated) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    res.json({
      code: 0,
      message: '更新成功',
      data: { orderId, status }
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.json({
      code: -1,
      message: '更新订单状态失败',
      error: error.message
    });
  }
});

module.exports = router;