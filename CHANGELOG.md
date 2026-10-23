# Changelog

All notable changes to SAO-UIMenu-Pet are documented here. This file's section headings
follow the fixed vocabulary (emoji-indexed, mirrored in `CHANGELOG.zh-CN.md`).

## Unreleased

### ✨ Features

- **Floating (draggable) menu toggle** (2026-10-21, settled after five rounds): the
  control panel gains a **"菜单浮窗"** toggle row (panel height 240×216). **Final
  geometry: the menu window is always 764×604 with a 760×600 content area embedded at
  (2,2) and a 2px transparent border band around it** — the old full-screen-cover
  mode is gone. **On = draggable**: the golden frame is drawn on a **`::before`
  pseudo-element** (`inset: -2px`, 2px #F2B116 family + 9px radius,
  `pointer-events: none`) that lands exactly inside the transparent band, so it has
  **zero pixel overlap with any UI content** (CDP-measured frame ring
  [0,2]/[762,764] vs content [2,762], overlap 0px); `cursor: move` on blank areas
  (interactive elements keep their own cursors); hold any blank area to drag
  (`window.moveTo` per frame). The frame rendering went through three iterations
  (plain `border` shrank the content box and clipped edge elements — "content
  outside the frame disappears"; covering pseudo-element overlapped the edge 2px;
  separated border-band is the final, after two user rounds of "UI is still
  covered"). **Off (default) = locked at the current position** (no border, not
  draggable, never snaps back to the center). Position changes are persisted on move (`settings.menu_float_pos`, 400ms
  debounce); before every show the panel is aligned to the saved position (first
  open / out-of-bounds → centered on the gear's display); the toggle applies
  immediately via the `pet:menu-float` broadcast (renderer `floatMode`) plus a
  main-process alignment fallback. Backed by `pet:get/set-menu-float` +
  `pet:menu-float` channels (contract/preload mirror/tests synced),
  `wm.applyMenuMode()` and renderer-side capture-phase mousedown drag detection.
  Pitfalls: Electron `screen.getDisplayMatching` requires a full rectangle
  (`{x,y,width,height}`); a bare `{x,y}` point throws "conversion failure" (noted in
  code with a defensive try/catch); the renderer float-mode flag is driven by the
  toggle broadcast, not by `outerWidth < screen.width` (that size check is always
  true now that the window is always a panel — removed).
- **Floating menu · sixth round (content clipping fix + BongoCat-style system
  drag)** (2026-10-21): user reported "the top of the personal-info card is
  visibly clipped by the floating panel". Two root causes found and re-verified
  via CDP: ① the skin's `.position` element runs an infinite **`breath` animation
  (8s)** that slowly drifts the whole menu content ±4px, so the left-card /
  quests-list top kept kissing (and half the time crossing) the window's top
  edge; `.menu-app .position { animation-name: none !important }` stops it — 8s
  sampling shows zero drift and a constant static chain (viewport top = top +
  constant, cross-checked), ② `.left-card`'s `top:-180px` overhang (full-screen
  era design) sat the card 51px above the viewport in the 600px panel — recalibrated
  to `top:-120.8px` (card top flush with the content area at 2px, bottom 519 fully
  visible) and the quests `ul#quests` to `-84.8px` — CDP: zero clipping, fixed
  positions. **Drag upgraded to dual-channel (mirroring BongoCat's system move
  loop)**: while floatMode, `.menu-app` inlines `-webkit-app-region: drag`
  (interactive elements — li/input/buttons/quest slots etc. — get `no-drag` so
  they stay clickable), with the original JS `window.moveTo` capture-drag kept as
  an environment fallback (mutually exclusive). Build-chain reminder: `npm run
  dist:win` does NOT run `vite build` — always `npm run build` first when only
  CSS/JS changed (learned the hard way this round: two verifications read stale
  artifacts).
- **Floating menu · seventh round (left-card / quest-empty visual consistency)**
  (2026-10-21): user felt the left card was "whiter than it should be" — its
  background went from `rgba(255,255,255,0.92)` to `0.85`, matching the
  translucent white of the right-side quest sub-panels / menu rows exactly; the
  quest empty-state row ("其他任务暂无内容") gained the same background so all
  rows share one style. CDP: all three computed backgrounds 0.85, left-card
  position unchanged (t=2.03/b=519.03).
