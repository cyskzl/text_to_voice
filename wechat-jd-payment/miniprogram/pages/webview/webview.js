Page({
  data: {
    url: ''
  },

  onLoad(options) {
    // 获取要加载的URL
    const url = decodeURIComponent(options.url)
    this.setData({ url })
    
    console.log('加载URL:', url)
  },

  // 处理来自H5页面的消息
  handleMessage(e) {
    console.log('收到H5消息:', e.detail)
    
    const data = e.detail.data
    if (data && data.length > 0) {
      const message = data[data.length - 1] // 获取最新的消息
      
      if (message.type === 'paymentComplete') {
        // 支付完成，返回上一页
        wx.navigateBack()
      }
    }
  }
})