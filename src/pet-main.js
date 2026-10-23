// SAO 菜单桌宠 —— 小挂件页入口
import 'font-awesome/css/font-awesome.min.css'
import Vue from 'vue'
import PetApp from './PetApp.vue'
import saoFontUrl from 'sao-ui-beta/lib/fonts/SAOUI.ttf'

// 全局错误收集（排查用）
window.__SAO_ERRORS__ = []
window.addEventListener('error', e => {
  window.__SAO_ERRORS__.push(String(e.message || e))
})
Vue.config.errorHandler = err => {
  window.__SAO_ERRORS__.push(String((err && err.message) || err))
}

// SAO UI 标题字体（SAOUI.ttf）
const style = document.createElement('style')
style.textContent = `@font-face{font-family:'SAOUI';src:url("${saoFontUrl}") format('truetype');}`
document.head.appendChild(style)

new Vue({ render: h => h(PetApp) }).$mount('#app')

// 诊断：暴露根实例（主进程 diag 可用 executeJavaScript 驱动拖动/点击链路仿真）
// 注意：.pet 元素上的 __vue__ 是根 Vue 实例，组件（含 dDown/dMove/dUp/openMenu）在 $children[0]
setTimeout(() => {
  const el = document.querySelector('.pet')
  const root = el && el.__vue__
  const vm = root && root.$children && root.$children[0]
  window.__petVM = vm && typeof vm.dDown === 'function' ? vm : root
  console.log('[pet] petVM=' + (window.__petVM ? 'ok' : 'none'))
}, 50)