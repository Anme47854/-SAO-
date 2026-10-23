import 'font-awesome/css/font-awesome.min.css'
import Vue from 'vue'
import MenuApp from './MenuApp.vue'
import { Drag, DragX } from './directives.js'

// 桌宠模式：全屏菜单窗口由主进程（全局热键 / 挂件手势）控制显隐，
// 页面内不再自我处理 Alt+A（避免与全局快捷键双触发）
const PET_MODE = new URLSearchParams(location.search).get('pet') === '1'
window.__SAO_PET_MODE__ = PET_MODE

// 桌宠模式辅助：菜单关闭时通知主进程隐藏全屏透明窗口
window.petHideFull = () => {
  if (window.petAPI && window.petAPI.hideFull) window.petAPI.hideFull()
}

// 全局静音钩子：拦截页面一切音频播放（含 SAO 组件内部音效），与挂件页共用主进程开关
window.__sndMuted = false
{
  const origPlay = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    if (window.__sndMuted) {
      try {
        this.pause()
        this.currentTime = 0
      } catch (e) {
        /* 忽略 */
      }
      return Promise.resolve()
    }
    return origPlay.apply(this, arguments)
  }
}

// 全局状态收集：供页面左下角自诊断面板显示
window.__SAO_UI_STATUS__ = { ok: [], failed: [] }
window.__SAO_UI_ERRORS__ = []
window.addEventListener('error', e => {
  window.__SAO_UI_ERRORS__.push(String(e.message || e))
})
Vue.config.errorHandler = err => {
  window.__SAO_UI_ERRORS__.push(String((err && err.message) || err))
}

// 菜单组 4 个组件：字符串字面量动态导入（vite/rollup 可静态分析），逐个守卫，失败只跳过自身
const LOADERS = [
  ['pop-up-menu', () => import('sao-ui-beta/packages/PopUpMenu/src/index.vue')],
  ['menu-bar', () => import('sao-ui-beta/packages/MenuBar/src/index.vue')],
  ['left-info', () => import('sao-ui-beta/packages/LeftInfo/src/index.vue')],
  ['child-bar', () => import('sao-ui-beta/packages/ChildBar/src/index.vue')]
]

async function boot() {
  for (const [name, load] of LOADERS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const mod = await load()
      Vue.component(name, mod.default)
      window.__SAO_UI_STATUS__.ok.push(name)
      console.log('[sao-menu] registered component:', name)
    } catch (err) {
      window.__SAO_UI_STATUS__.failed.push({ name, err: String((err && err.message) || err) })
      console.error('[sao-menu] failed to load component:', name, err)
    }
  }

  // 全局事件总线（menu-bar / left-info / child-bar 联动依赖）
  Vue.prototype.$EventBus = new Vue()

  // 拖拽指令（v-drag / v-dragX）
  Vue.directive('drag', Drag)
  Vue.directive('dragX', DragX)
}

boot().finally(() => {
  window.__menuVM = new Vue({ render: h => h(MenuApp) }).$mount('#app')

  // 桌宠模式：主进程打开菜单窗口时，通知页面重新呼出弹出菜单
  // 注意：openMenu 是子组件 MenuApp 的方法，根实例（render-only）上不存在，
  // 必须通过 vm.$children[0] 调用 —— 之前漏了这层，导致弹出层从未打开（全屏空白窗口=卡死）
  if (PET_MODE && window.petAPI && window.petAPI.onOpenFull) {
    window.petAPI.onOpenFull(() => {
      const vm = window.__menuVM
      const appVm = (vm && vm.$children && vm.$children[0]) || null
      if (appVm && appVm.openMenu) appVm.openMenu()
      // 安全网：弹出层 800ms 内没打开就隐藏窗口，防止透明空窗口挡住桌面（看着像卡死）
      setTimeout(() => {
        const m = appVm && appVm.$refs && appVm.$refs.menu
        if (m && m.$data && !m.$data.visible && window.petHideFull) window.petHideFull()
      }, 800)
    })
  }
})