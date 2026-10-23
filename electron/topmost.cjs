// SAO 菜单桌宠 —— 最顶层钉置顶（仿 BongoCat：原生 SetWindowPos(HWND_TOPMOST) 一次 +
// 状态变化时再钉；本机 EsafeNet Cobra DocGuard 向 Electron 进程注入 Hook64.dll 挂钩了进程内
// user32 调用，Electron alwaysOnTop 不落 EXSTYLE 位，因此由**未注入**的外部 PowerShell 进程执行）。
// 稳健性：boot 后按 1/2/4/8/16s 重试（窗口创建/枚举竞态），此后每 25s 周期自愈重钉一次
// （置顶位可能被安全层或其他置顶窗口群清掉）；同名功能语义与 BongoCat 一致，实现路径不同。
'use strict'

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

// 说明：本机 EsafeNetScreen（安全层，TOPMOST 透明窗）周期性盖住右下角是安全软件行为，
// 应用侧无解（BongoCat 在该环境同样被盖）；事件驱动重钉把恢复时间压到最短。
// 置顶顺序约定：**先钉全屏菜单 → 再钉控制面板 → 再钉任务酒馆 → 最后钉齿轮** ——
// SetWindowPos(HWND_TOPMOST) 按调用顺序叠层，后钉者在上；
// 这样呼出全屏菜单/控制面板/任务酒馆后齿轮仍保持在最前面（用户需求）。
const TOP_PIN_PS1 = [
  // FindWindow 在本机安全环境被挂钩（查不到任何窗口），改用 EnumWindows + 标题比对
  '$sig=\'[DllImport("user32.dll")] public static extern bool EnumWindows(EW cb, IntPtr lp); public delegate bool EW(IntPtr h, IntPtr l); [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);\'',
  'Add-Type -MemberDefinition $sig -Name T -Namespace W',
  '$script:menu=[IntPtr]::Zero; $script:pet=[IntPtr]::Zero; $script:cfg=[IntPtr]::Zero; $script:tavern=[IntPtr]::Zero',
  '$cb={ param($h,$l) if([W.T]::IsWindowVisible($h)){ $sb=New-Object System.Text.StringBuilder 128; [void][W.T]::GetWindowText($h,$sb,128); $t=$sb.ToString(); if($t -eq "SAO Menu"){ $script:menu=$h } elseif($t -eq "SAO \u83dc\u5355\u684c\u5ba0"){ $script:pet=$h } elseif($t -eq "SAO \u914d\u7f6e\u9762\u677f"){ $script:cfg=$h } elseif($t -eq "SAO \u4efb\u52a1\u9152\u9986"){ $script:tavern=$h } }; return $true }',
  'try { [void][W.T]::EnumWindows($cb,[IntPtr]::Zero) } catch { }',
  'try {',
  '  # 仿 BongoCat：SetWindowPos(HWND_TOPMOST, SWP_NOSIZE|SWP_NOMOVE|SWP_NOACTIVATE=0x13)',
  '  # 顺序：全屏菜单 → 控制面板 → 任务酒馆 → 齿轮（后钉者在上 → 齿轮恒最前）',
  '  if($script:menu -ne [IntPtr]::Zero -and [W.T]::IsWindowVisible($script:menu)){ [void][W.T]::SetWindowPos($script:menu,[IntPtr](-1),0,0,0,0,0x13) }',
  '  if($script:cfg -ne [IntPtr]::Zero -and [W.T]::IsWindowVisible($script:cfg)){ [void][W.T]::SetWindowPos($script:cfg,[IntPtr](-1),0,0,0,0,0x13) }',
  '  if($script:tavern -ne [IntPtr]::Zero -and [W.T]::IsWindowVisible($script:tavern)){ [void][W.T]::SetWindowPos($script:tavern,[IntPtr](-1),0,0,0,0,0x13) }',
  '  if($script:pet -ne [IntPtr]::Zero -and [W.T]::IsWindowVisible($script:pet)){ [void][W.T]::SetWindowPos($script:pet,[IntPtr](-1),0,0,0,0,0x13) }',
  '} catch { }'
].join('\n')

// 工厂：依赖 { log, paths }，全部置顶逻辑收拢在本文。
function createTopmost({ log, paths }) {
  let helper = null // 当前 pin 助手进程（一次性，执行完即退）
  let pinQueue = false // 助手进程占用期间的事件合并为一次延迟重钉

  function writeScript() {
    const dir = paths.dataDir()
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'top-pin.ps1')
    // BOM：PS5.1 无 BOM 按 GBK 解码会乱码
    fs.writeFileSync(file, '\ufeff' + TOP_PIN_PS1, 'utf8')
    return file
  }

  // 运行一次「找窗口+钉顶」的独立进程（执行完即退出，无常驻）
  function runPin(reason) {
    try {
      const file = writeScript()
      if (reason) log.info('top pin: ' + reason)
      // 绝对路径：防 PATH 里没有 PowerShell；stdout/stderr 收走供排障（不再全部丢弃）
      const psPath = process.env.SystemRoot
        ? process.env.SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
        : 'powershell.exe'
      helper = spawn(psPath, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      let errTail = ''
      helper.stderr.on('data', d => {
        errTail = (errTail + String(d)).slice(-200)
      })
      helper.on('error', e => {
        log.error('top pin spawn ERR ' + e.message)
        helper = null
        if (pinQueue) {
          pinQueue = false
          runPin('queue')
        }
      })
      helper.on('exit', code => {
        if (errTail && code !== 0) log.error('top pin exit=' + code + ' err=' + errTail.trim())
        helper = null
        if (pinQueue) {
          pinQueue = false
          runPin('queue')
        }
      })
    } catch (e) {
      helper = null
      log.error('top pin ERR ' + e)
    }
  }

  // 事件驱动重钉（BongoCat：状态变化时才再置顶，无常驻轮询）
  function request(reason) {
    if (helper) {
      pinQueue = true
      return
    }
    runPin(reason)
  }

  // 自愈参数：启动重试节奏 + 周期重钉间隔（轻量：一次 FindWindow+SetWindowPos，进程即退）
  const BOOT_RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]
  const TICK_INTERVAL = 25000
  let bootRetry = 0
  let tickTimer = null

  function start() {
    if (helper) return
    runPin('boot') // 创建后钉一次（BongoCat：窗口创建时 SetWindowPos 一次）
    // 启动重试：窗口创建/枚举竞态兜底（找不到窗口时每档延迟重钉）
    bootRetry = 0
    const armBootRetry = () => {
      if (bootRetry >= BOOT_RETRY_DELAYS.length || tickTimer === null) return
      const delay = BOOT_RETRY_DELAYS[bootRetry++]
      setTimeout(() => {
        if (tickTimer === null) return // 已 stop，放弃剩余重试
        request('boot-retry-' + bootRetry)
        armBootRetry()
      }, delay)
    }
    // 周期自愈：置顶位被外部（安全层/其他置顶窗口群）清掉时 25s 内自动恢复
    tickTimer = setInterval(() => request('tick'), TICK_INTERVAL)
    armBootRetry()
  }

  function stop() {
    if (tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    bootRetry = BOOT_RETRY_DELAYS.length // 截断启动重试链
    if (helper) {
      try {
        helper.kill()
      } catch (e) {
        /* 忽略 */
      }
      helper = null
    }
  }

  return { request, start, stop }
}

module.exports = { createTopmost }