const api = require("../../utils/api")
const format = require("../../utils/format")

function getErrorMessage(res, fallback) {
  const message = res && res.data && res.data.message

  if (message === "premium_currency 不足") {
    return "招募券不足"
  }

  return message || fallback
}

Page({
  data: {
    loadingResources: false,
    pulling: false,
    errorMessage: "",
    resources: format.formatResources(),
    survivor: null
  },

  onLoad() {
    this.loadResources()
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
      errorMessage: ""
    })

    api.pullGacha()
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.survivor) {
          const survivor = res.data.survivor
          const compensation = res.data.compensation || null
          const compensationAmount = compensation ? compensation.amount : 0
          const duplicate = Boolean(res.data.duplicate)

          this.setData({
            survivor: {
              name: survivor.name,
              rarity: survivor.rarity,
              role: survivor.role,
              mood: format.formatMood(survivor.mood),
              currentStateTag: survivor.current_state_tag || "",
              injuredTag: survivor.injured_tag || "",
              personalityLabel: survivor.personality_label || "",
              signatureLine: survivor.signature_line || "",
              gachaIntroLine: duplicate ? "" : survivor.gacha_intro_line || "",
              duplicate,
              compensationText: duplicate ? `已拥有，转化为材料 +${compensationAmount}` : ""
            }
          })
          wx.showToast({
            title: duplicate ? "获得补偿" : "招募成功",
            icon: "success"
          })
          this.loadResources()
          return
        }

        const message = getErrorMessage(res, "招募失败")
        this.setData({
          errorMessage: message
        })
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
          pulling: false
        })
      })
  }
})
