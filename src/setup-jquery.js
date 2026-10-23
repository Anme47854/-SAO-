// 必须在引入 sao-ui-beta 之前执行：建立 jQuery 全局变量
// （sao-ui-beta 的 Live2D 看板娘组件内部 waifu-tips.js 重度依赖全局 $）
import $ from 'jquery'

window.$ = $
window.jQuery = $
window.jquery = $

export default $