// SAO 菜单桌宠 —— 路径（仿 bongocat-storage：便携化数据目录 = exe 旁边，不写系统 AppData，
// 规避权限策略/安全软件对未知程序的限制；全部路径只在这里解析）
'use strict'

const path = require('path')

function appDir() {
  // 打包后 = win-unpacked 目录；dev 模式 = node_modules/electron/dist（与历史行为一致）
  return path.dirname(process.execPath)
}

// 便携数据目录：设置 + 日志 + 生成的 ps1 助手文件都放这里
function dataDir() {
  return path.join(appDir(), 'sao-pet-data')
}

// 主日志文件（与历史行为一致：exe 旁 sao-pet-log.txt）
function logFile() {
  return path.join(appDir(), 'sao-pet-log.txt')
}

// 设置文件（sao-pet-data/settings.json）
function settingsFile() {
  return path.join(dataDir(), 'settings.json')
}

// 供 pet-preload 使用的 preload 绝对路径（index.cjs 构造时调用一次，返回值固定）
function preloadFile() {
  return path.join(__dirname, 'pet-preload.cjs')
}

// 渲染层构建产物目录
function distDir() {
  return path.join(__dirname, '..', 'dist')
}

// Electron userData 也指向便携数据目录（app.setPath 只能由主进程调）
function setupUserData(app, log) {
  try {
    app.setPath('userData', dataDir())
  } catch (e) {
    log.error('setPath userData ERROR: ' + e)
  }
}

module.exports = { appDir, dataDir, logFile, settingsFile, preloadFile, distDir, setupUserData }