const api = require("../../utils/api")
const format = require("../../utils/format")

const DEFAULT_VISIBLE_LOG_COUNT = 1

function getRarityKey(rarity) {
  const value = String(rarity || "R").toLowerCase()

  if (value === "ssr" || value === "sr") {
    return value
  }

  return "r"
}

function getOfferEventClass(eventType) {
  if (eventType === "purchased") {
    return "log-tag log-tag--offer-purchased"
  }

  if (eventType === "closed") {
    return "log-tag log-tag--offer-closed"
  }

  return "log-tag log-tag--offer-exposed"
}

function getLogSortValue(row) {
  const id = Number(row.id)

  if (!isNaN(id)) {
    return id
  }

  const time = new Date(row.created_at).getTime()
  return isNaN(time) ? 0 : time
}

function sortLogsNewestFirst(logs) {
  return logs.slice().sort((left, right) => {
    return getLogSortValue(right) - getLogSortValue(left)
  })
}

function decorateLatestLogs(logs) {
  return logs.map((log, index) => {
    return Object.assign({}, log, {
      isLatest: index === 0,
      latestText: index === 0 ? "最新" : "",
      logCardClass: `${log.logCardClass}${index === 0 ? " log-card--latest" : ""}`
    })
  })
}

function buildExpandableLogState(section, logs, expanded) {
  const hiddenCount = Math.max(logs.length - DEFAULT_VISIBLE_LOG_COUNT, 0)
  const visibleLogs = expanded ? logs : logs.slice(0, DEFAULT_VISIBLE_LOG_COUNT)

  return {
    [`${section}Logs`]: logs,
    [`${section}VisibleLogs`]: visibleLogs,
    [`${section}HiddenCount`]: hiddenCount,
    [`${section}HasHiddenLogs`]: hiddenCount > 0,
    [`${section}ToggleText`]: expanded ? "收起" : `展开更早记录（${hiddenCount}）`
  }
}

function buildLogTimeParts(createdAt) {
  const rawText = String(createdAt || "").replace("T", " ")
  const parts = rawText.split(" ")
  const dateText = parts[0] || "--"
  const timeText = parts[1] || rawText || "--"

  return {
    dayLabel: `记录日 ${dateText}`,
    timeLabel: timeText
  }
}

function buildRecordText(row) {
  return row.id ? `记录 #${row.id}` : "记录 #--"
}

function getChangeClass(value) {
  const numberValue = Number(value || 0)

  if (numberValue > 0) {
    return "resource-change resource-change--gain"
  }

  if (numberValue < 0) {
    return "resource-change resource-change--loss"
  }

  return "resource-change"
}

function buildResourceChangeRows(row) {
  return [
    { label: "食物", value: row.food_change },
    { label: "电力", value: row.power_change },
    { label: "材料", value: row.materials_change }
  ].map((item) => {
    return {
      label: item.label,
      valueText: format.formatChange(item.value),
      changeClass: getChangeClass(item.value)
    }
  })
}

function formatGachaLog(row) {
  const rarityKey = getRarityKey(row.rarity)
  const duplicate = Boolean(row.duplicate)
  const compensation = row.compensation || {}
  const compensationAmount = compensation.amount || 0

  return Object.assign({
    id: row.id,
    survivor_name: row.survivor_name,
    rarity: row.rarity,
    role: row.role,
    duplicate,
    compensation_text: duplicate ? `重复角色转化：材料 +${compensationAmount}` : "",
    created_at: row.created_at,
    logCardClass: `log-card log-card--gacha log-card--rarity-${rarityKey}`,
    tagClass: `log-tag log-tag--rarity-${rarityKey}`,
    markerText: duplicate ? "重复补偿" : "招募记录",
    rarityText: row.rarity || "R"
  }, buildLogTimeParts(row.created_at), {
    recordText: buildRecordText(row)
  })
}

function getOfferOutcomeText(eventType) {
  if (eventType === "purchased") {
    return "处理结果：补给已购买并入库，资源与队伍状态获得恢复。"
  }

  if (eventType === "closed") {
    return "处理结果：玩家暂缓处理，补给室进入短时待命。"
  }

  return "处理结果：补给协议已开放，等待玩家确认。"
}

