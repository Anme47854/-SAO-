import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue2'

export default defineConfig({
  base: './', // 相对路径构建：Electron 以 file:// 加载打包产物时需要
  plugins: [vue()],
  resolve: {
    // 只把「精确的」parallax-js 包名指向本地垫片（$ 表示精确匹配，不影响包内深路径导入）
    alias: {
      'parallax-js$': fileURLToPath(new URL('./src/parallax-shim.js', import.meta.url))
    },
    // sao-ui-beta 的组件 index.js 使用 `import X from './src'` 目录解析到 src/index.vue，
    // 需要把 .vue 加进扩展名列表（vue-cli/webpack 默认支持，vite 需要显式声明）
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  // sao-ui-beta 内含 .vue 源码与相对路径资源（fonts/sounds/live2d），跳过预构建直接按源码处理
  optimizeDeps: {
    exclude: ['sao-ui-beta']
  },
  build: {
    // 多页面：index.html = 完整组件演示页；menu.html = 全屏菜单页；pet.html = 桌宠小挂件页；
    // config.html = 控制面板页（齿轮右键呼出，配置"游戏模式 / 游戏中显示猫"）；
    // tavern.html = 任务酒馆页（菜单任务条目呼出的独立小窗）
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        menu: fileURLToPath(new URL('./menu.html', import.meta.url)),
        pet: fileURLToPath(new URL('./pet.html', import.meta.url)),
        config: fileURLToPath(new URL('./config.html', import.meta.url)),
        tavern: fileURLToPath(new URL('./tavern.html', import.meta.url))
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // 端口被占用时自动 +1 递增，不强制失败（以终端打印的 Local 地址为准）
    open: true // 自动打开浏览器
  }
})