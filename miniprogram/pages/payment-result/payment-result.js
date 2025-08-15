// pages/payment-result/payment-result.js
const app = getApp()

Page({
  data: {
    status: '', // success, failed, cancelled
    orderId: '',
    paymentType: '', // jdpay, wechatpay
    orderInfo: null,
    loading: true
  },

  onLoad(options) {
    const status = options.status || 'failed'
    const orderId = options.orderId || ''
    const paymentType = options.paymentType || 'jdpay'
    
    this.setData({
      status,
      orderId,
      paymentType
    })

    // 设置页面标题
    this.setPageTitle(status)
    
    // 查询订单详情
    this.queryOrderDetail()
    
    // 防止用户返回到支付页面
    wx.hideHomeButton()
  },

  // 设置页面标题
  setPageTitle(status) {
    let title = '支付结果'
    
    switch(status) {
      case 'success':
        title = '支付成功'
        break
      case 'failed':
        title = '支付失败'
        break
      case 'cancelled':
        title = '支付取消'
        break
    }
    
    wx.setNavigationBarTitle({ title })
  },

  // 查询订单详情
  queryOrderDetail() {
    if (!this.data.orderId) {
      this.setData({ loading: false })
      return
    }

    wx.request({
      url: `${app.globalData.serverUrl}/jd_payment.php/query_status`,
      method: 'GET',
      data: {
        trade_no: this.data.orderId
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          this.setData({
            orderInfo: res.data.data,
            loading: false
          })
        } else {
          this.setData({ loading: false })
        }
      },
      fail: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 返回首页
  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 继续购物
  continueShopping() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 重新支付
  retryPayment() {
    if (this.data.orderInfo) {
      wx.redirectTo({
        url: `/pages/payment/payment?productId=1&productName=${encodeURIComponent('重新支付商品')}&price=${this.data.orderInfo.amount || 0}`
      })
    } else {
      wx.navigateBack()
    }
  },

  // 查看订单详情
  viewOrderDetail() {
    wx.showModal({
      title: '订单详情',
      content: `订单号：${this.data.orderId}\n支付方式：${this.getPaymentTypeName()}\n订单状态：${this.getStatusText()}`,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 获取支付方式名称
  getPaymentTypeName() {
    switch(this.data.paymentType) {
      case 'jdpay':
        return '京东支付'
      case 'wechatpay':
        return '微信支付'
      default:
        return '未知'
    }
  },

  // 获取状态文本
  getStatusText() {
    switch(this.data.status) {
      case 'success':
        return '支付成功'
      case 'failed':
        return '支付失败'
      case 'cancelled':
        return '支付取消'
      default:
        return '未知状态'
    }
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '如有问题请联系客服\n客服电话：400-123-4567\n工作时间：9:00-18:00',
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '我在使用京东支付，快来体验吧！',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '京东支付小程序，支付更便捷！',
      imageUrl: '/images/share.png'
    }
  }
})