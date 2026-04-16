const api = require("../../utils/api")
const format = require("../../utils/format")

function formatDutyLog(row) {
  return {
    id: row.id,
    survivor_name: row.survivor_name,
    duty_type: row.duty_type,
    duty_label: format.getDutyLabel(row.duty_type),
    result_text: row.result_text,
    food_change_text: format.formatChange(row.food_change),
    power_change_text: format.formatChange(row.power_change),
    materials_change_text: format.formatChange(row.materials_change),
    created_at: row.created_at
  }
}

function formatOfferLog(row) {
  return {
    id: row.id,
    action_type: format.getOfferEventLabel(row.event_type),
    event_type: row.event_type,
    trigger_reason: format.getTriggerReasonLabel(row.trigger_reason),
    resource_snapshot_text: (
      `食物 ${row.food_before} / 电力 ${row.power_before} / ` +
      `材料 ${row.materials_before} / 招募券 ${row.premium_currency_before}`
    ),
    survivor_count_text: row.survivor_count === undefined ? "--" : row.survivor_count,
    created_at: row.created_at
  }
}

Page({
  data: {
    loadingGachaLogs: false,
    loadingDutyLogs: false,
    loadingOfferLogs: false,
    gachaErrorMessage: "",
    dutyErrorMessage: "",
    offerErrorMessage: "",
    gachaLogs: [],
    dutyLogs: [],
    offerLogs: []
  },

  onShow() {
    this.loadLogs()
  },

  loadLogs() {
    this.loadGachaLogs()
    this.loadDutyLogs()
    this.loadOfferLogs()
  },

  loadGachaLogs() {
    this.setData({
      loadingGachaLogs: true,
      gachaErrorMessage: ""
    })

    api.getGachaLogs()
      .then((res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          this.setData({
            gachaLogs: res.data
          })
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
          this.setData({
            dutyLogs: res.data.map(formatDutyLog)
          })
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
          this.setData({
            offerLogs: res.data.map(formatOfferLog)
          })
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
