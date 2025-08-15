const app = getApp()

Page({
  data: {
    productId: '',
    productName: '',
    price: 0,
    orderId: '',
    payMethod: 'jd', // 默认选中京东支付
    loading: false
  },

  onLoad(options) {
    // 获取商品信息
    this.setData({
      productId: options.productId,
      productName: options.productName,
      price: options.price
    })
    
    // 创建订单
    this.createOrder()
  },

  // 创建订单
  createOrder() {
    wx.showLoading({ title: '创建订单中...' })
    
    wx.request({
      url: `${app.globalData.baseUrl}/api/order/create`,
      method: 'POST',
      data: {
        productId: this.data.productId,
        productName: this.data.productName,
        price: this.data.price,
        payMethod: 'jd'
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.data.code === 0) {
          const orderId = res.data.data.orderId
          this.setData({ orderId })
          
          // 保存订单信息到全局
          app.globalData.currentOrder = {
            orderId: orderId,
            productId: this.data.productId,
            price: this.data.price
          }
        } else {
          wx.showToast({
            title: res.data.message || '创建订单失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 选择支付方式
  selectPayMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ payMethod: method })
  },

  // 确认支付
  confirmPay() {
    if (!this.data.payMethod) {
      wx.showToast({
        title: '请选择支付方式',
        icon: 'none'
      })
      return
    }

    if (!this.data.orderId) {
      wx.showToast({
        title: '订单创建失败',
        icon: 'none'
      })
      return
    }

    // 调用京东支付
    this.jdPay()
  },

  // 京东支付
  jdPay() {
    wx.showLoading({ title: '正在发起支付...' })
    
    // 调用后端接口获取支付参数
    wx.request({
      url: `${app.globalData.baseUrl}/api/payment/jd/create`,
      method: 'POST',
      data: {
        orderId: this.data.orderId,
        amount: this.data.price,
        returnUrl: `${app.globalData.h5BridgeUrl}/payment-result`
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.data.code === 0) {
          const paymentData = res.data.data
          
          // 构建H5中转页URL
          const h5Url = `${app.globalData.h5BridgeUrl}/jd-payment?orderId=${this.data.orderId}&payUrl=${encodeURIComponent(paymentData.payUrl)}`
          
          // 跳转到webview页面
          wx.navigateTo({
            url: `/pages/webview/webview?url=${encodeURIComponent(h5Url)}`
          })
        } else {
          wx.showToast({
            title: res.data.message || '支付失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 页面显示时检查支付状态
  onShow() {
    // 如果有订单ID，检查支付状态
    if (this.data.orderId && app.globalData.currentOrder) {
      this.checkPaymentStatus()
    }
  },

  // 检查支付状态
  checkPaymentStatus() {
    wx.request({
      url: `${app.globalData.baseUrl}/api/order/status`,
      method: 'POST',
      data: {
        orderId: this.data.orderId
      },
      success: (res) => {
        if (res.data.code === 0) {
          const status = res.data.data.status
          
          if (status === 'paid') {
            wx.showModal({
              title: '支付成功',
              content: '您的订单已支付成功',
              showCancel: false,
              success: () => {
                // 返回首页
                wx.navigateBack()
              }
            })
          } else if (status === 'failed') {
            wx.showModal({
              title: '支付失败',
              content: '支付未成功，请重新支付',
              showCancel: false
            })
          }
        }
      }
    })
  }
})