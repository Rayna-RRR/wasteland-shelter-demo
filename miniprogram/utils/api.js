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

module.exports = {
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
  getEmergencyOfferLogs
}
