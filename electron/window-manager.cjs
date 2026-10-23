// SAO 菜单桌宠 —— 窗口管理（仿 bongocat-app product_windows / bongocat-overlay：
// 唯一拥有 petWin / menuWin 两个 BrowserWindow 的模块，其他模块只能通过 getter 读取、
// 通过事件总线协作，不直接持有窗口引用）
'use strict'

const fs = require('fs')
const path = require('path')
const { BrowserWindow, screen, dialog } = require('electron')
const { EVENTS } = require('./events.cjs')
const { CHANNELS } = require('./ipc-contract.cjs')

// 竖排布局：窗口永远固定为窄窗（不随面板开关而 resize，避免透明窗口重合成卡顿/位移）
// 挂件：单一齿轮按钮，56×56（44 齿轮 + 6 像素留白）；点击展开全屏菜单，按住可拖动
const PET_W = 56
const PET_H = 56

// 工厂：依赖 { log, bus, settings, topmost, paths, env }
// env = { isDev, devBase, dist, preload }
function createWindowManager({ log, bus, settings, topmost, paths, env }) {
  let petWin = null
  let menuWin = null
  let menuLoaded = false
  let configWin = null
  let tavernWin = null
  let tavernPendingGroup = null // 酒馆窗口未就绪时暂存的归属分组，did-finish-load 后补发
  // 菜单面板形态（2026-10-21 定稿）：窗口**恒为 764×604 固定尺寸**（内容区 760×600
  // 渲染层固定从 (2,2) 开始、四周 2px 透明边带）——金框画在边带内、与内容零重叠
  // （五轮：用户反馈「UI 还是会被挡住」→ 内容/框线彻底分离，框线一个像素都不盖内容；
  // 早期 border 加根元素会压缩内容盒、伪元素覆盖又会压边 2px，均被用户否决）。
  // 设置开关「菜单浮窗」只控制**可拖+金框**：开 = 按住空白处可拖（渲染层 window.moveTo）
  // + 边带金框可见；关 = 锁定在当前位置（无框、不可拖）。位置恒记 menu_float_pos
  // （窗口左上角），首次无位置时 = 齿轮所在屏居中；开关切换不动窗口位置（关=保留当前位置）。
  const MENU_FLOAT_W = 764
  const MENU_FLOAT_H = 604
  // 浮窗位置落盘防抖（ms）：拖动结束或停止移动后 400ms 保存一次
  const MENU_POS_SAVE_MS = 400
  let menuPosTimer = null
  // 控制面板：小卡片窗（齿轮右键呼出；240×216 白底卡片，见 config.html / ConfigApp.vue）
  const CONFIG_W = 240
  const CONFIG_H = 216
  // 任务酒馆：独立小窗（菜单任务条目呼出；仿 SAO Utils 2 设置窗口布局，见 tavern.html / TavernApp.vue）
  const TAVERN_W = 640
  const TAVERN_H = 460
  // 齿轮夺焦时间戳：控制面板失焦但 400ms 内焦点给了齿轮 → 视为右键"切换"，不自动收起
  //（否则"点击面板外收起"会先把面板关掉、随后右键 toggle 又把它打开，出现关不掉的抖动）
  let petFocusedAt = 0

  // 窗口级事件钩子：页面加载成败 / 渲染进程崩溃 / 控制台消息 → 写日志
  function hookWebContents(win, tag) {
    win.webContents.on('did-finish-load', () => {
      log.info(tag + ' did-finish-load url=' + win.webContents.getURL())
    })
    win.webContents.on('did-fail-load', (_e, code, desc, url) => {
      log.error(tag + ' did-fail-load code=' + code + ' desc=' + desc + ' url=' + url)
    })
    win.webContents.on('render-process-gone', (_e, details) => {
      log.error(tag + ' render-process-gone reason=' + details.reason + ' exitCode=' + details.exitCode)
    })
    win.webContents.on('console-message', (_e, level, message, line, source) => {
      log.info(tag + ' <console> [' + level + '] ' + message + ' (' + source + ':' + line + ')')
    })
  }

  function loadPage(win, page, query) {
    const qs = query ? new URLSearchParams(query).toString() : ''
    if (env.isDev) {
      win.loadURL(env.devBase + page + (qs ? '?' + qs : ''))
      win.webContents.openDevTools({ mode: 'detach' })
    } else if (fs.existsSync(path.join(env.dist, page))) {
      win.loadFile(path.join(env.dist, page), qs ? { query } : undefined)
    } else {
      throw new Error('dist/' + page + ' missing')
    }
  }

  // ---- 小挂件窗口：透明 · 无边框 · 置顶 · 不占任务栏 ----
  function createPet() {
    log.info('createPet start')
    petWin = new BrowserWindow({
      width: PET_W,
      height: PET_H,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      // 注意：不可设 focusable:false —— Windows 上 NOACTIVATE 窗口会吞掉全部鼠标输入（实测齿轮点不动）！
      hasShadow: false,
      backgroundColor: '#00000000',
      title: 'SAO 菜单桌宠',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: env.preload
      }
    })
    petWin.on('show', () => {})
    petWin.on('focus', () => {
      petFocusedAt = Date.now()
    })

    const wa = screen.getPrimaryDisplay().workArea
    const homeX = settings.get('home_x')
    const homeY = settings.get('home_y')
    if (homeX !== null && homeY !== null) {
      petWin.setPosition(homeX, homeY)
      log.info('createPet homePos x=' + homeX + ' y=' + homeY)
    } else {
      // 默认右下角；注意：与历史行为一致 —— 默认位置只在用户拖动后落盘（drag 模块负责）
      const x = wa.x + wa.width - PET_W - 24
      const y = wa.y + wa.height - PET_H - 24
      petWin.setPosition(x, y)
      log.info('createPet positioned x=' + x + ' y=' + y)
    }

    try {
      loadPage(petWin, 'pet.html')
    } catch (e) {
      log.error('createPet ERROR: dist/pet.html missing')
      dialog.showErrorBox('缺少构建产物', '未找到 dist/pet.html。\n请先在项目目录运行：npm run build')
    }

    hookWebContents(petWin, 'pet')

    petWin.webContents.on('did-finish-load', () => {
      bus.emit(EVENTS.PET_LOADED)
    })

    petWin.on('closed', () => {
      petWin = null
    })
    log.info('createPet done')
  }

  // ---- 菜单窗口：透明 · 恒为 760×600 固定尺寸面板（开关「菜单浮窗」只控制可拖+金框） ----
  function createMenu() {
    log.info('createMenu start')
    const d = gearDisplay()
    const initial = floatBoundsFor(d)
    log.info('createMenu initial=' + JSON.stringify(initial))
    menuWin = new BrowserWindow({
      x: initial.x,
      y: initial.y,
      width: initial.width,
      height: initial.height,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: true,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: env.preload
      }
    })
    log.info('createMenu BrowserWindow constructed')

    if (process.platform === 'darwin') {
      menuWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    }

    // 拖动结束后落盘保存面板位置（防抖；面板恒为统一形态，任何移动都记录）
    menuWin.on('move', onMenuMoved)

    try {
      loadPage(menuWin, 'menu.html', { pet: '1' })
    } catch (e) {
      log.error('createMenu ERROR: dist/menu.html missing')
      dialog.showErrorBox('缺少构建产物', '未找到 dist/menu.html。\n请先在项目目录运行：npm run build')
    }

    hookWebContents(menuWin, 'menu')
    // 菜单页加载完成标记：启动自动呼出的触发时机（避免窗口先显示而页面未就绪=空白窗）
    menuWin.webContents.on('did-finish-load', () => {
      menuLoaded = true
      bus.emit(EVENTS.MENU_LOADED)
    })

    menuWin.on('closed', () => {
      menuWin = null
    })
    log.info('createMenu done bounds=' + JSON.stringify(menuWin.getBounds()))
  }

  function toggleMenu() {
    if (!menuWin) return
    if (menuWin.isVisible()) {
      menuWin.hide()
      log.info('menu hid')
      topmost.request('menu-hid') // 菜单关闭后即刻把齿轮钉回最顶（BongoCat 事件驱动）
    } else {
      try {
        // 每次显示前按当前设置应用窗口模式：全屏盖齿轮所在屏 / 浮窗固定尺寸位置
        applyMenuMode()
        menuWin.webContents.send(CHANNELS.OPEN_FULL)
        menuWin.show()
        menuWin.focus()
        log.info('menu shown')
        topmost.request('menu-show') // 菜单全屏弹出，钉菜单+齿轮到最顶
      } catch (e) {
        log.error('menu show ERROR: ' + e)
      }
    }
  }

  // ---- 菜单窗口模式（全屏盖屏 ↔ 浮窗自由拖拽） ----
  // 齿轮当前所在显示器（菜单全屏模式的覆盖目标、浮窗默认位置的锚点）
  function gearDisplay() {
    return screen.getDisplayMatching(
      petWin && !petWin.isDestroyed() ? petWin.getBounds() : screen.getPrimaryDisplay().bounds
    )
  }

  // 浮窗模式的窗口 bounds：有保存位置且仍在某屏范围内 → 用之；否则齿轮所在屏居中
  function floatBoundsFor(display) {
    const fallback = {
      x: Math.round(display.workArea.x + (display.workArea.width - MENU_FLOAT_W) / 2),
      y: Math.round(display.workArea.y + (display.workArea.height - MENU_FLOAT_H) / 2),
      width: MENU_FLOAT_W,
      height: MENU_FLOAT_H
    }
    try {
      const pos = settings && settings.get ? settings.get('menu_float_pos') : null
      if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return fallback
      // 拔屏/改分辨率后旧位置可能落到显示器外：离所有屏太远就回退居中
      // 注意：getDisplayMatching 参数必须是完整矩形（{x,y,width,height}），
      // 只传 {x,y} 坐标点会抛 "conversion failure"（实测踩坑）
      const near = screen.getDisplayMatching({
        x: pos.x,
        y: pos.y,
        width: MENU_FLOAT_W,
        height: MENU_FLOAT_H
      }).workArea
      if (
        pos.x < near.x - MENU_FLOAT_W ||
        pos.x > near.x + near.width ||
        pos.y < near.y - MENU_FLOAT_H ||
        pos.y > near.y + near.height
      ) {
        return fallback
      }
      return { x: Math.round(pos.x), y: Math.round(pos.y), width: MENU_FLOAT_W, height: MENU_FLOAT_H }
    } catch (e) {
      log.error('floatBoundsFor ERR ' + (e && e.stack ? e.stack.split('\n')[0] : e))
      return fallback
    }
  }

  // 显示前把面板窗口对齐到保存位置 / 齿轮所在屏居中（面板恒为 760×600，
  // 开关切换不动窗口位置：关闭=保留当前位置是用户诉求）
  function applyMenuMode() {
    if (!menuWin || menuWin.isDestroyed()) return
    const target = floatBoundsFor(gearDisplay())
    const b = menuWin.getBounds()
    if (
      b.x !== target.x ||
      b.y !== target.y ||
      b.width !== target.width ||
      b.height !== target.height
    ) {
      menuWin.setBounds(target)
      log.info('menu bounds aligned ' + JSON.stringify(target))
    }
  }

  // 窗口被拖动（仅「菜单浮窗」开时渲染层允许拖）→ 防抖落盘保存位置
  function onMenuMoved() {
    if (!menuWin || menuWin.isDestroyed()) return
    clearTimeout(menuPosTimer)
    menuPosTimer = setTimeout(() => {
      menuPosTimer = null
      if (!menuWin || menuWin.isDestroyed()) return
      const b = menuWin.getBounds()
      try {
        settings.set('menu_float_pos', { x: Math.round(b.x), y: Math.round(b.y) })
        log.info('menu_float_pos saved ' + JSON.stringify(settings.get('menu_float_pos')))
      } catch (e) {
        log.error('menu_float_pos save ERR ' + e)
      }
    }, MENU_POS_SAVE_MS)
  }

  function hideMenu() {
    if (menuWin && menuWin.isVisible()) menuWin.hide()
    log.info('ipc hide-full')
  }

  // ---- 控制面板窗口：齿轮右键呼出（透明小卡片，复用 petAPI 设置通道双向同步）----
  function createConfig() {
    log.info('createConfig start')
    configWin = new BrowserWindow({
      width: CONFIG_W,
      height: CONFIG_H,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      backgroundColor: '#00000000',
      title: 'SAO 配置面板',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: env.preload
      }
    })
    try {
      loadPage(configWin, 'config.html')
    } catch (e) {
      log.error('createConfig ERROR: dist/config.html missing')
    }
    hookWebContents(configWin, 'config')
    // 失焦（点击面板外任意处）/ Esc → 收起；齿轮夺焦（右键切换）例外
    configWin.on('focus', () => {
      log.info('config focus (petFocusedAt age=' + (Date.now() - petFocusedAt) + 'ms)')
    })
    configWin.on('blur', () => {
      const age = Date.now() - petFocusedAt
      if (configWin && !configWin.isDestroyed() && configWin.isVisible()) {
        if (age < 400) return
        configWin.hide()
        log.info('config hid (blur, petFocusAge=' + age + 'ms)')
      } else {
        log.info('config blur ignored (hidden)')
      }
    })
    configWin.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        if (configWin && !configWin.isDestroyed() && configWin.isVisible()) configWin.hide()
      }
    })
    configWin.on('closed', () => {
      configWin = null
    })
    log.info('createConfig done')
  }

  // 右键齿轮开关；位置跟随齿轮（默认右下，放不下翻到上方），始终在齿轮所在屏内
  function toggleConfig() {
    if (!configWin || configWin.isDestroyed()) createConfig()
    if (!configWin) return
    if (configWin.isVisible()) {
      configWin.hide()
      log.info('config hid (toggle)')
      return
    }
    const pb = petWin && !petWin.isDestroyed() ? petWin.getBounds() : screen.getPrimaryDisplay().workArea
    const wa = screen.getDisplayMatching(pb).workArea
    let x = pb.x + 8
    let y = pb.y + PET_H + 8
    if (y + CONFIG_H > wa.y + wa.height) y = pb.y - CONFIG_H - 8
    if (x + CONFIG_W > wa.x + wa.width) x = wa.x + wa.width - CONFIG_W - 8
    configWin.setPosition(Math.round(Math.max(x, wa.x)), Math.round(Math.max(y, wa.y)))
    configWin.show()
    configWin.focus()
    log.info('config shown')
    topmost.request('config-show') // 钉序：全屏菜单 → 控制面板 → 齿轮（齿轮最顶）
  }

  function hideConfig() {
    if (configWin && !configWin.isDestroyed() && configWin.isVisible()) {
      configWin.hide()
      log.info('config hid (ipc)')
    }
  }

  // ---- 任务酒馆窗口：菜单任务条目呼出（独立小窗，仿 SAO Utils 2 设置窗口；640×460 固定）----
  // 与 config 不同：酒馆是"工作窗口"，失焦不自动收起，只有 Esc / 自绘 × 关闭
  function createTavern() {
    log.info('createTavern start')
    tavernWin = new BrowserWindow({
      width: TAVERN_W,
      height: TAVERN_H,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      backgroundColor: '#00000000',
      title: 'SAO 任务酒馆',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: env.preload
      }
    })
    try {
      loadPage(tavernWin, 'tavern.html')
    } catch (e) {
      log.error('createTavern ERROR: dist/tavern.html missing')
    }
    hookWebContents(tavernWin, 'tavern')
    tavernWin.webContents.on('did-finish-load', () => {
      // 打开请求早于页面就绪时，补发归属分组（其余状态由 tavern 页自己 getQuests 拉取）
      if (tavernPendingGroup) {
        tavernWin.webContents.send(CHANNELS.OPEN_TAVERN, { group: tavernPendingGroup })
        tavernPendingGroup = null
      }
    })
    // 注：Esc 关闭交给渲染层处理（编辑任务时 Esc 先取消编辑；非编辑态再由页面调 closeTavern）
    tavernWin.on('closed', () => {
      tavernWin = null
    })
    log.info('createTavern done')
  }

  // 打开任务酒馆（可选归属分组 personal/other，用于任务栏下级框点条目直达对应分类）
  function openTavern(group) {
    if (!tavernWin || tavernWin.isDestroyed()) {
      tavernPendingGroup = group
      createTavern()
      if (!tavernWin) return
    }
    const pb = petWin && !petWin.isDestroyed() ? petWin.getBounds() : screen.getPrimaryDisplay().workArea
    const wa = screen.getDisplayMatching(pb).workArea
    const x = Math.round(wa.x + (wa.width - TAVERN_W) / 2)
    const y = Math.round(wa.y + (wa.height - TAVERN_H) / 2)
    tavernWin.setPosition(Math.max(x, wa.x), Math.max(y, wa.y))
    tavernWin.show()
    tavernWin.focus()
    if (group) {
      try {
        tavernWin.webContents.send(CHANNELS.OPEN_TAVERN, { group })
      } catch (e) {
        log.error('tavern group send ERROR: ' + e)
      }
    }
    log.info('tavern shown group=' + (group || 'default'))
    topmost.request('tavern-show') // 钉序：全屏菜单 → 控制面板 → 任务酒馆 → 齿轮（齿轮最顶）
  }

  function hideTavern() {
    if (tavernWin && !tavernWin.isDestroyed() && tavernWin.isVisible()) {
      tavernWin.hide()
      log.info('tavern hid (ipc)')
    }
  }

  // 主进程 → 渲染层广播（全部窗口都发；窗口未就绪自动跳过）
  function broadcast(channel, payload) {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send(channel, payload)
    if (menuWin && !menuWin.isDestroyed()) menuWin.webContents.send(channel, payload)
    if (configWin && !configWin.isDestroyed()) configWin.webContents.send(channel, payload)
    if (tavernWin && !tavernWin.isDestroyed()) tavernWin.webContents.send(channel, payload)
  }

  return {
    createPet,
    createMenu,
    toggleMenu,
    hideMenu,
    applyMenuMode, // 设置开关切换时即时应用全屏/浮窗模式（index 事件路由调用）
    toggleConfig,
    hideConfig,
    openTavern,
    hideTavern,
    broadcast,
    pet: () => petWin,
    menu: () => menuWin,
    config: () => configWin,
    tavern: () => tavernWin,
    menuReady: () => menuLoaded
  }
}

module.exports = { createWindowManager, PET_W, PET_H }