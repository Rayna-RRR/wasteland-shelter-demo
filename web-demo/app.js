const asset = (path) => `../miniprogram/assets/images/${path}`

const survivorsPool = [
  {
    id: "zhou_ying",
    name: "周萤",
    rarity: "SSR",
    role: "废墟斥候",
    portrait: asset("characters/zhou_ying.png"),
    fallback: "萤",
    fatigue: 18,
    health: 92
  },
  {
    id: "lin_qi",
    name: "林七",
    rarity: "SR",
    role: "机修员",
    portrait: asset("characters/lin_qi.png"),
    fallback: "七",
    fatigue: 26,
    health: 86
  },
  {
    id: "tang_ya",
    name: "唐鸦",
    rarity: "R",
    role: "守夜人",
    portrait: asset("characters/tang_ya.png"),
    fallback: "鸦",
    fatigue: 35,
    health: 78
  }
]

const duties = [
  {
    type: "scavenge",
    label: "外勤搜集",
    risk: "高风险",
    icon: asset("duties/duty_scavenge.png"),
    helper: "进入废墟搜集材料，收益较高但状态压力更明显。",
    resourceDelta: { food: 5, power: -2, materials: 8, premium: 0 },
    stateDelta: { fatigue: 15, health: -4 },
    resultText: "外勤小队穿过塌陷街区，带回了可修复零件和少量口粮。"
  },
  {
    type: "generate_power",
    label: "发电维护",
    risk: "普通",
    icon: asset("duties/duty_power.png"),
    helper: "维护发电机组，消耗材料换取电力稳定。",
    resourceDelta: { food: 0, power: 10, materials: -3, premium: 0 },
    stateDelta: { fatigue: 10, health: -1 },
    resultText: "发电机组恢复短时运转，照明和过滤系统重新稳定。"
  },
  {
    type: "cook",
    label: "厨房配给",
    risk: "普通",
    icon: asset("duties/duty_cook.png"),
    helper: "整理库存与灶台，缓解短期食物压力。",
    resourceDelta: { food: 9, power: -1, materials: 0, premium: 0 },
    stateDelta: { fatigue: 8, health: 0 },
    resultText: "厨房完成低耗配给，避难所短期口粮压力下降。"
  },
  {
    type: "guard",
    label: "守卫巡逻",
    risk: "高风险",
    icon: asset("duties/duty_guard.png"),
    helper: "承担夜间巡逻，保护入口但容易造成疲劳累积。",
    resourceDelta: { food: -3, power: -2, materials: 4, premium: 1 },
    stateDelta: { fatigue: 18, health: -6 },
    resultText: "巡逻队赶走了徘徊者，也发现了一批可回收路障材料。"
  }
]

const events = [
  {
    id: "filter_clog_v1",
    title: "过滤管路堵塞",
    image: asset("events/event_filter_clog.png"),
    copy: "净水过滤管路出现堵塞，短时间内需要抽调材料维护。",
    result: "已派人拆洗滤芯，材料消耗增加。"
  },
  {
    id: "battery_cache_v1",
    title: "旧电池缓存",
    image: asset("events/event_battery_cache.png"),
    copy: "巡逻队在地下储物间发现一批老旧电池。",
    result: "电力储备得到补充。"
  },
  {
    id: "caravan_trade_v1",
    title: "路过商队",
    image: asset("events/event_caravan_trade.png"),
    copy: "一支小商队请求用维修材料交换食物。",
    result: "交易完成，资源结构发生调整。"
  }
]

const emergencyOffer = {
  title: "战备应急补给协议",
  image: asset("items/emergency_supply.png"),
  copy: "检测到资源与队伍压力上升，补给室开放短时恢复协议。",
  reward: { food: 18, power: 14, materials: 12, premium: -2 },
  result: "补给协议已启用，资源和队伍状态暂时稳定。"
}

const state = {
  resources: {
    food: 80,
    power: 76,
    materials: 48,
    premium: 3
  },
  survivors: [Object.assign({}, survivorsPool[0])],
  selectedSurvivorId: "zhou_ying",
  selectedDutyType: "scavenge",
  lastResult: null,
  pressure: null,
  actionCount: 0,
  recruitIndex: 1,
  logs: [
    { type: "系统", text: "记录台已启动：当前是静态浏览器预览，不连接后端。" }
  ]
}

