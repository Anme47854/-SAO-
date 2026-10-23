# SAO-UIMenu-Pet（SAO 菜单桌宠）

一款 Windows 桌面陪伴小部件：一只常驻所有窗口最前面的透明齿轮，轻点即可呼出全屏
《刀剑神域》风格菜单。代码结构与风格参照 [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)
（Electron + Vue 2.7 对其架构的移植版）。

<div align="center">

[English](README.md) | 简体中文

</div>

## 功能

| 功能 | 说明 |
| --- | --- |
| 齿轮常驻最顶 | 由外部 PowerShell 进程真调 `SetWindowPos(HWND_TOPMOST)` —— 在 DLP/安全软件挂钩进程内 user32 调用的环境下依然有效（一次性 + 事件驱动重钉，无常驻轮询） |
| 全屏 SAO 菜单 | `Alt+A`（被占用时回退 `Ctrl+Shift+A`）或轻点齿轮呼出全屏菜单（sao-ui-beta 皮肤） |
| 游戏模式 | 前台全屏应用检测 → 全屏游戏/全屏应用前台时**自动隐藏齿轮**，切回桌面恢复（「游戏中显示猫」开关与 `Alt+C` 已删除，行为固定） |
| 控制面板 | 齿轮**右键**呼出/收起（`SAO 配置面板` 小窗）：「游戏模式」开关即点即切，与菜单/挂件状态互通 |
| FF14 个人信息 | 菜单「用户 → 个人信息」弹出编辑器（角色名/大区/服务器/职业/等级/称号/部队，下拉+自由输入），保存后菜单左信息实时显示，数据仅存本机 |
| 设置持久化 | `sao-pet-data/settings.json`，升级为 `schema_version: 1` + snake_case 键；旧 camelCase 数据自动迁移并留备份 |
| 自诊断 | `--diag` 自动模拟拖动/点击/游戏模式全链路，每一步如实写入 `sao-pet-log.txt` |

## 快速开始（开发）

```powershell
# 必须先清除被污染的环境变量（见交接文档 §二.1）：
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm install       # 仅首次（按 package-lock.json 恢复依赖）
npm run dev       # 终端 1：vite 开发服务器 http://127.0.0.1:5173
npm run app:dev   # 终端 2：Electron，挂 DevTools
```

## 构建 / 打包

```powershell
npm run build       # vite build → dist/
npm run dist:win    # electron-builder → release/win-unpacked + 便携 exe
```

- 本机 NSIS portable 结尾会报已知无害的 `mmap size` 错误；部署一律用 `release/win-unpacked/`。
- 部署目录 `C:\Users\YWB\AppData\Local\Programs\SAO-PET`：替换文件时保留 `sao-pet-data`
  目录，设置不丢。

## 使用方法

| 操作 | 效果 |
| --- | --- |
| 轻点齿轮 | 呼出 / 关闭全屏菜单 |
| 按住拖动齿轮 | 移动挂件；拖动结束后记住新位置 |
| `Alt+A` / `Ctrl+Shift+A` | 呼出 / 关闭全屏菜单（全局热键；`Alt+C` 已删除） |
| 右键齿轮 | 呼出 / 收起控制面板（游戏模式开关；再右键一次即关） |
| 菜单「用户 → 个人信息」 | 弹出 FF14 个人信息编辑器；「保存」后左信息联动显示 |
| 菜单底部系统面板 | 声音开关 · 退出应用（游戏模式在控制面板） |

## 架构（BongoCat 风格）

```
electron/
├── index.cjs            # 入口：装配、事件路由、生命周期、IPC 注册
├── app-log.cjs          # 日志（轮转、tmpdir 回退）
├── paths.cjs            # 便携数据目录/日志/设置路径
├── settings.cjs         # 设置仓库：schema_version、snake_case、原子写、v0 迁移
├── ipc-contract.cjs     # 通道名 + 载荷契约（唯一事实来源）
├── events.cjs           # 主进程事件总线（具名事件）
├── window-manager.cjs   # 两个 BrowserWindow 的唯一 owner
├── topmost.cjs          # 外部 SetWindowPos 置顶（一次性 + 事件驱动）
├── game-mode.cjs        # 前台全屏检测、齿轮显隐
├── drag.cjs             # 挂件拖动状态机
├── audio.cjs            # 静音单例 + 广播
├── hotkeys.cjs          # 全局热键 + 冲突回退
├── diag.cjs             # --diag 自诊断
├── pet-preload.cjs      # contextBridge（window.petAPI）
├── main.cjs             # 旧版单窗口入口（已废弃，勿用）
└── tests/               # node --test 单元测试
```

模块之间通过具名事件总线协作；渲染层只走 `ipc-contract.cjs` 声明的通道。完整工作约定与
BongoCat 映射表见 [AGENTS.md](AGENTS.md)。

## 验证

```text
npm run check   # node --check 全部 electron/*.cjs
npm test        # node --test 单元测试（settings 迁移/恢复、IPC 契约）
npm run app -- --diag   # 自诊断运行（模拟拖动/点击/游戏模式）
```

窗口 z 序 / TOPMOST 验证：在受信 PowerShell 运行 `.verify-z.ps1`。

## 相关文档

- [HANDOVER.md](HANDOVER.md) — 接手者版交接文档（阅读入口，含目录/构建/部署/关键实现纪要）
- [交接文档.md](交接文档.md) — 逐轮交接流水账：本机环境特殊性、部署、CDP 验证记录
- [AGENTS.md](AGENTS.md) — AI 工作约定（含 BongoCat ↔ SAO 模块映射表）
- [按钮交接文档.md](按钮交接文档.md) — 每个菜单按钮/区域的实际行为
- [README-DEMO.md](README-DEMO.md) — 演示页（sao-ui-beta 组件画廊）
- 风格参照： [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)（Apache-2.0，只读归档
  在 `E:\harnesss\bongocat-src`）