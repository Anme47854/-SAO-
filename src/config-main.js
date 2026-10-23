// SAO 菜单桌宠 —— 控制面板页入口（齿轮右键呼出的透明小卡片，240×168）
// 配置项与菜单/挂件共用同一套 petAPI 通道（getGame/setGame/onGame 等），
// 主进程广播任何来源的变化，各页面自动保持同步。
import Vue from 'vue'
import ConfigApp from './ConfigApp.vue'

// 全局错误收集（排查用，同挂件页）
window.__SAO_ERRORS__ = []
window.addEventListener('error', e => {
  window.__SAO_ERRORS__.push(String(e.message || e))
})
Vue.config.errorHandler = err => {
  window.__SAO_ERRORS__.push(String((err && err.message) || err))
}

new Vue({ render: h => h(ConfigApp) }).$mount('#app')

// Esc 收起面板（主进程 before-input-event 也会兜底一次）
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && window.petAPI && window.petAPI.closeConfig) {
    window.petAPI.closeConfig()
  }
})