- **Rounds 9–13 ("Item Shop / Trading Post" not-open tip dialog)** (2026-10-22): the "道具商店"
  row opens a tip layer styled after the SAO Utils 2 quit-confirm dialog, reusing
  SAO Utils 2's original assets in `public/sao/` — `dialog.png` (350×253 faceplate)
  plus the 40×40 badge icons `ok.png`/`cancel.png` (incl. -hovered variants).
  **Round 11 final (user asked to look up how SAO Utils 2 does it)**: located the
  official implementation source under `E:\SAO Utils 2\win64\qml\` —
  `com\gpbeta\private\DialogTemplate.qml` + `Packages\com.gpbeta.theme.sao\qml\ThemeDialog.qml`,
  and rebuilt every parameter from the source: buttons are plain-image ImageButtons
  (40×40, `buttonSpacing 110`, `buttonOffset 28`, bottom-centered Row); dialog.png is
  a BorderImage 9-slice (top 74 / bottom 96 / left-right 16); title top 30, 19px
  `#AA333333` + Glow; body 16px `#BB333333` with 1px white drop-shadow; scale-in
  (0.1→1) animation. The red decoration line/capsule buttons previously inferred
  from the screenshot were confirmed as background noise/misreading and removed.
  CDP: 40×40 borderless buttons, gap 110, 28px from bottom, title/body params match
  the source, all close paths work. Menu stays open; 确定 / 取消 / mask all close.
  **Round 12**: user reported the text blended into the panel — raised title/body
  color from the source's translucent #AA333333/#BB333333 to rgba(51,51,51,.92) +
  font-weight 500 (the source's Medium weight, missed initially) + a faint white
  underline shadow; contrast ~4.7:1 → 7.52:1, layout untouched.
  **Round 13**: the 交易行 (Trading Post) row now opens the same tip dialog with
  dynamic body text per item (`openShopTip('交易行')` / `{{ shopTipName }}`); CDP
  verified both entries and both close paths.
  (Assets and source reference from the local SAO Utils 2 installation, for
  personal local use.)
- **Round 8 (HD avatar + profile-editor save/cancel fully visible)**
  (2026-10-22):
  - **Avatar no longer blurry**: upload chain upgraded from "128px PNG → dataURL in
    settings (≤256KB)" to "2048px JPEG q0.92 → main process writes
    `sao-pet-data/avatar.jpg` → settings stores only the short filename, legacy
    dataURL values still display"; rendering goes through the custom
    **`pet-avatar://`** protocol (Chromium blocks file:// sub-resources from
    file:// pages; protocol needs `standard` privilege + explicit
    `image/jpeg` MIME). Left-card 216×288 portrait and editor preview (60×80)
    sync in HD.
  - **Editor save/cancel no longer shadowed**: content measured ~626px against the
    604px window — the buttons (y 592–628) sat mostly off-window → compressed
    spacing (title/grid/inputs/footer/preview box) + `max-height:100vh`; mask
    background 0.35 → **0.15** ("no shadow" per user). CDP: editor 567px fully
    on-window, footer 534.5–570.5 fully visible, buttons clickable.
- **Right-click "Control Panel" on the gear**: a dedicated config card window
  (`config.html` / `src/ConfigApp.vue`, 240×168 translucent white plate matching the v2
  palette) now holds the two toggles **game mode** and **show-cat-in-game**, moved out of
  the full-screen menu's sub-menu rows. Rows are live-synced via the shared
  `pet:set-game` / `pet:set-showcat` channels and `pet:game` / `pet:showcat` broadcasts
  (menu, gear, panel and the `Alt+C` hotkey all mirror each other). The panel closes on
  blur or Esc, and toggles on another right-click of the gear; it joins the pin chain
  (full-screen menu → control panel → gear).
- **Editable FF14 profile** ("用户 > 个人信息" → 冒险者手册): an edit card pops up inside
  the full-screen menu with **character name / data-center / world / job / level (0–999) /
  title / free company** (data-center, world and job offer datalist suggestions plus free
  text; built-in CN data-centers, common worlds, and every combat/crafter/gatherer job incl.
  the 7.0 Viper and Pictomancer). 保存 persists through the new `pet:profile-set` channel
  into the atomically-written `profile` key of `settings.json` (whitelist keys, typecast and
  length-capped), broadcasts `pet:profile`, and the menu's left-info box (previously the
  static 'Kirito' / 'Welcome to SAO world') now renders the live profile. Data stays local.
- **Profile round 2** (2026-10-19): the left-info box is a "character card" — a two-column,
  equally-spaced grid that **always shows all 9 fields** (empty ones read 未填写 in grey)
  topped by a round avatar; new **信仰** (the Twelve, suggested list + free text) and
  **日期** fields; "部队 / 自由公司" is renamed "部队"; the zone/world/job/faith suggestion
  lists scroll **inside the dropdown** when long, and clicking an input never scrolls the
  card/page (editor card is fixed-fit); **avatar upload**: the picture is center-cropped and
  compressed to a 128px PNG via canvas → `pet:avatar-set` → the `avatar` key of settings
  (256KB cap) → `pet:avatar` broadcast keeps all windows in sync.
