const dutyLabels = {
  scavenge: "外出搜集",
  generate_power: "发电维护",
  cook: "库存炊事",
  guard: "夜间守卫",
  rest: "休整"
}

const dutyTypes = [
  { type: "scavenge", label: dutyLabels.scavenge },
  { type: "generate_power", label: dutyLabels.generate_power },
  { type: "cook", label: dutyLabels.cook },
  { type: "guard", label: dutyLabels.guard }
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
  exposed: "补给信号出现",
  closed: "暂缓处理",
  purchased: "协议已启用"
}

const triggerReasonLabels = {
  food_pressure: "食物压力",
  power_shortage: "电力短缺",
  power_pressure: "电力压力",
  materials_pressure: "材料压力",
  combined_resource_pressure: "多项资源压力",
  team_state_pressure: "队伍状态压力",
  low_efficiency_pressure: "行动效率压力",
  shelter_pressure: "避难所压力"
}

function getOfferEventLabel(eventType) {
  return offerEventLabels[eventType] || "未知记录"
}

function getTriggerReasonLabel(reason) {
  return triggerReasonLabels[reason] || "未记录"
}

module.exports = {
  dutyTypes,
  getDutyLabel,
  formatMood,
  formatChange,
  formatResources,
  getOfferEventLabel,
  getTriggerReasonLabel
}