function getOfferActionSummary(eventType, triggerReason) {
  const reasonNotice = format.getTriggerReasonNotice(triggerReason)

  if (eventType === "purchased") {
    return `${reasonNotice} 玩家已启用协议，补给记录已归档。`
  }

  if (eventType === "closed") {
    return `${reasonNotice} 玩家选择暂缓，系统保留关闭记录。`
  }

  return `${reasonNotice} 系统已记录本次补给开放。`
}

function formatSnapshotValue(value) {
  if (value === undefined || value === null) {
    return "--"
  }

  return value
}

function buildOfferSnapshotRows(row) {
  return [
    { label: "食物", value: formatSnapshotValue(row.food_before) },
    { label: "电力", value: formatSnapshotValue(row.power_before) },
    { label: "材料", value: formatSnapshotValue(row.materials_before) },
    { label: "招募券", value: formatSnapshotValue(row.premium_currency_before) }
  ]
}

function formatOfferActionCount(actionCount) {
  if (actionCount === undefined || actionCount === null) {
    return "未记录"
  }

  const count = Number(actionCount)
  if (isNaN(count)) {
    return "未记录"
  }

  if (count <= 0) {
    return "尚未完成值勤时"
  }

  return `第 ${count} 次值勤后`
}

function formatDutyLog(row) {
  return Object.assign({
    id: row.id,
    survivor_name: row.survivor_name,
    duty_type: row.duty_type,
    duty_label: format.getDutyLabel(row.duty_type),
    result_text: row.result_text,
    food_change_text: format.formatChange(row.food_change),
    power_change_text: format.formatChange(row.power_change),
    materials_change_text: format.formatChange(row.materials_change),
    logCardClass: "log-card log-card--duty",
    tagClass: "log-tag log-tag--duty",
    markerText: "值勤行动",
    resourceChanges: buildResourceChangeRows(row),
    created_at: row.created_at
  }, buildLogTimeParts(row.created_at), {
    recordText: buildRecordText(row)
  })
}

function formatOfferLog(row) {
  const actionType = format.getOfferEventLabel(row.event_type)
  const triggerReason = format.getTriggerReasonLabel(row.trigger_reason)
  const snapshotRows = buildOfferSnapshotRows(row)

  return Object.assign({
    id: row.id,
    action_type: actionType,
    event_type: row.event_type,
    trigger_reason: triggerReason,
    action_summary: getOfferActionSummary(row.event_type, row.trigger_reason),
    resource_snapshot_text: (
      `食物 ${snapshotRows[0].value} / 电力 ${snapshotRows[1].value} / ` +
      `材料 ${snapshotRows[2].value} / 招募券 ${snapshotRows[3].value}`
    ),
    resourceSnapshotRows: snapshotRows,
    survivor_count_text: row.survivor_count === undefined || row.survivor_count === null ? "--" : row.survivor_count,
    action_count_text: formatOfferActionCount(row.action_count),
    outcome_text: getOfferOutcomeText(row.event_type),
    logCardClass: `log-card log-card--offer log-card--offer-${row.event_type || "exposed"}`,
    tagClass: getOfferEventClass(row.event_type),
    markerText: "应急补给协议",
    logTitle: `${actionType} · 应急补给协议`,
    created_at: row.created_at
  }, buildLogTimeParts(row.created_at), {
    recordText: buildRecordText(row)
  })
}

