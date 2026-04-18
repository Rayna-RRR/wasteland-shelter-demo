const api = require("../../utils/api")
const format = require("../../utils/format")

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

  return {
    id: row.id,
    name: row.name,
    rarity: getRarityLabel(row.rarity),
    rarityKey,
    rarityBadgeClass: `rarity-badge rarity-badge--${rarityKey}`,
    selectedPanelClass: `selected-duty-card selected-duty-card--${rarityKey}`,
    role: row.role,
    traitLabel: profile.traitLabel,
    workStyleLine: profile.workStyleLine,
    archiveLine: profile.archiveLine,
    currentStateTag: profile.currentStateTag,
    injuredTag: row.injured_tag || "",
    fatigue: state.fatigue,
    health: state.health,
    fatigueClass: state.fatigueClass,
    healthClass: state.healthClass,
    stateTag: profile.currentStateTag || state.stateTag,
    stateTagClass: state.stateTagClass,
    cardBaseClass: `survivor-card survivor-card--${rarityKey}`,
    cardClass: `survivor-card survivor-card--${rarityKey}`
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

  const fallbackId = survivors[0].id
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

function buildResultPanel(result, survivor, dutyLabel) {
  const survivorState = formatState(survivor.fatigue, survivor.health)
  const profile = normalizeSurvivorProfile(survivor, survivorState.stateTag)

  return {
    survivorName: survivor.name || "幸存者",
    dutyLabel,
    traitLabel: profile.traitLabel,
    workStyleLine: profile.workStyleLine,
    archiveLine: profile.archiveLine,
    currentStateTag: profile.currentStateTag,
    injuredTag: survivor.injured_tag || "",
    resultText: result.result_text,
    foodChange: format.formatChange(result.food_change),
    powerChange: format.formatChange(result.power_change),
    materialsChange: format.formatChange(result.materials_change),
    fatigue: survivorState.fatigue,
    health: survivorState.health,
    fatigueClass: survivorState.fatigueClass,
    healthClass: survivorState.healthClass,
    stateTag: profile.currentStateTag || survivorState.stateTag,
    stateTagClass: survivorState.stateTagClass
  }
}

Page({
  data: {
    loadingResources: false,
    loadingSurvivors: false,
    assigning: false,
    errorMessage: "",
    resources: format.formatResources(),
    survivors: [],
    selectedSurvivorId: null,
    selectedSurvivor: null,
    dutyTypes: format.dutyTypes,
    dutyResult: null
  },

  onShow() {
    this.loadResources()
    this.loadSurvivors()
  },

  loadResources() {
    this.setData({
      loadingResources: true
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

    this.setData({
      assigning: true,
      errorMessage: ""
    })

    api.assignDuty({
        survivor_id: survivorId,
        duty_type: dutyType
      })
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.result) {
          const result = res.data.result
          const survivor = res.data.survivor || {}

          this.setData({
            dutyResult: buildResultPanel(result, survivor, format.getDutyLabel(dutyType))
          })

          wx.showToast({
            title: "值勤完成",
            icon: "success"
          })
          this.loadResources()
          this.loadSurvivors()
          return
        }

        const message = getDutyErrorMessage(res)
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
          assigning: false
        })
      })
  },

  restSurvivor(event) {
    if (this.data.assigning) {
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

    this.setData({
      assigning: true,
      errorMessage: ""
    })

    api.restSurvivor({
        survivor_id: survivorId
      })
      .then((res) => {
        if (res.statusCode === 200 && res.data && res.data.result) {
          const result = res.data.result
          const survivor = res.data.survivor || {}

          this.setData({
            dutyResult: buildResultPanel(result, survivor, "休整")
          })

          wx.showToast({
            title: "休整完成",
            icon: "success"
          })
          this.loadSurvivors()
          return
        }

        const message = getRestErrorMessage(res)
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
          assigning: false
        })
      })
  }
})
