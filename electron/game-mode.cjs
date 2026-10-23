// SAO 菜单桌宠 —— 游戏模式（仿 BongoCat runtime 的行为编排）：游戏模式开启时，
// 前台是全屏游戏/全屏应用 → 自动隐藏齿轮不挡画面；切回桌面立即恢复显示。
// （原「游戏中显示猫」开关已按用户要求删除，行为固定为"游戏模式 = 全屏游戏时隐藏齿轮"。）
// PowerShell 辅助进程（启动时常驻一个，不逐帧起进程）：每 800ms 上报前台窗口矩形。
// 说明：前台窗口矩形由**外部 PowerShell 进程**读取并管道喂入 —— 本机 DLP 挂钩了进程内
// user32 调用，进程内 GetForegroundWindow/WriteProcessMemory 类探测不可靠（实测）。
'use strict'

const { spawn } = require('child_process')
const { screen } = require('electron')
const { EVENTS } = require('./events.cjs')

const FG_PS1 =
  '$sig=\'[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r); public struct RECT { public int L,T,R,B; };\'' +
  'Add-Type -MemberDefinition $sig -Name FG -Namespace W;' +
  'while($true){ try { $h=[W.FG]::GetForegroundWindow(); if($h -ne [IntPtr]::Zero){ $r=New-Object W.FG+RECT; [void][W.FG]::GetWindowRect($h,[ref]$r); "FG $($r.L),$($r.T),$($r.R),$($r.B)" } else { "FG 0,0,0,0" } } catch { "FG -1,-1,-1,-1" }; Start-Sleep -Milliseconds 800 }'

// 工厂：依赖 { log, bus, settings, topmost, wm }；screen/spawn 为 Electron/Node 直取。
function createGameMode({ log, bus, settings, topmost, wm }) {
  let catHidden = false // 齿轮是否正被"游戏模式（前台全屏）"藏起
  let fgInfo = null // 前台窗口矩形信息（辅助进程每 800ms 喂入）
  let fgHelper = null
  let fgLines = 0

  function startFgHelper() {
    if (fgHelper) return
    try {
      fgHelper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', FG_PS1], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      })
      let buf = ''
      fgHelper.stdout.on('data', d => {
        buf += d.toString()
        let i
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim()
          buf = buf.slice(i + 1)
          if (line.indexOf('FG ') === 0) {
            const p = line.slice(3).split(',')
            if (p.length === 4) {
              fgInfo = { l: +p[0], t: +p[1], r: +p[2], b: +p[3], ts: Date.now() }
              if (fgLines < 3) {
                fgLines += 1
                log.info('fg line' + fgLines + ' rect=' + fgInfo.l + ',' + fgInfo.t + ',' + fgInfo.r + ',' + fgInfo.b)
              }
              check()
            }
          }
        }
      })
      fgHelper.on('error', () => {
        fgHelper = null
      })
      fgHelper.on('exit', () => {
        fgHelper = null
      })
      log.info('fg helper started')
    } catch (e) {
      log.error('fg helper ERR ' + e)
    }
  }

  function stopFgHelper() {
    if (fgHelper) {
      try {
        fgHelper.kill()
      } catch (e) {
        /* 忽略 */
      }
      fgHelper = null
    }
  }

  // 前台窗口是否≈全屏（覆盖所在显示区 ≥99%）且不是咱们自己的窗口
  function fgFullscreen() {
    if (!fgInfo || Date.now() - fgInfo.ts > 4000) return false // 无数据或过期
    const r = fgInfo
    const petWin = wm.pet()
    if (petWin && !petWin.isDestroyed()) {
      const b = petWin.getBounds()
      if (Math.abs(r.l - b.x) <= 4 && Math.abs(r.t - b.y) <= 4) return false
    }
    const menuWin = wm.menu()
    if (menuWin && !menuWin.isDestroyed() && menuWin.isVisible()) {
      const b = menuWin.getBounds()
      if (
        Math.abs(r.l - b.x) <= 4 &&
        Math.abs(r.t - b.y) <= 4 &&
        Math.abs(r.r - (b.x + b.width)) <= 4 &&
        Math.abs(r.b - (b.y + b.height)) <= 4
      )
        return false
    }
    try {
      const d = screen.getDisplayMatching({ x: Math.max(r.l, 0) + 1, y: Math.max(r.t, 0) + 1, width: 1, height: 1 })
      const b = d.bounds
      return r.r - r.l >= b.width * 0.99 && r.b - r.t >= b.height * 0.99
    } catch (e) {
      return false
    }
  }

  // 齿轮显示/隐藏（只在状态真正变化时动作并记录）
  function setCatShown(show) {
    const petWin = wm.pet()
    if (!petWin || petWin.isDestroyed()) return
    if (show && catHidden) {
      petWin.show()
      petWin.setAlwaysOnTop(true)
      catHidden = false
      log.info('cat shown')
      topmost.request('cat-show') // 齿轮重新显示后钉回最顶（BongoCat 事件驱动）
    } else if (!show && !catHidden && petWin.isVisible()) {
      petWin.hide()
      catHidden = true
      log.info('cat hidden (fullscreen app foreground)')
    }
  }

  function check() {
    if (!settings.get('game_mode')) return
    // 固定语义（"游戏中显示猫"已删除）：全屏前台 → 隐藏齿轮，否则显示
    setCatShown(!fgFullscreen())
  }

  // 游戏模式切换：开 → 起前台探测 + 按全屏状态显隐；关 → 停探测 + 恢复显示
  function applyMode(mode) {
    if (mode) {
      startFgHelper()
      setCatShown(!fgFullscreen())
      log.info('game mode ON (hide gear in fullscreen apps)')
    } else {
      stopFgHelper()
      setCatShown(true)
      log.info('game mode OFF')
    }
    topmost.request('game-mode') // 模式切换后钉一次，确保齿轮状态符合新显示状态
  }

  // ---- 以下为外部（IPC / 设置恢复）入口 ----

  function setMode(value) {
    settings.set('game_mode', !!value)
    applyMode(!!value)
    bus.emit(EVENTS.GAME_MODE_CHANGED, !!value)
  }

  // --diag 专用：注入模拟前台矩形（验证全屏→隐藏/切回→显示链路；不落盘）
  function injectForegroundRect(rect) {
    fgInfo = { l: rect.l, t: rect.t, r: rect.r, b: rect.b, ts: Date.now() }
  }

  function stop() {
    stopFgHelper()
  }

  return {
    applyMode,
    setMode,
    injectForegroundRect,
    check,
    stop
  }
}

module.exports = { createGameMode }