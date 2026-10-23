// parallax-js 兼容垫片
// 原因：parallax-js@3.1.0 的 dist/parallax.js 是 UMD 产物（module.exports = Parallax），
// vite 用 esbuild 预构建这类 UMD 文件时识别不出 default 导出，导致
// "The requested module 'parallax.js' does not provide an export named 'default'"。
// 处理：1) 副作用加载真实 UMD（浏览器分支会把 Parallax 挂到 window.Parallax）
//       2) 依次从 default / named / window 全局中取到 Parallax 类，再默认导出
import 'parallax-js/dist/parallax.js'
import * as Raw from 'parallax-js/dist/parallax.js'

const Parallax =
  (Raw && Raw.default) ||
  (Raw && Raw.Parallax) ||
  (typeof window !== 'undefined' && window.Parallax) ||
  (typeof globalThis !== 'undefined' && globalThis.Parallax)

export default Parallax