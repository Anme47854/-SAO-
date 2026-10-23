// SAO 菜单桌宠 —— 日志（仿 bongocat-log：单一写入入口、级别区分、大小轮转、主文件写失败
// 回退 tmpdir —— "程序在哪一步挂掉，sao-pet-log.txt 会如实记录"的保证来源）
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const DEFAULT_MAX_BYTES = 512 * 1024 // 512KB 触发轮转（翻倍成 .1，保留最近两份）

// 工厂：注入日志文件路径后返回 { info, warn, error, file, rotate }
function createLogger({ file, maxBytes = DEFAULT_MAX_BYTES }) {
  const fallbackFile = path.join(os.tmpdir(), 'sao-pet-log.txt')
  let current = null // 最近一次成功写入的目标文件

  function write(msg) {
    const line = new Date().toISOString() + '  ' + msg + '\n'
    let ok = false
    for (const target of [file, fallbackFile]) {
      try {
        if (target === file && !ok && current === file) {
          // 主文件已写入过：先按尺寸轮转
          try {
            const st = fs.statSync(target)
            if (st.size > maxBytes) {
              fs.copyFileSync(target, target + '.1')
              fs.truncateSync(target, 0)
            }
          } catch (e) {
            /* 首次写入 / stat 失败不轮转 */
          }
        }
        fs.appendFileSync(target, line)
        current = target
        ok = true
        break
      } catch (e) {
        /* 尝试下一个位置 */
      }
    }
    return ok
  }

  return {
    file,
    info: msg => write(msg),
    warn: msg => write('WARN ' + msg),
    error: msg => write('ERROR ' + msg),
    // 自诊断/开机横幅类消息（语义上与 info 等价，保留别名便于阅读）
    line: msg => write(msg)
  }
}

module.exports = { createLogger }