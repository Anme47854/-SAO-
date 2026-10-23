# SAO-UIMenu-Pet 交接文档（接手者版）

> 面向**人类接手者**的一站式交接文档。写于 2026-10-23，覆盖仓库当期全部功能与已知事项。
> 若你是 AI/编码代理，请先读 [AGENTS.md](AGENTS.md)（工作约定）与 [交接文档.md](交接文档.md)（环境特殊性 + 验证流水账）。

**项目一句话**：Windows 桌面 SAO（刀剑神域）风格菜单桌宠——一个常驻所有窗口最前端的透明齿轮，轻点呼出全屏 SAO 菜单、右键呼出配置面板，另配任务酒馆子窗口；Electron 31 + Vue 2.7，架构参照 [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)。

其他归档文档：[README.zh-CN.md](README.zh-CN.md)（中文简介）/ [README.md](README.md)（English）/ [按钮交接文档.md](按钮交接文档.md)（每个菜单按钮的行为）/ [CHANGELOG](CHANGELOG.zh-CN.md)

---

## 1. 当前功能一览

| 功能 | 说明 |
| --- | --- |
| 齿轮桌宠常驻最顶 | 外部 PowerShell 真调 `SetWindowPos(HWND_TOPMOST)`（事件驱动重钉，无常驻轮询）——本机 DLP/安全软件会挂钩进程内 user32 调用，故必须走外部进程 |
| 全屏 SAO 菜单 | 轻点齿轮或 `Alt+A`（被占用回退 `Ctrl+Shift+A`）呼出全屏菜单（sao-ui-beta 1.2.21 皮肤，Vue 重写交互） |
| 游戏模式 | 前台全屏应用检测 → 全屏时自动隐藏齿轮，回桌面恢复；开关在「控制面板」 |
| 控制面板 | 齿轮右键：游戏模式开关、菜单浮窗开关（可拖+金框 / 锁定当前位置） |
| 任务酒馆 | 菜单「任务」条目呼出的独立小窗（640×460）：日常/周常/其他任务列表 + 增减与完成状态 |
| FF14 个人信息 | 菜单「用户 → 个人信息」编辑器：角色名/大区/服务器/职业/等级/称号/部队，保存后左卡实时刷新 |
| **头像高清（八轮）** | 头像用 canvas 裁方 → ≤2048px JPEG 落盘 `sao-pet-data/avatar.jpg`，通过自定义协议 `pet-avatar://` 显示 |
| **道具商店 / 交易行提示框（九~十三轮）** | 点「道具商店」「交易行」弹出「暂未开放」提示框——**SAO Utils 2 推出确认框同款**（原版素材 + 原版 QML 参数，见 §5） |
| 设置持久化 | `sao-pet-data/settings.json`，`schema_version:1` + snake_case；旧 camelCase 自动迁移留备份 |
| 自诊断 | `npm run app -- --diag` 模拟拖动/点击/游戏模式全链路并写入 `sao-pet-log.txt` |

## 2. 目录结构（当前真实结构）

```
├── package.json              # scripts：dev/build/app/app:dev/check/test/dist:win/dist:zip
├── vite.config.js
├── index.html / menu.html / pet.html / config.html / tavern.html   # 四个渲染页入口
├── src/
│   ├── MenuApp.vue           # 菜单面板（760×600 内容区）——本轮迭代最多的文件
│   ├── PetApp.vue            # 齿轮桌宠（56×56，透明置顶）
│   ├── ConfigApp.vue         # 控制面板（240×216）
│   ├── TavernApp.vue         # 任务酒馆（640×460）
│   └── pet-menu-data.js / pet-main.js / menu-main.js / config-main.js / tavern-main.js / main.js / directives.js / setup-jquery.js / parallax-shim.js
├── electron/                 # 主进程（全部 .cjs，通道/事件/设置见 §5）
│   ├── index.cjs             # 入口：装配、事件路由、生命周期、IPC 注册
│   ├── window-manager.cjs    # 四窗口唯一 owner（pet/menu/config/tavern）
│   ├── topmost.cjs           # 外部 SetWindowPos 置顶（一次性 + 事件驱动）
│   ├── game-mode.cjs         # 前台全屏检测、齿轮显隐
│   ├── hotkeys.cjs           # 全局热键注册/冲突回退
│   ├── settings.cjs          # 配置存储（原子写、v0 迁移）
│   ├── paths.cjs / app-log.cjs / audio.cjs / drag.cjs / diag.cjs
│   ├── ipc-contract.cjs      # 通道名+载荷契约唯一来源
│   ├── events.cjs            # 主进程类型化事件总线
│   ├── pet-preload.cjs       # contextBridge（window.petAPI；沙箱 preload 内联镜像契约）
│   ├── main.cjs              # 遗留旧入口（勿用）
│   └── tests/                # node --test 单元测试（settings/ipc-contract/events/preload 一致性）
├── public/
│   ├── sao/                  # SAO Utils 2 原版素材：dialog.png(350×253)、ok.png/cancel.png(40×40，含 -hovered)
│   └── waifu-tips.json
├── scripts/check-main.cjs    # `npm run check`：electron/*.cjs 语法检查
├── *.bat                     # 启动演示 / 打包EXE / 诊断 的便捷双击脚本
├── .verify-z.ps1             # 置顶/z 序验证脚本
└── 文档：AGENTS.md / 交接文档.md / 按钮交接文档.md / CHANGELOG(.zh-CN|.md) / README*
```

