import './setup-jquery' // 必须最先执行：建立全局 jQuery（Live2D 的 waifu-tips.js 依赖）
import 'font-awesome/css/font-awesome.min.css' // 本地打包 Font Awesome 4（离线可用）
import Vue from 'vue'
import App from './App.vue'
import { Drag, DragX } from './directives.js'

// 全局状态收集：供页面左下角自诊断面板显示
window.__SAO_UI_STATUS__ = { ok: [], failed: [] }
window.__SAO_UI_ERRORS__ = []
window.addEventListener('error', e => {
  window.__SAO_UI_ERRORS__.push(String(e.message || e))
})
Vue.config.errorHandler = err => {
  window.__SAO_UI_ERRORS__.push(String((err && err.message) || err))
}

// 每个组件一个「字符串字面量」动态导入：vite 能静态分析并正确转换，
// 且单个组件加载/编译失败只跳过它自己，页面其余部分照常可用
const LOADERS = [
  ['sao-alert', () => import('sao-ui-beta/packages/Alert/src/index.vue')],
  ['link-start', () => import('sao-ui-beta/packages/LinkStart/src/index.vue')],
  ['hp', () => import('sao-ui-beta/packages/HP/src/index.vue')],
  ['pop-up-menu', () => import('sao-ui-beta/packages/PopUpMenu/src/index.vue')],
  ['menu-bar', () => import('sao-ui-beta/packages/MenuBar/src/index.vue')],
  ['left-info', () => import('sao-ui-beta/packages/LeftInfo/src/index.vue')],
  ['child-bar', () => import('sao-ui-beta/packages/ChildBar/src/index.vue')],
  ['live2d', () => import('sao-ui-beta/packages/Live2d/src/index.vue')]
]

async function boot() {
  let l2dOk = true
  for (const [name, load] of LOADERS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const mod = await load()
      Vue.component(name, mod.default)
      window.__SAO_UI_STATUS__.ok.push(name)
      console.log('[sao-ui] registered component:', name)
    } catch (err) {
      window.__SAO_UI_STATUS__.failed.push({ name, err: String((err && err.message) || err) })
      console.error('[sao-ui] failed to load component:', name, err)
      if (name === 'live2d') l2dOk = false
    }
  }

  window.__SAO_L2D_OK__ = l2dOk

  // 全局事件总线（菜单组 menu-bar / left-info / child-bar 联动依赖）
  Vue.prototype.$EventBus = new Vue()

  // 拖拽指令（v-drag / v-dragX）
  Vue.directive('drag', Drag)
  Vue.directive('dragX', DragX)
}

boot().finally(() => {
  new Vue({ render: h => h(App) }).$mount('#app')
})