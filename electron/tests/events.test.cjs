// SAO 菜单桌宠 —— events.cjs 单元测试（node --test）
// 覆盖：具名事件注册/触发/once/解除、未知事件显式拒绝、单监听器异常不拖垮总线
'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { createBus, EVENTS } = require('../events.cjs')

const silentLog = { info() {}, warn() {}, error() {} }

test('known events can be subscribed and emitted with payload', () => {
  const bus = createBus({ log: silentLog })
  let got = null
  bus.on(EVENTS.AUDIO_MUTED_CHANGED, v => {
    got = v
  })
  bus.emit(EVENTS.AUDIO_MUTED_CHANGED, true)
  assert.strictEqual(got, true)
})

test('once listeners fire exactly once', () => {
  const bus = createBus({ log: silentLog })
  let n = 0
  bus.once(EVENTS.GAME_MODE_CHANGED, () => {
    n += 1
  })
  bus.emit(EVENTS.GAME_MODE_CHANGED, true)
  bus.emit(EVENTS.GAME_MODE_CHANGED, false)
  assert.strictEqual(n, 1)
})

test('off removes a listener', () => {
  const bus = createBus({ log: silentLog })
  let n = 0
  const fn = () => {
    n += 1
  }
  bus.on(EVENTS.HOTKEY_MENU, fn)
  bus.off(EVENTS.HOTKEY_MENU, fn)
  bus.emit(EVENTS.HOTKEY_MENU)
  assert.strictEqual(n, 0)
})

test('unknown event strings are rejected explicitly', () => {
  const bus = createBus({ log: silentLog })
  assert.throws(() => bus.on('no:such-event', () => {}), /unknown event/)
  assert.throws(() => bus.emit('no:such-event'), /unknown event/)
})

test('a throwing listener does not break other listeners or emit', () => {
  const bus = createBus({ log: silentLog })
  let got = null
  bus.on(EVENTS.PROFILE_CHANGED, () => {
    throw new Error('listener boom')
  })
  bus.on(EVENTS.PROFILE_CHANGED, v => {
    got = v
  })
  bus.emit(EVENTS.PROFILE_CHANGED, { name: 'test' })
  assert.deepStrictEqual(got, { name: 'test' })
})

test('all documented events are registerable', () => {
  const bus = createBus({ log: silentLog })
  for (const event of Object.values(EVENTS)) {
    bus.on(event, () => {}) // 不应抛 unknown event
  }
})