const resourceMeta = [
  { key: "food", label: "食物" },
  { key: "power", label: "电力" },
  { key: "materials", label: "材料" },
  { key: "premium", label: "招募券" }
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatChange(value) {
  const numberValue = Number(value || 0)
  return numberValue > 0 ? `+${numberValue}` : `${numberValue}`
}

function getRarityClass(rarity) {
  return String(rarity || "R").toLowerCase()
}

function getSurvivorState(survivor) {
  if (survivor.health <= 35) {
    return { label: "健康风险", tone: "danger" }
  }

  if (survivor.fatigue >= 78) {
    return { label: "疲劳过高", tone: "warning" }
  }

  if (survivor.health <= 60 || survivor.fatigue >= 60) {
    return { label: "状态不稳", tone: "warning" }
  }

  return { label: "待命", tone: "normal" }
}

function getTeamSummary() {
  const highFatigue = state.survivors.filter((survivor) => survivor.fatigue >= 75).length
  const lowHealth = state.survivors.filter((survivor) => survivor.health <= 60).length

  if (lowHealth >= 2 || state.survivors.some((survivor) => survivor.health <= 35)) {
    return {
      label: "健康风险",
      tone: "danger",
      text: "健康风险上升，继续高风险值勤可能导致受伤。"
    }
  }

  if (highFatigue >= 2) {
    return {
      label: "疲劳累积",
      tone: "warning",
      text: "队伍疲劳正在累积，建议安排休整。"
    }
  }

  return {
    label: "状态可控",
    tone: "normal",
    text: "当前队伍状态可控，可以继续安排值勤。"
  }
}

function getPressureState() {
  if (state.resources.food <= 55 || state.resources.power <= 55) {
    return { label: "资源临界", tone: "danger" }
  }

  if (state.resources.materials <= 30 || state.survivors.some((survivor) => survivor.fatigue >= 75)) {
    return { label: "压力上升", tone: "warning" }
  }

  return { label: "运转稳定", tone: "normal" }
}

function getResultSeverity(resourceDelta, stateDelta, survivor) {
  const resourceGain = Object.values(resourceDelta).filter((value) => value > 0).reduce((sum, value) => sum + value, 0)
  const resourceLoss = Object.values(resourceDelta).filter((value) => value < 0).reduce((sum, value) => sum + Math.abs(value), 0)

  if (stateDelta.health <= -6 || survivor.health <= 45) {
    return { label: "健康风险", tone: "danger" }
  }

  if (stateDelta.fatigue >= 15 || survivor.fatigue >= 78) {
    return { label: "疲劳上升", tone: "warning" }
  }

  if (resourceGain >= 8 && resourceGain > resourceLoss) {
    return { label: "收益良好", tone: "normal" }
  }

  if (resourceLoss >= 5 || resourceGain <= 2) {
    return { label: "资源承压", tone: "warning" }
  }

  return { label: "状态可控", tone: "normal" }
}

function getNextHint(resourceDelta, stateDelta, survivor) {
  if (stateDelta.health <= -5 || survivor.health <= 45) {
    return "健康风险上升，继续高风险行动可能导致受伤。"
  }

  if (stateDelta.fatigue >= 14 || survivor.fatigue >= 75) {
    return "当前疲劳偏高，建议安排休整。"
  }

  if (resourceDelta.food > 0) {
    return "食物压力有所缓解，可以继续维持短期值勤。"
  }

  if (resourceDelta.power > 0) {
    return "电力供应有所恢复，可以继续安排基础轮值。"
  }

  if (resourceDelta.materials > 0) {
    return "材料库存有所补充，后续维护压力下降。"
  }

  return "本次收益有限，建议调整派遣对象或任务类型。"
}

function imageMarkup(src, fallback, className) {
  return `
    <span class="${className}">
      <img src="${src}" alt="${fallback}" data-fallback="${fallback}">
      <span class="asset-fallback">${fallback}</span>
    </span>
  `
}

function setBadge(element, info) {
  element.className = `status-badge ${info.tone === "danger" ? "danger" : info.tone === "warning" ? "warning" : ""}`.trim()
  element.textContent = info.label
}

function renderResources() {
  const grid = document.getElementById("resourceGrid")
  grid.innerHTML = resourceMeta.map((item) => {
    const value = state.resources[item.key]
    const tone = value <= (item.key === "materials" ? 30 : 55) ? "danger" : value <= 68 ? "warning" : ""
    const width = item.key === "premium" ? clamp(value * 20, 8, 100) : clamp(value, 4, 100)
    return `
      <article class="resource-card">
        <span class="resource-label">${item.label}</span>
        <strong class="resource-value">${value}</strong>
        <div class="meter"><div class="meter-fill ${tone}" style="width:${width}%"></div></div>
      </article>
    `
  }).join("")

  setBadge(document.getElementById("pressureBadge"), getPressureState())
}

function renderSurvivors() {
  const list = document.getElementById("survivorList")
  list.innerHTML = state.survivors.map((survivor) => {
    const status = getSurvivorState(survivor)
    const selected = survivor.id === state.selectedSurvivorId
    return `
      <article class="survivor-card ${selected ? "selected" : ""}" data-survivor-id="${survivor.id}">
        ${imageMarkup(survivor.portrait, survivor.fallback, "portrait")}
        <div>
          <span class="survivor-name">${survivor.name}</span>
          <div class="tag-row">
            <span class="tag ${getRarityClass(survivor.rarity)}">${survivor.rarity}</span>
            <span class="tag">${survivor.role}</span>
            <span class="tag">疲劳 ${survivor.fatigue}</span>
            <span class="tag">健康 ${survivor.health}</span>
          </div>
        </div>
        <span class="state-pill ${status.tone === "danger" ? "danger" : status.tone === "warning" ? "warning" : ""}">${status.label}</span>
      </article>
    `
  }).join("")

  const selected = state.survivors.find((survivor) => survivor.id === state.selectedSurvivorId)
  document.getElementById("selectedBadge").textContent = selected ? `已选：${selected.name}` : "未选择"
  renderTeamHint()
}

function renderTeamHint() {
  const summary = getTeamSummary()
  const highFatigue = state.survivors.filter((survivor) => survivor.fatigue >= 75).length
  const lowHealth = state.survivors.filter((survivor) => survivor.health <= 60).length
  const node = document.getElementById("teamHint")
  node.className = `team-hint ${summary.tone === "danger" ? "danger" : summary.tone === "warning" ? "warning" : ""}`
  node.innerHTML = `
    <div class="team-hint-title">
      <span>队伍状态</span>
      <span>${summary.label}</span>
    </div>
    <p class="team-hint-copy">${summary.text}</p>
    <div class="chip-row">
      <span class="delta-chip">成员 ${state.survivors.length}</span>
      <span class="delta-chip">高疲劳 ${highFatigue}</span>
      <span class="delta-chip">健康风险 ${lowHealth}</span>
    </div>
  `
}

function renderDuties() {
  const options = document.getElementById("dutyOptions")
  options.innerHTML = duties.map((duty) => {
    const selected = duty.type === state.selectedDutyType
    return `
      <article class="duty-card ${selected ? "selected" : ""} ${duty.risk === "高风险" ? "risk" : ""}" data-duty-type="${duty.type}">
        ${imageMarkup(duty.icon, duty.label, "duty-icon")}
        <div>
          <span class="duty-title">${duty.label}</span>
          <span class="duty-helper">${duty.risk} · ${duty.helper}</span>
        </div>
      </article>
    `
  }).join("")
}

function renderResult() {
  const resultCard = document.getElementById("resultCard")
  const resultBadge = document.getElementById("resultBadge")

  if (!state.lastResult) {
    resultBadge.className = "status-badge"
    resultBadge.textContent = "等待行动"
    resultCard.className = "result-card empty-state"
    resultCard.textContent = "执行一次值勤后，这里会显示资源变化、幸存者状态变化和下一步建议。"
    return
  }

  const result = state.lastResult
  setBadge(resultBadge, result.severity)
  resultCard.className = "result-card"
  resultCard.innerHTML = `
    <div class="result-head">
      ${imageMarkup(result.duty.icon, result.duty.label, "duty-icon")}
      <div>
        <span class="result-title">值勤完成 · ${result.duty.label}</span>
        <div class="tag-row">
          <span class="tag">${result.survivor.name}</span>
          <span class="tag ${getRarityClass(result.survivor.rarity)}">${result.survivor.rarity}</span>
          <span class="tag">${result.survivor.role}</span>
        </div>
      </div>
    </div>
    <p class="result-copy">${result.text}</p>
    <div class="delta-section">
      <span class="delta-section-title">资源变化</span>
      <div class="chip-row">${deltaChips(result.resourceDelta, resourceMeta)}</div>
    </div>
    <div class="delta-section">
      <span class="delta-section-title">幸存者状态</span>
      <div class="chip-row">
        <span class="delta-chip ${result.stateDelta.fatigue > 0 ? "loss" : "gain"}">疲劳 ${formatChange(result.stateDelta.fatigue)}</span>
        <span class="delta-chip ${result.stateDelta.health < 0 ? "loss" : "gain"}">健康 ${formatChange(result.stateDelta.health)}</span>
      </div>
    </div>
    <div class="next-hint">${result.nextHint}</div>
  `
}

function deltaChips(delta, meta) {
  return meta.map((item) => {
    const value = delta[item.key] || 0
    if (value === 0) {
      return ""
    }

    return `<span class="delta-chip ${value > 0 ? "gain" : "loss"}">${item.label} ${formatChange(value)}</span>`
  }).join("") || '<span class="delta-chip">资源未变化</span>'
}

function renderPressure() {
  const type = document.getElementById("pressureType")
  const card = document.getElementById("pressureCard")

  if (!state.pressure) {
    type.className = "status-badge"
    type.textContent = "待命"
    card.className = "empty-state"
    card.textContent = "执行值勤后先观察随机事件；连续行动或资源压力上升后，会出现应急补给预览。"
    return
  }

  if (state.pressure.kind === "event") {
    type.className = "status-badge warning"
    type.textContent = "随机事件"
    card.className = "pressure-card"
    card.innerHTML = `
      ${imageMarkup(state.pressure.image, state.pressure.title, "event-image")}
      <div>
        <span class="pressure-title">${state.pressure.title}</span>
        <p class="pressure-copy">${state.pressure.copy}</p>
        <div class="pressure-actions">
          <button class="small-button" type="button" data-action="resolve-event">处理事件</button>
        </div>
      </div>
    `
    return
  }

  type.className = "status-badge danger"
  type.textContent = "应急补给"
  card.className = "pressure-card"
  card.innerHTML = `
    ${imageMarkup(emergencyOffer.image, emergencyOffer.title, "offer-image")}
    <div>
      <span class="pressure-title">${emergencyOffer.title}</span>
      <p class="pressure-copy">${emergencyOffer.copy}</p>
      <div class="pressure-actions">
        <button class="small-button" type="button" data-action="claim-offer">启用补给</button>
        <button class="small-button secondary" type="button" data-action="close-offer">暂缓处理</button>
      </div>
    </div>
  `
}

function renderLogs() {
  const list = document.getElementById("logList")
  list.innerHTML = state.logs.slice(0, 6).map((item, index) => `
    <article class="log-item">
      <div class="log-meta">#${state.logs.length - index} · ${item.type}</div>
      <div class="log-title">${item.text}</div>
    </article>
  `).join("")
}

function renderAll() {
  renderResources()
  renderSurvivors()
  renderDuties()
  renderResult()
  renderPressure()
  renderLogs()
  bindDynamicEvents()
}

function bindDynamicEvents() {
  document.querySelectorAll(".survivor-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedSurvivorId = card.dataset.survivorId
      renderAll()
    })
  })

  document.querySelectorAll(".duty-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedDutyType = card.dataset.dutyType
      renderAll()
    })
  })

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", handleImageError, { once: true })
  })
}

