// SAO 菜单桌宠 —— ipc-contract.cjs 单元测试（node --test）
// 契约守卫：通道名唯一、枚举完整、preload 暴露的 API 与契约一致
'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { CHANNELS, PAYLOADS, PRELOAD_API } = require('../ipc-contract.cjs')

test('channel names are unique', () => {
  const values = Object.values(CHANNELS)
  assert.strictEqual(new Set(values).size, values.length, 'duplicate channel names')
})

test('every channel has a payload contract entry', () => {
  // PAYLOADS 以通道名的字符串值做键（与 preload/主进程拿到的一致）
  for (const channel of Object.values(CHANNELS)) {
    assert.ok(channel in PAYLOADS, 'missing payload contract for ' + channel)
  }
})

test('preload API surface matches the documented contract', () => {
  const expected = [
    'openFull',
    'hideFull',
    'dragStart',
    'dragEnd',
    'quit',
    'openConfig',
    'closeConfig',
    'getMuted',
    'setMuted',
    'onMute',
    'getGame',
    'setGame',
    'onGame',
    'getProfile',
    'setProfile',
    'onProfile',
    'getAvatar',
    'setAvatar',
    'onAvatar',
    'getQuests',
    'setQuests',
    'onQuests',
    'openTavern',
    'closeTavern',
    'onTavern',
    'getMenuFloat',
    'setMenuFloat',
    'onMenuFloat',
    'onOpenFull',
    'onHotkey'
  ]
  assert.deepStrictEqual([...PRELOAD_API].sort(), expected.sort())
})

test('channels use the historical pet:* namespace (renderer bundle compatibility)', () => {
  for (const name of Object.values(CHANNELS)) {
    assert.ok(name.startsWith('pet:'), 'channel must stay in pet:* namespace: ' + name)
  }
})