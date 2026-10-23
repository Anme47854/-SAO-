// SAO 菜单桌宠 —— 应用入口（仿 bongocat-app main：装配职责单一模块、接线事件总线、
// 生命周期管理；业务逻辑分布在 electron/ 下各模块，本文件只做装配与路由）
'use strict'

const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { app, ipcMain, protocol, net } = require('electron')

const { createLogger } = require('./app-log.cjs')
const paths = require('./paths.cjs')
const { createBus, EVENTS } = require('./events.cjs')
const { createSettings } = require('./settings.cjs')
const { createTopmost } = require('./topmost.cjs')
const { createWindowManager } = require('./window-manager.cjs')
const { createDrag } = require('./drag.cjs')
const { createAudio } = require('./audio.cjs')
const { createGameMode } = require('./game-mode.cjs')
const { createHotkeys } = require('./hotkeys.cjs')
const { createDiag } = require('./diag.cjs')
const { CHANNELS } = require('./ipc-contract.cjs')

// ---- 启动日志（先于一切：程序在哪一步挂掉都会如实记录）----
const log = createLogger({ file: paths.logFile() })
log.info('BOOT start argv=' + JSON.stringify(process.argv.slice(1)))
log.info('execPath=' + process.execPath)

// ---- 便携化 + 环境开关（全部在窗口创建前执行）----
// 便携化：数据目录放在 exe 旁边，不写系统 AppData（规避权限策略/安全软件对未知程序的限制）
paths.setupUserData(app, log)
// 本机安全软件（火绒/DLP 等）对 Electron 沙箱子进程树敏感，常被静默终止；
// 桌宠为本地小工具，关闭沙箱换取稳定性（数据不落地网络）
app.commandLine.appendSwitch('no-sandbox')
// AMD 驱动对透明置顶窗口的 GPU 合成偶发挂起（表现为点击/呼出全屏后整机卡死，
// BongoCat 不卡正是因为渲染路径不同）——强制软件渲染，牺牲一点动画流畅换稳定
app.disableHardwareAcceleration()

process.on('uncaughtException', err => {
  log.error('UNCAUGHT: ' + (err && err.stack ? err.stack : String(err)))
})

const isDev = process.argv.includes('--dev')
const DIAG = process.argv.includes('--diag')
const env = {
  isDev,
  devBase: 'http://127.0.0.1:5173/',
  dist: paths.distDir(),
  preload: paths.preloadFile()
}

// ---- 装配（依赖方向无环：log → paths → bus → settings → topmost → wm → drag/game/...）----
const bus = createBus({ log })
const settings = createSettings({ file: paths.settingsFile(), log })
settings.load()
const topmost = createTopmost({ log, paths })
const wm = createWindowManager({ log, bus, settings, topmost, paths, env })
const drag = createDrag({ log, settings, wm })
const audio = createAudio({ log, bus })
const game = createGameMode({ log, bus, settings, topmost, wm })
const hotkeys = createHotkeys({ log, bus })
const diag = createDiag({ log, wm, game, drag })

// ---- 事件总线 → 窗口广播 / 动作路由（仿 BongoCat snapshot → UI 投影）----
bus.on(EVENTS.AUDIO_MUTED_CHANGED, v => wm.broadcast(CHANNELS.MUTE_EVT, v))
bus.on(EVENTS.GAME_MODE_CHANGED, v => wm.broadcast(CHANNELS.GAME_EVT, v))
bus.on(EVENTS.PROFILE_CHANGED, v => wm.broadcast(CHANNELS.PROFILE_EVT, v))
bus.on(EVENTS.AVATAR_CHANGED, v => wm.broadcast(CHANNELS.AVATAR_EVT, v))
bus.on(EVENTS.QUESTS_CHANGED, v => wm.broadcast(CHANNELS.QUESTS_EVT, v)) // 任务（任务酒馆）广播
bus.on(EVENTS.MENU_FLOAT_CHANGED, v => {
  wm.broadcast(CHANNELS.MENU_FLOAT_EVT, v) // 控制面板开关实时同步
  wm.applyMenuMode() // 菜单开着时即时切换全屏/浮窗模式
})
// 挂件页加载完成：补发热键注册结果（启动阶段热键可能尚未注册，与历史行为一致地如实发送当前值）
bus.on(EVENTS.PET_LOADED, () => wm.broadcast(CHANNELS.HOTKEY_EVT, hotkeys.status().menu))
// 热键 → 动作
bus.on(EVENTS.HOTKEY_MENU, () => wm.toggleMenu())

