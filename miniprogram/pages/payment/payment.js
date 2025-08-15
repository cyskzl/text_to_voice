// pages/payment/payment.js
const app = getApp()

Page({
  data: {
    productInfo: {},
    orderId: '',
    paymentMethods: [
      {
        id: 'jdpay',
        name: '京东支付',
        icon: '/images/jdpay.png',
        desc: '京东钱包，安全便捷'
      },
      {
        id: 'wechatpay',
        name: '微信支付',
        icon: '/images/wechatpay.png',
        desc: '微信安全支付'
      }
    ],
    selectedPayment: 'jdpay',
    loading: false
  },

  onLoad(options) {
    // 获取商品信息
    const productInfo = {
      id: options.productId,
      name: decodeURIComponent(options.productName || ''),
      price: parseFloat(options.price || 0)
    }
    
    // 生成订单号
    const orderId = this.generateOrderId()
    
    this.setData({
      productInfo,
      orderId
    })

    wx.setNavigationBarTitle({
      title: `支付 - ${productInfo.name}`
    })
  },

  // 生成订单号
  generateOrderId() {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `JD${timestamp}${random}`
  },

  // 选择支付方式
  selectPayment(e) {
    const paymentId = e.currentTarget.dataset.id
    this.setData({
      selectedPayment: paymentId
    })
  },

  // 确认支付
  confirmPayment() {
    if (this.data.loading) return

    const { selectedPayment, productInfo, orderId } = this.data

    if (selectedPayment === 'jdpay') {
      this.payWithJD()
    } else if (selectedPayment === 'wechatpay') {
      this.payWithWechat()
    }
  },

  // 京东支付
  async payWithJD() {
    this.setData({ loading: true })

    try {
      // 创建支付订单
      const orderResult = await this.createJDPayOrder()
      
      if (orderResult.code === 0) {
        // 跳转到WebView支付页面
        wx.navigateTo({
          url: `/pages/payment-webview/payment-webview?payUrl=${encodeURIComponent(orderResult.data.pay_url)}&orderId=${this.data.orderId}`
        })
      } else {
        throw new Error(orderResult.message || '创建订单失败')
      }

    } catch (error) {
      console.error('京东支付失败:', error)
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 微信支付
  async payWithWechat() {
    this.setData({ loading: true })

    try {
      // 调用微信支付API
      const payResult = await this.requestWechatPay()
      
      if (payResult.code === 0) {
        const payData = payResult.data
        
        wx.requestPayment({
          timeStamp: payData.timeStamp,
          nonceStr: payData.nonceStr,
          package: payData.package,
          signType: payData.signType,
          paySign: payData.paySign,
          success: (res) => {
            this.handlePaymentSuccess('wechatpay')
          },
          fail: (res) => {
            console.error('微信支付失败:', res)
            wx.showToast({
              title: '支付失败',
              icon: 'error'
            })
          }
        })
      } else {
        throw new Error(payResult.message || '创建微信支付订单失败')
      }

    } catch (error) {
      console.error('微信支付失败:', error)
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 创建京东支付订单
  createJDPayOrder() {
    return new Promise((resolve, reject) => {
      const { productInfo, orderId } = this.data
      
      wx.request({
        url: `${app.globalData.serverUrl}/jd_payment.php/create_order`,
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          out_trade_no: orderId,
          subject: productInfo.name,
          body: `购买商品：${productInfo.name}`,
          total_amount: productInfo.price,
          user_id: app.globalData.userInfo?.nickName || 'guest'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error('网络请求失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  // 请求微信支付
  requestWechatPay() {
    return new Promise((resolve, reject) => {
      const { productInfo, orderId } = this.data
      
      wx.request({
        url: `${app.globalData.serverUrl}/wechat_payment.php/create_order`,
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          out_trade_no: orderId,
          body: `购买商品：${productInfo.name}`,
          total_fee: Math.round(productInfo.price * 100), // 微信支付金额单位为分
          openid: app.globalData.openid || ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error('网络请求失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  // 处理支付成功
  handlePaymentSuccess(paymentType) {
    wx.redirectTo({
      url: `/pages/payment-result/payment-result?status=success&orderId=${this.data.orderId}&paymentType=${paymentType}`
    })
  },

  // 查询订单状态
  queryOrderStatus() {
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
            this.handlePaymentSuccess('jdpay')
          }
        }
      }
    })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  }
})