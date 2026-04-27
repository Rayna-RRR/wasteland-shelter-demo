const api = require("../../utils/api")
const format = require("../../utils/format")
const config = require("../../config")
const portraitMap = require("../../utils/portrait-map")

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
const HOME_SURVIVOR_PREVIEW_LIMIT = 3
const EMERGENCY_SUPPLY_IMAGE = "/assets/images/items/emergency_supply.png"

const DIFFICULTY_NOTES = {
  "稳健": "开局配给：食物100 / 电力95 / 材料70 / 招募券45，适合熟悉流程但仍需规划。",
  "标准": "开局配给：食物80 / 电力80 / 材料55 / 招募券30，适合常规轮值。",
  "极端": "开局配给：食物55 / 电力60 / 材料32 / 招募券15，资源压力会更早出现。"
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

function buildEmptySurvivorPreviewState() {
  return {
    loadingSurvivorPreview: false,
    survivorPreviewError: "",
    survivorPreview: []
  }
}

function getSurvivorStatusTone(data, unavailable) {
  if (data.status === "left" || data.health <= 30) {
    return "danger"
  }

  if (unavailable || data.status === "injured" || data.health <= 60 || data.fatigue >= 80) {
    return "warning"
  }

  return "good"
}

function getSurvivorVitalClass(type, value) {
  if (type === "health" && value <= 30) {
    return "survivor-vital survivor-vital--danger"
  }

  if ((type === "health" && value <= 60) || (type === "fatigue" && value >= 80)) {
    return "survivor-vital survivor-vital--warning"
  }

  return "survivor-vital"
}

function buildHomeSurvivor(row) {
  const data = row || {}
  const rarityKey = portraitMap.getRarityKey(data.rarity)
  const status = data.status || "active"
  const fatigue = Number(data.fatigue === undefined ? 0 : data.fatigue)
  const health = Number(data.health === undefined ? 100 : data.health)
  const unavailable = data.assignable === false || status === "injured" || status === "left"
  const statusLabel = data.status_label || data.current_state_tag || (unavailable ? "不可值勤" : "待命")
  const statusTone = getSurvivorStatusTone({
    status,
    fatigue,
    health
  }, unavailable)

  return Object.assign({
    id: data.id,
    name: data.name || "幸存者",
    role: data.role || "未登记",
    rarity: data.rarity || "R",
    rarityKey,
    rarityBadgeClass: `survivor-tag survivor-rarity-tag survivor-rarity-tag--${rarityKey}`,
    traitLabel: data.trait_label || data.personality_label || (data.mood ? format.formatMood(data.mood) : ""),
    statusLabel,
    statusClass: `survivor-status-tag survivor-status-tag--${statusTone}`,
    fatigue,
    health,
    fatigueClass: getSurvivorVitalClass("fatigue", fatigue),
    healthClass: getSurvivorVitalClass("health", health),
    cardClass: (
      `survivor-card survivor-card--home survivor-card--${rarityKey}` +
      (unavailable ? " survivor-card--unavailable" : "")
    )
  }, portraitMap.getSurvivorPortrait(data))
}

function normalizeRunState(data) {
  const runState = data && data.run_state

  if (!runState) {
    return {
      current_day: "--",
      total_days: "--",
      actions_left: "--",
      actions_per_day: "--",
      threat_days_left: "--",
      game_status: "inactive",
      pending_event_id: "",
      pending_event: null,
      result: "",
      last_settlement_summary: ""
    }
  }

  return {
    current_day: runState.current_day,
    total_days: runState.total_days,
    actions_left: runState.actions_left,
    actions_per_day: runState.actions_per_day,
    threat_days_left: runState.threat_days_left,
    game_status: runState.game_status || "active",
    pending_event_id: runState.pending_event_id || "",
    pending_event: runState.pending_event || null,
    result: runState.result || "",
    last_settlement_summary: runState.last_settlement_summary || ""
  }
}

function normalizePendingEvent(runState) {
  const pendingEvent = runState && runState.pending_event

  if (!pendingEvent) {
    return null
  }

  return {
    id: pendingEvent.id || "",
    day: pendingEvent.day || runState.current_day,
    title: pendingEvent.title || "今日事件",
    description: pendingEvent.description || "",
    targetSurvivor: pendingEvent.target_survivor || null,
    choices: Array.isArray(pendingEvent.choices) ? pendingEvent.choices.map((choice) => {
      return {
        id: choice.id,
        label: choice.label || "处理",
        description: choice.description || ""
      }
    }) : []
  }
}

function parseSettlementSummary(summaryText) {
  if (!summaryText || typeof summaryText !== "string") {
    return null
  }

  try {
    const summary = JSON.parse(summaryText)
    return summary && typeof summary === "object" ? summary : null
  } catch (error) {
    return null
  }
}

function formatResourceParts(values) {
  const data = values || {}
  const rows = [
    { label: "食物", value: data.food || 0 },
    { label: "电力", value: data.power || 0 },
    { label: "材料", value: data.materials || 0 }
  ]

  return rows.map((item) => {
    return `${item.label} ${item.value}`
  }).join(" / ")
}

function getRunStatusLabel(status) {
  if (status === "won") {
    return "已胜利"
  }

  if (status === "lost") {
    return "已失败"
  }

  if (status === "active") {
    return "进行中"
  }

  return "未开始"
}

function getRunStatusClass(status) {
  if (status === "won") {
    return "resource-status resource-status--normal"
  }

  if (status === "lost") {
    return "resource-status resource-status--critical"
  }

  if (status === "active") {
    return "resource-status resource-status--normal"
  }

  return "resource-status resource-status--warning"
}

function getRunResultMessage(status) {
  if (status === "won") {
    return "避难所撑过了最终日，本轮胜利。"
  }

  if (status === "lost") {
    return "食物或电力在日终结算后归零，本轮失败。"
  }

  return ""
}

function getRunStatusHelper(status) {
  if (status === "won") {
    return "最终威胁已解除"
  }

  if (status === "lost") {
    return "资源归零后失守"
  }

  if (status === "active") {
    return "本轮仍在进行"
  }

  return "等待开局"
}

function getRunOverviewLead(status, pendingEvent) {
  if (pendingEvent) {
    return "今日事件优先处理"
  }

  if (status === "won") {
    return "本轮胜利"
  }

  if (status === "lost") {
    return "本轮失败"
  }

  return "当前局概览"
}

function getRunOverviewNote(runState, status, pendingEvent) {
  if (pendingEvent) {
    return "今日事件会暂时阻挡招募和值勤，请先完成选择。"
  }

  if (status === "won") {
    return "避难所已经撑过最终威胁，可以查看日志回顾本轮。"
  }

  if (status === "lost") {
    return "本轮已经结束，可以查看日志定位资源断点。"
  }

  const actionsLeft = Number(runState.actions_left)
  if (!isNaN(actionsLeft) && actionsLeft > 0) {
    return `还能执行 ${actionsLeft} 次行动，可继续招募或安排值勤。`
  }

  return "今日行动已耗尽，等待日终状态同步。"
}

function buildHomeSubtitle(runState, status, pendingEvent) {
  if (!runState || runState.current_day === "--") {
    return "资源总览 / 值勤待命 / 补给协议"
  }

  if (pendingEvent) {
    return `第 ${runState.current_day} 天 · 今日事件待处理`
  }

  if (status === "won") {
    return `第 ${runState.current_day} 天 · 本轮胜利`
  }

  if (status === "lost") {
    return `第 ${runState.current_day} 天 · 本轮失败`
  }

  return (
    `第 ${runState.current_day} 天 · ` +
    `剩余行动 ${runState.actions_left}/${runState.actions_per_day} · ` +
    `威胁 ${runState.threat_days_left} 天`
  )
}

function getRunOverviewClass(status, pendingEvent) {
  if (status === "lost") {
    return "run-overview-card run-overview-card--critical"
  }

  if (pendingEvent) {
    return "run-overview-card run-overview-card--warning"
  }

  return "run-overview-card run-overview-card--normal"
}

function buildRunOverviewItems(runState, status) {
  return [
    {
      label: "当前天数",
      value: `第 ${runState.current_day} 天`,
      helper: `共 ${runState.total_days} 天`,
      itemClass: "run-overview-item"
    },
    {
      label: "剩余行动",
      value: `${runState.actions_left} / ${runState.actions_per_day}`,
      helper: "今日可用",
      itemClass: "run-overview-item"
    },
    {
      label: "威胁倒计时",
      value: `${runState.threat_days_left} 天`,
      helper: "撑到归零前",
      itemClass: "run-overview-item"
    },
    {
      label: "本轮状态",
      value: getRunStatusLabel(status),
      helper: getRunStatusHelper(status),
      itemClass: "run-overview-item"
    }
  ]
}

function buildRunOverview(runState, status, pendingEvent) {
  return {
    homeSubtitle: buildHomeSubtitle(runState, status, pendingEvent),
    runOverviewClass: getRunOverviewClass(status, pendingEvent),
    runOverviewLead: getRunOverviewLead(status, pendingEvent),
    runOverviewTitle: `第 ${runState.current_day} / ${runState.total_days} 天`,
    runOverviewNote: getRunOverviewNote(runState, status, pendingEvent),
    runOverviewItems: buildRunOverviewItems(runState, status)
  }
}

function getSettlementResultText(summary) {
  if (!summary) {
    return ""
  }

  if (summary.result === "won") {
    return "结算结果：撑过最终日。"
  }

  if (summary.result === "lost") {
    return "结算结果：避难所失守。"
  }

  if (summary.result === "advanced") {
    return `结算结果：进入第 ${summary.next_day} 天。`
  }

  return "结算结果：已记录。"
}

function buildSettlementPanel(runState) {
  const summary = parseSettlementSummary(runState.last_settlement_summary)

  if (!summary) {
    return {
      hasSettlementSummary: false,
      settlementSummary: null
    }
  }

  const upkeep = summary.upkeep || {}
  const teamPenalty = upkeep.team_penalty || {}
  const penaltyText = teamPenalty.applied
    ? `维护不足：全员疲劳 ${format.formatChange(teamPenalty.fatigue_change)} / 健康 ${format.formatChange(teamPenalty.health_change)}`
    : "维护完成：无额外队伍惩罚"

  return {
    hasSettlementSummary: true,
    settlementSummary: {
      title: `第 ${summary.settled_day} 天日终结算`,
      resultText: getSettlementResultText(summary),
      paidText: `维护支付：${formatResourceParts(upkeep.paid)}`,
      shortfallText: upkeep.fully_paid ? "维护缺口：无" : `维护缺口：${formatResourceParts(upkeep.shortfall)}`,
      teamPenaltyText: penaltyText
    }
  }
}

function buildRunState(data) {
  const runState = normalizeRunState(data)
  const status = runState.game_status
  const pendingEvent = normalizePendingEvent(runState)

  return Object.assign({
    hasRunState: Boolean(data && data.run_state),
    runState,
    hasPendingEvent: Boolean(pendingEvent),
    pendingEvent,
    runStatusLabel: getRunStatusLabel(status),
    runStatusClass: getRunStatusClass(status),
    runResultMessage: getRunResultMessage(status),
    runEnded: status === "won" || status === "lost"
  }, buildRunOverview(runState, status, pendingEvent), buildSettlementPanel(runState))
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
    offerImageSrc: EMERGENCY_SUPPLY_IMAGE,
    offerImageVisible: true,
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
    errorMessage: "",
    hasRunState: false,
    runState: normalizeRunState(),
    hasPendingEvent: false,
    pendingEvent: null,
    eventResolving: false,
    eventErrorMessage: "",
    eventResultMessage: "",
    runStatusLabel: "未开始",
    runStatusClass: "resource-status resource-status--warning",
    runResultMessage: "",
    runEnded: false,
    homeSubtitle: "资源总览 / 值勤待命 / 补给协议",
    runOverviewClass: "run-overview-card run-overview-card--warning",
    runOverviewLead: "等待开局",
    runOverviewTitle: "第 -- / -- 天",
    runOverviewNote: "完成首次接入后会显示当前局状态。",
    runOverviewItems: buildRunOverviewItems(normalizeRunState(), "inactive"),
    hasSettlementSummary: false,
    settlementSummary: null
  }, buildEmptyResourceState(), buildEmptySurvivorPreviewState(), buildClearedOfferState())
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
    hasRunState: false,
    runState: normalizeRunState(),
    hasPendingEvent: false,
    pendingEvent: null,
    eventResolving: false,
    eventErrorMessage: "",
    eventResultMessage: "",
    runStatusLabel: "未开始",
    runStatusClass: "resource-status resource-status--warning",
    runResultMessage: "",
    runEnded: false,
    homeSubtitle: "资源总览 / 值勤待命 / 补给协议",
    runOverviewClass: "run-overview-card run-overview-card--warning",
    runOverviewLead: "等待开局",
    runOverviewTitle: "第 -- / -- 天",
    runOverviewNote: "完成首次接入后会显示当前局状态。",
    runOverviewItems: buildRunOverviewItems(normalizeRunState(), "inactive"),
    hasSettlementSummary: false,
    settlementSummary: null,
    offerLoading: false,
    offerPurchasing: false,
    offerVisible: false,
    offerExposed: false,
    offerErrorMessage: "",
    offerResultMessage: "",
    offer: null,
    offerImageSrc: EMERGENCY_SUPPLY_IMAGE,
    offerImageVisible: true,
    offerTriggerLabel: "",
    offerRewardRows: [],
    resourceCards: buildResourceCards(format.formatResources()),
    resourcePanelClass: "resource-status resource-status--normal",
    resourceStatusText: "等待同步",
    loadingSurvivorPreview: false,
    survivorPreviewError: "",
    survivorPreview: [],
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
          this.setData(Object.assign({
            initialized: true,
            initProfile: buildInitProfile(res.data)
          }, buildRunState(res.data), buildClearedOfferState()))
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
    this.loadSurvivorPreview()
    this.loadEmergencyOffer()
  },

  loadSurvivorPreview() {
    this.setData({
      loadingSurvivorPreview: true,
      survivorPreviewError: ""
    })

    api.getSurvivors()
      .then((res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          this.setData({
            survivorPreview: res.data
              .slice(0, HOME_SURVIVOR_PREVIEW_LIMIT)
              .map(buildHomeSurvivor)
          })
          return
        }

        this.setData({
          survivorPreviewError: "幸存者通讯读取失败"
        })
      })
      .catch(() => {
        this.setData({
          survivorPreviewError: "无法连接幸存者通讯"
        })
      })
      .finally(() => {
        this.setData({
          loadingSurvivorPreview: false
        })
      })
  },

  loadResources() {
    this.setData({
      loading: true,
      errorMessage: "",
      eventErrorMessage: ""
    })

    api.getResources()
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          const resources = format.formatResources(res.data)
          const runStateData = buildRunState(res.data)

          this.setData(Object.assign({
            resources,
            eventResultMessage: runStateData.hasPendingEvent ? "" : this.data.eventResultMessage
          }, buildResourceState(resources), runStateData))
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

  resolvePendingEvent(event) {
    if (this.data.eventResolving) {
      return
    }

    const choiceId = event.currentTarget.dataset.choiceId
    if (!choiceId) {
      return
    }

    this.setData({
      eventResolving: true,
      eventErrorMessage: "",
      eventResultMessage: ""
    })

    api.resolveEvent({
        choice_id: choiceId
      })
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.status === "ok") {
          const result = res.data.result || {}
          const resultText = result.result_text || res.data.message || "事件已处理。"

          this.setData(Object.assign({
            hasPendingEvent: false,
            pendingEvent: null,
            eventResultMessage: resultText
          }, buildRunState(res.data)))

          wx.showToast({
            title: "事件已处理",
            icon: "success"
          })
          this.refreshHome()
          return
        }

        this.setData({
          eventErrorMessage: (res.data && res.data.message) || "事件处理失败。"
        })
      })
      .catch(() => {
        this.setData({
          eventErrorMessage: "无法连接后端服务。"
        })
      })
      .finally(() => {
        this.setData({
          eventResolving: false
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
            offerImageVisible: active ? true : this.data.offerImageVisible,
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

  handleOfferImageError() {
    this.setData({
      offerImageVisible: false
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
            offerImageVisible: true,
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
