// SAO 菜单桌宠 —— settings.cjs 单元测试（node --test）
// 覆盖：v0(camelCase)→v1 迁移、损坏恢复、schema_version 拒绝、类型回落、原子写
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { createSettings, SCHEMA_VERSION } = require('../settings.cjs')

const silentLog = { info() {}, warn() {}, error() {} }

function tmpFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saosettings-'))
  return path.join(dir, name)
}

test('legacy v0 (camelCase) settings migrate to v1 snake_case, values preserved, backup kept', () => {
  const file = tmpFile('settings.json')
  fs.writeFileSync(file, JSON.stringify({ gameMode: true, homeX: 12, homeY: 34 }))
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('game_mode'), true)
  assert.strictEqual(s.get('home_x'), 12)
  assert.strictEqual(s.get('home_y'), 34)
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.strictEqual(raw.schema_version, SCHEMA_VERSION)
  assert.strictEqual(raw.game_mode, true)
  assert.strictEqual(raw.home_x, 12)
  // 迁移前旧文件留档
  const bak = JSON.parse(fs.readFileSync(file + '.bak', 'utf8'))
  assert.strictEqual(bak.gameMode, true)
})

test('v1 file loads as-is; unknown fields never enter memory state', () => {
  const file = tmpFile('settings.json')
  fs.writeFileSync(
    file,
    JSON.stringify({ schema_version: 1, game_mode: true, rogue: 'x' })
  )
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('game_mode'), true)
  // load 只读：未知键被丢弃在内存态之外，磁盘文件保持原样（不随启动重写）
  assert.strictEqual(s.snapshot().rogue, undefined)
  assert.ok(!('rogue' in s.snapshot()))
})

test('profile object key round-trips and is sanitized', () => {
  const file = tmpFile('settings.json')
  fs.writeFileSync(
    file,
    JSON.stringify({
      schema_version: 1,
      profile: { name: 'Alice', zone: '陆行鸟', world: 42, level: 75, rogue: 1 }
    })
  )
  const s = createSettings({ file, log: silentLog })
  s.load()
  // 白名单键保留（非法类型回落空串），未知键丢弃
  assert.deepStrictEqual(s.get('profile'), { name: 'Alice', zone: '陆行鸟', world: '', level: 75 })
  // 写入后原子落盘并可在重载后读回
  s.set('profile', { name: 'Bob', level: 9999 })
  const s2 = createSettings({ file, log: silentLog })
  s2.load()
  assert.deepStrictEqual(s2.get('profile'), { name: 'Bob', level: 999 })
})

test('avatar key round-trips, keeps legacy dataURL, and is length-capped', () => {
  const file = tmpFile('settings.json')
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('avatar'), '') // 默认空
  // 八轮起 avatar 存 sao-pet-data 内短文件名（如 'avatar.jpg'）
  s.set('avatar', 'avatar.jpg')
  assert.strictEqual(s.get('avatar'), 'avatar.jpg')
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).avatar, 'avatar.jpg')
  // 旧版 dataURL 值读取兼容（长度在限内可 round-trip，仅作显示兼容）
  s.set('avatar', 'data:image/png;base64,AAAA')
  assert.strictEqual(s.get('avatar'), 'data:image/png;base64,AAAA')
  // 超长（旧 dataURL 数百 KB）不再允许写盘 → 回落空串（文件存盘替代 settings 大字段）
  s.set('avatar', 'x'.repeat(300000))
  assert.strictEqual(s.get('avatar'), '')
})

