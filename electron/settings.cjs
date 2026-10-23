// SAO 菜单桌宠 —— 设置仓库（仿 bongocat-config：单一严格解析入口、schema_version、
// snake_case 键名、原子写 + 备份兜底；旧版 camelCase 数据一次性迁移，旧数据不丢）
'use strict'

const fs = require('fs')
const path = require('path')

const SCHEMA_VERSION = 1

// 个人信息（FF14 角色卡，用户可编辑；全部可选，仅字符串/数值，长度与范围收口）
const PROFILE_FIELDS = Object.freeze({
  name: v => (typeof v === 'string' ? v.slice(0, 40) : ''),
  zone: v => (typeof v === 'string' ? v.slice(0, 20) : ''), // 大区
  world: v => (typeof v === 'string' ? v.slice(0, 20) : ''), // 服务器
  job: v => (typeof v === 'string' ? v.slice(0, 20) : ''), // 职业
  level: v => (Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), 999) : 0), // 等级
  title: v => (typeof v === 'string' ? v.slice(0, 40) : ''), // 称号
  faith: v => (typeof v === 'string' ? v.slice(0, 20) : ''), // 信仰（十二神/守护神）
  date: v => (typeof v === 'string' ? v.slice(0, 16) : ''), // 日期（冒险开始日等）
  fc: v => (typeof v === 'string' ? v.slice(0, 40) : '') // 部队
})

function sanitizeProfile(v) {
  const out = {}
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [key, validate] of Object.entries(PROFILE_FIELDS)) {
      if (key in v) out[key] = validate(v[key])
    }
  }
  return out
}

// 任务（任务酒馆；个人任务/其他任务两组，每组条目 { id 自增string, text, done }；上限与长度收口）
function sanitizeQuestList(v) {
  if (!Array.isArray(v)) return []
  return v
    .slice(0, 200)
    .map(q => {
      const out = {}
      if (q && typeof q === 'object') {
        if (typeof q.id === 'string' && q.id.length <= 32) out.id = q.id
        if (typeof q.text === 'string') out.text = q.text.slice(0, 200)
        if (typeof q.done === 'boolean') out.done = q.done
      }
      return out
    })
    .filter(q => q.id && typeof q.text === 'string')
}

function sanitizeQuests(v) {
  const out = { personal: [], other: [] }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (Array.isArray(v.personal)) out.personal = sanitizeQuestList(v.personal)
    if (Array.isArray(v.other)) out.other = sanitizeQuestList(v.other)
  }
  return out
}

// 新格式键名（snake_case）→ 校验函数。键名只允许出现在这里，未知键一律丢弃。
const FIELDS = Object.freeze({
  game_mode: v => (typeof v === 'boolean' ? v : false), // 游戏模式：全屏游戏前台时自动隐藏齿轮
  profile: sanitizeProfile, // 个人信息（FF14 角色卡，用户可编辑）
  avatar: v => (typeof v === 'string' && v.length <= 200 ? v : ''), // 角色头像：存 sao-pet-data 内短文件名（如 'avatar.jpg'）；旧版 dataURL 值读取兼容、写入已被新链路取代
  quests: sanitizeQuests, // 任务（任务酒馆：个人任务/其他任务两组）
  menu_float: v => (typeof v === 'boolean' ? v : false), // 菜单浮窗：全屏盖屏 ↔ 自由拖拽的固定尺寸浮窗
  menu_float_pos: v =>
    v && typeof v === 'object' && Number.isFinite(v.x) && Number.isFinite(v.y)
      ? { x: Math.round(v.x), y: Math.round(v.y) }
      : null, // 菜单浮窗窗口位置（拖动后保存；无则为空）
  home_x: v => (typeof v === 'number' && Number.isFinite(v) ? v : null), // 齿轮"家"位置 X
  home_y: v => (typeof v === 'number' && Number.isFinite(v) ? v : null) // 齿轮"家"位置 Y
})

function defaults() {
  return {
    schema_version: SCHEMA_VERSION,
    game_mode: false,
    profile: {},
    avatar: '',
    quests: { personal: [], other: [] },
    menu_float: false,
    menu_float_pos: null,
    home_x: null,
    home_y: null
  }
}