function handleImageError(event) {
  const image = event.currentTarget
  const frame = image.parentElement

  if (frame) {
    frame.classList.add("asset-missing")
  } else {
    image.classList.add("is-hidden")
  }
}

function recruitSurvivor() {
  const next = survivorsPool[state.recruitIndex % survivorsPool.length]
  const alreadyOwned = state.survivors.some((survivor) => survivor.id === next.id)

  if (alreadyOwned) {
    state.resources.materials += 6
    state.logs.unshift({ type: "招募", text: `${next.name}重复登记，已折算为维修材料 +6。` })
  } else {
    state.survivors.push(Object.assign({}, next))
    state.selectedSurvivorId = next.id
    state.logs.unshift({ type: "招募", text: `登记完成：${next.name}加入避难所值勤名单。` })
  }

  state.recruitIndex += 1
  renderAll()
}

function assignDuty() {
  const survivor = state.survivors.find((item) => item.id === state.selectedSurvivorId)
  const duty = duties.find((item) => item.type === state.selectedDutyType)

  if (!survivor || !duty) {
    return
  }

  Object.keys(duty.resourceDelta).forEach((key) => {
    state.resources[key] = clamp(state.resources[key] + duty.resourceDelta[key], 0, 120)
  })

  survivor.fatigue = clamp(survivor.fatigue + duty.stateDelta.fatigue, 0, 100)
  survivor.health = clamp(survivor.health + duty.stateDelta.health, 0, 100)
  state.actionCount += 1

  const severity = getResultSeverity(duty.resourceDelta, duty.stateDelta, survivor)
  state.lastResult = {
    survivor,
    duty,
    text: `${survivor.name}完成${duty.label}。${duty.resultText}`,
    resourceDelta: duty.resourceDelta,
    stateDelta: duty.stateDelta,
    severity,
    nextHint: getNextHint(duty.resourceDelta, duty.stateDelta, survivor)
  }
  state.logs.unshift({ type: "值勤", text: `${survivor.name}完成${duty.label}，记录状态：${severity.label}。` })
  updatePressureAfterDuty()
  renderAll()
}

