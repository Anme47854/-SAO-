# 更新日志

本文件记录 SAO-UIMenu-Pet 的重要变更；分段标题遵循固定词表（以 emoji 为标识，
与 `CHANGELOG.md` 两侧一一对应）。

## Unreleased

### ✨ 特性

- **菜单浮窗开关（可拖拽自由摆放）**（2026-10-21，五轮定稿）：控制面板新增「**菜单浮窗**」
  开关行（面板增高至 240×216）。**最终几何：菜单窗口恒为 764×604 固定尺寸、内容区
  760×600 内嵌 (2,2) 起、四周 2px 透明边带（不再有全屏盖屏形态）**：
  **开 = 可拖**（金框画在 ::before 伪元素、inset:-2px 恰好落在**透明边带内**——2px 金框
  #F2B116 系 + 9px 圆角 + `pointer-events:none`，**与内容零像素重叠**，CDP 实测
  ring [0,2]/[762,764] vs 内容 [2,762] 重叠 0px；空白处 `cursor: move`，按住面板
  空白处自由拖动，交互元素不受影响）；**关（默认）= 锁定当前位置**（无框、不可拖、
  不回屏幕中央）。位置任何移动都自动落盘（`settings.menu_float_pos`，防抖
  400ms），每次显示前对齐保存位置（首次/失效回退 = 齿轮所在屏居中），重开/重启保留；
  开关切换即时生效（广播 `pet:menu-float` → 渲染层 `floatMode` + 主进程对齐兜底）。
  实现：`pet:get/set-menu-float` + `pet:menu-float` 三通道（合约/镜像/测试已同步）、
  `wm.applyMenuMode()`、`MenuApp` 渲染层拖拽（`window.moveTo` + 捕获阶段 mousedown
  判定）。踩坑：Electron `screen.getDisplayMatching` 参数必须完整矩形
  （`{x,y,width,height}`），只传坐标点抛 “conversion failure”（已加注释与兜底
  try/catch）；渲染层浮窗判定改由开关广播驱动（窗口恒为面板后 `outerWidth<screen.width`
  尺寸判定恒真，已废弃）；**金框绘制三版迭代**（border 压缩内容盒 → 覆盖式伪元素压边
  2px → 边带分离零重叠），用户连续两轮反馈「UI 被挡住」后的终稿。
- **菜单浮窗 · 六轮（内容被自身裁剪修复 + BongoCat 式系统拖动）**（2026-10-21）：用户反馈
  「左边悬浮框上面有明显的把个人信息裁剪一小节」→ 排查出两个根因并 CDP 复验：
  ① **皮肤 `.position` 的 `breath` 无限动画（8s）使整块菜单内容 ±4px 呼吸漂移**，
  浮动中 left-card/任务条目 ul 顶部来回贴窗口上缘；`.menu-app .position { animation-name:
  none !important }` 禁掉后 8s 采样零漂移、静态链恒定（视口顶 = top + 常数，CDP 互证）；
  ② **left-card 顶部垂悬 -180px（全屏时代设计）** → 浮窗 600 高下顶部越界 51px 被裁，
  校准 `top:-120.8px`（顶贴内容区 2px、底 519 完整入窗），任务条目 `ul#quests` 同源
  校准 `-84.8px` —— CDP 实测零裁剪、位置恒定。**拖动升级双通道（参考 BongoCat
  边框拖拽的系统 move loop）**：floatMode 时 `.menu-app` 内联 `-webkit-app-region:
  drag`（交互元素组含 li/输入/按钮/任务下级框等补 `no-drag` 保持可点），原 JS
  `window.moveTo` 捕获式拖动保留作环境兜底（互斥不冲突）。构建链提醒：`npm run
  dist:win` 不含 vite build，改 CSS/JS 须先 `npm run build`（本轮两度读旧产物教训）。
