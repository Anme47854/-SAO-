// SAO 菜单桌宠 —— 主进程事件总线（仿 BongoCat runtime 的 typed command/snapshot 精神：
// 模块之间不直接互相调用，只通过具名事件传递；事件名集中声明，禁止字符串拼接协议）
'use strict'

// 事件名常量。语义与 CHANGELOG / AGENTS 中的模块职责一一对应。
const EVENTS = Object.freeze({
  // 音频模块：静音状态变化（payload: boolean）
  AUDIO_MUTED_CHANGED: 'audio:muted-changed',
  // 游戏模式设置变化（payload: boolean；来源：控制面板 / 主进程恢复）
  GAME_MODE_CHANGED: 'settings:game-mode-changed',
  // 个人信息变化（payload: object；来源：菜单「个人信息」编辑器）
  PROFILE_CHANGED: 'settings:profile-changed',
  // 角色图标变化（payload: string base64 dataURL 或 ''；来源：编辑器上传/移除）
  AVATAR_CHANGED: 'settings:avatar-changed',
  // 任务变化（payload: { personal: [], other: [] }；来源：任务酒馆）
  QUESTS_CHANGED: 'settings:quests-changed',
  // 菜单浮窗开关变化（payload: boolean；来源：控制面板；主进程据此即时应用窗口模式）
  MENU_FLOAT_CHANGED: 'settings:menu-float-changed',
  // 窗口模块：挂件页加载完成（主进程据此补发热键状态等启动快照）
  PET_LOADED: 'wm:pet-loaded',
  // 窗口模块：菜单页加载完成（启动自动呼出以此为触发时机）
  MENU_LOADED: 'wm:menu-loaded',
  // 热键模块：Alt+A 触发（payload: 无）
  HOTKEY_MENU: 'hotkeys:menu'
})

// 总线工厂。emit 逐个调监听器并吞掉单个监听器的异常（错误只写日志，不拖垮其他监听器）。
function createBus({ log } = {}) {
  const listeners = new Map()
  const onceSet = new Set()
  // 合法事件 = EVENTS 的值（调用方传的是字符串值，不是常量名）
  const validEvents = new Set(Object.values(EVENTS))

  function on(event, fn) {
    if (!validEvents.has(event)) throw new Error('unknown event: ' + event)
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(fn)
    return () => off(event, fn)
  }

  function once(event, fn) {
    onceSet.add(fn)
    return on(event, fn)
  }

  function off(event, fn) {
    const set = listeners.get(event)
    if (set) set.delete(fn)
    onceSet.delete(fn)
  }

  function emit(event, payload) {
    if (!validEvents.has(event)) throw new Error('unknown event: ' + event)
    const set = listeners.get(event)
    if (!set || set.size === 0) return
    for (const fn of [...set]) {
      try {
        fn(payload)
      } catch (err) {
        if (log && log.error) {
          log.error(
            'bus listener ERR event=' + event + ' ' + (err && err.stack ? err.stack.split('\n')[0] : err)
          )
        }
      }
      if (onceSet.has(fn)) {
        onceSet.delete(fn)
        off(event, fn)
      }
    }
  }

  return { on, once, off, emit, EVENTS }
}

module.exports = { createBus, EVENTS }