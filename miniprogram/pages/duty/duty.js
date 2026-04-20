const api = require("../../utils/api")
const format = require("../../utils/format")

const ACTION_EXHAUSTED_MESSAGE = "今日行动次数已用尽。日推进会在下一阶段接入。"

const RESOURCE_DELTA_META = [
  { key: "food_change", label: "食物" },
  { key: "power_change", label: "电力" },
  { key: "materials_change", label: "材料" },
  { key: "premium_currency_change", label: "招募券" }
]

function getStateTag(fatigue, health) {
  if (health <= 30) {
    return "重伤"
  }

  if (health <= 60) {
    return "状态不稳"
  }

  if (fatigue >= 80) {
    return "疲惫"
  }

  return "状态良好"
}

function getStatusTagClass(status, fallbackClass) {
  if (status === "left") {
    return "state-tag state-tag--danger"
  }

  if (status === "injured") {
    return "state-tag state-tag--warning"
  }

  return fallbackClass
}

function getStateTagClass(fatigue, health) {
  if (health <= 30) {
    return "state-tag state-tag--danger"
  }

  if (health <= 60) {
    return "state-tag state-tag--warning"
  }

  if (fatigue >= 80) {
    return "state-tag state-tag--warning"
  }

  return "state-tag state-tag--good"
}

function getFatigueClass(fatigue) {
  return fatigue >= 80 ? "state-value state-value--warning" : "state-value"
}

function getHealthClass(health) {
  return health <= 30 ? "state-value state-value--danger" : "state-value"
}

function getRarityKey(rarity) {
  const value = String(rarity || "R").toLowerCase()

  if (value === "ssr" || value === "sr") {
    return value
  }

  return "r"
}

function getRarityLabel(rarity) {
  return rarity || "R"
}

function formatState(fatigue, health) {
  const fatigueValue = Number(fatigue === undefined ? 0 : fatigue)
  const healthValue = Number(health === undefined ? 100 : health)

  return {
    fatigue: fatigueValue,
    health: healthValue,
    fatigueClass: getFatigueClass(fatigueValue),
    healthClass: getHealthClass(healthValue),
    stateTag: getStateTag(fatigueValue, healthValue),
    stateTagClass: getStateTagClass(fatigueValue, healthValue)
  }
}

function getNumberValue(value) {
  const numberValue = Number(value)
  return isNaN(numberValue) ? 0 : numberValue
}

function buildDeltaClass(baseClass, tone) {
  return `${baseClass} ${baseClass}--${tone}`
}

function buildResourceDeltaRows(result) {
  return RESOURCE_DELTA_META.map((item) => {
    const value = getNumberValue(result[item.key])

    if (value === 0) {
      return null
    }

    const tone = value > 0 ? "gain" : "loss"
    return {
      label: item.label,
      value,
      valueText: format.formatChange(value),
      tone,
      cardClass: buildDeltaClass("delta-card", tone),
      valueClass: buildDeltaClass("delta-value", tone)
    }
  }).filter(Boolean)
}

function getStateChangeValue(stateChange, survivor, previousSurvivor, key) {
  const directValue = stateChange && stateChange[key]

  if (directValue !== undefined) {
    return getNumberValue(directValue)
  }

  if (!previousSurvivor) {
    return 0
  }

  const stateKey = key === "fatigue_change" ? "fatigue" : "health"
  return getNumberValue(survivor[stateKey]) - getNumberValue(previousSurvivor[stateKey])
}