- **菜单浮窗 · 七轮（左卡/任务空态视觉一致性）**（2026-10-21）：用户反馈左卡底色「更白了
  些」→ 左卡背景 `rgba(255,255,255,0.92)` → `0.85`，与右侧任务下级框/菜单行半透明白
  完全一致；「其他任务暂无内容」空态行补同款底色（与其他框风格统一）。CDP 实测三处
  背景全 0.85、left-card 位置零回归（t=2.03/b=519.03）。
- **九轮~十三轮（「道具商店/交易行」暂未开放提示框）**（2026-10-22）：参考 SAO Utils 2 推出确认框，
  给「道具商店」行加提示弹层；复用 SAO Utils 2 原版素材 `public/sao/`（`dialog.png` 350×253
  面板 + `ok.png`/`cancel.png` + -hovered）。**十一轮定稿**：用户指示检索 SAO Utils 2 源码，
  找到官方实现 `DialogTemplate.qml` / `ThemeDialog.qml`（`E:\SAO Utils 2\win64\qml\`）——
  全部参数按源码：按钮 = 纯图片 ImageButton（40×40、`buttonSpacing 110`、`buttonOffset 28`、
  Row 底部居中）；dialog.png 为 BorderImage 九宫格（top 74/bottom 96/left/right 16）；标题
  top 30、19px `#AA333333` + Glow；正文 16px `#BB333333` 白色 1px 下投影；进场
  scale 0.1→1 动画。此前按截图推断的「红装饰线/胶囊按钮/米金底」经源码核对为背景噪音/
  误读，已删除修正。CDP 终验全对（40×40 无底、gap 110、距底 28、标题/正文参数与源码一致、
  关闭路径通）。**十二轮**：用户反馈字体与背景重合 → 标题/正文字色从源码半透明
  #AA333333/#BB333333 提升至 rgba(51,51,51,.92) + font-weight 500（源码同款 Medium）+ 白微
  投影，对比度 ~4.7:1 → 7.52:1，布局参数不变。**十三轮**：交易行接入同一弹窗，正文按点击
  项动态显示（`openShopTip('交易行')` / `{{ shopTipName }}`），CDP 双入口 + 两条关闭路径
  验证通过。菜单保持打开；「确定」/「取消」/点遮罩均关闭。
  （素材与源码参考自本机 SAO Utils 2 安装，个人本地使用）
- **八轮（头像高清 + 编辑器保存/取消完整显示）**（2026-10-22）：
  - **头像不再模糊**：上传链路从「128px PNG → dataURL 存 settings（≤256KB）」升级为
    「2048px JPEG q0.92 → 主进程写盘 `sao-pet-data/avatar.jpg` → settings 只存短文件名、
    旧 dataURL 读取兼容」；显示改走自定义协议 **`pet-avatar://`**（Chromium 禁止 file://
    页面加载 file:// 子资源；协议需 standard privilege + 显式 image/jpeg MIME）。左卡
    216×288 画像框与编辑器预览（60×80）同步高清。
  - **个人信息编辑器底部不再被遮**：内容实测超 604 窗口、保存/取消按钮（y 592–628）
    大半沉出窗外 → 压缩内容（标题/网格/输入/按钮间距/预览框）+ `max-height:100vh`；
    遮罩背景 0.35 → **0.15**（用户「不要阴影」）。CDP：编辑器 567 高完整入窗、
    foot 534.5–570.5 完整可见、按钮可点中。
- **齿轮右键「控制面板」**：新增独立配置小窗（`config.html` / `src/ConfigApp.vue`，240×168
  透明白卡，与配色 v2 一致），把「游戏模式 / 游戏中显示猫」两个配置从全屏菜单子菜单行
  移入面板，点击卡片行即切换（与菜单/热键/挂件共用 `pet:set-game` / `pet:set-showcat`
  通道 + `pet:game` / `pet:showcat` 广播，任何入口改动三页面实时同步）。面板失焦或按
  Esc 收起；右键齿轮再按一次即关；面板钉入置顶链（全屏菜单 → 控制面板 → 齿轮）。
