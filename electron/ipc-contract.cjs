// SAO 菜单桌宠 —— IPC 契约（仿 BongoCat shared/config contract：通道名与载荷形状集中声明，
// 主进程与 preload 共用同一份事实，禁止各自手写通道字符串）。
// 说明：Electron 沙箱 preload 不能 require 相对文件，pet-preload.cjs 内联镜像本文件 CHANNELS，
// 一致性由 electron/tests/preload-contract.test.cjs 静态比对强制（改通道须两处同步）。
'use strict'

// 通道名常量。字符串沿用了历史值（pet:*），保证旧版渲染层 bundle 与新主进程互通；
// 唯一的声明入口在本文，任何新增/改名只允许在这里改。
const CHANNELS = Object.freeze({
  // 渲染层 → 主进程：呼出 / 隐藏全屏菜单窗口（这个通道也用于主进程 → 渲染层：菜单打开请求）
  OPEN_FULL: 'pet:open-full',
  HIDE_FULL: 'pet:hide-full',
  QUIT: 'pet:quit',
  // 控制面板（齿轮右键呼出的小窗）：呼出/收起
  CONFIG_OPEN: 'pet:config-open',
  CONFIG_CLOSE: 'pet:config-close',
  // 声音开关：同步读取 / 写入 / 事件推送
  GET_MUTED: 'pet:get-muted',
  SET_MUTED: 'pet:set-muted',
  MUTE_EVT: 'pet:mute',
  // 游戏模式：同步读取 / 写入 / 事件推送
  GET_GAME: 'pet:get-game',
  SET_GAME: 'pet:set-game',
  GAME_EVT: 'pet:game',
  // 个人信息（FF14 角色卡）：同步读取 / 写入 / 事件推送
  GET_PROFILE: 'pet:profile-get',
  SET_PROFILE: 'pet:profile-set',
  PROFILE_EVT: 'pet:profile',
  // 角色图标（上传图片，base64 dataURL，≤256KB）：同步读取 / 写入 / 事件推送
  GET_AVATAR: 'pet:avatar-get',
  SET_AVATAR: 'pet:avatar-set',
  AVATAR_EVT: 'pet:avatar',
  // 任务（任务酒馆）：同步读取 / 写入 / 事件推送
  GET_QUESTS: 'pet:quests-get',
  SET_QUESTS: 'pet:quests-set',
  QUESTS_EVT: 'pet:quests',
  // 任务酒馆窗口：打开（渲染层→主进程请求；载荷 { group?: 'personal'|'other' }；
  // 主进程→酒馆窗口设置归属：已开则直接转发同载荷）
  OPEN_TAVERN: 'pet:tavern-open',
  CLOSE_TAVERN: 'pet:tavern-close',
  // 菜单浮窗模式（设置开关：全屏盖屏 ↔ 自由拖拽固定尺寸浮窗）：同步读取 / 写入 / 事件推送
  GET_MENU_FLOAT: 'pet:get-menu-float',
  SET_MENU_FLOAT: 'pet:set-menu-float',
  MENU_FLOAT_EVT: 'pet:menu-float',
  // 挂件拖动开始/结束（payload: { on: boolean, offX?: number, offY?: number }）
  DRAG: 'pet:drag',
  // 主进程 → 渲染层：全局热键注册结果（payload: boolean）
  HOTKEY_EVT: 'pet:hotkey'
})

// 载荷形状（payload contract）。用于测试断言与新人核对；不承载逻辑。
const PAYLOADS = Object.freeze({
  [CHANNELS.OPEN_FULL]: null,
  [CHANNELS.HIDE_FULL]: null,
  [CHANNELS.QUIT]: null,
  [CHANNELS.CONFIG_OPEN]: null,
  [CHANNELS.CONFIG_CLOSE]: null,
  [CHANNELS.GET_MUTED]: null, // sendSync → boolean
  [CHANNELS.SET_MUTED]: 'boolean',
  [CHANNELS.MUTE_EVT]: 'boolean',
  [CHANNELS.GET_GAME]: null, // sendSync → boolean
  [CHANNELS.SET_GAME]: 'boolean',
  [CHANNELS.GAME_EVT]: 'boolean',
  [CHANNELS.GET_PROFILE]: null, // sendSync → object
  [CHANNELS.SET_PROFILE]: 'object',
  [CHANNELS.PROFILE_EVT]: 'object',
  [CHANNELS.GET_AVATAR]: null, // sendSync → string（八轮起 = 显示源：file:// 绝对路径 / 旧版 dataURL / ''）
  [CHANNELS.SET_AVATAR]: 'string', // 渲染层 → 主进程：JPEG dataURL（主进程写盘 sao-pet-data/avatar.jpg）
  [CHANNELS.AVATAR_EVT]: 'string', // 广播：显示源（同 GET_AVATAR 语义）
  [CHANNELS.GET_QUESTS]: null, // sendSync → { personal: [], other: [] }
  [CHANNELS.SET_QUESTS]: 'object',
  [CHANNELS.QUESTS_EVT]: 'object',
  [CHANNELS.OPEN_TAVERN]: '{ group?: string }',
  [CHANNELS.CLOSE_TAVERN]: null,
  [CHANNELS.GET_MENU_FLOAT]: null, // sendSync → boolean
  [CHANNELS.SET_MENU_FLOAT]: 'boolean',
  [CHANNELS.MENU_FLOAT_EVT]: 'boolean',
  [CHANNELS.DRAG]: '{ on: boolean, offX?: number, offY?: number }',
  [CHANNELS.HOTKEY_EVT]: 'boolean'
})

// preload 暴露给页面的同名 API（渲染层只认这组方法名；加方法须同步更新 pet-preload.cjs 与本文）
const PRELOAD_API = Object.freeze([
  'openFull',
  'hideFull',
  'dragStart',
  'dragEnd',
  'quit',
  'openConfig',
  'closeConfig',
  'getMuted',
  'setMuted',
  'onMute',
  'getGame',
  'setGame',
  'onGame',
  'getProfile',
  'setProfile',
  'onProfile',
  'getAvatar',
  'setAvatar',
  'onAvatar',
  'getQuests',
  'setQuests',
  'onQuests',
  'openTavern',
  'closeTavern',
  'onTavern',
  'getMenuFloat',
  'setMenuFloat',
  'onMenuFloat',
  'onOpenFull',
  'onHotkey'
])

module.exports = { CHANNELS, PAYLOADS, PRELOAD_API }