function buildStateDeltaRows(result, survivor, previousSurvivor) {
  const stateChange = result.survivor_state || result.survivor_state_change || {}
  const fatigueChange = getStateChangeValue(
    stateChange,
    survivor,
    previousSurvivor,
    "fatigue_change"
  )
  const healthChange = getStateChangeValue(
    stateChange,
    survivor,
    previousSurvivor,
    "health_change"
  )

  return [
    {
      label: "疲劳",
      value: fatigueChange,
      tone: fatigueChange > 0 ? "loss" : "gain"
    },
    {
      label: "健康",
      value: healthChange,
      tone: healthChange > 0 ? "gain" : "loss"
    }
  ].filter((item) => item.value !== 0).map((item) => {
    return {
      label: item.label,
      value: item.value,
      valueText: format.formatChange(item.value),
      tone: item.tone,
      cardClass: buildDeltaClass("delta-card", item.tone),
      valueClass: buildDeltaClass("delta-value", item.tone)
    }
  })
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

function buildConsequencePanel(result, survivor) {
  const consequence = result.survivor_consequence || null
  const status = (consequence && consequence.status) || survivor.status || "active"

  if (status === "left") {
    const leaveReason = (
      (consequence && consequence.leave_reason) ||
      survivor.leave_reason ||
      "已离开避难所"
    )

    return {
      hasConsequence: true,
      consequenceClass: "result-alert result-alert--danger",
      consequenceTitle: "离队后果",
      consequenceMessage: (
        (consequence && consequence.message) ||
        `${survivor.name || "幸存者"}已离队。`
      ),
      consequenceDetail: `原因：${leaveReason}`
    }
  }

  if (status === "injured") {
    const availableOnDay = (
      (consequence && consequence.available_on_day) ||
      survivor.available_on_day ||
      "--"
    )

    return {
      hasConsequence: true,
      consequenceClass: "result-alert result-alert--warning",
      consequenceTitle: "重伤停工",
      consequenceMessage: (
        (consequence && consequence.message) ||
        `${survivor.name || "幸存者"}需要暂停值勤。`
      ),
      consequenceDetail: `恢复日：第 ${availableOnDay} 天`
    }
  }

  return {
    hasConsequence: false,
    consequenceClass: "",
    consequenceTitle: "",
    consequenceMessage: "",
    consequenceDetail: ""
  }
}

function buildResultSignalText(resourceDeltaRows, stateDeltaRows) {
  const hasResourceGain = resourceDeltaRows.some((item) => item.tone === "gain")
  const hasResourceLoss = resourceDeltaRows.some((item) => item.tone === "loss")
  const hasStateCost = stateDeltaRows.some((item) => item.tone === "loss")
  const hasStateRecovery = stateDeltaRows.some((item) => item.tone === "gain")

  if (hasResourceGain && hasStateCost) {
    return "收益与代价"
  }

  if (hasResourceGain) {
    return "行动收益"
  }

  if (hasStateRecovery && !hasResourceLoss) {
    return "状态恢复"
  }

  if (hasResourceLoss || hasStateCost) {
    return "行动消耗"
  }

  return "行动记录"
}

function normalizeSurvivorProfile(survivor, fallbackStateTag) {
  return {
    traitLabel: survivor.trait_label || survivor.personality_label || (survivor.mood ? format.formatMood(survivor.mood) : ""),
    workStyleLine: survivor.work_style_line || survivor.personality_label || "",
    archiveLine: survivor.archive_line || survivor.signature_line || "",
    currentStateTag: survivor.current_state_tag || fallbackStateTag || ""
  }
}

function formatSurvivor(row) {
  const state = formatState(row.fatigue, row.health)
  const rarityKey = getRarityKey(row.rarity)
  const profile = normalizeSurvivorProfile(row, state.stateTag)
  const status = row.status || "active"
  const unavailable = row.assignable === false || status === "injured" || status === "left"
  const statusLabel = row.status_label || (unavailable ? "不可值勤" : "可值勤")
  const statusNote = row.unavailable_reason || row.leave_reason || ""
  const displayStateTag = unavailable ? statusLabel : (profile.currentStateTag || state.stateTag)
  const stateTagClass = getStatusTagClass(status, state.stateTagClass)
  const cardBaseClass = `survivor-card survivor-card--${rarityKey}${unavailable ? " survivor-card--unavailable" : ""}`

  return {
    id: row.id,
    name: row.name,
    rarity: getRarityLabel(row.rarity),
    rarityKey,
    rarityBadgeClass: `rarity-badge rarity-badge--${rarityKey}`,
    selectedPanelClass: `selected-duty-card selected-duty-card--${rarityKey}${unavailable ? " selected-duty-card--unavailable" : ""}`,
    role: row.role,
    traitLabel: profile.traitLabel,
    workStyleLine: profile.workStyleLine,
    archiveLine: profile.archiveLine,
    currentStateTag: profile.currentStateTag,
    injuredTag: row.injured_tag || "",
    status,
    statusLabel,
    statusNote,
    availableOnDay: row.available_on_day || 1,
    leaveReason: row.leave_reason || "",
    unavailable,
    fatigue: state.fatigue,
    health: state.health,
    fatigueClass: state.fatigueClass,
    healthClass: state.healthClass,
    stateTag: displayStateTag,
    stateTagClass,
    cardBaseClass,
    cardClass: cardBaseClass
  }
}

function applySurvivorSelection(survivors, selectedSurvivorId) {
  if (!survivors.length) {
    return {
      survivors: [],
      selectedSurvivorId: null,
      selectedSurvivor: null
    }
  }

  const firstAssignable = survivors.find((survivor) => !survivor.unavailable)
  const fallbackId = (firstAssignable || survivors[0]).id
  const selectedId = Number(selectedSurvivorId || fallbackId)
  let selectedSurvivor = null

  const markedSurvivors = survivors.map((survivor) => {
    const selected = Number(survivor.id) === selectedId
    const cardBaseClass = survivor.cardBaseClass || "survivor-card"
    const markedSurvivor = Object.assign({}, survivor, {
      cardClass: selected ? `${cardBaseClass} survivor-card--selected` : cardBaseClass
    })

    if (selected) {
      selectedSurvivor = markedSurvivor
    }

    return markedSurvivor
  })

  return {
    survivors: markedSurvivors,
    selectedSurvivorId: selectedSurvivor ? selectedSurvivor.id : null,
    selectedSurvivor
  }
}

function getDutyErrorMessage(res) {
  const message = res && res.data && res.data.message

  if (message === "survivor 不存在") {
    return "幸存者不存在"
  }

  if (message && message.indexOf("参数错误") === 0) {
    return "值勤参数错误"
  }

  return message || "值勤失败"
}

function getRestErrorMessage(res) {
  const message = res && res.data && res.data.message

  if (message === "survivor 不存在") {
    return "幸存者不存在"
  }

  if (message && message.indexOf("参数错误") === 0) {
    return "休整参数错误"
  }

  return message || "休整失败"
}

function buildDayTransitionRows(dayTransition) {
  if (!dayTransition) {
    return []
  }

  const rows = [
    {
      label: "结算日",
      value: `第 ${dayTransition.settled_day || "--"} 天`
    }
  ]
  const upkeep = dayTransition.upkeep || {}

  if (upkeep.paid) {
    rows.push({
      label: "维护支付",
      value: formatResourceParts(upkeep.paid)
    })
  }

  if (upkeep.shortfall) {
    rows.push({
      label: "维护缺口",
      value: upkeep.fully_paid ? "无" : formatResourceParts(upkeep.shortfall)
    })
  }

  const teamPenalty = upkeep.team_penalty || {}
  if (teamPenalty.applied) {
    rows.push({
      label: "队伍影响",
      value: (
        `全员疲劳 ${format.formatChange(teamPenalty.fatigue_change)} / ` +
        `健康 ${format.formatChange(teamPenalty.health_change)}`
      )
    })
  }

  return rows
}

function buildDayTransitionPanel(dayTransition) {
  if (!dayTransition) {
    return {
      hasDayTransition: false,
      dayTransitionMessage: "",
      dayTransitionRows: []
    }
  }

  return {
    hasDayTransition: true,
    dayTransitionMessage: getDayTransitionMessage(dayTransition),
    dayTransitionRows: buildDayTransitionRows(dayTransition)
  }
}

function buildResultPanel(result, survivor, dutyLabel, previousSurvivor, dayTransition) {
  const survivorState = formatState(survivor.fatigue, survivor.health)
  const profile = normalizeSurvivorProfile(survivor, survivorState.stateTag)
  const resourceDeltaRows = buildResourceDeltaRows(result)
  const stateDeltaRows = buildStateDeltaRows(result, survivor, previousSurvivor)

  return Object.assign({
    survivorName: survivor.name || "幸存者",
    dutyLabel,
    resultSignalText: buildResultSignalText(resourceDeltaRows, stateDeltaRows),
    traitLabel: profile.traitLabel,
    workStyleLine: profile.workStyleLine,
    archiveLine: profile.archiveLine,
    currentStateTag: profile.currentStateTag,
    injuredTag: survivor.injured_tag || "",
    resultText: result.result_text,
    foodChange: format.formatChange(result.food_change),
    powerChange: format.formatChange(result.power_change),
    materialsChange: format.formatChange(result.materials_change),
    resourceDeltaRows,
    stateDeltaRows,
    hasResourceDeltas: resourceDeltaRows.length > 0,
    hasStateDeltas: stateDeltaRows.length > 0,
    fatigue: survivorState.fatigue,
    health: survivorState.health,
    fatigueClass: survivorState.fatigueClass,
    healthClass: survivorState.healthClass,
    stateTag: profile.currentStateTag || survivorState.stateTag,
    stateTagClass: getStatusTagClass(survivor.status, survivorState.stateTagClass)
  }, buildConsequencePanel(result, survivor), buildDayTransitionPanel(dayTransition))
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
      pending_event: null
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
    pending_event: runState.pending_event || null
  }
}

