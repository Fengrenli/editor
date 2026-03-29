/**
 * electron-builder 依赖根目录 hoist 的 app-builder-bin；若缺失或被杀软损坏，会报 ERR_ELECTRON_BUILDER_CANNOT_EXECUTE。
 * 在 prepare / electron-builder 之前运行，给出明确修复命令。
 */
const fs = require('node:fs')
const path = require('node:path')

const desktopDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(desktopDir, '../..')
const exe = path.join(
  repoRoot,
  'node_modules',
  'app-builder-bin',
  'win',
  'x64',
  'app-builder.exe',
)

if (!fs.existsSync(exe)) {
  console.error(
    '[desktop] 未找到 app-builder.exe：\n  ',
    exe,
    '\n请在仓库根目录执行（会拉全 electron-builder 原生依赖）：\n' +
      '  npm install --workspace=desktop --foreground-scripts\n' +
      '或：\n' +
      '  npm run reinstall\n',
  )
  process.exit(1)
}

try {
  const buf = Buffer.alloc(2)
  const fd = fs.openSync(exe, 'r')
  fs.readSync(fd, buf, 0, 2, 0)
  fs.closeSync(fd)
  if (buf[0] !== 0x4d || buf[1] !== 0x5a) {
    throw new Error('不是有效的 Windows PE 可执行文件（可能下载不完整）')
  }
} catch (e) {
  console.error(
    '[desktop] app-builder.exe 异常：',
    e?.message || e,
    '\n路径：',
    exe,
    '\n请删除该文件后执行：npm install --workspace=desktop --foreground-scripts',
  )
  process.exit(1)
}
