const config = require("../config")

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBaseUrl}${path}`,
      method,
      data,
      success: resolve,
      fail: reject
    })
  })
}

function getResources() {
  return request("/api/resources", "GET")
}

function getInitStatus() {
  return request("/api/init/status", "GET")
}

function initializeShelter(data) {
  return request("/api/init", "POST", data)
}

function ensureInitialized() {
  return getInitStatus()
    .then((res) => {
      const initialized = Boolean(res.statusCode === 200 && res.data && res.data.initialized)

      if (!initialized) {
        wx.showToast({
          title: "请先接入避难所",
          icon: "none"
        })
        wx.switchTab({
          url: "/pages/home/home"
        })
      }

      return initialized
    })
    .catch(() => {
      wx.showToast({
        title: "无法读取避难所状态",
        icon: "none"
      })
      wx.switchTab({
        url: "/pages/home/home"
      })
      return false
    })
}

function pullGacha() {
  return request("/api/gacha", "POST")
}

function getSurvivors() {
  return request("/api/survivors", "GET")
}

function assignDuty(data) {
  return request("/api/duty", "POST", data)
}

function restSurvivor(data) {
  return request("/api/rest", "POST", data)
}

function getGachaLogs() {
  return request("/api/gacha-logs", "GET")
}

function getDutyLogs() {
  return request("/api/duty-logs", "GET")
}

function getEmergencyOfferState() {
  return request("/api/emergency-offer/state", "GET")
}

function exposeEmergencyOffer() {
  return request("/api/emergency-offer/expose", "POST")
}

function closeEmergencyOffer() {
  return request("/api/emergency-offer/close", "POST")
}

function purchaseEmergencyOffer() {
  return request("/api/emergency-offer/purchase", "POST")
}

function getEmergencyOfferLogs() {
  return request("/api/emergency-offer/logs", "GET")
}

function resetEmergencyOfferDebug() {
  return request("/api/debug/reset-emergency-offer", "POST")
}

function resetInitDebug() {
  return request("/api/dev/reset-init", "POST")
}

module.exports = {
  getInitStatus,
  initializeShelter,
  ensureInitialized,
  getResources,
  pullGacha,
  getSurvivors,
  assignDuty,
  restSurvivor,
  getGachaLogs,
  getDutyLogs,
  getEmergencyOfferState,
  exposeEmergencyOffer,
  closeEmergencyOffer,
  purchaseEmergencyOffer,
  getEmergencyOfferLogs,
  resetEmergencyOfferDebug,
  resetInitDebug
}