function getRunBlockedMessage(runState) {
  if (runState.pending_event_id || runState.pending_event) {
    return "今日随机事件未处理，请先回首页处理。"
  }

  if (runState.game_status === "won") {
    return "避难所已撑过最终日，本轮已胜利。"
  }

  if (runState.game_status === "lost") {
    return "避难所已经失守，本轮已结束。"
  }

  return ACTION_EXHAUSTED_MESSAGE
}

function getDayTransitionMessage(dayTransition) {
  if (!dayTransition) {
    return ""
  }

  if (dayTransition.result === "won") {
    return "日终结算完成，本轮胜利。"
  }

  if (dayTransition.result === "lost") {
    return "日终结算完成，本轮失败。"
  }

  if (dayTransition.result === "advanced") {
    return `日终结算完成，进入第 ${dayTransition.next_day} 天。`
  }

  return "日终结算完成。"
}

function buildRunState(data) {
  const runState = normalizeRunState(data)
  const hasRunState = Boolean(data && data.run_state)
  const runActive = runState.game_status === "active"
  const noActionsLeft = hasRunState && runActive && Number(runState.actions_left) <= 0
  const hasPendingEvent = hasRunState && Boolean(runState.pending_event_id || runState.pending_event)

  return {
    hasRunState,
    runState,
    hasPendingEvent,
    noActionsLeft,
    actionBlocked: hasRunState && (!runActive || noActionsLeft || hasPendingEvent),
    actionBlockMessage: getRunBlockedMessage(runState)
  }
}