- Text color scheme replicated from SAO Utils 2, v2 (final, sampled from the installed
  theme resources `E:\SAO Utils 2\Packages\com.gpbeta.theme.sao`: the launcher plates are
  white `#FFFFFF` / translucent white `rgba(255,255,255,.85)`, hover/active are gold
  `#F2B116`-`#FBB717` with white text, idle icons/text are charcoal `#333333` — matching
  `ItemButton.qml` idle `#CC333333` / hover `#EEFFFFFF`): menu-bar icons, sub-menu rows and
  left-info text are now charcoal `#333333` on the skin's white plates; hover/active turn
  gold `#F2B116` with white glyphs. All v1 blue glow + `text-stroke` overrides removed
  (they made idle text blurry and lowered contrast on white plates). Bundles the original
  `SAOUI-Regular.otf` font (`@font-face 'SAO UI'`) so the menu text matches SAO Utils 2.

### 🐛 Bug Fixes

- **Left-info card becomes a "character portrait frame"**: the 88px round avatar was still too
  small, so the card top is now a **rectangular portrait frame** (deep-indigo gradient;
  uploaded images `cover` the whole rectangle; without an image a large gold user icon
  fills the frame). After the user said 216×170 still read as a square, the frame now uses
  the standard **3:4 portrait character-card ratio → 216×288** (used by mainstream
  character/promo art; FF14's Lodestone adventurer card 320×440 ≈ 8:11 is close; 2:3 for
  full-body art, 16:9 for landscape banners). CDP-verified 216×290 incl. border (ratio
  1.34), fully inside the viewport; the editor preview matches the 3:4 ratio (60×80) and
  the empty-state gold icon grew to 128px. (Card geometry cheatsheet: `.left-card` must
  keep `box-sizing:border-box` — a content-box 240px card is really 266px wide and touches
  the icon column; with border-box + `left:calc(-25px - 240px - 10px)` the gap is 35px.)
- **Fixed a Vite/LightningCSS comment mishap**: an HTML-style `<!-- ... -->` inside the
  `<style>` block survived minification as `\<!-- ... -->` and made the CSS parser swallow
  the entire following rule (`.lc-portrait`'s computed style fell back to defaults — CDP
  verified); restoring `/* */` fixed it (216×170 frame + gradient ✓, 35px gap ✓, the
  user-uploaded image fills the frame ✓, dropdown/wheel regression ✓).
- **Quest system — task bar revamp + Quest Tavern** (2026-10-19, layout picked by the user):
  the quest tab's "主线任务/支线任务" placeholders became **接取任务 (fa-plus-circle) /
  个人任务 (fa-list-ul) / 其他任务 (fa-ellipsis-h)**; clicking a row opens a sub-panel on
  the **right side of that row** (same row styling, absolute `left:100%` inside the `li`):
  Accept = empty state "暂无可接取任务" + "前往任务酒馆"; Personal/Other = the unfinished
  quest list (numbered) + "前往任务酒馆". "前往任务酒馆" opens the **fourth window, the
  Quest Tavern** (640×460 independent plate, SAO Utils 2 settings-window layout: draggable
  top bar with a self-drawn ×/Esc close, left nav **任务大厅 (empty placeholder) / 个人任务**).
  Personal quests render as an **Excel-style table** (bold grey header 序号/任务内容/是否完成,
  thin grid + alternating row tint): **unfinished-only by default** with a "仅未完成/全部"
  toggle, a **+ per row inserts a new row below it** plus a fixed "＋ 添加任务" row at the
  bottom, inline cell editing (Enter/blur saves, blank saves = row deleted, Esc cancels),
  check = gold ✓ + grey strikethrough, per-row × deletes. Since the tavern nav has no
  "其他任务" page, a **"个人/其他" group segment** sits next to the completion toggle to
  manage the other-quest category. Data persists in the new `quests` settings key
  (personal/other groups, {id/text/done}, ≤200 rows, ≤200 chars), via
  `pet:quests-get` (sync) / `pet:quests-set` / `pet:quests` broadcast to every window —
  same pattern as the avatar. The pin chain grows to four windows
  (menu → config → tavern → gear). CDP-verified end to end, including a quest the user
  typed live ("仓科收银集群") surviving redeploy, menu sub-panel sync, and z-order
  (tavern Topmost=True). Two traps recorded for posterity: **Vue 2 never proxies
  underscore-prefixed data** (`_uidSeq` was always undefined → task ids contained `NaN`;
  renamed `uidSeq`), and **CSS block comments cannot nest** (a `/*` inside a comment body
  closes early → RollupError "Unexpected '/'").
