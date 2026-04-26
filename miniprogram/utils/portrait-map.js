const SURVIVOR_PORTRAITS = {
  "周萤": { path: "", fallbackText: "萤" },
  "唐鸦": { path: "", fallbackText: "鸦" },
  "顾砚秋": { path: "", fallbackText: "砚秋" },
  "周芩": { path: "", fallbackText: "芩" },
  "林七": { path: "", fallbackText: "七" },
  "许禾": { path: "", fallbackText: "禾" },
  "阿拓": { path: "", fallbackText: "拓" },
  "林雾": { path: "", fallbackText: "雾" },
  "姜照晚": { path: "", fallbackText: "照晚" },
  "小五": { path: "", fallbackText: "五" },
  "阿琴": { path: "", fallbackText: "琴" },
  "老秦": { path: "", fallbackText: "秦" },
  "石头": { path: "", fallbackText: "石头" },
  "唐屿宁": { path: "", fallbackText: "屿宁" },
  "沈见微": { path: "", fallbackText: "见微" }
}

function getRarityKey(rarity) {
  const value = String(rarity || "R").toLowerCase()

  if (value === "ssr" || value === "sr") {
    return value
  }

  return "r"
}

function getFallbackText(name) {
  const text = String(name || "幸存者").trim()

  if (!text) {
    return "人"
  }

  if (text.length <= 2) {
    return text
  }

  return text.slice(text.length - 2)
}

function getSurvivorPortrait(survivor) {
  const data = survivor || {}
  const name = data.name || ""
  const rarityKey = getRarityKey(data.rarity)
  const portrait = SURVIVOR_PORTRAITS[name] || {}
  const portraitPath = portrait.path || ""
  const hasPortrait = Boolean(portraitPath)

  return {
    hasPortrait,
    portraitPath,
    portraitAlt: portrait.alt || `${name || "幸存者"}头像`,
    portraitFallbackText: portrait.fallbackText || getFallbackText(name),
    portraitFrameClass: (
      `survivor-portrait survivor-portrait--${rarityKey}` +
      (hasPortrait ? " survivor-portrait--image" : " survivor-portrait--fallback")
    ),
    portraitFallbackClass: `survivor-portrait-fallback survivor-portrait-fallback--${rarityKey}`
  }
}

function attachSurvivorPortrait(survivor) {
  return Object.assign({}, survivor, getSurvivorPortrait(survivor))
}

module.exports = {
  SURVIVOR_PORTRAITS,
  attachSurvivorPortrait,
  getRarityKey,
  getSurvivorPortrait
}
