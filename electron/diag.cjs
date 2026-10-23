// SAO 菜单桌宠 —— 自诊断（--diag）：启动后自动模拟拖动/点击/游戏模式/全屏显隐注入，
// 配合渲染层 console 埋点，sao-pet-log.txt 会记录卡死的具体步骤。
// 时间轴：13s 拖拽仿真 / 17.5s 点击仿真 / 27s 游戏模式开 / 32s 注入全屏矩形（应隐藏）
//         / 34s 注入桌面小矩形（应恢复显示）/ 36s 游戏模式关（还原状态，不落盘）。
// 注：游戏模式开关改由主进程直调（setMode），不再依赖渲染层 toggleGame（已随旧菜单行移除）。
'use strict'

// 依赖 { log, wm, game, drag }；页面实例（window.__petVM / __menuVM）由渲染层 pet-main.js / menu-main.js 暴露
function createDiag({ log, wm, game, drag }) {
  function petEval(js, tag, delay) {
    setTimeout(() => {
      const petWin = wm.pet()
      if (!petWin || petWin.isDestroyed()) return
      petWin.webContents
        .executeJavaScript(js)
        .then(s => log.info('diag ' + tag + ' -> ' + s))
        .catch(e => log.error('diag ' + tag + ' ERR ' + e))
    }, delay)
  }

  function menuEval(js, tag, delay) {
    setTimeout(() => {
      const menuWin = wm.menu()
      if (!menuWin || menuWin.isDestroyed()) return
      menuWin.webContents
        .executeJavaScript(js)
        .then(s => log.info('diag ' + tag + ' -> ' + s))
        .catch(e => log.error('diag ' + tag + ' ERR ' + e))
    }, delay)
  }

  function runPetDiag() {
    log.info('diag mode on')
    // 菜单页状态探针（5000ms 时菜单应处于不可见/关闭态；8000ms 后手动 close 一次）
    menuEval(
      `(function(){ var vm=window.__menuVM; var app=vm&&vm.$children?vm.$children[0]:null; var m=app&&app.$refs?app.$refs.menu:null; var info=document.querySelector('.info'); var st=info?getComputedStyle(info).display:''; return 'open='+(m&&m.$data?m.$data.visible:'noref')+' infoDisplay='+st+' infoCount='+(info?1:0)+' menuApp='+(document.querySelector('.menu-app')?'y':'n') })()`,
      'menu-state',
      5000
    )
    menuEval(
      `(function(){ var vm=window.__menuVM; var app=vm&&vm.$children?vm.$children[0]:null; var m=app&&app.$refs?app.$refs.menu:null; if(m){ m.close() } return 'close called' })()`,
      'menu-close',
      8000
    )
    setTimeout(() => {
      const menuWin = wm.menu()
      log.info('diag menu-hidden=' + (menuWin && !menuWin.isDestroyed() ? !menuWin.isVisible() : 'gone'))
    }, 11000)
    // 拖动手势仿真（不依赖真实输入，避开 DLP 对注入事件的拦截）：
    // dDown+dMove → 页面发 dragStart → 主进程定时器移动窗口 → 光标静止 1.2s → 自动结束
    petEval(
      `(function(){ var v=window.__petVM; if(!v) return 'nopetVM'; v.dDown({screenX: window.screenX+28, screenY: window.screenY+28}); v.dMove({screenX: window.screenX+60, screenY: window.screenY+60}); return 'drag sim sent' })()`,
      'drag-sim',
      13000
    )
    setTimeout(() => {
      log.info('diag dragState=' + drag.isActive())
    }, 16500)
    // 点击仿真（轻点 = 展开全屏菜单）
    petEval(
      `(function(){ var v=window.__petVM; if(!v) return 'nopetVM'; v.dDown({screenX: window.screenX+28, screenY: window.screenY+28}); v.dUp(); return 'click sim sent' })()`,
      'click-sim',
      17500
    )
    // 点击后：菜单页弹出层应再次可见（toggleMenu 从隐藏→显示）
    menuEval(
      `(function(){ var vm=window.__menuVM; var app=vm&&vm.$children?vm.$children[0]:null; var m=app&&app.$refs?app.$refs.menu:null; return 'open2='+(m&&m.$data?m.$data.visible:'noref') })()`,
      'menu-state2',
      20500
    )
    menuEval(
      `(function(){ var vm=window.__menuVM; var app=vm&&vm.$children?vm.$children[0]:null; var m=app&&app.$refs?app.$refs.menu:null; if(m){ m.close() } return 'close2 called' })()`,
      'menu-close2',
      23000
    )
    // 游戏模式链路：主进程直调 setMode(true) → 起前台探测（日志 game mode ON）
    setTimeout(() => {
      game.setMode(true)
      log.info('diag game-on sent (main-direct)')
    }, 27000)
    // 全屏 → 隐藏链路（注入模拟前台窗口矩形 = 全屏，验证齿轮藏起；不落盘）
    setTimeout(() => {
      game.injectForegroundRect({ l: 0, t: 0, r: 1366, b: 768 })
      game.check()
      const petWin = wm.pet()
      log.info('diag hide-check visible=' + (petWin && !petWin.isDestroyed() ? petWin.isVisible() : 'gone'))
    }, 32000)
    // 切回桌面（注入桌面小矩形）→ 齿轮恢复显示
    setTimeout(() => {
      game.injectForegroundRect({ l: 10, t: 10, r: 210, b: 210 })
      game.check()
      const petWin = wm.pet()
      log.info('diag show-check visible=' + (petWin && !petWin.isDestroyed() ? petWin.isVisible() : 'gone'))
    }, 34000)
    // 还原游戏模式（不落盘到用户设置）
    setTimeout(() => {
      game.setMode(false)
      log.info('diag game-off sent (restored)')
    }, 36000)
  }

  return { runPetDiag }
}

module.exports = { createDiag }