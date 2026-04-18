const api = require("../../utils/api")
const format = require("../../utils/format")
const config = require("../../config")

const RESOURCE_THRESHOLDS = {
  food: { warning: 75, critical: 60 },
  power: { warning: 75, critical: 60 },
  materials: { warning: 35, critical: 25 }
}

const RESOURCE_META = [
  { key: "food", label: "食物", code: "FOOD", thresholdText: "警戒 75 / 临界 60" },
  { key: "power", label: "电力", code: "PWR", thresholdText: "警戒 75 / 临界 60" },
  { key: "materials", label: "材料", code: "MAT", thresholdText: "警戒 35 / 临界 25" },
  { key: "premium_currency", label: "招募券", code: "TKT", thresholdText: "招募资源" }
]

function getNumberValue(value) {
  const numberValue = Number(value)
  return isNaN(numberValue) ? null : numberValue
}

function getResourceLevel(key, value, resources) {
  const numberValue = getNumberValue(value)

  if (key === "power" && resources.power_shortage) {
    return "critical"
  }

  if (!RESOURCE_THRESHOLDS[key] || numberValue === null) {
    return "normal"
  }

  if (numberValue <= RESOURCE_THRESHOLDS[key].critical) {
    return "critical"
  }

  if (numberValue <= RESOURCE_THRESHOLDS[key].warning) {
    return "warning"
  }

  return "normal"
}

function getResourceStatusLabel(key, level, resources) {
  if (key === "power" && resources.power_shortage) {
    return "短缺"
  }

  if (level === "critical") {
    return "临界"
  }

  if (level === "warning") {
    return "警戒"
  }

  if (key === "premium_currency") {
    return "可用"
  }

  return "稳定"
}

function getMeterPercent(key, value) {
  const numberValue = getNumberValue(value)

  if (numberValue === null) {
    return 0
  }

  if (key === "premium_currency") {
    return Math.min(100, Math.max(8, numberValue * 16))
  }

  return Math.min(100, Math.max(4, numberValue))
}

function buildResourceCards(resources) {
  return RESOURCE_META.map((item) => {
    const value = resources[item.key]
    const level = getResourceLevel(item.key, value, resources)

    return {
      key: item.key,
      label: item.label,
      code: item.code,
      value,
      thresholdText: item.thresholdText,
      statusLabel: getResourceStatusLabel(item.key, level, resources),
      cardClass: `resource-instrument resource-instrument--${level}`,
      meterClass: `resource-meter-fill resource-meter-fill--${level}`,
      meterStyle: `width: ${getMeterPercent(item.key, value)}%;`
    }
  })
}

function getResourcePanelState(resources) {
  if (resources.power_shortage) {
    return {
      resourcePanelClass: "resource-status resource-status--critical",
      resourceStatusText: "电力短缺"
    }
  }

  const cards = buildResourceCards(resources)
  const hasCritical = cards.some((item) => item.cardClass.indexOf("--critical") !== -1)
  const hasWarning = cards.some((item) => item.cardClass.indexOf("--warning") !== -1)

  if (hasCritical) {
    return {
      resourcePanelClass: "resource-status resource-status--critical",
      resourceStatusText: "资源临界"
    }
  }

  if (hasWarning) {
    return {
      resourcePanelClass: "resource-status resource-status--warning",
      resourceStatusText: "资源警戒"
    }
  }

  return {
    resourcePanelClass: "resource-status resource-status--normal",
    resourceStatusText: "运转稳定"
  }
}

function buildResourceState(resources) {
  return Object.assign({
    resourceCards: buildResourceCards(resources)
  }, getResourcePanelState(resources))
}

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

function isLocalDevApi() {
  const apiBaseUrl = String(config.apiBaseUrl || "").toLowerCase()

  return apiBaseUrl.indexOf("127.0.0.1") !== -1 || apiBaseUrl.indexOf("localhost") !== -1
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
    offerRewardRows: [],
    resourceCards: buildResourceCards(format.formatResources()),
    resourcePanelClass: "resource-status resource-status--normal",
    resourceStatusText: "等待同步",
    isLocalDev: isLocalDevApi(),
    debugResetting: false
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
          const resources = format.formatResources(res.data)

          this.setData(Object.assign({
            resources
          }, buildResourceState(resources)))
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
            offerRewardRows: active ? buildOfferRewardRows(offer) : [],
            offerResultMessage: active ? "" : this.data.offerResultMessage,
            offerErrorMessage: active ? "" : this.data.offerErrorMessage
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
          const resources = format.formatResources(res.data.resources)

          this.setData(Object.assign({
            resources,
            offerVisible: false,
            offerResultMessage: res.data.message || "战备补给已入库。"
          }, buildResourceState(resources)))
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
  },

  confirmResetEmergencyOfferDebug() {
    if (!this.data.isLocalDev || this.data.debugResetting) {
      return
    }

    wx.showModal({
      title: "确认重置补给测试状态",
      content: "这只会清空应急补给调试记录，不会重置整个游戏。确认继续？",
      confirmText: "确认重置",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          this.resetEmergencyOfferDebug()
        }
      }
    })
  },

  resetEmergencyOfferDebug() {
    this.setData({
      debugResetting: true
    })

    api.resetEmergencyOfferDebug()
      .then((res) => {
        if (res.statusCode === 200) {
          this.setData({
            offerVisible: false,
            offer: null,
            offerTriggerLabel: "",
            offerRewardRows: [],
            offerResultMessage: "",
            offerErrorMessage: "",
            offerExposed: false
          })
          this.loadResources()
          this.loadEmergencyOffer()
          wx.showToast({
            title: "补给测试状态已重置",
            icon: "success"
          })
          return
        }

        wx.showToast({
          title: "重置失败",
          icon: "none"
        })
      })
      .catch(() => {
        wx.showToast({
          title: "无法连接调试接口",
          icon: "none"
        })
      })
      .finally(() => {
        this.setData({
          debugResetting: false
        })
      })
  }
})
