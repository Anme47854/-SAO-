// SAO 菜单桌宠 —— 主进程语法检查脚本（npm run check）
// 逐个 node --check electron/ 下的 .cjs，防止模块拆分后出现低级语法错误
'use strict'

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')

function collect(dir) {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) out.push(...collect(full))
    else if (name.endsWith('.cjs')) out.push(full)
  }
  return out
}

const files = collect(path.join(root, 'electron'))
let failed = 0
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    console.log('ok   ' + path.relative(root, file))
  } catch (e) {
    failed += 1
    console.error('FAIL ' + path.relative(root, file))
    process.stderr.write(String(e.stderr || ''))
  }
}
if (failed) {
  console.error(failed + ' file(s) failed syntax check')
  process.exit(1)
}
console.log('OK: ' + files.length + ' cjs file(s) passed node --check')