Page({
  data: {
    loadingGachaLogs: false,
    loadingDutyLogs: false,
    loadingOfferLogs: false,
    gachaErrorMessage: "",
    dutyErrorMessage: "",
    offerErrorMessage: "",
    gachaExpanded: false,
    dutyExpanded: false,
    offerExpanded: false,
    gachaLogs: [],
    dutyLogs: [],
    offerLogs: [],
    gachaVisibleLogs: [],
    dutyVisibleLogs: [],
    offerVisibleLogs: [],
    gachaHiddenCount: 0,
    dutyHiddenCount: 0,
    offerHiddenCount: 0,
    gachaHasHiddenLogs: false,
    dutyHasHiddenLogs: false,
    offerHasHiddenLogs: false,
    gachaToggleText: "",
    dutyToggleText: "",
    offerToggleText: ""
  },

  onShow() {
    api.ensureInitialized().then((initialized) => {
      if (initialized) {
        this.loadLogs()
        return
      }

      this.resetPageState()
    })
  },

  resetPageState() {
    this.setData({
      loadingGachaLogs: false,
      loadingDutyLogs: false,
      loadingOfferLogs: false,
      gachaErrorMessage: "",
      dutyErrorMessage: "",
      offerErrorMessage: "",
      gachaExpanded: false,
      dutyExpanded: false,
      offerExpanded: false,
      gachaLogs: [],
      dutyLogs: [],
      offerLogs: [],
      gachaVisibleLogs: [],
      dutyVisibleLogs: [],
      offerVisibleLogs: [],
      gachaHiddenCount: 0,
      dutyHiddenCount: 0,
      offerHiddenCount: 0,
      gachaHasHiddenLogs: false,
      dutyHasHiddenLogs: false,
      offerHasHiddenLogs: false,
      gachaToggleText: "",
      dutyToggleText: "",
      offerToggleText: ""
    })
  },

  loadLogs() {
    this.loadGachaLogs()
    this.loadDutyLogs()
    this.loadOfferLogs()
  },

  toggleGachaLogs() {
    const expanded = !this.data.gachaExpanded

    this.setData(Object.assign({
      gachaExpanded: expanded
    }, buildExpandableLogState("gacha", this.data.gachaLogs, expanded)))
  },

  toggleDutyLogs() {
    const expanded = !this.data.dutyExpanded

    this.setData(Object.assign({
      dutyExpanded: expanded
    }, buildExpandableLogState("duty", this.data.dutyLogs, expanded)))
  },

  toggleOfferLogs() {
    const expanded = !this.data.offerExpanded

    this.setData(Object.assign({
      offerExpanded: expanded
    }, buildExpandableLogState("offer", this.data.offerLogs, expanded)))
  },

  loadGachaLogs() {
    this.setData({
      loadingGachaLogs: true,
      gachaErrorMessage: ""
    })

    api.getGachaLogs()
      .then((res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          const logs = decorateLatestLogs(sortLogsNewestFirst(
            res.data.map(formatGachaLog)
          ))

          this.setData(buildExpandableLogState(
            "gacha",
            logs,
            this.data.gachaExpanded
          ))
          return
        }

        this.setData({
          gachaErrorMessage: "招募日志加载失败"
        })
      })
      .catch(() => {
        this.setData({
          gachaErrorMessage: "无法连接后端服务"
        })
      })
      .finally(() => {
        this.setData({
          loadingGachaLogs: false
        })
      })
  },

  loadDutyLogs() {
    this.setData({
      loadingDutyLogs: true,
      dutyErrorMessage: ""
    })

    api.getDutyLogs()
      .then((res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          const logs = decorateLatestLogs(sortLogsNewestFirst(
            res.data.map(formatDutyLog)
          ))

          this.setData(buildExpandableLogState(
            "duty",
            logs,
            this.data.dutyExpanded
          ))
          return
        }

        this.setData({
          dutyErrorMessage: "值勤日志加载失败"
        })
      })
      .catch(() => {
        this.setData({
          dutyErrorMessage: "无法连接后端服务"
        })
      })
      .finally(() => {
        this.setData({
          loadingDutyLogs: false
        })
      })
  },

  loadOfferLogs() {
    this.setData({
      loadingOfferLogs: true,
      offerErrorMessage: ""
    })

    api.getEmergencyOfferLogs()
      .then((res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          const logs = decorateLatestLogs(sortLogsNewestFirst(
            res.data.map(formatOfferLog)
          ))

          this.setData(buildExpandableLogState(
            "offer",
            logs,
            this.data.offerExpanded
          ))
          return
        }

        this.setData({
          offerErrorMessage: "补给日志加载失败"
        })
      })
      .catch(() => {
        this.setData({
          offerErrorMessage: "无法连接后端服务"
        })
      })
      .finally(() => {
        this.setData({
          loadingOfferLogs: false
        })
      })
  }
})
