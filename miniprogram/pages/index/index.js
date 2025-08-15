// pages/index/index.js
const app = getApp()

Page({
  data: {
    products: [
      {
        id: 1,
        name: "iPhone 15 Pro",
        price: 7999,
        image: "/images/iphone15pro.jpg"
      },
      {
        id: 2,
        name: "MacBook Pro",
        price: 12999,
        image: "/images/macbook.jpg"
      },
      {
        id: 3,
        name: "AirPods Pro",
        price: 1899,
        image: "/images/airpods.jpg"
      }
    ]
  },

  onLoad() {
    // 页面加载时的逻辑
  },

  // 购买商品
  buyProduct(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p.id == productId)
    
    if (!product) {
      wx.showToast({
        title: '商品信息错误',
        icon: 'error'
      })
      return
    }

    // 跳转到支付页面
    wx.navigateTo({
      url: `/pages/payment/payment?productId=${productId}&productName=${product.name}&price=${product.price}`
    })
  },

  // 获取用户信息
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        app.globalData.userInfo = res.userInfo
      }
    })
  }
})