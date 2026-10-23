// SAO 菜单桌宠 —— preload 与 ipc-contract 一致性测试（node --test）
// 沙箱 preload 不能 require 相对文件，所以 pet-preload.cjs 内联镜像了 CHANNELS；
// 本测试静态比对两侧通道字符串集合，双向强制一致（防漂移）。
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const { CHANNELS } = require('../ipc-contract.cjs')

const PRELOAD_SRC = fs.readFileSync(path.join(__dirname, '..', 'pet-preload.cjs'), 'utf8')

test('preload channel literals match ipc-contract CHANNELS exactly (both directions)', () => {
  const inlined = [...PRELOAD_SRC.matchAll(/'pet:[a-z-]+'/g)].map(m => m[0].slice(1, -1))
  assert.ok(inlined.length > 0, 'expected preload to reference pet:* channel literals')
  const contract = Object.values(CHANNELS)
  // 1) preload 用到的每个通道都在契约里
  for (const c of inlined) {
    assert.ok(contract.includes(c), 'preload uses channel not in ipc-contract: ' + c)
  }
  // 2) 契约里每个通道都被 preload 用到（preload 没漏通道）
  for (const c of contract) {
    assert.ok(inlined.includes(c), 'ipc-contract channel missing from preload: ' + c)
  }
  assert.deepStrictEqual([...inlined].sort(), [...contract].sort())
})

test('preload does not require relative modules (sandbox constraint)', () => {
  assert.ok(!/require\(\s*['"]\.\//.test(PRELOAD_SRC), 'preload must not require relative modules')
  assert.ok(!/require\(\s*['"]\.\.\//.test(PRELOAD_SRC), 'preload must not require parent modules')
})