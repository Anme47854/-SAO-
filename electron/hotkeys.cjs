// SAO 菜单桌宠 —— 全局热键（仿 bongocat shortcut/global：集中注册、冲突时自动回退备选
// 组合，注册结果通过事件广播给渲染层；实际动作只发事件，由 index.cjs 接线到功能模块）
'use strict'

const { globalShortcut } = require('electron')
const { EVENTS } = require('./events.cjs')

// 主组合与回退组合；回退只在主组合被占用（返回 false）时尝试
const MENU_ACCEL = { primary: 'Alt+A', fallback: 'CommandOrControl+Shift+A' }

// 工厂：依赖 { log, bus }
function createHotkeys({ log, bus }) {
  let menuOk = false

  function registerPrimary(accel, handler) {
    try {
      return globalShortcut.register(accel, handler)
    } catch (e) {
      return false
    }
  }

  function register() {
    // Alt+A 呼出全屏菜单（如被微信截图等占用则注册备用组合）
    menuOk = registerPrimary(MENU_ACCEL.primary, () => bus.emit(EVENTS.HOTKEY_MENU))
    if (!menuOk) menuOk = registerPrimary(MENU_ACCEL.fallback, () => bus.emit(EVENTS.HOTKEY_MENU))
    log.info('hotkey registered: ' + menuOk)
  }

  function status() {
    return { menu: menuOk }
  }

  function dispose() {
    globalShortcut.unregisterAll()
  }

  return { register, status, dispose }
}

module.exports = { createHotkeys }