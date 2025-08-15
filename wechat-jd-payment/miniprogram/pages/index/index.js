const app = getApp()

Page({
  data: {
    products: [
      {
        id: 1,
        name: '商品示例1',
        description: '这是一个测试商品',
        price: 99.00,
        image: '/images/product1.jpg'
      },
      {
        id: 2,
        name: '商品示例2',
        description: '这是另一个测试商品',
        price: 199.00,
        image: '/images/product2.jpg'
      }
    ]
  },

  onLoad() {
    // 可以从后端加载商品列表
    this.loadProducts()
  },

  // 加载商品列表
  loadProducts() {
    // 这里可以调用后端API获取商品列表
    // wx.request({
    //   url: `${app.globalData.baseUrl}/api/products`,
    //   success: (res) => {
    //     this.setData({ products: res.data.data })
    //   }
    // })
  },

  // 选择商品
  selectProduct(e) {
    const product = e.currentTarget.dataset.product
    console.log('选择商品：', product)
  },

  // 立即购买
  buyNow(e) {
    const product = e.currentTarget.dataset.product
    
    // 跳转到支付页面
    wx.navigateTo({
      url: `/pages/payment/payment?productId=${product.id}&productName=${product.name}&price=${product.price}`
    })
  }
})