// ---- IPC 注册（渲染层请求 → 功能模块；通道名唯一来源是 ipc-contract.cjs）----
ipcMain.on(CHANNELS.OPEN_FULL, () => {
  log.info('ipc open-full')
  wm.toggleMenu()
})
ipcMain.on(CHANNELS.HIDE_FULL, () => wm.hideMenu())
ipcMain.on(CHANNELS.QUIT, () => {
  log.info('ipc quit')
  app.quit()
})
ipcMain.on(CHANNELS.GET_MUTED, e => {
  e.returnValue = audio.get()
})
ipcMain.on(CHANNELS.SET_MUTED, (_e, v) => audio.set(v))
ipcMain.on(CHANNELS.GET_GAME, e => {
  e.returnValue = settings.get('game_mode')
})
ipcMain.on(CHANNELS.SET_GAME, (_e, v) => game.setMode(v))
ipcMain.on(CHANNELS.GET_PROFILE, e => {
  e.returnValue = settings.get('profile') // 个人信息（FF14 角色卡）
})
ipcMain.on(CHANNELS.SET_PROFILE, (_e, p) => {
  const profile = settings.set('profile', p)
  bus.emit(EVENTS.PROFILE_CHANGED, profile) // 广播 → 菜单左信息/编辑器实时同步
  log.info('profile saved keys=' + Object.keys(profile).join(',') || 'empty')
})
// ---- 角色头像（八轮 2026-10-22 高清化：渲染层传高清 JPEG dataURL → 主进程写盘
//      sao-pet-data/avatar.jpg（覆盖、原子写）→ settings 只存短文件名 'avatar.jpg'）
//      显示源：getAvatar / avatar 广播统一返回可加载 src（file:// 绝对路径；旧版
//      dataURL 值原样返回兼容显示），渲染层直接喂 <img> 即可 ----
const AVATAR_FILE = 'avatar.jpg'
function avatarSrc() {
  const stored = settings.get('avatar')
  if (!stored) return ''
  if (stored.startsWith('data:')) return stored // 旧版 dataURL 完好性兼容（仅显示）
  return 'pet-avatar://' + stored // 自定义协议（file:// 子资源被 Chromium 拦，见协议注册）
}
function writeAvatarFile(buf) {
  const target = path.join(paths.dataDir(), AVATAR_FILE)
  const tmp = target + '.tmp'
  fs.writeFileSync(tmp, buf)
  fs.renameSync(tmp, target)
}
function removeAvatarFile() {
  try {
    fs.rmSync(path.join(paths.dataDir(), AVATAR_FILE), { force: true })
  } catch {
    /* 文件不存在等，忽略 */
  }
}
ipcMain.on(CHANNELS.GET_AVATAR, e => {
  e.returnValue = avatarSrc() // 角色头像显示源（file:// 路径 / 旧 dataURL / ''）
})
ipcMain.on(CHANNELS.SET_AVATAR, (_e, v) => {
  if (typeof v === 'string' && v.startsWith('data:image/')) {
    const m = /^data:image\/[a-z+.-]+;base64,([\s\S]+)$/.exec(v)
    if (m && m[1]) {
      try {
        const buf = Buffer.from(m[1], 'base64')
        writeAvatarFile(buf)
        settings.set('avatar', AVATAR_FILE)
        bus.emit(EVENTS.AVATAR_CHANGED, avatarSrc()) // 广播 → 左信息/编辑器预览实时同步
        log.info('avatar saved file=' + AVATAR_FILE + ' bytes=' + buf.length)
      } catch (err) {
        log.error('avatar write ERR ' + err.message)
      }
      return
    }
  }
  // 空/非法 → 清空
  removeAvatarFile()
  settings.set('avatar', '')
  bus.emit(EVENTS.AVATAR_CHANGED, '')
  log.info('avatar cleared')
})
ipcMain.on(CHANNELS.GET_QUESTS, e => {
  e.returnValue = settings.get('quests') // 任务（个人任务/其他任务两组）
})
ipcMain.on(CHANNELS.SET_QUESTS, (_e, q) => {
  const quests = settings.set('quests', q)
  bus.emit(EVENTS.QUESTS_CHANGED, quests) // 广播 → 菜单任务栏/酒馆/齿轮同步
  log.info(
    'quests saved personal=' + quests.personal.length + ' other=' + quests.other.length
  )
})
ipcMain.on(CHANNELS.OPEN_TAVERN, (_e, payload) => {
  const group = payload && (payload.group === 'other' ? 'other' : payload.group === 'personal' ? 'personal' : null)
  wm.openTavern(group) // 任务酒馆窗口（独立小窗，仿 SAO Utils 2 设置布局）
})
ipcMain.on(CHANNELS.CLOSE_TAVERN, () => wm.hideTavern())
ipcMain.on(CHANNELS.GET_MENU_FLOAT, e => {
  e.returnValue = settings.get('menu_float') // 菜单浮窗开关（控制面板读取）
})
ipcMain.on(CHANNELS.SET_MENU_FLOAT, (_e, v) => {
  const on = settings.set('menu_float', !!v)
  bus.emit(EVENTS.MENU_FLOAT_CHANGED, on) // 广播 → 控制面板开关同步 + 即时应用窗口模式
  log.info('menu_float set ' + on)
})
ipcMain.on(CHANNELS.DRAG, (_e, s) => drag.setSignal(s))
  // 控制面板（齿轮右键）：呼出 / 收起
  ipcMain.on(CHANNELS.CONFIG_OPEN, () => wm.toggleConfig())
  ipcMain.on(CHANNELS.CONFIG_CLOSE, () => wm.hideConfig())