// 旧版（v0，camelCase）字段 → v1 映射；旧文件解析后写入时会带上 schema_version: 1
const LEGACY_FIELDS = Object.freeze({
  gameMode: 'game_mode',
  homeX: 'home_x',
  homeY: 'home_y'
})

// 严格解析 v1：schema_version 非 1 明确拒绝（跟 BongoCat 同规则：不静默转换），
// 值类型不对的字段回落默认值，不整文件炸掉。
function parseV1(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.schema_version !== SCHEMA_VERSION) return null
  const state = defaults()
  for (const [key, validate] of Object.entries(FIELDS)) {
    if (key in raw) state[key] = validate(raw[key])
  }
  // home_x / home_y 必须成对出现，否则视为未设置
  if (state.home_x === null || state.home_y === null) {
    state.home_x = null
    state.home_y = null
  }
  return state
}

// 工厂：注入设置文件路径与日志。
// API：load() 必须最先调用；get/set/assign 操作内存态并（set/assign）原子落盘。
function createSettings({ file, log }) {
  let state = null

  function persist(extraNote) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      const tmp = file + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8')
      fs.renameSync(tmp, file) // 同目录临时文件 + rename = 原子替换
      if (extraNote) log.info(extraNote)
      return true
    } catch (e) {
      log.error('settings save ERROR: ' + (e && e.message ? e.message : e))
      return false
    }
  }

  function load() {
    let raw = null
    let legacy = false
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      // 文件不存在 = 首次运行；存在但解析失败 = 损坏 → 备份 + 默认值（ADM：最新有效备份 → 默认配置）
      if (fs.existsSync(file)) {
        try {
          fs.copyFileSync(file, file + '.corrupt-' + Date.now())
          log.warn('settings file corrupt, backed up to .corrupt-* , using defaults')
        } catch (e2) {
          log.error('settings corrupt backup ERROR: ' + e2)
        }
      }
      state = defaults()
      persist()
      return
    }

    if (raw && raw.schema_version === SCHEMA_VERSION) {
      state = parseV1(raw)
    } else if (raw && typeof raw === 'object') {
      // 旧版 camelCase：迁移（保留原值），落盘前先备份旧文件
      legacy = true
      state = defaults()
      for (const [oldKey, newKey] of Object.entries(LEGACY_FIELDS)) {
        if (oldKey in raw) state[newKey] = FIELDS[newKey](raw[oldKey])
      }
      if (state.home_x === null || state.home_y === null) {
        state.home_x = null
        state.home_y = null
      }
    } else {
      state = defaults()
    }

    if (legacy) {
      try {
        fs.copyFileSync(file, file + '.bak')
      } catch (e) {
        log.warn('settings v0 backup ERROR: ' + e)
      }
      persist('settings migrated v0 -> v1 (backup at settings.json.bak)')
    } else if (!state) {
      // schema_version 非 1：明确拒绝，按默认值重建（损坏文件已在上方处理，这里值=null 不可达，
      // 防御性保留）
      state = defaults()
      persist()
    }
  }

  function get(key) {
    if (!(key in FIELDS)) throw new Error('unknown settings key: ' + key)
    return state[key]
  }

  function set(key, value) {
    if (!(key in FIELDS)) throw new Error('unknown settings key: ' + key)
    state[key] = FIELDS[key](value)
    persist()
    return state[key]
  }

  // 一次改多个键、只落盘一次（拖动结束时 home_x/home_y 一起写）
  function assign(updates) {
    for (const [key, value] of Object.entries(updates)) {
      if (!(key in FIELDS)) throw new Error('unknown settings key: ' + key)
      state[key] = FIELDS[key](value)
    }
    persist()
  }

  // 只读快照（仿 BongoCat RenderSnapshot 精神：渲染层需要时一次性拿全量）
  function snapshot() {
    return { ...state }
  }

  return { load, get, set, assign, snapshot, file }
}

module.exports = { createSettings, SCHEMA_VERSION }