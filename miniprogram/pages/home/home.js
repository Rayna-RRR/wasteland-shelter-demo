const api = require("../../utils/api")
const format = require("../../utils/format")

function buildOfferRewardRows(offer) {
  const rewards = (offer && offer.rewards) || {}

  return [
    { label: "招募券", value: `+${rewards.premium_currency || 0}` },
    { label: "食物", value: `+${rewards.food || 0}` },
    { label: "电力", value: `+${rewards.power || 0}` },
    { label: "材料", value: `+${rewards.materials || 0}` },
    { label: "全员疲劳", value: "-15" },
    { label: "全员健康", value: "+5" }
  ]
}

Page({
  data: {
    loading: false,
    errorMessage: "",
    resources: format.formatResources(),
    offerLoading: false,
    offerPurchasing: false,
    offerVisible: false,
    offerExposed: false,
    offerErrorMessage: "",
    offerResultMessage: "",
    offer: null,
    offerTriggerLabel: "",
    offerRewardRows: []
  },

  onShow() {
    this.refreshHome()
  },

  refreshHome() {
    this.loadResources()
    this.loadEmergencyOffer()
  },

  loadResources() {
    this.setData({
      loading: true,
      errorMessage: ""
    })

    api.getResources()
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData({
            resources: format.formatResources(res.data)
          })
          return
        }

        this.setData({
          errorMessage: "资源加载失败"
        })
      })
      .catch(() => {
        this.setData({
          errorMessage: "无法连接后端服务"
        })
      })
      .finally(() => {
        this.setData({
          loading: false
        })
      })
  },

  loadEmergencyOffer() {
    this.setData({
      offerLoading: true,
      offerErrorMessage: ""
    })

    api.getEmergencyOfferState()
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          const active = Boolean(res.data.active)
          const offer = res.data.offer || null

          this.setData({
            offerVisible: active,
            offer,
            offerTriggerLabel: active ? format.getTriggerReasonLabel(res.data.trigger_reason) : "",
            offerRewardRows: active ? buildOfferRewardRows(offer) : []
          })

          if (active && !this.data.offerExposed) {
            this.setData({
              offerExposed: true
            })
            api.exposeEmergencyOffer().catch(() => {})
          }

          return
        }

        this.setData({
          offerErrorMessage: "补给室通讯暂时中断"
        })
      })
      .catch(() => {
        this.setData({
          offerErrorMessage: "补给室通讯暂时中断"
        })
      })
      .finally(() => {
        this.setData({
          offerLoading: false
        })
      })
  },

  closeEmergencyOffer() {
    api.closeEmergencyOffer().finally(() => {
      this.setData({
        offerVisible: false,
        offerResultMessage: "已暂缓处理，补给室继续待命。"
      })
    })
  },

  purchaseEmergencyOffer() {
    this.setData({
      offerPurchasing: true,
      offerErrorMessage: "",
      offerResultMessage: ""
    })

    api.purchaseEmergencyOffer()
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.status === "ok") {
          this.setData({
            resources: format.formatResources(res.data.resources),
            offerVisible: false,
            offerResultMessage: res.data.message || "战备补给已入库。"
          })
          return
        }

        this.setData({
          offerErrorMessage: (res.data && res.data.message) || "补给协议暂时无法启用"
        })
      })
      .catch(() => {
        this.setData({
          offerErrorMessage: "补给室通讯暂时中断"
        })
      })
      .finally(() => {
        this.setData({
          offerPurchasing: false
        })
      })
  }
})