## 3. 快速开始 / 构建 / 部署

```powershell
# 1) 清除被污染的环境变量（本机历史原因，见 §7）：
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

# 2) 开发
npm install        # 首次（按 package-lock.json）
npm run dev        # 终端1：vite dev server  http://127.0.0.1:5173
npm run app:dev    # 终端2：Electron + DevTools

# 3) 验证
npm run check      # electron/*.cjs 语法检查（19 文件）
npm test           # node --test 单元测试（settings 迁移/恢复、IPC 契约、preload 通道一致性）

# 4) 构建与打包
npm run build      # vite build → dist/
npm run dist:win   # electron-builder → release/win-unpacked（+ portable exe）
```

**部署**：把 `release/win-unpacked/` 整个拷到目标目录（本机为
`C:\Users\YWB\AppData\Local\Programs\SAO-PET`），**保留 `sao-pet-data/` 不动**（设置与头像都在里面）。
本机 `dist:win` 的 portable 阶段被安全软件拦截（`AppData\Local\electron-builder` mkdir 拒绝）是**已知无害**——packaging/asar 已成功，用 win-unpacked 即可。

## 4. 验证手段

- 常规：`npm run check` → `npm test` → `npm run build` 全绿后再打包。
- 置顶验证：`.verify-z.ps1`（受信 PowerShell 进程执行）枚举四窗口 TOPMOST 位。
- **CDP 运行时验证（本机常用）**：以 `--remote-debugging-port=9333` 启动部署版 → 连 `http://127.0.0.1:9333/json` 拿 pet/menu 目标 → WebSocket 走 `Runtime.evaluate` + `Input.dispatchMouseEvent` 模拟点击，验证弹窗几何/文本/关闭路径。探针脚本放 `%TEMP%\probe-*.js`，用完即删。
- 构建后必须核对 `dist/` 产物时间戳与 `public/sao/` 素材是否进包（曾有 vite 把相对路径 `src="sao/..."` 当模块解析导致 **构建静默失败但旧产物被部署** 的教训：public 资源引用必须写 `/sao/...` 根路径）。

## 5. 关键实现纪要（防重踩坑）

### 5.1 四窗口与置顶顺序

| 窗口 | 尺寸 | 说明 |
| --- | --- | --- |
| pet（齿轮） | 56×56 | 透明置顶；**必须永远在最前** |
| menu（菜单） | 764×604 | 恒为面板；内容区 760×600 内嵌 (2,2) 2px 透明边带；「菜单浮窗」开关只控制可拖+金框 vs 锁定 |
| config（控制面板） | 240×216 | 齿轮右键呼出 |
| tavern（任务酒馆） | 640×460 | 菜单任务条目呼出 |

置顶顺序约定（`topmost.cjs` 固定）：先全屏菜单 → 再控制面板 → 再任务酒馆 → **后齿轮**（后钉者在最前）。

### 5.2 契约纪律（改通道/事件/设置键的三条铁律）

- 通道名只准在 `electron/ipc-contract.cjs` 改，且 **必须同步 `electron/pet-preload.cjs` 内联镜像**（沙箱 preload 不能 require 相对文件）；一致性由 `electron/tests/preload-contract.test.cjs` 静态比对强制。
- 事件名只准在 `electron/events.cjs` 加；设置键只准在 `electron/settings.cjs` 加。
- 设置写入必须原子（同目录临时文件 + rename）；`schema_version` 非 1 明确拒绝。

### 5.3 头像链路（八轮）

canvas 裁方 → `min(2048, 原图 min 边)` JPEG q0.92 dataURL → `pet:avatar-set` → 主进程原子写盘
`sao-pet-data/avatar.jpg` → settings.avatar 只存短文件名（≤200 字符，旧 dataURL 兼容）→ 广播
`pet-avatar://` URL。协议需 `registerSchemesAsPrivileged(standard:true)`（ready 前）+
`protocol.handle`（whenReady 内：host=文件名、basename 防穿越、显式 image/jpeg）。

