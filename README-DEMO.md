# SAO-UI Demo 演示工程（sao-ui-demo）

用 Vite + Vue 2 搭建的 [sao-ui-beta](https://www.npmjs.com/package/sao-ui-beta)（SAO-UI 组件库）效果演示页。

## 快速开始（2 步）

1. **双击 `启动演示.bat`**（首次会自动 `npm install`，需要 Node.js 16+）
2. 浏览器自动打开 `http://127.0.0.1:5173`

或手动执行：

```bash
cd sao-ui-demo
npm install      # 仅首次
npm run dev      # 启动后访问 http://127.0.0.1:5173
```

## 页面演示内容

| 操作 | 效果 |
| --- | --- |
| 点「Alert 弹窗」 | SAO 风格对话框：宽度展开动画、文字切片浮现、经典音效，蓝色 OK / 红色 关闭 |
| 点「Link Start 入场」| 桐人版 Link Start 语音 + NerveGear 启动音 + 250+ 粒子 3D 飞入动画（约 8 秒） |
| 点「打开菜单」或按 **Alt + A** 或按住鼠标快速下滑 250px | 全屏菜单：主图标栏逐项下落、点击激活置顶、左侧信息面板展开、二级子菜单联动、3D 曲面特效、滚轮切换图标 |
| 右上角 HP 血条 | 血量随机变化：数字逐格滚动、血条颜色绿/黄/红 自适应 |
| 右下角看板娘 | Live2D 挂件外壳 + 提示气泡（点击/悬停触发对话文本） |
| 「v-drag 拖拽卡片」| `v-drag` 指令效果（页面右下方，可任意拖拽） |

## 目录结构

```
sao-ui-demo/
├── 启动演示.bat        # 一键启动脚本（Windows）
├── package.json        # 依赖锁定：vue 2.7 / sao-ui-beta 1.2.21 / vite 4
├── vite.config.js      # vue2 插件 + 关闭 sao-ui-beta 预构建
├── index.html          # 引入 Font Awesome 4（菜单图标）
├── public/
│   └── waifu-tips.json # 看板娘对话配置（本地化，原默认指向失效的 yamapink.com）
└── src/
    ├── main.js         # 注册组件 + 指令 + 全局 jQuery（Live2D 需要）
    ├── setup-jquery.js # 必须先于 sao-ui-beta 执行
    └── App.vue         # 演示页面
```

## 常见问题

- **报「vite 不是内部或外部命令」**：说明未成功安装依赖，先确认 Node.js 版本 ≥ 16，再删除 `node_modules` 与 `package-lock.json` 后重新运行 bat。
- **端口被占用**：`vite.config.js` 中 `strictPort: true`，若 5173 被占用会直接报错，可改端口或关闭占用程序。
- **Font Awesome 图标不显示**：页面通过 CDN 引入 font-awesome 4.7，断网时可把 CSS 放到本地。
- **Live2D 模型不显示**：原仓库模型托管于 `yamapink.com`（已失效），本演示未包含模型文件，仅展示外壳与气泡；如需完整模型，需要自建模型 API 并替换 `sao-ui-beta` 包内 `Live2d/src/index.vue` 中的 `modelAPI`。**所有音频需用户交互后才会播放**（浏览器自动播放策略）。
- **控制台出现 live2d/fghrsh 相关报错**：属预期行为（模型服务器不可达），不影响其他组件。

## 打包为 EXE 桌面程序（SAO 菜单桌宠）

> 透明化（2026-10 更新）：桌宠挂件与全屏菜单均为**纯透明浮层**——页面不画背景、无遮罩、无模糊（移除 backdrop-filter，避免 AMD 显卡透明全屏合成挂起）。挂件按钮为不透明深蓝圆，标题「SAO 菜单」；齿轮设置面板含音效开关 / 全屏菜单 / 退出三项。菜单弹出层关闭时自动隐藏全屏窗口，并带 800ms 安全网防止透明空窗口挡住桌面。
> 启动位置：**必须放 C 盘常规目录**（如 `C:\Users\<用户>\AppData\Local\Programs\SAO-PET\`）——本机企业管控（亿赛通 DocGuard 等）会静默终止 E:\ 盘上的未签名 exe（退出码 0x80000003，无窗口、无日志、无弹窗）。

项目内置一个 Electron 桌面程序「**SAO 菜单桌宠**」：右下角一只透明置顶的 SAO 菜单小挂件，可拖动、可点击互动；`Alt+A` 或下滑手势再呼出全屏菜单。

| 交互 | 说明 |
| --- | --- |
| 点击菜单图标 | 播放点击音效 + 金色激活 + 弹出二级子菜单（再点收起） |
| `Alt + A` | 全屏菜单 呼出 / 关闭（全局热键；被占用时自动改用 `Ctrl+Shift+A`，挂件底部会提示） |
| 在挂件上按住鼠标快速下滑 120px | 呼出全屏菜单 |
| `Esc` / 点击空白处 | 收起子菜单 / 关闭全屏菜单 |
| 滚轮在图标排上滚动 | 循环切换菜单页（换一组子菜单） |
| 拖动顶栏「SAO」区域 | 移动挂件位置（位置会记住在窗口会话内） |
| 顶栏按钮 | 🔔 开关音效 · ⤢ 呼出全屏菜单 · ⏻ 退出桌宠 |

### 一键打包

双击 **`打包EXE.bat`**，自动完成：安装依赖 → `vite build` → electron-builder 打包。

或手动执行：

```bash
npm install        # 首次
npm run build      # 生成 dist/（index.html 演示页 + menu.html 全屏菜单页 + pet.html 桌宠挂件页）
npm run dist:win   # 打包，产物在 release/SAO-UIMenu-Pet-1.0.0.exe
```

- 产物为 **单文件便携版 EXE**（免安装，双击即用），位于 `release/` 目录
- 首次打包会从网络下载 Electron 运行时（约 100MB），需要耐心等待
- 想直接调试桌面版页面：先 `npm run dev` 启动 vite，再开一个终端跑 `npm run app:dev`（自动开 DevTools）
- 也可用 `release/win-unpacked/SAO-UIMenu.exe` 免打包直接跑；或把 `win-unpacked` 整个复制到任意目录运行

### 相关文件

```
electron/index.cjs          # ★ 应用入口（装配 + 事件路由 + IPC 注册；仿 BongoCat 结构）
electron/settings.cjs       # 设置仓库（schema_version:1 / snake_case / 原子写 / 旧格式迁移）
electron/window-manager.cjs # 双窗口唯一 owner（挂件 56×56 + 全屏菜单）
electron/topmost.cjs        # 外部 SetWindowPos 置顶（一次性 + 事件驱动）
electron/game-mode.cjs      # 游戏模式：前台全屏检测 + 齿轮显隐
electron/hotkeys.cjs        # 全局热键 Alt+A（含冲突回退；Alt+C 已随「游戏中显示猫」删除）
electron/drag.cjs           # 挂件拖动状态机
electron/audio.cjs          # 声音开关（主进程单例 + 广播）
electron/diag.cjs           # --diag 自诊断
electron/app-log.cjs        # 日志（轮转 + tmpdir 回退）
electron/ipc-contract.cjs   # IPC 通道名/载荷契约（唯一来源）
electron/events.cjs         # 主进程事件总线
electron/pet-preload.cjs    # preload：页面 ↔ 主进程 最小桥（contextBridge）
electron/main.cjs           # 旧版单窗口主进程（已废弃，保留参考）
pet.html                    # 桌宠挂件页 HTML 入口
src/pet-main.js             # 挂件页入口（SAOUI 字体注入 + 错误收集）
src/PetApp.vue              # 挂件 UI：齿轮按钮/拖动/轻点开菜单
src/pet-menu-data.js        # 挂件菜单数据（与全屏菜单同源一致）
menu.html                   # 全屏菜单页 HTML 入口
src/menu-main.js            # 菜单页入口：注册 pop-up-menu/menu-bar/left-info/child-bar
src/MenuApp.vue             # 菜单页 UI：氛围背景 + 交互提示 + 菜单联动组
src/parallax-shim.js        # parallax-js UMD 兼容垫片（vite 预构建无法识别 default 导出）
打包EXE.bat                 # 一键打包脚本
```

## 说明

- 演示工程本身只是「效果查看器」，未修改 sao-ui-beta 的任何源码。
- 相关交接资料见上级目录《SAO-UI项目介绍与交接文档.md》。