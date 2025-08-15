App({
  globalData: {
    // 后端API地址
    baseUrl: 'https://your-backend-api.com',
    // H5中转页地址
    h5BridgeUrl: 'https://your-h5-bridge.com',
    // 当前订单信息
    currentOrder: null
  },
  
  onLaunch() {
    // 小程序初始化
    console.log('App Launch')
  },
  
  onShow() {
    // 小程序显示时检查是否从支付页面返回
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    
    // 如果是从webview返回，检查支付状态
    if (currentPage && currentPage.route === 'pages/payment/payment') {
      if (this.globalData.currentOrder) {
        // 查询订单状态
        this.checkOrderStatus(this.globalData.currentOrder.orderId)
      }
    }
  },
  
  // 检查订单状态
  checkOrderStatus(orderId) {
    wx.request({
      url: `${this.globalData.baseUrl}/api/order/status`,
      method: 'POST',
      data: { orderId },
      success: (res) => {
        if (res.data.code === 0) {
          const status = res.data.data.status
          if (status === 'paid') {
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            })
          } else if (status === 'failed') {
            wx.showToast({
              title: '支付失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})