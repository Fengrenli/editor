/**
 * Copies Next `standalone` trace + static assets + public into dist/next for electron extraResources.
 * Prerequisite: `apps/editor` has been built (`next build` with output: 'standalone').
 */
const fs = require('node:fs')
const path = require('node:path')

const desktopDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(desktopDir, '../..')
const editorDir = path.join(repoRoot, 'apps', 'editor')
const standaloneRoot = path.join(editorDir, '.next', 'standalone')
const outDir = path.join(desktopDir, 'dist', 'next')

/**
 * Bun 等会在 standalone 里留下指向仓库外 store 的符号链接（如 node_modules/next）。
 * `fs.cpSync` 在目标侧复制 symlink 时，Windows 常需提升权限（errno 1314），且打包后仍指向本机绝对路径。
 * 遍历复制：遇 symlink 则复制 realpath 下的真实文件/目录，目标树中不出现 symlink。
 */
function copyTreeResolvingSymlinks(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name)
    const d = path.join(dest, ent.name)
    if (ent.isSymbolicLink()) {
      const real = fs.realpathSync(s)
      const st = fs.statSync(real)
      if (st.isDirectory()) {
        copyTreeResolvingSymlinks(real, d)
      } else {
        fs.copyFileSync(real, d)
      }
      continue
    }
    if (ent.isDirectory()) {
      copyTreeResolvingSymlinks(s, d)
      continue
    }
    fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(path.join(standaloneRoot, 'apps', 'editor', 'server.js'))) {
  console.error(
    '[prepare-next] Missing apps/editor/.next/standalone. Run from repo root:\n' +
      '  npx turbo run build --filter=editor\n' +
      'or:\n' +
      '  cd apps/editor && npx dotenv-cli -e ./.env.local -- npx next build',
  )
  process.exit(1)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
copyTreeResolvingSymlinks(standaloneRoot, outDir)

/** Next 运行时需要；若未走 turbo 先构建 editor，standalone 可能是旧缓存，会缺此包 */
const swcInteropProbe = path.join(
  outDir,
  'apps',
  'editor',
  'node_modules',
  '@swc',
  'helpers',
  '_',
  '_interop_require_default',
  'package.json',
)

function ensureSwcHelpers() {
  if (fs.existsSync(swcInteropProbe)) {
    return
  }
  const candidates = [
    path.join(editorDir, 'node_modules', '@swc', 'helpers'),
    path.join(repoRoot, 'node_modules', '@swc', 'helpers'),
  ]
  for (const src of candidates) {
    if (!fs.existsSync(src)) {
      continue
    }
    const dest = path.join(outDir, 'apps', 'editor', 'node_modules', '@swc', 'helpers')
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    copyTreeResolvingSymlinks(src, dest)
    console.warn('[prepare-next] standalone 缺少 @swc/helpers，已从以下路径补拷：\n  ', src)
    break
  }
  if (!fs.existsSync(swcInteropProbe)) {
    console.error(
      '[prepare-next] 仍缺少 @swc/helpers（win-unpacked 会报 MODULE_NOT_FOUND）。请按顺序执行：\n' +
        '  1) 仓库根目录：bun install 或 npm install\n' +
        '  2) npx turbo run build --filter=editor --force\n' +
        '  3) 再打包桌面：建议用仓库根目录 npm run build:desktop（会先构建 editor）\n' +
        '  若必须在 apps/desktop 下执行 npm run build:desktop，请务必先做第 2 步。',
    )
    process.exit(1)
  }
}

ensureSwcHelpers()

/**
 * standalone 的 server.js 会把构建机上的 outputFileTracingRoot / turbopack.root 打进 JSON（如 D:\\Reditor-main）。
 * 换盘、安装到其它目录后该路径不存在，Next 会按错误根去拼 node_modules，触发 @next/env、@swc/helpers 等 MODULE_NOT_FOUND。
 * 在 stringify 进环境变量之前改为「当前包内」的 standalone 根：.../resources/next
 */
function patchStandaloneServerTracingRoot(serverJsPath) {
  if (!fs.existsSync(serverJsPath)) {
    return
  }
  let s = fs.readFileSync(serverJsPath, 'utf8')
  const needle =
    'process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)'
  if (!s.includes(needle)) {
    console.warn(
      '[prepare-next] 未找到 standalone 配置注入标记，跳过 portable tracing 修正（请确认 Next 版本未改 server.js 模板）',
    )
    return
  }
  const inject = `{const __rdTraceRoot=path.resolve(__dirname,'..','..');nextConfig.outputFileTracingRoot=__rdTraceRoot;if(nextConfig.turbopack)nextConfig.turbopack.root=__rdTraceRoot}\n`
  s = s.replace(needle, inject + needle)
  fs.writeFileSync(serverJsPath, s)
}

patchStandaloneServerTracingRoot(path.join(outDir, 'apps', 'editor', 'server.js'))

const staticSrc = path.join(editorDir, '.next', 'static')
const staticDest = path.join(outDir, 'apps', 'editor', '.next', 'static')
if (!fs.existsSync(staticSrc)) {
  console.error('[prepare-next] Missing apps/editor/.next/static')
  process.exit(1)
}
fs.mkdirSync(path.dirname(staticDest), { recursive: true })
fs.cpSync(staticSrc, staticDest, { recursive: true })

const publicSrc = path.join(editorDir, 'public')
const publicDest = path.join(outDir, 'apps', 'editor', 'public')
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true })
}

console.log('[prepare-next] OK →', outDir)