- **FF14 个人信息编辑**（「用户 → 个人信息」→ 冒险者手册）：全屏菜单内弹出编辑卡片，
  可填**角色名 / 大区 / 服务器 / 职业 / 等级（0–999）/ 称号 / 部队**（大区、服务器、
  职业带 datalist 候选 + 自由输入；内置国服四大区、常用服务器与全部战斗/生产采集职业，
  含 7.0 蝰蛇剑士、绘图师）。保存经新通道 `pet:profile-set` → `settings.json` 的
  `profile` 键（白名单键 + 类型/长度收口）原子落盘 → 广播 `pet:profile` → 菜单左信息
  实时显示（原静态 'Kirito' / 'Welcome to SAO world' 改由个人信息驱动）。数据仅存本机。
- **个人信息二轮细化**（2026-10-19）：左信息改「角色卡」——两列等距网格**常显全部 9 个
  字段**（未填显示灰色「未填写」）+ 顶部圆形头像；新增「信仰」（十二神候选 + 自由输入）
  与「日期」字段；「部队 / 自由公司」改名为「部队」；大区/服务器/职业/信仰的候选下拉
  **列表超长在列表内部滚动**、点击输入框不滚卡片/页面（编辑器卡片固定适配）；**角色图标
  支持上传图片**：canvas 居中裁剪压缩 128px PNG → `pet:avatar-set` → settings `avatar`
  键（≤256KB 校验）→ 广播 `pet:avatar` 三窗口同步。
- **左信息卡改为「角色画像框」**（2026-10-19 三轮，六轮改比例）：88px 圆头像仍嫌小 → 卡片顶部
  整体改为**长方形角色画像框**（上传图 `cover` 铺满整个矩形；未上传时金色大 `fa-user-circle` 占满
  框内），下方两列 9 字段网格不变。用户反馈 216×170 仍像正方形 → 按主流 **3:4 竖版角色卡比例**
  改 **216×288**（FF14 ロドスト冒险者名片 320×440 ≈ 8:11 亦接近；全身立绘常用 2:3、横版横幅
  16:9），CDP 实测 216×290 高宽比 1.34、整卡在视口内；编辑器预览同步 3:4（60×80），空态金色
  图标放大到 128px。
- **任务系统 · 任务栏改版 + 任务酒馆**（2026-10-19，方案经用户挑选）：任务栏「主线任务/
  支线任务」改为**接取任务（fa-plus-circle）/ 个人任务（fa-list-ul）/ 其他任务（fa-ellipsis-h）**
  三条目：点条目在**该行右侧**弹出下级框（与任务栏同款行样式，li 内绝对定位 `left:100%`）——
  接取任务=空态「暂无可接取任务」+「前往任务酒馆」；个人/其他任务=未完成列表（带序号）+
  「前往任务酒馆」。点「前往任务酒馆」打开**第四窗口「任务酒馆」**（640×460 独立小窗，仿
  SAO Utils 2 设置窗口布局：可拖动顶栏 + 自绘 × / Esc 关闭，左导航**任务大厅（空态占位）/
  个人任务**）。个人任务=**Excel 样式表格**（灰底粗体表头 序号/任务内容/是否完成 + 细网格 +
  隔行底色）：**默认仅显示未完成**、顶部「仅未完成/全部」小切换；**行尾 ＋= 在该行下方插行**、
  底部固定「＋ 添加任务」行；点内容单格行内编辑（回车/失焦保存、空文本=删除该行、Esc 取消）；
  完成=金色√ + 灰字删除线；行尾 × 删除。因酒馆左导航无「其他任务」页，**表格顶部设「个人/
  其他」归属分段控件**（与完成度切换并列）管理其他任务分类。数据存 settings 新键 `quests`
  （personal/other 两组，条目 {id/text/done}，≤200 条、≤200 字符），走 `pet:quests-get`
  （同步）/ `pet:quests-set` / `pet:quests` 广播到**全部窗口**实时同步（与头像同款模式）；
  置顶链扩为四窗（全屏菜单 → 控制面板 → 任务酒馆 → 齿轮）。CDP 全链路实测通过
  （三条目/下级框/独立窗口/表头/受信点击添加+键盘输入回车保存/勾完成隐藏/切全部置灰/
  广播同步/重启持久化/四窗 z 序 Topmost=True），用户真实添加的「仓科收银集群」跨部署保留。
  **踩坑 ×2 实录**：a) Vue 2 不会把**下划线前缀** data（`_uidSeq`）代理到实例 → 任务 id
  混入 `NaN`（改名 `uidSeq`）；b) CSS 块注释**不能嵌套**（注释正文里出现 `/*` 会提前闭合 →
  RollupError "Unexpected '/'"）。
