// SAO Menu —— 旧版单窗口主进程（演示期遗留，**勿用**）
//
// ⚠️ DEPRECATED：当前唯一真身入口是 electron/index.cjs（package.json "main"）。
// 本文件仅作历史参考保留：它只开一个普通全屏菜单窗口，不含挂件、置顶、游戏模式。
// 需要单窗口调试页面时请用：npm run dev + npm run app:dev（走 index.cjs --dev）。
'use strict'

const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.argv.includes('--dev')
const DEV_URL = 'http://127.0.0.1:5173/menu.html'
const PROD_FILE = path.join(__dirname, '..', 'dist', 'menu.html')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true, // 隐藏默认菜单栏，保持 SAO 沉浸感
    backgroundColor: '#0a1220',
    title: 'SAO Menu',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    // 开发模式：需要先手动运行 `npm run dev`
    win.loadURL(DEV_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else if (fs.existsSync(PROD_FILE)) {
    win.loadFile(PROD_FILE)
  } else {
    dialog.showErrorBox(
      '缺少构建产物',
      '未找到 dist/menu.html。\n请先在项目目录运行：npm run build'
    )
    win.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent('<h2 style="color:#dfe6f2">未构建：请运行 <code>npm run build</code> 后再启动</h2>')
    )
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})