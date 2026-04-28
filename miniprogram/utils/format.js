const dutyLabels = {
  scavenge: "外出搜集",
  generate_power: "发电维护",
  cook: "库存炊事",
  guard: "夜间守卫",
  rest: "休整"
}

const dutyTypes = [
  {
    type: "scavenge",
    label: dutyLabels.scavenge,
    buttonLabel: "外出搜集 · 高风险",
    riskLabel: "高风险"
  },
  {
    type: "generate_power",
    label: dutyLabels.generate_power,
    buttonLabel: dutyLabels.generate_power,
    riskLabel: ""
  },
  {
    type: "cook",
    label: dutyLabels.cook,
    buttonLabel: dutyLabels.cook,
    riskLabel: ""
  },
  {
    type: "guard",
    label: dutyLabels.guard,
    buttonLabel: "夜间守卫 · 高风险",
    riskLabel: "高风险"
  }
]

const moodLabels = {
  cold: "冷静",
  alert: "警觉",
  steady: "稳定",
  calm: "平静",
  reckless: "鲁莽",
  normal: "普通",
  tired: "疲惫",
  gentle: "温和",
  silent: "沉默"
}

function getDutyLabel(type) {
  return dutyLabels[type] || "未知值勤"
}

function formatMood(mood) {
  return moodLabels[mood] || "未知"
}

function formatChange(value) {
  const numberValue = Number(value || 0)
  return numberValue > 0 ? `+${numberValue}` : `${numberValue}`
}

function formatResources(row) {
  const data = row || {}

  return {
    food: data.food === undefined ? "--" : data.food,
    power: data.power === undefined ? "--" : data.power,
    materials: data.materials === undefined ? "--" : data.materials,
    premium_currency: data.premium_currency === undefined ? "--" : data.premium_currency,
    power_shortage: Boolean(data.power_shortage),
    power_deficit: data.power_deficit || 0
  }
}

const offerEventLabels = {
  exposed: "补给开放",
  closed: "玩家关闭",
  purchased: "补给购买"
}

const triggerReasonLabels = {
  resource_food_low: "食物储备告急",
  resource_power_low: "电力供应不稳",
  resource_materials_low: "维修材料不足",
  survivor_fatigue_pressure: "队伍疲劳累积",
  survivor_health_pressure: "幸存者健康风险",
  severe_multi_pressure: "多重压力叠加",
  action_pressure: "连续行动后补给压力上升",
  food_pressure: "食物储备告急",
  power_shortage: "电力短缺",
  power_pressure: "电力供应不稳",
  materials_pressure: "维修材料不足",
  combined_resource_pressure: "多重压力叠加",
  team_state_pressure: "队伍状态压力异常",
  low_efficiency_pressure: "连续行动后补给压力上升",
  shelter_pressure: "避难所压力"
}

const triggerReasonNotices = {
  resource_food_low: "食物储备低于安全线，系统建议先恢复短期口粮。",
  resource_power_low: "电力供应出现波动，照明、过滤与发电排班需要稳定。",
  resource_materials_low: "维修材料不足，设备维护和守卫轮值都会受到影响。",
  survivor_fatigue_pressure: "队伍疲劳正在累积，继续值勤会压低后续行动效率。",
  survivor_health_pressure: "幸存者健康风险升高，系统建议安排短时恢复。",
  severe_multi_pressure: "多项压力同时出现，补给室已开放应急协议。",
  action_pressure: "连续行动后补给压力上升，建议先稳定资源与队伍状态。",
  food_pressure: "食物储备低于安全线，系统建议先恢复短期口粮。",
  power_shortage: "电力供应出现波动，照明、过滤与发电排班需要稳定。",
  power_pressure: "电力供应出现波动，照明、过滤与发电排班需要稳定。",
  materials_pressure: "维修材料不足，设备维护和守卫轮值都会受到影响。",
  combined_resource_pressure: "多项压力同时出现，补给室已开放应急协议。",
  team_state_pressure: "队伍状态异常，系统建议安排短时恢复。",
  low_efficiency_pressure: "连续行动后补给压力上升，建议先稳定资源与队伍状态。",
  shelter_pressure: "避难所运行压力升高，系统建议确认应急补给协议。"
}

function getOfferEventLabel(eventType) {
  return offerEventLabels[eventType] || "未知记录"
}

function getTriggerReasonLabel(reason) {
  return triggerReasonLabels[reason] || "未记录"
}

function getTriggerReasonNotice(reason) {
  return triggerReasonNotices[reason] || "避难所压力升高，系统建议确认应急补给协议。"
}

module.exports = {
  dutyTypes,
  getDutyLabel,
  formatMood,
  formatChange,
  formatResources,
  getOfferEventLabel,
  getTriggerReasonLabel,
  getTriggerReasonNotice
}
