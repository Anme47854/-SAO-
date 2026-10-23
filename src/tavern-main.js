// SAO 菜单桌宠 —— 任务酒馆页入口（菜单任务条目呼出的独立小窗，仿 SAO Utils 2 设置窗口布局）
// 左侧导航：任务大厅（空态占位）/ 个人任务（Excel 样式表格：序号/任务内容/是否完成 + 每行可加号插入）
// 数据走 petAPI 任务通道（getQuests/setQuests/onQuests），主进程持久化并广播到菜单任务栏同步。
import 'font-awesome/css/font-awesome.min.css' // 本地打包 Font Awesome 4（离线可用）
// 必须引入：酒馆页所有 fa 图标（+ − 增删 / 导航 / 关闭）都依赖它——
// 曾缺失导致「操作」列 +/− 图标静默不渲染（用户反馈看不到，图标元素在但字体没定义）
import Vue from 'vue'
import TavernApp from './TavernApp.vue'

// 全局错误收集（排查用，同其他页面）
window.__SAO_ERRORS__ = []
window.addEventListener('error', e => {
  window.__SAO_ERRORS__.push(String(e.message || e))
})
Vue.config.errorHandler = err => {
  window.__SAO_ERRORS__.push(String((err && err.message) || err))
}

new Vue({ render: h => h(TavernApp) }).$mount('#app')