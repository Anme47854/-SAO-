// SAO 菜单桌宠 —— 挂件拖动状态机（渲染层只发开始/结束两条信号，主进程每 16ms
// 直接读系统鼠标坐标移动窗口；鼠标静止 1.2s 自动结束，兜底"松手事件丢失"的边界情况）
// 跨屏说明：钳位参照「光标所在显示器」（getDisplayNearestPoint），光标进入第二块屏时
// 齿轮跟随进入；若按旧逻辑取「齿轮当前所在屏」的 workArea，齿轮会被压在自己的屏幕边缘
// 永远过不去（无法拖到其他屏幕）。
'use strict'

const { screen } = require('electron')

// 工厂：依赖 { log, settings, wm }
function createDrag({ log, settings, wm }) {
  let dragState = null
  let dragTimer = null
  let dragLastPt = null
  let dragLastMoveAt = 0
  let dragErrAt = 0

  function saveHomeFromBounds() {
    const petWin = wm.pet()
    if (petWin && !petWin.isDestroyed()) {
      const b = petWin.getBounds()
      // 拖动结束 = 齿轮新家位置（游戏模式归位点）；一次 assign 只落盘一次
      settings.assign({ home_x: b.x, home_y: b.y })
      return { x: b.x, y: b.y }
    }
    return null
  }

  function stopDrag(auto) {
    const wasActive = !!dragTimer
    if (dragTimer) {
      clearInterval(dragTimer)
      dragTimer = null
    }
    dragState = null
    dragLastPt = null
    if (wasActive) {
      const home = saveHomeFromBounds()
      log.info(
        'drag ' + (auto ? 'auto-end' : 'end') + ' wasActive=true home=' + (home ? home.x + ',' + home.y : 'gone')
      )
    }
  }

  function tickDrag() {
    if (!dragState) return
    const petWin = wm.pet()
    if (!petWin || petWin.isDestroyed()) return
    try {
      const pt = screen.getCursorScreenPoint()
      if (dragLastPt && pt.x === dragLastPt.x && pt.y === dragLastPt.y) {
        if (Date.now() - dragLastMoveAt > 1200) return stopDrag(true)
      } else {
        dragLastPt = pt
        dragLastMoveAt = Date.now()
      }
      const b = petWin.getBounds()
      // 跨屏拖动的关键：以光标所在显示器为钳位参照（而非齿轮所在屏），负坐标/多屏拼接由系统处理
      const wa = screen.getDisplayNearestPoint(pt).workArea
      const x = Math.round(Math.min(Math.max(pt.x - dragState.offX, wa.x), wa.x + wa.width - b.width))
      const y = Math.round(Math.min(Math.max(pt.y - dragState.offY, wa.y), wa.y + wa.height - b.height))
      petWin.setPosition(x, y)
    } catch (err) {
      const now = Date.now()
      if (now - dragErrAt > 2000) {
        dragErrAt = now
        log.error('drag tick ERR ' + (err && err.stack ? err.stack.split('\n')[0] : err))
      }
    }
  }

  // 渲染层信号入口：{ on: true, offX, offY } = 开始；{ on: false } = 结束
  function setSignal(s) {
    if (s && s.on) {
      dragState = { offX: s.offX || 0, offY: s.offY || 0 }
      dragLastPt = null
      dragLastMoveAt = 0
      if (!dragTimer) dragTimer = setInterval(tickDrag, 16)
      log.info('drag start off=' + dragState.offX + ',' + dragState.offY)
    } else {
      stopDrag(false)
    }
  }

  // 供 --diag 读取拖动状态（历史日志字段 dragState=active/idle-or-ended）
  function isActive() {
    return dragTimer ? 'active' : 'idle-or-ended'
  }

  return { setSignal, isActive, stopDrag }
}

module.exports = { createDrag }