- **Dropdown tail was clipped**: two layers — the editor card's baseline `overflow:auto`
  (not just the earlier `overflow:hidden`) cut off lists opening downward, so the last
  rows were unreachable; switching to `overflow:visible` lets the lists overflow fully.
  Also, native scrolling of the list proved broken in this environment (real injected
  wheel events did not move scrollTop), so both the list and its input now `@wheel` —
  advancing `scrollTop` manually in JS (both directions, page stays put). The avatar was
  enlarged to 88px to match the old big-square footprint.
- **Observable topmost execution**: the pin helper now spawns
  `%SystemRoot%\System32\WindowsPowerShell\...\powershell.exe` by absolute path and
  captures exit code / stderr (non-zero exits are logged) instead of failing silently.
- Reverted `focusable:false` on the gear window (WS_EX_NOACTIVATE swallows mouse input on
  Windows); the control panel's blur-to-close now has a **400ms gear-focus grace** so a
  right-click toggles it off instead of closing-and-reopening it.
- Topmost hardening: pin is now re-attempted after boot (1/2/4/8/16s, covers window
  creation races) and re-asserted every 25s, so the gear/menu recover within 25s even when
  other topmost window sets (e.g. a running SAO Utils 2) or the security layer clear the
  `WS_EX_TOPMOST` bit. Verified: pet z=25 / menu z=28, both `Topmost=True`, above
  SAO Utils 2's topmost Qt windows.

- Topmost pin order reversed: the gear pet is now pinned **after** the fullscreen menu
  (SetWindowPos stacking order), so the gear stays visible on top even while the menu is
  open — clicking the gear to toggle the menu no longer hides it under the menu window.
- `electron/main.cjs` is marked deprecated (legacy single-window entry); package entry moved
  to `electron/index.cjs`.

### ♻️ Refactoring

- Restructured the main process following BongoCat's code types and style: the monolithic
  `electron/pet.cjs` (~750 lines) is split into single-responsibility modules
  (`index.cjs` assembly + wiring, `app-log`, `paths`, `settings`, `ipc-contract`, `events`,
  `window-manager`, `topmost`, `game-mode`, `drag`, `audio`, `hotkeys`, `diag`).
- `window-manager` is now the sole owner of the pet/menu windows; other modules read them
  through getters and cooperate via the typed event bus in `events.cjs`.
- All IPC channel names are declared only in `ipc-contract.cjs`; the sandboxed preload
  (`pet-preload.cjs`) mirrors the same channel strings inline (relative requires are not
  allowed in sandboxed preloads), and a static test keeps the two copies in lockstep.

### ⚙️ Configuration

- `settings.json` now carries `schema_version: 1` and `snake_case` keys
  (`game_mode` / `profile` / `avatar` / `home_x` / `home_y`).
- The `profile` sub-fields gained `faith` (信仰) and `date` (日期); a new `avatar` key holds
  the character-icon base64 data URL (256KB cap; oversized values fall back to '').
- **Removed the "show-cat-in-game" toggle and the `Alt+C` hotkey** (2026-10-15; its semantics
  overlapped/conflicted with game mode): the control panel now has a single "game mode" row;
  the `pet:get-showcat` / `set-showcat` / `showcat` channels, the three preload methods and
  the `show_cat_in_game` settings key are all gone (leftovers in old settings files are
  silently ignored).
- Game mode behavior is now fixed: with game mode on, a full-screen game/app in the
  foreground **hides the gear automatically**; returning to the desktop restores it.
- `--diag` timeline updated: game mode is toggled directly from the main process at 27s
  (the renderer `toggleGame` no longer exists), 32s injects a fullscreen rect (expect hidden),
  34s a desktop-sized rect (expect shown), 36s restores game mode.
- Legacy camelCase settings (`gameMode` / `showCat` / `homeX` / `homeY`) are migrated
  automatically on first launch, with the old file kept as `settings.json.bak`.
- Corrupt settings files are backed up as `settings.json.corrupt-<ts>` and replaced with
  defaults; a non-`1` `schema_version` is rejected explicitly (no silent conversion).
- All writes are atomic (same-directory temp file + rename).

### 🧪 Testing

- Added `node --test` unit tests (21 cases): `electron/tests/settings.test.cjs` (v0→v1
  migration, corruption recovery, type fallback, atomic writes, `profile` key whitelist /
  typecast / persistence, `avatar` key round-trip and length cap), `events.test.cjs` (event bus contract),
  `ipc-contract.test.cjs` (channel uniqueness, payload contract) and
  `preload-contract.test.cjs` (sandbox-preload channel mirror stays in lockstep).
- Added `npm run check` (syntax-check every `electron/*.cjs`) and `npm test`.

### 📝 Documentation

- Added `AGENTS.md` (working agreement incl. the BongoCat ↔ SAO module mapping table).
- Added bilingual `README.md` / `README.zh-CN.md` and this changelog pair, following
  BongoCat's documentation conventions.