### 5.4 「道具商店/交易行」提示框（九~十三轮，效果同 SAO Utils 2 推出确认框）

- **素材**：`public/sao/dialog.png`（350×253 面板原图）、`ok.png`/`cancel.png`（40×40 原版徽章）

  （圆钮，hover 切 `-hovered`）——复制自本机 SAO Utils 2 安装
  `Packages\com.gpbeta.theme.sao\Images\`。
- **参数**：取自官方源码（十一轮检索到并逐项落实）：
  - `E:\SAO Utils 2\win64\qml\com\gpbeta\private\DialogTemplate.qml`：按钮 = `ImageButton` 纯图片、Row 底部居中、背景 = BorderImage 九宫格
  - `Packages\com.gpbeta.theme.sao\qml\ThemeDialog.qml`：`buttonSpacing: 110`、`buttonOffset: 28`、`topPadding: 74`、`bottomPadding(modal): 96`、`titlePadding: 30`、标题 19px `#AA333333` + Glow、正文 16px `#BB333333` + 白色 1px 下投影
- **CSS 落地**：按钮 40×40 纯图无底无文字（`gap 110`、距底 28）；正文区在 y74–157 内垂直居中；进场 `scale(0.1)→1` 260ms。
- **可读性微调（十二轮）**：源码半透明灰在浅底上对比度仅 ~4.7:1，标题/正文提至 `rgba(51,51,51,.92)` + `font-weight:500` + 白微投影 → 对比度 7.52:1，布局参数不动。
- **动态正文（十三轮）**：`openShopTip(name)` + `shopTipName`，道具商店/交易行共用弹窗各自显示名称。
- 弹窗 z-index 9500（高于个人信息编辑器 9000）；浮动模式下面板遮罩已加 no-drag。

### 5.5 已知误判教训

- 曾按用户截图**像素推断**出「金/红圆形按钮」「胶囊按钮」「红装饰竖线」等，后经官方 QML 源码核对全部推翻（按钮=纯图、红竖线=截图背景噪音）→ **凡涉及“与 SAO Utils 2 一致”，以官方源码与素材为准，不要靠截图猜**。

## 6. 素材与版权说明

- `public/sao/` 素材与官方参数参考均取自**本机安装的 SAO Utils 2**（NERvGear 框架，作者 GPBeta），仅用于个人本地使用；相关 QML 源码为 NERvGear 框架实现，版权归原作者。若需分发，请自行确认授权。
- 皮肤 `sao-ui-beta` 来自 npm 包（`devDependencies`）。
- 架构风格参考 [BongoCat](https://github.com/ayangweb/BongoCat)（Apache-2.0，只读归档在 `E:\harnesss\bongocat-src`）。

## 7. 本机环境已知坑（部署机偏好）

| 坑 | 说明 |
| --- | --- |
| `ELECTRON_RUN_AS_NODE=1` 被污染 | 历史遗留的进程环境变量，会让 Electron 以 Node 模式启动（无窗口）；所有启动命令前先 `Remove-Item Env:ELECTRON_RUN_AS_NODE` |
| Hook64.dll 挂钩 user32 | `win.setAlwaysOnTop` 在进程内不可靠 → 置顶必须走外部 PowerShell `SetWindowPos`（`topmost.cjs` 已封装） |
| 安全软件拦 electron-builder 缓存 | `dist:win` portable 阶段 `mkdir AppData\Local\electron-builder` 被拒 → 用 win-unpacked 部署 |
| PS5.1 BOM | 脚本文件保存为 UTF-8 **带 BOM**，否则中文注释乱码 |
| `npm` 命令 | 本机 `npm` 解析到 npm.ps1 被 ExecutionPolicy 拦 → 用 `npm.cmd` |
| 单实例竞态 | 二次启动会杀旧实例或弹提示，见 `交接文档.md` §二 |
| EsafeNetScreen 浮层 | 安全软件屏幕浮层可能遮挡验证截图 |

## 8. 文档索引

| 文档 | 内容 |
| --- | --- |
| [HANDOVER.md](HANDOVER.md)（本文件） | 接手者一站式文档 |
| [交接文档.md](交接文档.md) | 逐轮交接流水账：环境坑、部署、CDP 验证记录（最详细，AI 与人都可读） |
| [AGENTS.md](AGENTS.md) | AI 工作约定（架构边界、通道/事件/设置纪律、验证流程） |
| [按钮交接文档.md](按钮交接文档.md) | 每个菜单按钮/区域的实际行为与触发方式 |
| [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) / [CHANGELOG.md](CHANGELOG.md) | 逐轮改动记录（中/英） |
| [README.zh-CN.md](README.zh-CN.md) / [README.md](README.md) | 项目简介 |