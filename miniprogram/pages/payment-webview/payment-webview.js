// pages/payment-webview/payment-webview.js
const app = getApp()

Page({
  data: {
    payUrl: '',
    orderId: '',
    loading: true,
    showRetry: false,
    paymentStatus: 'pending' // pending, success, failed
  },

  onLoad(options) {
    const payUrl = decodeURIComponent(options.payUrl || '')
    const orderId = options.orderId || ''
    
    this.setData({
      payUrl,
      orderId
    })

    wx.setNavigationBarTitle({
      title: '京东支付'
    })

    // 开始轮询查询支付状态
    this.startPollingPaymentStatus()
  },

  onUnload() {
    // 页面卸载时清除定时器
    if (this.data.statusTimer) {
      clearInterval(this.data.statusTimer)
    }
  },

  // WebView加载完成
  onWebViewLoad() {
    this.setData({
      loading: false
    })
  },

  // WebView加载失败
  onWebViewError() {
    this.setData({
      loading: false,
      showRetry: true
    })
    
    wx.showToast({
      title: '支付页面加载失败',
      icon: 'error'
    })
  },

  // 重试加载
  retryLoad() {
    this.setData({
      loading: true,
      showRetry: false
    })
  },

  // 开始轮询查询支付状态
  startPollingPaymentStatus() {
    // 每5秒查询一次支付状态
    const timer = setInterval(() => {
      this.queryPaymentStatus()
    }, 5000)
    
    this.setData({
      statusTimer: timer
    })
  },

  // 查询支付状态
  queryPaymentStatus() {
    wx.request({
      url: `${app.globalData.serverUrl}/jd_payment.php/query_status`,
      method: 'GET',
      data: {
        trade_no: this.data.orderId
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const status = res.data.data.trade_status
          
          if (status === 'success' || status === '2') {
            // 支付成功
            this.handlePaymentSuccess()
          } else if (status === 'failed' || status === '3') {
            // 支付失败
            this.handlePaymentFailed()
          }
        }
      },
      fail: (err) => {
        console.error('查询支付状态失败:', err)
      }
    })
  },

  // 处理支付成功
  handlePaymentSuccess() {
    // 清除定时器
    if (this.data.statusTimer) {
      clearInterval(this.data.statusTimer)
    }
    
    this.setData({
      paymentStatus: 'success'
    })

    wx.showToast({
      title: '支付成功',
      icon: 'success',
      duration: 2000,
      success: () => {
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/payment-result/payment-result?status=success&orderId=${this.data.orderId}&paymentType=jdpay`
          })
        }, 2000)
      }
    })
  },

  // 处理支付失败
  handlePaymentFailed() {
    // 清除定时器
    if (this.data.statusTimer) {
      clearInterval(this.data.statusTimer)
    }
    
    this.setData({
      paymentStatus: 'failed'
    })

    wx.showModal({
      title: '支付失败',
      content: '支付过程中发生错误，是否重新支付？',
      confirmText: '重新支付',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          // 重新支付
          wx.navigateBack()
        } else {
          // 返回支付结果页
          wx.redirectTo({
            url: `/pages/payment-result/payment-result?status=failed&orderId=${this.data.orderId}&paymentType=jdpay`
          })
        }
      }
    })
  },

  // 手动查询支付状态
  manualCheckStatus() {
    wx.showLoading({
      title: '查询中...'
    })
    
    this.queryPaymentStatus()
    
    setTimeout(() => {
      wx.hideLoading()
      
      if (this.data.paymentStatus === 'pending') {
        wx.showToast({
          title: '支付状态查询中，请稍候',
          icon: 'none'
        })
      }
    }, 2000)
  },

  // 取消支付
  cancelPayment() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消支付吗？',
      confirmText: '确定',
      cancelText: '继续支付',
      success: (res) => {
        if (res.confirm) {
          // 清除定时器
          if (this.data.statusTimer) {
            clearInterval(this.data.statusTimer)
          }
          
          wx.redirectTo({
            url: `/pages/payment-result/payment-result?status=cancelled&orderId=${this.data.orderId}&paymentType=jdpay`
          })
        }
      }
    })
  },

  // WebView消息处理
  onWebViewMessage(e) {
    const messages = e.detail.data
    
    if (messages && messages.length > 0) {
      const message = messages[messages.length - 1]
      
      if (message.type === 'payment_result') {
        if (message.status === 'success') {
          this.handlePaymentSuccess()
        } else if (message.status === 'failed') {
          this.handlePaymentFailed()
        }
      }
    }
  }
})