test('quests key round-trips personal/other groups and sanitizes entries', () => {
  const file = tmpFile('settings.json')
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.deepStrictEqual(s.get('quests'), { personal: [], other: [] }) // 默认两组空
  s.set('quests', {
    personal: [
      { id: 'a1', text: '打完零式', done: false },
      { id: 'a2', text: '看看云海日出', done: true }
    ],
    other: [{ id: 'b1', text: '拍一张风景照', done: false, rogue: true }],
    rogue: 'x' // 未知键丢弃
  })
  const q = s.get('quests')
  assert.strictEqual(q.personal.length, 2)
  assert.strictEqual(q.personal[1].done, true)
  assert.strictEqual(q.other[0].text, '拍一张风景照') // 未知字段被丢弃但不炸
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).quests, q) // 原子落盘
  // 非法条目（缺 id / 缺 text / 非对象）逐个被滤掉
  s.set('quests', { personal: [{ id: 'x' }, { text: 'no-id' }, 7, 's'], other: 'not-array' })
  assert.deepStrictEqual(s.get('quests'), { personal: [], other: [] })
  // 条数上限 200、单条文本上限 200 字符
  s.set('quests', {
    personal: Array.from({ length: 300 }, (_, i) => ({ id: 'id' + i, text: 'x'.repeat(500), done: false }))
  })
  const capped = s.get('quests')
  assert.strictEqual(capped.personal.length, 200)
  assert.ok(capped.personal[0].text.length <= 200)
  // 重载读回
  const s2 = createSettings({ file, log: silentLog })
  s2.load()
  assert.deepStrictEqual(s2.get('quests'), capped)
})

test('menu_float key round-trips and menu_float_pos sanitizes coordinates', () => {
  const file = tmpFile('settings.json')
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('menu_float'), false) // 默认：全屏盖屏
  s.set('menu_float', true)
  assert.strictEqual(s.get('menu_float'), true)
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).menu_float, true) // 原子落盘
  s.set('menu_float', 'yes') // 非布尔回落默认
  assert.strictEqual(s.get('menu_float'), false)
  // 位置：合法对象（x/y 有限数）保留并取整；非法回落 null
  s.set('menu_float_pos', { x: 12.6, y: -300.4 })
  assert.deepStrictEqual(s.get('menu_float_pos'), { x: 13, y: -300 })
  s.set('menu_float_pos', { x: 'a', y: 1 })
  assert.strictEqual(s.get('menu_float_pos'), null)
  s.set('menu_float_pos', null)
  assert.strictEqual(s.get('menu_float_pos'), null)
})

test('schema_version != 1 is rejected and rewritten as clean v1 defaults (no crash)', () => {
  const file = tmpFile('settings.json')
  fs.writeFileSync(file, JSON.stringify({ schema_version: 99, game_mode: true }))
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('game_mode'), false) // 默认值
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.strictEqual(raw.schema_version, 1)
})

test('corrupt file falls back to defaults and keeps a .corrupt-* backup', () => {
  const file = tmpFile('settings.json')
  fs.writeFileSync(file, '{ not json !!!')
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('game_mode'), false)
  assert.deepStrictEqual(s.get('profile'), {})
  const dir = path.dirname(file)
  const backups = fs.readdirSync(dir).filter(f => f.startsWith('settings.json.corrupt-'))
  assert.ok(backups.length >= 1, 'expected a corrupt backup file')
  // 损坏文件被默认值文件覆盖，可再次正常读取
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.strictEqual(raw.schema_version, 1)
})

test('wrong value types fall back to defaults instead of crashing', () => {
  const file = tmpFile('settings.json')
  fs.writeFileSync(
    file,
    JSON.stringify({ schema_version: 1, game_mode: 'yes', home_x: 'a', home_y: null })
  )
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('game_mode'), false)
  assert.strictEqual(s.get('home_x'), null)
  assert.strictEqual(s.get('home_y'), null)
})

test('set/assign persist atomically (tmp + rename) and survive reload', () => {
  const file = tmpFile('settings.json')
  const s = createSettings({ file, log: silentLog })
  s.load()
  s.set('game_mode', true)
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).game_mode, true)
  s.assign({ home_x: 5, home_y: 6 })
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.strictEqual(raw.home_x, 5)
  assert.strictEqual(raw.home_y, 6)
  // 重新加载后状态保持
  const s2 = createSettings({ file, log: silentLog })
  s2.load()
  assert.strictEqual(s2.get('game_mode'), true)
  assert.strictEqual(s2.get('home_x'), 5)
})

test('first run with no file starts on defaults and writes a v1 file', () => {
  const file = tmpFile('settings.json')
  const s = createSettings({ file, log: silentLog })
  s.load()
  assert.strictEqual(s.get('game_mode'), false)
  assert.strictEqual(fs.existsSync(file), true)
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).schema_version, 1)
})