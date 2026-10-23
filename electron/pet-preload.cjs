// SAO 菜单桌宠 —— preload：向页面暴露最小 IPC 桥（window.petAPI）。
// 注意：Electron 沙箱 preload 只能 require 内置模块（electron/events/timers/url），
// 不能 require 相对文件 —— 因此通道名在此**内联镜像** ipc-contract.cjs；
// 两者必须逐字一致，由 electron/tests/preload-contract.test.cjs 静态比对强制（防漂移）。
'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// 通道名（与 electron/ipc-contract.cjs 的 CHANNELS 保持一致；改动两处同步 + 跑 npm test）
const CHANNELS = Object.freeze({
  OPEN_FULL: 'pet:open-full',
  HIDE_FULL: 'pet:hide-full',
  QUIT: 'pet:quit',
  CONFIG_OPEN: 'pet:config-open',
  CONFIG_CLOSE: 'pet:config-close',
  GET_MUTED: 'pet:get-muted',
  SET_MUTED: 'pet:set-muted',
  MUTE_EVT: 'pet:mute',
  GET_GAME: 'pet:get-game',
  SET_GAME: 'pet:set-game',
  GAME_EVT: 'pet:game',
  GET_PROFILE: 'pet:profile-get',
  SET_PROFILE: 'pet:profile-set',
  PROFILE_EVT: 'pet:profile',
  GET_AVATAR: 'pet:avatar-get',
  SET_AVATAR: 'pet:avatar-set',
  AVATAR_EVT: 'pet:avatar',
  GET_QUESTS: 'pet:quests-get',
  SET_QUESTS: 'pet:quests-set',
  QUESTS_EVT: 'pet:quests',
  OPEN_TAVERN: 'pet:tavern-open',
  CLOSE_TAVERN: 'pet:tavern-close',
  GET_MENU_FLOAT: 'pet:get-menu-float',
  SET_MENU_FLOAT: 'pet:set-menu-float',
  MENU_FLOAT_EVT: 'pet:menu-float',
  DRAG: 'pet:drag',
  HOTKEY_EVT: 'pet:hotkey'
})

contextBridge.exposeInMainWorld('petAPI', {
  // 呼出 / 隐藏全屏菜单窗口
  openFull: () => ipcRenderer.send(CHANNELS.OPEN_FULL),
  hideFull: () => ipcRenderer.send(CHANNELS.HIDE_FULL),
  // 挂件拖动：开始/结束两个信号（主进程每 16ms 跟鼠标坐标移动，拖动全程无逐帧 IPC）
  dragStart: (offX, offY) =>
    ipcRenderer.send(CHANNELS.DRAG, { on: true, offX: Math.round(offX), offY: Math.round(offY) }),
  dragEnd: () => ipcRenderer.send(CHANNELS.DRAG, { on: false }),
  // 退出程序
  quit: () => ipcRenderer.send(CHANNELS.QUIT),
  // 控制面板（齿轮右键呼出）：呼出 / 收起
  openConfig: () => ipcRenderer.send(CHANNELS.CONFIG_OPEN),
  closeConfig: () => ipcRenderer.send(CHANNELS.CONFIG_CLOSE),
  // 声音开关（主进程持有，两个页面同步）
  getMuted: () => !!ipcRenderer.sendSync(CHANNELS.GET_MUTED),
  setMuted: v => ipcRenderer.send(CHANNELS.SET_MUTED, !!v),
  onMute: cb => ipcRenderer.on(CHANNELS.MUTE_EVT, (_e, v) => cb && cb(!!v)),
  // 游戏模式（主进程持有：全屏游戏前台时自动隐藏齿轮）
  getGame: () => !!ipcRenderer.sendSync(CHANNELS.GET_GAME),
  setGame: v => ipcRenderer.send(CHANNELS.SET_GAME, !!v),
  onGame: cb => ipcRenderer.on(CHANNELS.GAME_EVT, (_e, v) => cb && cb(!!v)),
  // 个人信息（FF14 角色卡：角色名/大区·服务器/职业/等级/称号/信仰/日期/部队；主进程持久化，菜单左信息与编辑器同步）
  getProfile: () => ipcRenderer.sendSync(CHANNELS.GET_PROFILE),
  setProfile: p => ipcRenderer.send(CHANNELS.SET_PROFILE, p || {}),
  onProfile: cb => ipcRenderer.on(CHANNELS.PROFILE_EVT, (_e, p) => cb && cb(p || {})),
  // 角色图标（上传图片 → base64 dataURL，主进程持久化并广播）
  getAvatar: () => ipcRenderer.sendSync(CHANNELS.GET_AVATAR),
  setAvatar: dataUrl => ipcRenderer.send(CHANNELS.SET_AVATAR, typeof dataUrl === 'string' ? dataUrl : ''),
  onAvatar: cb => ipcRenderer.on(CHANNELS.AVATAR_EVT, (_e, v) => cb && cb(v || '')),
  // 任务（任务酒馆：个人任务/其他任务两组；主进程持久化并广播到各页面）
  getQuests: () => ipcRenderer.sendSync(CHANNELS.GET_QUESTS),
  setQuests: q => ipcRenderer.send(CHANNELS.SET_QUESTS, q || {}),
  onQuests: cb => ipcRenderer.on(CHANNELS.QUESTS_EVT, (_e, q) => cb && cb(q || { personal: [], other: [] })),
  // 任务酒馆窗口：打开（可选归属分组）/ 关闭（自绘 × 或 Esc）；主进程→页面：归属分组转发
  openTavern: group => ipcRenderer.send(CHANNELS.OPEN_TAVERN, group ? { group } : {}),
  closeTavern: () => ipcRenderer.send(CHANNELS.CLOSE_TAVERN),
  onTavern: cb => ipcRenderer.on(CHANNELS.OPEN_TAVERN, (_e, p) => cb && cb(p || {})),
  // 菜单浮窗模式（设置开关：全屏盖屏 ↔ 自由拖拽固定尺寸浮窗）
  getMenuFloat: () => !!ipcRenderer.sendSync(CHANNELS.GET_MENU_FLOAT),
  setMenuFloat: v => ipcRenderer.send(CHANNELS.SET_MENU_FLOAT, !!v),
  onMenuFloat: cb => ipcRenderer.on(CHANNELS.MENU_FLOAT_EVT, (_e, v) => cb && cb(!!v)),
  // 主进程 → 页面：全屏菜单打开请求；热键注册结果
  onOpenFull: cb => ipcRenderer.on(CHANNELS.OPEN_FULL, () => cb && cb()),
  onHotkey: cb => ipcRenderer.on(CHANNELS.HOTKEY_EVT, (_e, ok) => cb && cb(ok))
})