// 每次启动自动呼出全屏菜单（主效果）：等菜单页加载完成再弹，避免空白窗口吃输入
let autoOpenDone = false
function maybeFirstRun() {
  log.info('auto-open armed (full menu on startup)')
  let tries = 0
  const t = setInterval(() => {
    tries += 1
    if (wm.menuReady() && !autoOpenDone) {
      autoOpenDone = true
      clearInterval(t)
      log.info('auto-open: menu page ready, showing full menu')
      setTimeout(() => wm.toggleMenu(), 300)
    } else if (tries > 60) {
      clearInterval(t)
      log.info('auto-open give up: menu page not ready in 12s')
    }
  }, 200)
}

// ---- 单实例：防止重复启动互相抢热键 ----
// ---- 角色头像协议（八轮 2026-10-22）：Chromium 禁止 file:// 页面加载 file:// 子资源
//      （img naturalWidth=0 实测），注册 pet-avatar:// 自定义协议映射 sao-pet-data 文件 ----
protocol.registerSchemesAsPrivileged([
  // standard 必须：<img>/CSS 等按 http 类资源加载非 standard scheme 会被拒（实测
  // naturalWidth=0）；secure+supportFetchAPI+stream 供 fetch 与流式读取
  { scheme: 'pet-avatar', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

if (!app.requestSingleInstanceLock()) {
  log.info('another instance running, quit')
  app.quit()
} else {
  app.on('second-instance', () => {
    const petWin = wm.pet()
    if (petWin) {
      petWin.show()
      petWin.focus()
      topmost.request('second-instance') // 二次启动唤醒时钉回最顶
    }
  })

  app.on('will-quit', () => {
    game.stop() // 停前台窗口探测 helper
    topmost.stop() // stop 常驻/进行中的 pin 助手
    hotkeys.dispose()
    log.info('quit')
  })

  app.whenReady().then(() => {
    log.info('ready')
    // 头像协议 handler：pet-avatar://<文件名> → sao-pet-data/<文件名>（host 即文件名；
    // basename 校验防目录穿越）
    protocol.handle('pet-avatar', async req => {
      let name = ''
      try {
        name = new URL(req.url).host
      } catch {
        /* 非法 URL */
      }
      if (!name || path.basename(name) !== name) return new Response('', { status: 404 })
      const file = path.join(paths.dataDir(), name)
      if (!fs.existsSync(file)) return new Response('', { status: 404 })
      const resp = await net.fetch(pathToFileURL(file).toString())
      // 显式 image/jpeg：file 协议经 net.fetch 常带 application/octet-stream，
      // <img> 对自定义协议的 MIME 嗅探不可靠（实测解码失败）
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'content-type': 'image/jpeg' }
      })
    })
    wm.createPet()
    wm.createMenu()
    topmost.start() // 创建后钉一次（BongoCat：窗口创建时 SetWindowPos 一次）
    game.applyMode(settings.get('game_mode')) // 恢复上次的游戏模式状态（前台全屏时隐藏齿轮）
    log.info(
      'settings loaded gameMode=' +
        settings.get('game_mode') +
        ' home=' +
        (settings.get('home_x') !== null
          ? settings.get('home_x') + ',' + settings.get('home_y')
          : 'default')
    )

    hotkeys.register()

    // 心跳：每 5 秒记录两个窗口状态（页面/主进程卡死会在这里现形）。
    // 注：不用 webContents.isResponsive —— Electron 31 无此 API；改查窗口存活/可见性。
    setInterval(() => {
      try {
        const petWin = wm.pet()
        const menuWin = wm.menu()
        log.info(
          'hb pet=' +
            (petWin && !petWin.isDestroyed() ? 'alive' : 'gone') +
            ' menu=' +
            (menuWin && !menuWin.isDestroyed()
              ? menuWin.isVisible() ? 'visible' : 'hidden'
              : 'gone')
        )
      } catch (e) {
        log.error('hb ERR ' + (e && e.message ? e.message : e))
      }
    }, 5000)

    if (DIAG) diag.runPetDiag()

    maybeFirstRun()
  })

  app.on('window-all-closed', () => {
    log.info('window-all-closed -> quit')
    app.quit()
  })
}