Page({
  data: {
    loadingResources: false,
    loadingSurvivors: false,
    assigning: false,
    errorMessage: "",
    resources: format.formatResources(),
    hasRunState: false,
    runState: normalizeRunState(),
    hasPendingEvent: false,
    noActionsLeft: false,
    actionBlocked: false,
    actionBlockMessage: ACTION_EXHAUSTED_MESSAGE,
    survivors: [],
    selectedSurvivorId: null,
    selectedSurvivor: null,
    dutyTypes: format.dutyTypes,
    dutyResult: null,
    offerHintVisible: false,
    offerHintText: "",
    offerHintTriggerLabel: "",
    resetStateVersion: 0
  },

  onShow() {
    api.ensureInitialized().then((initialized) => {
      this.syncResetStateVersion()

      if (initialized) {
        this.loadResources()
        this.loadSurvivors()
        return
      }

      this.resetPageState()
    })
  },

  resetPageState() {
    this.setData({
      loadingResources: false,
      loadingSurvivors: false,
      assigning: false,
      errorMessage: "",
      resources: format.formatResources(),
      hasRunState: false,
      runState: normalizeRunState(),
      hasPendingEvent: false,
      noActionsLeft: false,
      actionBlocked: false,
      actionBlockMessage: ACTION_EXHAUSTED_MESSAGE,
      survivors: [],
      selectedSurvivorId: null,
      selectedSurvivor: null,
      dutyResult: null,
      offerHintVisible: false,
      offerHintText: "",
      offerHintTriggerLabel: "",
      resetStateVersion: this.getResetStateVersion()
    })
  },

  getResetStateVersion() {
    const app = getApp()
    const globalData = app.globalData || {}
    return Number(globalData.resetStateVersion || 0)
  },

  syncResetStateVersion() {
    const resetStateVersion = this.getResetStateVersion()

    if (resetStateVersion <= this.data.resetStateVersion) {
      return
    }

    this.resetPageState()
  },

  loadResources() {
    this.setData({
      loadingResources: true
    })

    api.getResources()
      .then((res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData(Object.assign({
            resources: format.formatResources(res.data)
          }, buildRunState(res.data)))
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
          loadingResources: false
        })
      })
  },

  loadSurvivors() {
    this.setData({
      loadingSurvivors: true,
      errorMessage: ""
    })

    api.getSurvivors()
      .then((res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          const selection = applySurvivorSelection(
            res.data.map(formatSurvivor),
            this.data.selectedSurvivorId
          )

          this.setData(selection)
          return
        }

        this.setData({
          errorMessage: "幸存者列表加载失败"
        })
      })
      .catch(() => {
        this.setData({
          errorMessage: "无法连接后端服务"
        })
      })
      .finally(() => {
        this.setData({
          loadingSurvivors: false
        })
      })
  },

  selectSurvivor(event) {
    const survivorId = event.currentTarget.dataset.survivorId
    const selection = applySurvivorSelection(this.data.survivors, survivorId)

    this.setData(selection)
  },

  assignDuty(event) {
    if (this.data.assigning) {
      return
    }

    if (this.data.actionBlocked) {
      this.showActionBlocked()
      return
    }

    const survivorId = event.currentTarget.dataset.survivorId || this.data.selectedSurvivorId
    const dutyType = event.currentTarget.dataset.dutyType

    if (!survivorId) {
      const message = "请先选择幸存者"
      this.setData({
        errorMessage: message
      })
      wx.showToast({
        title: message,
        icon: "none"
      })
      return
    }

    if (this.data.selectedSurvivor && this.data.selectedSurvivor.unavailable) {
      this.showUnavailableSurvivorMessage()
      return
    }

    this.setData({
      assigning: true,
      errorMessage: "",
      offerHintVisible: false,
      offerHintText: "",
      offerHintTriggerLabel: ""
    })

    api.assignDuty({
        survivor_id: survivorId,
        duty_type: dutyType
      })
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.result) {
          const result = res.data.result
          const survivor = res.data.survivor || {}
          const previousSurvivor = this.data.selectedSurvivor

          this.setData(Object.assign({
            dutyResult: buildResultPanel(
              result,
              survivor,
              format.getDutyLabel(dutyType),
              previousSurvivor,
              res.data.day_transition
            )
          }, buildRunState(res.data)))

          wx.showToast({
            title: "值勤完成",
            icon: "success"
          })
          if (res.data.day_transition) {
            wx.showToast({
              title: getDayTransitionMessage(res.data.day_transition),
              icon: "none"
            })
          }
          this.loadResources()
          this.loadSurvivors()
          this.checkEmergencyOfferAfterDuty()
          return
        }

        const message = getDutyErrorMessage(res)
        this.setData(Object.assign({
          errorMessage: message
        }, buildRunState(res && res.data)))
        wx.showToast({
          title: message,
          icon: "none"
        })
      })
      .catch(() => {
        const message = "无法连接后端服务"
        this.setData({
          errorMessage: message
        })
        wx.showToast({
          title: message,
          icon: "none"
        })
      })
      .finally(() => {
        this.setData({
          assigning: false
        })
      })
  },

  checkEmergencyOfferAfterDuty() {
    api.getEmergencyOfferState()
      .then((res) => {
        if (!(res.statusCode === 200 && res.data && res.data.active)) {
          this.setData({
            offerHintVisible: false,
            offerHintText: "",
            offerHintTriggerLabel: ""
          })
          return
        }

        const triggerLabel = format.getTriggerReasonLabel(res.data.trigger_reason)
        const hintText = `检测到${triggerLabel}，补给室已开放战备补给协议。`

        this.setData({
          offerHintVisible: true,
          offerHintText: hintText,
          offerHintTriggerLabel: triggerLabel
        })

        wx.showModal({
          title: "补给室来讯",
          content: `${hintText} 是否返回首页处理？`,
          confirmText: "去处理",
          cancelText: "稍后",
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.switchTab({
                url: "/pages/home/home"
              })
            }
          }
        })
      })
      .catch(() => {})
  },

  goHomeForOffer() {
    wx.switchTab({
      url: "/pages/home/home"
    })
  },

  restSurvivor(event) {
    if (this.data.assigning) {
      return
    }

    if (this.data.actionBlocked) {
      this.showActionBlocked()
      return
    }

    const survivorId = event.currentTarget.dataset.survivorId || this.data.selectedSurvivorId

    if (!survivorId) {
      const message = "请先选择幸存者"
      this.setData({
        errorMessage: message
      })
      wx.showToast({
        title: message,
        icon: "none"
      })
      return
    }

    if (this.data.selectedSurvivor && this.data.selectedSurvivor.unavailable) {
      this.showUnavailableSurvivorMessage()
      return
    }

    this.setData({
      assigning: true,
      errorMessage: "",
      offerHintVisible: false,
      offerHintText: "",
      offerHintTriggerLabel: ""
    })

    api.restSurvivor({
        survivor_id: survivorId
      })
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.result) {
          const result = res.data.result
          const survivor = res.data.survivor || {}
          const previousSurvivor = this.data.selectedSurvivor

          this.setData(Object.assign({
            dutyResult: buildResultPanel(
              result,
              survivor,
              "休整",
              previousSurvivor,
              res.data.day_transition
            )
          }, buildRunState(res.data)))

          wx.showToast({
            title: "休整完成",
            icon: "success"
          })
          if (res.data.day_transition) {
            wx.showToast({
              title: getDayTransitionMessage(res.data.day_transition),
              icon: "none"
            })
          }
          this.loadResources()
          this.loadSurvivors()
          return
        }

        const message = getRestErrorMessage(res)
        this.setData(Object.assign({
          errorMessage: message
        }, buildRunState(res && res.data)))
        wx.showToast({
          title: message,
          icon: "none"
        })
      })
      .catch(() => {
        const message = "无法连接后端服务"
        this.setData({
          errorMessage: message
        })
        wx.showToast({
          title: message,
          icon: "none"
        })
      })
      .finally(() => {
        this.setData({
          assigning: false
        })
      })
  },

  showActionBlocked() {
    this.setData({
      errorMessage: this.data.actionBlockMessage
    })
    wx.showToast({
      title: this.data.actionBlockMessage,
      icon: "none"
    })
  },

  showUnavailableSurvivorMessage() {
    const survivor = this.data.selectedSurvivor || {}
    const message = survivor.statusNote || "该幸存者当前不可值勤。"

    this.setData({
      errorMessage: message
    })
    wx.showToast({
      title: message,
      icon: "none"
    })
  }
})
