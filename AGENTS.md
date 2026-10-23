# SAO 菜单桌宠（SAO-UIMenu-Pet）AI 工作约定

适用于整个仓库；分析、修改或验证前先完整阅读本文件与 `交接文档.md` / `AGENTS.md` 引用的资料。

本文件只保留**长期有效约束**；与 `E:\sao\交接文档.md` 冲突时以本文件与代码为准并同步两份文档。

## 1. 项目事实

- Electron 31 + Vue 2.7 桌面应用，四个窗口：**齿轮桌宠**（透明置顶小挂件，56×56）、**菜单面板**（`SAO Menu`，sao-ui-beta 1.2.21 皮肤；窗口恒 764×604、内容区 760×600 内嵌 (2,2) 起 2px 透明边带，设置开关「菜单浮窗」控制**可拖+边带金框 / 锁定当前位置**（可拖=双通道：`-webkit-app-region: drag` 系统级拖动 + JS `window.moveTo` 兜底；皮肤 `.position` 的 breath 无限动画已禁，left-card `top:-120.8px`、`ul#quests` `-84.8px` 为静态链校准值，勿改））、**控制面板**（`SAO 配置面板`，齿轮右键呼出的小卡片窗，240×216，两行开关：游戏模式/菜单浮窗，见 `config.html` / `src/ConfigApp.vue`）与**任务酒馆**（`SAO 任务酒馆`，菜单任务条目呼出的独立小窗，640×460，见 `tavern.html` / `src/TavernApp.vue`）。
- **每个页面入口 js 必须 `import 'font-awesome/css/font-awesome.min.css'`**（pet-main/menu-main/tavern-main 都带；曾缺 tavern 导致酒馆 fa 图标静默不渲染、用户看不到 ＋− 增删图标）。
- 主进程入口是 `electron/index.cjs`（package.json `main`）；业务逻辑拆在 `electron/` 下职责单一模块，装配与路由只在 index.cjs。
- 本机环境极特殊（DLP/安全软件）：见 `交接文档.md` §二 —— `ELECTRON_RUN_AS_NODE=1` 污染、Hook64.dll 挂钩进程内 user32 调用（`alwaysOnTop` 不落位，置顶必须走外部 PowerShell `SetWindowPos`）、PS5.1 BOM、单实例竞态、EsafeNetScreen 浮层。
- 代码类型与风格参照 [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)（参考源码归档在 `E:\harnesss\bongocat-src`，只读，勿改），映射关系见本文 §4。

## 2. 任务流程

### 2.1 决策阶梯（仿 BongoCat ADR-0030）

按顺序取第一个可行方案：现有行为已满足（YAGNI）→ 复用仓库已有 helper/模块/模式 → Node/Electron 标准能力 → 现有依赖 → 最小自有代码。不引入不必要的新依赖。

### 2.2 开始前

1. 检查工作副本现状（`E:\harnesss\sao-ui-demo` 是工作副本；`E:\sao\sao-ui-demo` 是精简归档，改完必须把工作副本内容同步回归档并更新 `E:\sao\交接文档.md`）。
2. 读现有实现与测试，不从文档标题推断行为；行为改动必须同步 `交接文档.md` 的验证记录。

### 2.3 实施

1. 遵循既有模块边界与命名；改动只覆盖请求范围，先最小闭环再扩展。
2. 通道名只准在 `electron/ipc-contract.cjs` 改；**`electron/pet-preload.cjs` 内联镜像同一组
   通道字符串（沙箱 preload 不能 require 相对文件），改通道必须两处同步，一致性由
   `electron/tests/preload-contract.test.cjs` 静态比对强制**；事件名只准在 `electron/events.cjs` 加；
   设置键只准在 `electron/settings.cjs` 加。**头像（八轮起）**：`pet:avatar-set` 载荷为 JPEG
   dataURL（主进程写盘 `sao-pet-data/avatar.jpg`、settings 只存短文件名 ≤200 字符）；
   `pet:avatar-get` / `pet:avatar` 广播返回显示源 `pet-avatar://` 协议 URL（旧 dataURL 兼容）。
   协议注册/实现在 `index.cjs`（registerSchemesAsPrivileged 须 ready 前 + whenReady 内
   protocol.handle：host 即文件名、basename 防穿越、显式 image/jpeg）。
   **十轮素材纪律**：`public/sao/`（dialog.png/ok.png/cancel.png 及 -hovered）是从本机
   SAO Utils 2 安装复制的原版素材（出处记 按钮交接文档.md §道具商店），Vue 模板里引用
   public 资源**必须写 `/sao/...` 根路径**（相对路径会被 vite 当模块 import 解析致
   `Rollup failed to resolve import` 构建失败）；`dist:win` portable 阶段会被安全软件拦
   `AppData\Local\electron-builder`（mkdir Access denied）——packaging/asar 已成功，
   该失败无害，部署以 win-unpacked 为准。
   **官方实现准据（十一轮）**：SAO Utils 2 对话框布局/配色参数以官方源码为准——
   `E:\SAO Utils 2\win64\qml\com\gpbeta\private\DialogTemplate.qml`（模板：ImageButton
   纯图按钮、Row 底部居中、BorderImage 九宫格）与 `E:\SAO Utils 2\Packages\com.gpbeta.theme.sao\qml\ThemeDialog.qml`
   （主题参数：buttonSpacing 110 / buttonOffset 28 / topPadding 74 / bottomPadding 96 /
   titlePadding 30 / 标题 #AA333333+Glow / 正文 #BB333333 16px 白影）；按钮 = ok.png/cancel.png
   原图 40×40（无底无文字），红装饰线等截图噪音勿复刻。
