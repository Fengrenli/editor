/**
 * 合并 package.json 的 build 配置；若设置环境变量 REDITOR_ELECTRON_DIST 指向已解压的
 * Electron 根目录，或直指其中的 electron.exe，则跳过从 GitHub 下载 Electron。
 */
const fs = require('node:fs')
const path = require('node:path')
const pkg = require('./package.json')

const base = { ...(pkg.build || {}) }

/** npm workspaces 常把 electron 提升到仓库根，electron-builder 默认只查本包 node_modules */
const monorepoRoot = path.resolve(__dirname, '../..')
function readElectronVersion(dir) {
  try {
    const p = path.join(dir, 'node_modules', 'electron', 'package.json')
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8')).version
    }
  } catch {
    /* ignore */
  }
  return null
}
const resolvedElectronVersion =
  readElectronVersion(__dirname) || readElectronVersion(monorepoRoot)
if (resolvedElectronVersion) {
  base.electronVersion = resolvedElectronVersion
}

/** 使用 npm 安装的 electron 自带的 dist，避免打包时再走 GitHub 下载（易超时或被墙） */
function electronDistFromModule(searchRoot) {
  try {
    const pkgPath = require.resolve('electron/package.json', {
      paths: [searchRoot, __dirname],
    })
    const dist = path.join(path.dirname(pkgPath), 'dist')
    const exe = path.join(dist, 'electron.exe')
    if (fs.existsSync(exe)) {
      return dist
    }
  } catch {
    /* ignore */
  }
  return null
}

const raw = process.env.REDITOR_ELECTRON_DIST?.trim()
if (raw) {
  const resolved = path.resolve(raw)
  let electronDist = resolved
  try {
    if (
      fs.existsSync(resolved) &&
      fs.statSync(resolved).isFile() &&
      path.basename(resolved).toLowerCase() === 'electron.exe'
    ) {
      electronDist = path.dirname(resolved)
    }
  } catch {
    // fall through to directory check
  }
  const exe = path.join(electronDist, 'electron.exe')
  if (!fs.existsSync(exe)) {
    throw new Error(
      `[electron-builder] REDITOR_ELECTRON_DIST 请设为 Electron 解压目录，或设为其中的 electron.exe 路径。未找到：${exe}`,
    )
  }
  base.electronDist = electronDist
} else {
  const fromMod =
    electronDistFromModule(monorepoRoot) || electronDistFromModule(__dirname)
  if (fromMod) {
    base.electronDist = fromMod
  }
}

/**
 * npm workspaces 下 electron-builder 会在 apps/desktop 内跑 production install，
 * 常把根目录 hoist 的 app-builder-bin / electron-builder 弄没，随后 spawn app-builder.exe ENOENT。
 * 桌面壳无 npm 生产依赖（仅 main + extraResources），跳过对 app 目录的依赖安装/重建。
 */
base.npmRebuild = true
base.beforeBuild = async () => false

module.exports = base
