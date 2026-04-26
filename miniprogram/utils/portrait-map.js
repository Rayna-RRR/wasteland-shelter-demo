const SURVIVOR_PORTRAITS = {
  "周萤": { path: "/assets/images/characters/zhou_ying.png", fallbackText: "萤" },
  "唐鸦": { path: "/assets/images/characters/tang_ya.png", fallbackText: "鸦" },
  "顾砚秋": { path: "/assets/images/characters/gu_yanqiu.png", fallbackText: "砚秋" },
  "周芩": { path: "/assets/images/characters/zhou_qin.png", fallbackText: "芩" },
  "林七": { path: "/assets/images/characters/lin_qi.png", fallbackText: "七" },
  "许禾": { path: "/assets/images/characters/xu_he.png", fallbackText: "禾" },
  "阿拓": { path: "/assets/images/characters/a_tuo.png", fallbackText: "拓" },
  "林雾": { path: "/assets/images/characters/lin_wu.png", fallbackText: "雾" },
  "姜照晚": { path: "/assets/images/characters/jiang_zhaowan.png", fallbackText: "照晚" },
  "小五": { path: "/assets/images/characters/xiao_wu.png", fallbackText: "五" },
  "阿琴": { path: "/assets/images/characters/a_qin.png", fallbackText: "琴" },
  "老秦": { path: "/assets/images/characters/lao_qin.png", fallbackText: "秦" },
  "石头": { path: "/assets/images/characters/shi_tou.png", fallbackText: "石头" },
  "唐屿宁": { path: "/assets/images/characters/tang_yuning.png", fallbackText: "屿宁" },
  "沈见微": { path: "/assets/images/characters/shen_jianwei.png", fallbackText: "见微" }
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
