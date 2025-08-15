// 简单的内存存储，实际项目应该使用数据库
const orders = new Map();

class OrderModel {
  // 保存订单
  static save(orderData) {
    orders.set(orderData.orderId, orderData);
    return orderData;
  }
  
  // 根据订单ID查找订单
  static findById(orderId) {
    return orders.get(orderId);
  }
  
  // 更新订单状态
  static updateStatus(orderId, status) {
    const order = orders.get(orderId);
    if (order) {
      order.status = status;
      order.updateTime = new Date();
      
      if (status === 'paid') {
        order.payTime = new Date();
      }
      
      orders.set(orderId, order);
      return true;
    }
    return false;
  }
  
  // 获取所有订单（调试用）
  static getAll() {
    return Array.from(orders.values());
  }
  
  // 清空订单（测试用）
  static clear() {
    orders.clear();
  }
}

module.exports = OrderModel;