function updatePressureAfterDuty() {
  const pressureState = getPressureState()

  if (pressureState.tone === "danger" || state.actionCount >= 3) {
    state.pressure = { kind: "offer" }
    state.logs.unshift({ type: "补给", text: "资源或队伍压力达到阈值，应急补给协议开放。" })
    return
  }

  if (state.actionCount >= 1) {
    const event = events[(state.actionCount - 1) % events.length]
    state.pressure = Object.assign({ kind: "event" }, event)
    state.logs.unshift({ type: "事件", text: `${event.title}触发，等待值班长处理。` })
  }
}

function resolveEvent() {
  if (!state.pressure || state.pressure.kind !== "event") {
    return
  }

  const event = state.pressure
  if (event.id === "filter_clog_v1") {
    state.resources.materials = clamp(state.resources.materials - 4, 0, 120)
  } else if (event.id === "battery_cache_v1") {
    state.resources.power = clamp(state.resources.power + 10, 0, 120)
  } else {
    state.resources.food = clamp(state.resources.food + 8, 0, 120)
    state.resources.materials = clamp(state.resources.materials - 3, 0, 120)
  }

  state.logs.unshift({ type: "事件", text: event.result })
  state.pressure = null
  renderAll()
}

function claimOffer() {
  Object.keys(emergencyOffer.reward).forEach((key) => {
    state.resources[key] = clamp(state.resources[key] + emergencyOffer.reward[key], 0, 120)
  })
  state.survivors.forEach((survivor) => {
    survivor.fatigue = clamp(survivor.fatigue - 12, 0, 100)
    survivor.health = clamp(survivor.health + 4, 0, 100)
  })
  state.logs.unshift({ type: "补给", text: emergencyOffer.result })
  state.pressure = null
  renderAll()
}

function closeOffer() {
  state.logs.unshift({ type: "补给", text: "指挥官暂缓启用应急补给协议。" })
  state.pressure = null
  renderAll()
}

function resetDemo() {
  state.resources = { food: 80, power: 76, materials: 48, premium: 3 }
  state.survivors = [Object.assign({}, survivorsPool[0])]
  state.selectedSurvivorId = "zhou_ying"
  state.selectedDutyType = "scavenge"
  state.lastResult = null
  state.pressure = null
  state.actionCount = 0
  state.recruitIndex = 1
  state.logs = [{ type: "系统", text: "预览记录已清空：静态浏览器预览回到初始演练。" }]
  renderAll()
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("recruitButton").addEventListener("click", recruitSurvivor)
  document.getElementById("assignButton").addEventListener("click", assignDuty)
  document.getElementById("resetButton").addEventListener("click", resetDemo)
  document.getElementById("pressureCard").addEventListener("click", (event) => {
    const action = event.target.dataset.action

    if (action === "resolve-event") {
      resolveEvent()
    } else if (action === "claim-offer") {
      claimOffer()
    } else if (action === "close-offer") {
      closeOffer()
    }
  })

  renderAll()
})
