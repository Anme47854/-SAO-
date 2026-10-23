// SAO 菜单桌宠 —— 声音开关（仿 bongocat-audio：主进程持有单一状态，挂件页与全屏菜单页
// 共用并同步；状态变化通过事件总线广播，由 index.cjs 转发到两个窗口）
'use strict'

const { EVENTS } = require('./events.cjs')

// 工厂：依赖 { log, bus }
function createAudio({ log, bus }) {
  let muted = false

  function get() {
    return muted
  }

  function set(value) {
    muted = !!value
    log.info('muted=' + muted)
    bus.emit(EVENTS.AUDIO_MUTED_CHANGED, muted)
  }

  return { get, set }
}

module.exports = { createAudio }