- 文字/图标配色复刻 SAO Utils 2 正式版 v2（实测本地安装主题资源
  `E:\SAO Utils 2\Packages\com.gpbeta.theme.sao`：启动器底板为白 `#FFFFFF`/半透白
  `rgba(255,255,255,.85)`，悬停/选中为金 `#F2B116`~`#FBB717` 配白字，空闲图标/文字为
  深炭灰 `#333333`，与 `ItemButton.qml` 的 idle `#CC333333`/hover `#EEFFFFFF` 一致）：
  菜单栏图标、子菜单行、左侧信息文字改为深灰 `#333333` 落在皮肤白底上，悬停/激活变
  金底 `#F2B116` 白字。移除 v1 全部蓝辉光与 text-stroke（在白色底上反而降低对比、
  并造成未选中文字模糊）。打包内附 SAO Utils 2 原版字体 `SAOUI-Regular.otf`
  （`@font-face 'SAO UI'`），菜单文字字形与 SAO Utils 2 一致。

### 🐛 修复

- **左信息卡间距（CDP 实测校准）**：`.left-card` 漏写 `box-sizing:border-box`，content-box 实际宽
  266px，右缘与图标列间距实测仅 1px（“几乎贴近”）；补 border-box + `left:calc(-25px - 240px - 10px)`
  → 间距 **35px**（列表又经 CDP 全实测：13 神全渲染、双向滚轮四场景通过）。
- **候选下拉末尾项被裁切**：根因有两层 —— 卡片基线规则 `overflow:auto`（非之前以为的
  overflow:hidden）把向下弹出的列表尾部裁掉、滚动够不到末尾；改 `overflow:visible` 后列表可完整
  溢出显示。另发现本机环境该列表 **原生滚动失效**（真实滚轮注入实测 scrollTop 不动），列表与输入框
  分别加 `@wheel` JS 手动推进 scrollTop（双向、防页面滚动）。
- **Vite/LightningCSS 注释事故**：`MenuApp.vue` 的 `<style>` 内把注释误写成 HTML 语法
  `<!-- ... -->`（需 `/* */`），Vite 原样带进压缩 CSS（`\<!-- ... -->`），CSS 解析器把紧随其后的
  `.lc-portrait` 规则整条吞掉（CDP 实测：画像框计算样式回退 214×214 方框、无背景，而 .lc-portrait
  img 子规则却在 —— 利用这一点精确定位）。改回 `/* */` 即恢复；**以后 style 内注释一律 `/* */`**。
- **置顶执行可观测**：`topmost.cjs` 的 pin 助手改用 `%SystemRoot%\System32\WindowsPowerShell\...\powershell.exe`
  绝对路径启动，并捕获退出码/stderr（非零退出写错误日志），不再静默失败。
- 齿轮窗口撤销本轮的 `focusable:false`（Windows 上 WS_EX_NOACTIVATE 会吞掉鼠标输入）；
  右键开关面板的"失焦自动收起"改为 **400ms 齿轮夺焦宽限**（面板因右键切换而失焦时不收起，
  点面板外/其他窗口仍正常收起）。
