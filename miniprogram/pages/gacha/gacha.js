const api = require("../../utils/api")
const format = require("../../utils/format")

const MIN_REVEAL_DURATION = 1600

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

  return {
    name: survivor.name,
    rarity: survivor.rarity,
    rarityKey,
    rarityBadgeClass: `recruit-rarity recruit-rarity--${rarityKey}`,
    resultCardClass: duplicate ? `card result-card result-card--${rarityKey} result-card--duplicate` : `card result-card result-card--${rarityKey}`,
    role: survivor.role,
    traitLabel: profile.traitLabel,
    workStyleLine: profile.workStyleLine,
    archiveLine: profile.archiveLine,
    currentStateTag: profile.currentStateTag,
    injuredTag: survivor.injured_tag || "",
    gachaIntroLine: duplicate ? "" : survivor.gacha_intro_line || "",
    duplicate,
    compensationText: duplicate ? `已拥有，转化为材料 +${compensationAmount}` : ""
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
    showResultCard: false
  },

  onShow() {
    api.ensureInitialized().then((initialized) => {
      if (initialized) {
        this.loadResources()
      }
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
          loadingResources: false
        })
      })
  },

  pullSurvivor() {
    if (this.data.pulling) {
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
            duplicate: Boolean(res.data.duplicate)
          }
        }

        return {
          ok: false,
          message: getErrorMessage(res, "招募失败")
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
          this.setData({
            survivor: result.survivor,
            isPullAnimating: false,
            revealStatusText: "信号锁定",
            showResultCard: true
          })
          wx.showToast({
            title: result.duplicate ? "获得补偿" : "招募成功",
            icon: "success"
          })
          this.loadResources()
          return
        }

        this.setData({
          errorMessage: result.message,
          isPullAnimating: false,
          revealStatusText: "信号中断",
          showResultCard: Boolean(this.data.survivor)
        })
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
