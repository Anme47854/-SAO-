# SAO-UIMenu-Pet（SAO 菜单桌宠）

SAO menu desktop pet for Windows — a transparent, always-on-top gear widget that lives in the
corner of your screen and opens a fullscreen SAO-styled menu with a light click. Code structure
and style follow [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat) (Electron + Vue 2.7
port of its architecture).

<div align="center">

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

## Features

| Feature | Description |
| --- | --- |
| Gear always on top | Real `SetWindowPos(HWND_TOPMOST)` via an external PowerShell helper — works even under DLP/security software that hooks in-process user32 calls (event-driven re-pin, no polling) |
| Fullscreen SAO menu | `Alt+A` (fallback `Ctrl+Shift+A`) or a light click on the gear opens the fullscreen SAO menu (sao-ui-beta skin) |
| Game mode | Foreground fullscreen detection → the gear **hides automatically** while a fullscreen game/app is foreground and reappears on the desktop (the "show cat in game" toggle and its `Alt+C` hotkey were removed; behavior is fixed) |
| Control panel | **Right-click the gear** to open/close the `SAO 配置面板` window: the game-mode toggle, live-synced with the menu and the gear |
| Editable FF14 profile | Menu 用户 > 个人信息 opens an editor (name / data-center / world / job / level / title / free company, datalist + free text); 保存 updates the menu's left-info live; data stays local |
| Persisted settings | `sao-pet-data/settings.json`, now `schema_version: 1` with `snake_case` keys; legacy camelCase data migrates automatically (backup kept) |
| Self-diagnostics | `--diag` drives drag/click/game-mode simulations and reports every step to `sao-pet-log.txt` |

## Quick start (development)

```powershell
# remove the polluted env var first if present (see handover doc):
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm install       # first run only (uses package-lock.json)
npm run dev       # terminal 1: vite dev server on http://127.0.0.1:5173
npm run app:dev   # terminal 2: electron with DevTools
```

## Build & package

```powershell
npm run build       # vite build → dist/
npm run dist:win    # electron-builder → release/win-unpacked + portable exe
```

- On this machine the NSIS portable step ends with a known-harmless `mmap size` error;
  deploy from `release/win-unpacked/`.
- Deploy target: `C:\Users\YWB\AppData\Local\Programs\SAO-PET` (keep the `sao-pet-data`
  folder when replacing files so settings survive).

## Usage

| Action | Result |
| --- | --- |
| Click the gear | Open / close the fullscreen menu |
| Drag the gear | Move it; the position is remembered after the drag ends |
| `Alt+A` / `Ctrl+Shift+A` | Toggle the fullscreen menu (global hotkey; `Alt+C` removed) |
| Right-click the gear | Open / close the control panel (game-mode toggle; right-click again to close) |
| Menu 用户 > 个人信息 | Opens the FF14 profile editor; 保存 updates the left-info live |
| Menu bottom panel | Sound on/off · Quit (game mode lives in the control panel) |

## Architecture (BongoCat-style)

```
electron/
├── index.cjs            # entry: wiring, event routing, lifecycle, IPC registration
├── app-log.cjs          # logging (rotation, tmpdir fallback)
├── paths.cjs            # portable data/log/settings paths
├── settings.cjs         # config store: schema_version, snake_case, atomic writes, v0 migration
├── ipc-contract.cjs     # channel names + payload contracts (single source of truth)
├── events.cjs           # main-process typed event bus
├── window-manager.cjs   # sole owner of the two BrowserWindows
├── topmost.cjs          # external SetWindowPos pin (one-shot + event-driven)
├── game-mode.cjs        # foreground fullscreen detection, cat show/hide
├── drag.cjs             # gear drag state machine
├── audio.cjs            # mute state singleton + broadcast
├── hotkeys.cjs          # global hotkeys with conflict fallback
├── diag.cjs             # --diag self-diagnostics
├── pet-preload.cjs      # contextBridge (window.petAPI)
├── main.cjs             # deprecated legacy single-window entry (do not use)
└── tests/               # node --test unit tests
```

Modules talk through the typed event bus; the renderer talks through the channels declared in
`ipc-contract.cjs`. See [AGENTS.md](AGENTS.md) for the full working agreement and the
BongoCat mapping table.

## Verification

```text
npm run check   # node --check on every electron/*.cjs
npm test        # node --test unit tests (settings migration/recovery, IPC contract)
npm run app -- --diag   # self-diagnostic run (simulated drag/click/game-mode)
```

Window z-order / TOPMOST verification: run `.verify-z.ps1` in a trusted PowerShell.

## Related documents

- [HANDOVER.md](HANDOVER.md) — handover doc for human maintainers (start here)
- [交接文档.md](交接文档.md) — per-round handover log: machine pitfalls, deployment, CDP verification
- [AGENTS.md](AGENTS.md) — AI/coding-agent working agreement
- [按钮交接文档.md](按钮交接文档.md) — behavior of every menu button/area
- [README-DEMO.md](README-DEMO.md) — demo page (sao-ui-beta component gallery)
- Code-style reference: [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat) (Apache-2.0,
  read-only archive at `E:\harnesss\bongocat-src`)