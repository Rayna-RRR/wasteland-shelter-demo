const api = require("../../utils/api")
const format = require("../../utils/format")
const portraitMap = require("../../utils/portrait-map")

const MIN_REVEAL_DURATION = 1600
const ACTION_EXHAUSTED_MESSAGE = "今日行动次数已用尽。日推进会在下一阶段接入。"

function getNextResultAnimationIndex(currentIndex) {
  return currentIndex === 0 ? 1 : 0
}

function getErrorMessage(res, fallback) {
  const message = res && res.data && res.data.message

  if (message === "premium_currency 不足") {
    return "招募券不足"
  }

  return message || fallback
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function getRarityKey(rarity) {
  const value = String(rarity || "R").toLowerCase()

  if (value === "ssr" || value === "sr") {
    return value
  }

  return "r"
}

function normalizeSurvivorProfile(survivor) {
  return {
    traitLabel: survivor.trait_label || survivor.personality_label || (survivor.mood ? format.formatMood(survivor.mood) : ""),
    workStyleLine: survivor.work_style_line || survivor.personality_label || "",
    archiveLine: survivor.archive_line || survivor.signature_line || "",
    currentStateTag: survivor.current_state_tag || ""
  }
}

function buildSurvivorResult(data) {
  const survivor = data.survivor
  const compensation = data.compensation || null
  const compensationAmount = compensation ? compensation.amount : 0
  const duplicate = Boolean(data.duplicate)
  const rarityKey = getRarityKey(survivor.rarity)
  const profile = normalizeSurvivorProfile(survivor)

  return Object.assign({
    name: survivor.name,
    rarity: survivor.rarity,
    rarityKey,
    rarityBadgeClass: `survivor-tag survivor-rarity-tag survivor-rarity-tag--${rarityKey}`,
    resultCardClass: duplicate ? `card result-card result-card--${rarityKey} result-card--duplicate` : `card result-card result-card--${rarityKey}`,
    resultSignalText: duplicate ? "重复信号回收" : `${survivor.rarity} 信号锁定`,
    role: survivor.role,
    traitLabel: profile.traitLabel,
    workStyleLine: profile.workStyleLine,
    archiveLine: profile.archiveLine,
    currentStateTag: profile.currentStateTag,
    injuredTag: survivor.injured_tag || "",
    gachaIntroLine: duplicate ? "" : survivor.gacha_intro_line || "",
    duplicate,
    compensationAmountText: duplicate ? `+${compensationAmount}` : "",
    compensationResourceText: duplicate ? "材料补偿" : "",
    compensationText: duplicate ? `已拥有，转化为材料 +${compensationAmount}` : ""
  }, portraitMap.getSurvivorPortrait(survivor))
}

function applyResultAnimation(survivor, animationIndex) {
  const isRareResult = survivor.rarityKey === "ssr"
  const rareClass = isRareResult ? " result-card--enter-rare" : ""

  return Object.assign({}, survivor, {
    resultCardClass: `${survivor.resultCardClass} result-card--enter result-card--enter-${animationIndex}${rareClass}`
  })
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
      game_status: "inactive"
    }
  }

  return {
    current_day: runState.current_day,
    total_days: runState.total_days,
    actions_left: runState.actions_left,
    actions_per_day: runState.actions_per_day,
    threat_days_left: runState.threat_days_left,
    game_status: runState.game_status || "active"
  }
}

function getRunBlockedMessage(runState) {
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

  return {
    hasRunState,
    runState,
    noActionsLeft,
    actionBlocked: hasRunState && (!runActive || noActionsLeft),
    actionBlockMessage: getRunBlockedMessage(runState)
  }
}

Page({
  data: {
    loadingResources: false,
    pulling: false,
    errorMessage: "",
    resources: format.formatResources(),
    survivor: null,
    isPullAnimating: false,
    revealStatusText: "招募舱待命",
    showResultCard: false,
    hasRunState: false,
    runState: normalizeRunState(),
    noActionsLeft: false,
    actionBlocked: false,
    actionBlockMessage: ACTION_EXHAUSTED_MESSAGE,
    resultAnimationIndex: 0,
    resetStateVersion: 0
  },

  onShow() {
    api.ensureInitialized().then((initialized) => {
      this.syncResetStateVersion()

      if (initialized) {
        this.loadResources()
        return
      }

      this.resetPageState()
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

    this.resetGachaPageState({
      resetStateVersion
    })
  },

  resetGachaPageState(extraState) {
    this.setData(Object.assign({
      loadingResources: false,
      pulling: false,
      errorMessage: "",
      resources: format.formatResources(),
      survivor: null,
      isPullAnimating: false,
      revealStatusText: "招募舱待命",
      showResultCard: false,
      hasRunState: false,
      runState: normalizeRunState(),
      noActionsLeft: false,
      actionBlocked: false,
      actionBlockMessage: ACTION_EXHAUSTED_MESSAGE,
      resultAnimationIndex: this.data.resultAnimationIndex,
      resetStateVersion: this.data.resetStateVersion
    }, extraState || {}))
  },

  resetPageState() {
    this.resetGachaPageState({
      resetStateVersion: this.getResetStateVersion()
    })
  },

  loadResources() {
    this.setData({
      loadingResources: true,
      errorMessage: ""
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

  pullSurvivor() {
    if (this.data.pulling) {
      return
    }

    if (this.data.actionBlocked) {
      this.setData({
        errorMessage: this.data.actionBlockMessage
      })
      wx.showToast({
        title: this.data.actionBlockMessage,
        icon: "none"
      })
      return
    }

    this.setData({
      pulling: true,
      errorMessage: "",
      isPullAnimating: true,
      revealStatusText: "信号接入中...",
      showResultCard: false
    })

    const revealTimer = wait(MIN_REVEAL_DURATION)
    const pullRequest = api.pullGacha()
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.survivor) {
          return {
            ok: true,
            survivor: buildSurvivorResult(res.data),
            duplicate: Boolean(res.data.duplicate),
            runStateData: res.data,
            dayTransition: res.data.day_transition || null
          }
        }

        return {
          ok: false,
          message: getErrorMessage(res, "招募失败"),
          runStateData: res && res.data
        }
      })
      .catch(() => {
        return {
          ok: false,
          message: "无法连接后端服务"
        }
      })

    Promise.all([pullRequest, revealTimer])
      .then((results) => {
        const result = results[0]

        if (result.ok) {
          const resultAnimationIndex = getNextResultAnimationIndex(this.data.resultAnimationIndex)

          this.setData(Object.assign({
            survivor: applyResultAnimation(result.survivor, resultAnimationIndex),
            isPullAnimating: false,
            revealStatusText: "信号锁定",
            showResultCard: true,
            resultAnimationIndex
          }, buildRunState(result.runStateData)))
          wx.showToast({
            title: result.duplicate ? "获得补偿" : "招募成功",
            icon: "success"
          })
          if (result.dayTransition) {
            wx.showToast({
              title: getDayTransitionMessage(result.dayTransition),
              icon: "none"
            })
          }
          this.loadResources()
          return
        }

        this.setData(Object.assign({
          errorMessage: result.message,
          isPullAnimating: false,
          revealStatusText: "信号中断",
          showResultCard: Boolean(this.data.survivor)
        }, buildRunState(result.runStateData)))
        wx.showToast({
          title: result.message,
          icon: "none"
        })
      })
      .finally(() => {
        this.setData({
          pulling: false
        })
      })
  }
})