- 顶置加固：boot 后按 1/2/4/8/16s 重试钉顶（覆盖窗口创建竞态），此后每 25s 周期自愈
  重钉 —— 置顶位被其他置顶窗口群（如运行中的 SAO Utils 2）或安全层清掉时 25s 内自动
  恢复。实测：齿轮 z=25 / 菜单 z=28，均 `Topmost=True`，压在 SAO Utils 2 置顶 Qt 窗口
  之上。

- 调整置顶顺序：齿轮挂件改为在**全屏菜单之后**钉顶（SetWindowPos 按调用顺序叠层，后钉者在上），
  呼出菜单后齿轮仍保持最前、不再被菜单窗口盖住——点击齿轮开关菜单时挂件全程可见，
  不再出现"点击后齿轮短暂消失"。
- `electron/main.cjs` 标注废弃（旧版单窗口入口），应用入口迁移到 `electron/index.cjs`。

### ♻️ 重构

- 主进程按 BongoCat 代码类型与风格重构：单体 `electron/pet.cjs`（约 750 行）拆分为
  职责单一模块（`index.cjs` 装配与路由 + `app-log` / `paths` / `settings` / `ipc-contract` /
  `events` / `window-manager` / `topmost` / `game-mode` / `drag` / `audio` / `hotkeys` / `diag`）。
- `window-manager` 成为挂件/菜单两个窗口的唯一 owner，其他模块只通过 getter 读取，
  通过 `events.cjs` 具名事件总线协作。
- 全部 IPC 通道名集中在 `ipc-contract.cjs` 声明；沙箱 preload（`pet-preload.cjs`）内联镜像
  同一组通道字符串（沙箱 preload 不能 require 相对文件），并用静态测试强制两侧一致。

### ⚙️ 配置

- `settings.json` 携带 `schema_version: 1` 并使用 snake_case 键
  （`game_mode` / `profile` / `avatar` / `home_x` / `home_y`）。
- `profile` 键子字段新增 `faith`（信仰）、`date`（日期）；新增 `avatar` 键（角色图标
  base64 dataURL，上限 256KB，超长回落空串）。
- **删除「游戏中显示猫」开关与 `Alt+C` 热键**（2026-10-15，用户确认其语义与游戏模式
  重叠/冲突）：控制面板只留「游戏模式」一行；`pet:get-showcat` / `set-showcat` /
  `showcat` 三个通道、preload 三个方法、`show_cat_in_game` 设置键全部移除
  （旧设置文件中的残留值自动忽略，不报错）。
- 游戏模式行为固定：开 + 前台全屏游戏/应用 → **自动隐藏齿轮**，切回桌面立即恢复显示。
- `--diag` 时间轴更新：27s 游戏模式开改为主进程直调（渲染层 toggleGame 已随菜单行移除），
  32s 注入全屏矩形（应隐藏）/ 34s 注入桌面小矩形（应恢复）/ 36s 还原游戏模式。
- 旧版 camelCase 设置（`gameMode` / `showCat` / `homeX` / `homeY`）首次启动自动迁移，
  旧文件留档为 `settings.json.bak`。
- 损坏的设置文件备份为 `settings.json.corrupt-<时间戳>` 后回落默认值；`schema_version`
  非 1 明确拒绝（不静默转换）。
- 所有写入均为原子替换（同目录临时文件 + rename）。

### 🧪 测试

- 新增 `node --test` 单元测试（21 用例）：`electron/tests/settings.test.cjs`（v0→v1 迁移、
  损坏恢复、类型回落、原子写、`profile` 键白名单/类型/落盘、`avatar` 键往返与长度上限）、`events.test.cjs`（事件总线契约）、
  `ipc-contract.test.cjs`（通道唯一性、载荷契约）与 `preload-contract.test.cjs`
  （沙箱 preload 通道镜像与契约保持同步）。
- 新增 `npm run check`（逐个语法检查 `electron/*.cjs`）与 `npm test`。

### 📝 文档

- 新增 `AGENTS.md`（工作约定，含 BongoCat ↔ SAO 模块映射表）。
- 按 BongoCat 文档惯例新增双语 `README.md` / `README.zh-CN.md` 与本文档。