3. 不做无关重构、批量格式化；不动 `node_modules` / `release` / `.cache`。
4. 主进程不要用 `webContents.isResponsive()`（Electron 31 无此 API）；窗口存活/响应判断用
   `!win.isDestroyed()` / `win.isVisible()`。

### 2.4 完成前

1. 跑 `npm run check`（全部 .cjs 语法检查）+ `npm test`（node --test 单元测试）+ `npm run build`（vite 构建）。
2. 涉及置顶/游戏模式/拖动时用 `--diag` 冒烟或 `.verify-z.ps1`（z 序）验证，验证命令与结果写进最终报告。
3. 复查正常/错误/重启/退出路径；日志不记录真实按键序列、剪贴板或用户文件内容。

## 3. 架构边界（BongoCat 代码类型映射）

| BongoCat | SAO 对应 | 职责 |
| --- | --- | --- |
| `bongocat-app` main | `electron/index.cjs` | 装配、事件路由、生命周期、IPC 注册 |
| `bongocat-config` | `electron/settings.cjs` | schema_version:1、snake_case、原子写、损坏备份、v0 迁移 |
| `bongocat-log` | `electron/app-log.cjs` | 单一日志入口、轮转、tmpdir 回退 |
| `bongocat-storage` | `electron/paths.cjs` | 便携数据目录/日志/设置路径 |
| `bongocat-app product_windows` | `electron/window-manager.cjs` | 四窗口唯一 owner、菜单/控制面板/任务酒馆开关、广播 |
| `bongocat-platform` | `electron/topmost.cjs` | 外部 SetWindowPos 置顶（一次性+事件驱动） |
| `bongocat-runtime` | `electron/game-mode.cjs` | 前台全屏检测、齿轮显隐 |
| `bongocat-input` | `electron/hotkeys.cjs` | 全局热键注册/冲突回退 |
| `bongocat-audio` | `electron/audio.cjs` | 静音单例 + 广播 |
| `bongocat-ui-protocol` | `electron/ipc-contract.cjs` | 通道名/载荷契约唯一来源 |
| runtime snapshot/command | `electron/events.cjs` | 主进程事件总线（具名事件，禁字符串拼接协议） |
| `bongocat-app smoke/diagnostics` | `electron/diag.cjs` | `--diag` 自诊断 |

规则：

- `window-manager.cjs` 是 `petWin` / `menuWin` / `configWin` / `tavernWin`（四窗口）的唯一 owner，其他模块只许通过 getter 读取。
- 模块之间不互相直接调用业务方法，走事件总线（`events.cjs`）；渲染层交互只走 `ipc-contract.cjs` 通道。
- 设置：`schema_version` 非 1 明确拒绝；旧 v0 camelCase 只允许由 `settings.cjs` 一次性迁移（自动备份 `.bak`）；损坏文件备份为 `.corrupt-*` 后回落默认值；写入必须同目录临时文件 + rename 原子替换。**不要再读写 camelCase 键**。
- 平台特殊性（外部 ps1 助手、--no-sandbox、禁硬件加速）只属于 topmost/game-mode/index，不扩散到其他模块。
- **置顶顺序约定（topmost.cjs 固定）**：钉顶恒为「先全屏菜单 → 再控制面板 → 再任务酒馆 → 后齿轮」——SetWindowPos(HWND_TOPMOST) 后钉者在上，齿轮必须永远在最前（含菜单/面板/酒馆打开时）；改顺序需同步交接文档验证记录。

## 4. 验证

```text
npm run check     # node --check 全部 electron/*.cjs（含 tests）
npm test          # node --test electron/tests/*.test.cjs（settings 迁移/恢复、ipc-contract 契约、events 总线、preload 通道一致性）
npm run build     # vite build → dist/
npm run app:dev   # 开发模式（需先 npm run dev 起 vite，且环境变量不能带 ELECTRON_RUN_AS_NODE=1）
npm run dist:win  # electron-builder → release/win-unpacked（部署用 win-unpacked，NSIS portable 报 mmap 错误属本机已知无害）
```

- 置顶验证：`.verify-z.ps1`（DSH pwsh 工具或独立受信进程执行）枚举窗口 TOPMOST 位。
- 部署目录 `C:\Users\YWB\AppData\Local\Programs\SAO-PET` 保留 `sao-pet-data` 不清；settings.json 升级为 v1 后旧数据自动迁移。

## 5. Git 与交付

- 未经用户明确要求，不 commit、push、开 PR、release 或打 tag。
- Commit message 用 Conventional Commits：`feat`/`fix`/`docs`/`test`/`refactor`/`perf`/`build`/`ci`/`chore`（不用 `update`/`misc`）。
- 用户可见行为/配置/默认值变化需同步两份 CHANGELOG（`CHANGELOG.md` / `CHANGELOG.zh-CN.md`，分段标题词表见仓库内约定：♻️ 重构 / ⚙️ 配置 / 🧪 测试 / 📝 文档 等），版本条目统一写在 `## Unreleased`。
- 交付前把工作副本同步回 `E:\sao\sao-ui-demo` 归档，并更新 `E:\sao\交接文档.md`（含代码地图与验证记录）。

## 6. 事实来源

| 主题 | 事实来源 |
| --- | --- |
| 本机环境特殊性 / 部署 / 速查 | `E:\sao\交接文档.md` |
| 代码类型与风格参照 | `E:\harnesss\bongocat-src`（只读）及其 AGENTS.md |
| 通道名 / 事件名 / 设置键 | `electron/ipc-contract.cjs` / `electron/events.cjs` / `electron/settings.cjs` |