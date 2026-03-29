/**
 * 确保已设置 REDITOR_ELECTRON_DIST（electron-builder.config.cjs 用其跳过在线下载 Electron）。
 */
const fs = require('node:fs')
const path = require('node:path')

const raw = process.env.REDITOR_ELECTRON_DIST?.trim()
if (!raw) {
  console.error(
    '[desktop] 请先在当前终端设置环境变量 REDITOR_ELECTRON_DIST，指向已解压的 Electron 根目录（内含 electron.exe）。\n' +
      '  PowerShell 示例：\n' +
      '    $env:REDITOR_ELECTRON_DIST = "C:\\\\Users\\\\你\\\\Downloads\\\\electron-v34.5.8-win32-x64"\n' +
      '    npm run build:desktop:local-electron',
  )
  process.exit(1)
}

const resolved = path.resolve(raw)
const dir = fs.existsSync(resolved) && fs.statSync(resolved).isFile()
  ? path.dirname(resolved)
  : resolved
const exe = path.join(dir, 'electron.exe')
if (!fs.existsSync(exe)) {
  console.error(`[desktop] 未找到 electron.exe：\n${exe}`)
  process.exit(1)
}
