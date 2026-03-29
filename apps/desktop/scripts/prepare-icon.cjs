/**
 * 从仓库根目录的 LOGO1.jpg 或 installer/source-logo.* 生成 electron-builder 用 icon.png（1024²，白底 contain）。
 * 环境变量 RDESIGN_ICON_SOURCE 可覆盖源文件路径。
 */
const fs = require('node:fs')
const path = require('node:path')

const desktopDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(desktopDir, '../..')
const installerDir = path.join(desktopDir, 'installer')
const outPng = path.join(installerDir, 'icon.png')

function findSource() {
  const env = process.env.RDESIGN_ICON_SOURCE?.trim()
  if (env) {
    const abs = path.resolve(env)
    if (fs.existsSync(abs)) {
      return abs
    }
    console.error('[prepare-icon] RDESIGN_ICON_SOURCE 指向的文件不存在:', abs)
    process.exit(1)
  }

  const candidates = [
    path.join(repoRoot, 'LOGO1.jpg'),
    path.join(repoRoot, 'LOGO1.png'),
    path.join(installerDir, 'source-logo.jpg'),
    path.join(installerDir, 'source-logo.jpeg'),
    path.join(installerDir, 'source-logo.png'),
    path.join(installerDir, 'source-logo.webp'),
  ]

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  return null
}

;(async () => {
  const src = findSource()
  if (!src) {
    if (fs.existsSync(outPng)) {
      console.log('[prepare-icon] 未找到源图，沿用已有', outPng)
      return
    }
    console.error(
      '[prepare-icon] 未找到图标源文件。请任选其一：\n' +
        `  - 仓库根目录 LOGO1.jpg / LOGO1.png\n` +
        `  - ${path.join('apps', 'desktop', 'installer', 'source-logo.jpg')}（或 .png）\n` +
        '  - 或设置环境变量 RDESIGN_ICON_SOURCE=绝对路径',
    )
    process.exit(1)
  }

  let sharp
  try {
    sharp = require('sharp')
  } catch {
    console.error('[prepare-icon] 请先在 apps/desktop 执行: npm install（需要 sharp）')
    process.exit(1)
  }

  fs.mkdirSync(installerDir, { recursive: true })

  await sharp(src)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(outPng)

  console.log('[prepare-icon] OK', src, '→', outPng)
})().catch((err) => {
  console.error('[prepare-icon]', err)
  process.exit(1)
})
