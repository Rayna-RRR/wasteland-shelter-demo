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

const DIFFICULTY_OPTIONS = ["稳健", "标准", "极端"]

const DIFFICULTY_NOTES = {
  "稳健": "开局配给：食物120 / 电力110 / 材料90 / 招募券60，适合熟悉流程。",
  "标准": "开局配给：食物100 / 电力100 / 材料70 / 招募券40，适合常规轮值。",
  "极端": "开局配给：食物70 / 电力75 / 材料45 / 招募券20，资源压力会更早出现。"
}

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

function buildEmptyResourceState() {
  const resources = format.formatResources()

  return Object.assign({
    resources
  }, buildResourceState(resources))
}

function buildClearedOfferState() {
  return {
    offerLoading: false,
    offerPurchasing: false,
    offerVisible: false,
    offerExposed: false,
    offerErrorMessage: "",
    offerResultMessage: "",
    offer: null,
    offerTriggerLabel: "",
    offerRewardRows: []
  }
}

function buildUninitializedHomeState(data) {
  return Object.assign({
    initialized: false,
    initErrorMessage: "",
    initProfile: buildInitProfile(data || {}),
    initIntroText: (data && data.intro_text) || INIT_INTRO_TEXT,
    loading: false,
    errorMessage: ""
  }, buildEmptyResourceState(), buildClearedOfferState())
}

function buildInitProfile(data) {
  return {
    shelter_code: data.shelter_code || "--",
    commander_name: data.commander_name || "--",
    difficulty: data.difficulty || "标准",
    introText: data.intro_text || INIT_INTRO_TEXT
  }
}

const INIT_INTRO_TEXT = "旧广播塔还剩最后一格电。登记代号，确认指挥官，补给室会按难度发放第一批物资。"

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

function markResetStateChanged() {
  const app = getApp()

  if (!app.globalData) {
    app.globalData = {}
  }

  app.globalData.resetStateVersion = Number(app.globalData.resetStateVersion || 0) + 1
}

