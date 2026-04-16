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

Page({
  data: {
    loadingGachaLogs: false,
    loadingDutyLogs: false,
    gachaErrorMessage: "",
    dutyErrorMessage: "",
    gachaLogs: [],
    dutyLogs: []
  },

  onShow() {
    this.loadLogs()
  },

  loadLogs() {
    this.loadGachaLogs()
    this.loadDutyLogs()
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
  }
})