Page({
  data: {
    checkingInit: false,
    initialized: false,
    initSubmitting: false,
    initErrorMessage: "",
    initProfile: buildInitProfile({}),
    initIntroText: INIT_INTRO_TEXT,
    initForm: {
      shelter_code: "",
      commander_name: "",
      difficulty: "标准"
    },
    difficultyOptions: DIFFICULTY_OPTIONS,
    difficultyIndex: 1,
    difficultyNote: DIFFICULTY_NOTES["标准"],
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
    demoModeLoading: false,
    demoModeEnabled: false,
    demoModeErrorMessage: "",
    debugResetting: false,
    debugInitResetting: false
  },

  onShow() {
    this.loadInitStatus()
    if (this.data.isLocalDev) {
      this.loadDemoModeStatus()
    }
  },

  loadInitStatus() {
    this.setData({
      checkingInit: !this.data.initialized,
      initErrorMessage: ""
    })

    api.getInitStatus()
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          const initialized = Boolean(res.data.initialized)

          if (initialized) {
            this.setData({
              initialized,
              initProfile: buildInitProfile(res.data),
              initIntroText: res.data.intro_text || INIT_INTRO_TEXT
            })
            this.refreshHome()
          } else {
            this.setData(buildUninitializedHomeState(res.data))
          }
          return
        }

        this.setData({
          initialized: false,
          initErrorMessage: "避难所登记状态读取失败。"
        })
      })
      .catch(() => {
        this.setData({
          initialized: false,
          initErrorMessage: "无法连接后端服务。"
        })
      })
      .finally(() => {
        this.setData({
          checkingInit: false
        })
      })
  },

  updateInitField(event) {
    const field = event.currentTarget.dataset.field
    const value = event.detail.value

    this.setData({
      [`initForm.${field}`]: value
    })
  },

  changeDifficulty(event) {
    const difficultyIndex = Number(event.detail.value)
    const difficulty = DIFFICULTY_OPTIONS[difficultyIndex] || "标准"

    this.setData({
      difficultyIndex,
      "initForm.difficulty": difficulty,
      difficultyNote: DIFFICULTY_NOTES[difficulty]
    })
  },

  submitInit() {
    const form = this.data.initForm
    const shelterCode = String(form.shelter_code || "").trim()
    const commanderName = String(form.commander_name || "").trim()

    if (!shelterCode || !commanderName) {
      this.setData({
        initErrorMessage: "请填写避难所代号和指挥官。"
      })
      return
    }

    this.setData({
      initSubmitting: true,
      initErrorMessage: ""
    })

    api.initializeShelter({
        shelter_code: shelterCode,
        commander_name: commanderName,
        difficulty: form.difficulty
      })
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.initialized) {
          markResetStateChanged()
          this.setData({
            initialized: true,
            initProfile: buildInitProfile(res.data)
          })
          wx.showToast({
            title: "避难所已接入",
            icon: "success"
          })
          this.refreshHome()
          return
        }

        this.setData({
          initErrorMessage: (res.data && res.data.message) || "初始化失败。"
        })
      })
      .catch(() => {
        this.setData({
          initErrorMessage: "无法连接后端服务。"
        })
      })
      .finally(() => {
        this.setData({
          initSubmitting: false
        })
      })
  },

  refreshHome() {
    if (!this.data.initialized) {
      return
    }

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

  loadDemoModeStatus() {
    this.setData({
      demoModeLoading: true,
      demoModeErrorMessage: ""
    })

    api.getDemoModeDebug()
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData({
            demoModeEnabled: Boolean(res.data.enabled)
          })
          return
        }

        this.setData({
          demoModeEnabled: false,
          demoModeErrorMessage: "录屏模式状态读取失败"
        })
      })
      .catch(() => {
        this.setData({
          demoModeEnabled: false,
          demoModeErrorMessage: "无法连接录屏模式调试接口"
        })
      })
      .finally(() => {
        this.setData({
          demoModeLoading: false
        })
      })
  },

  toggleDemoModeDebug() {
    if (!this.data.isLocalDev || this.data.demoModeLoading) {
      return
    }

    const nextEnabled = !this.data.demoModeEnabled

    this.setData({
      demoModeLoading: true,
      demoModeErrorMessage: ""
    })

    api.setDemoModeDebug(nextEnabled)
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          const enabled = Boolean(res.data.enabled)
          this.setData({
            demoModeEnabled: enabled
          })
          wx.showToast({
            title: enabled ? "录屏模式已开启" : "录屏模式已关闭",
            icon: "none"
          })
          return
        }

        this.setData({
          demoModeErrorMessage: "录屏模式切换失败"
        })
      })
      .catch(() => {
        this.setData({
          demoModeErrorMessage: "无法连接录屏模式调试接口"
        })
      })
      .finally(() => {
        this.setData({
          demoModeLoading: false
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
  },

  confirmResetInitDebug() {
    if (!this.data.isLocalDev || this.data.debugInitResetting) {
      return
    }

    wx.showModal({
      title: "确认重置新开局",
      content: "这会清空当前幸存者、招募日志、值勤日志和补给记录，并返回首次接入。仅用于本地开发。确认继续？",
      confirmText: "确认重置",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          this.resetInitDebug()
        }
      }
    })
  },

  resetInitDebug() {
    this.setData({
      debugInitResetting: true
    })

    api.resetInitDebug()
      .then((res) => {
        if (res.statusCode === 200) {
          markResetStateChanged()
          this.setData(Object.assign({
            initForm: {
              shelter_code: "",
              commander_name: "",
              difficulty: "标准"
            },
            difficultyIndex: 1,
            difficultyNote: DIFFICULTY_NOTES["标准"]
          }, buildUninitializedHomeState({})))
          this.loadInitStatus()
          wx.showToast({
            title: "已回到首次接入",
            icon: "success"
          })
          return
        }

        wx.showToast({
          title: "新开局重置失败",
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
          debugInitResetting: false
        })
      })
  }
})
