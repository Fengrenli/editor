/**
 * Electron main: spawns Next standalone using the same runtime as Electron (ELECTRON_RUN_AS_NODE).
 */
const { app, BrowserWindow, shell, dialog } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const APP_DISPLAY_NAME = 'Rdesign'

const isDev = process.env.REDITOR_DESKTOP_DEV === '1'
const PORT = process.env.REDITOR_PORT || '43120'

app.setName(APP_DISPLAY_NAME)

let mainWindow = null
let serverProcess = null
let shuttingDown = false

function getServerLogPath() {
  try {
    const dir = app.getPath('userData')
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'rdesign-server.log')
  } catch {
    return null
  }
}

function showFatal(message, detail) {
  const lines = [message]
  if (detail) lines.push('', String(detail))
  try {
    dialog.showErrorBox(APP_DISPLAY_NAME, lines.join('\n'))
  } catch {
    // ignore
  }
}

/** 读取日志文件末尾，避免整文件读入内存 */
function readLogTail(logPath, maxBytes = 8000) {
  try {
    if (!logPath || !fs.existsSync(logPath)) {
      return ''
    }
    const stat = fs.statSync(logPath)
    if (stat.size === 0) {
      return ''
    }
    const len = Math.min(maxBytes, stat.size)
    const fd = fs.openSync(logPath, 'r')
    const buf = Buffer.alloc(len)
    fs.readSync(fd, buf, 0, len, stat.size - len)
    fs.closeSync(fd)
    return buf.toString('utf8')
  } catch {
    return ''
  }
}

function getServerDir() {
  if (isDev) {
    return path.join(__dirname, '..', 'editor', '.next', 'standalone', 'apps', 'editor')
  }
  return path.join(process.resourcesPath, 'next', 'apps', 'editor')
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    let n = 0
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        n += 1
        if (n >= attempts) {
          reject(new Error(`Server not responding at ${url}`))
        } else {
          setTimeout(tryOnce, 200)
        }
      })
    }
    tryOnce()
  })
}

function startNextServer(logPath) {
  const serverDir = getServerDir()
  const serverJs = path.join(serverDir, 'server.js')
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT,
    HOSTNAME: '127.0.0.1',
  }

  if (!isDev) {
    // 继承的 NODE_OPTIONS（如 --inspect）可能导致 ELECTRON_RUN_AS_NODE 子进程异常退出
    delete env.NODE_OPTIONS
    /** standalone 根目录下的 node_modules（含 @next/env）；与 server.js 内修正的 tracingRoot 一致 */
    const nextRoot = path.join(process.resourcesPath, 'next')
    const nodePathExtra = [
      path.join(nextRoot, 'node_modules'),
      path.join(nextRoot, 'apps', 'editor', 'node_modules'),
    ].join(path.delimiter)
    env.NODE_PATH = env.NODE_PATH
      ? `${nodePathExtra}${path.delimiter}${env.NODE_PATH}`
      : nodePathExtra
  }

  if (isDev) {
    return spawn('node', [serverJs], {
      cwd: serverDir,
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })
  }

  if (!fs.existsSync(serverJs)) {
    showFatal('找不到内置网页服务文件。', `请重装应用。缺少：\n${serverJs}`)
    return null
  }

  /**
   * 不能直接把 fs.createWriteStream 传给 stdio：流在打开前 fd 为 null，
   * Node/Electron 的 spawn 会报 ERR_INVALID_ARG_VALUE。改用 pipe 再接到日志文件。
   */
  const stdio = logPath ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'ignore']
  let child
  try {
    child = spawn(process.execPath, [serverJs], {
      cwd: serverDir,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      stdio,
      windowsHide: true,
    })
  } catch (err) {
    showFatal('无法创建内置服务进程。', String(err?.message || err))
    return null
  }

  let logStream = null
  if (logPath && child.stdout && child.stderr) {
    try {
      logStream = fs.createWriteStream(logPath, { flags: 'a' })
      logStream.write(`\n\n--- ${new Date().toISOString()} ---\n`)
      logStream.write(
        `[bootstrap] cwd=${serverDir}\n[bootstrap] serverJs=${serverJs}\n[bootstrap] electron=${process.versions.electron} node=${process.versions.node}\n`,
      )
      child.stdout.pipe(logStream, { end: false })
      child.stderr.pipe(logStream, { end: false })
    } catch {
      logStream = null
    }
  }

  const endLog = () => {
    try {
      logStream?.end()
    } catch {
      // ignore
    }
  }
  child.on('close', endLog)
  child.on('error', endLog)

  return child
}

function createWindow(logHint) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#1f2433',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  })

  let showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
    }
    showFallback = null
  }, 8000)

  mainWindow.once('ready-to-show', () => {
    if (showFallback) {
      clearTimeout(showFallback)
      showFallback = null
    }
    mainWindow?.show()
  })

  const url = isDev ? 'http://127.0.0.1:3002' : `http://127.0.0.1:${PORT}`
  mainWindow.loadURL(url).catch((e) => {
    showFatal(
      '无法打开编辑器页面。',
      `${e?.message || e}${logHint ? `\n\n${logHint}` : ''}`,
    )
  })

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, code, desc, validatedURL, isMainFrame) => {
      if (isMainFrame === false) return
      showFatal(
        '页面加载失败。',
        `URL: ${validatedURL}\n错误: ${code} ${desc}${logHint ? `\n\n${logHint}` : ''}`,
      )
    },
  )

  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  const logPath = !isDev ? getServerLogPath() : null
  const logHint = logPath ? `服务日志：\n${logPath}` : ''

  if (!isDev) {
    serverProcess = startNextServer(logPath)
    if (!serverProcess) {
      app.quit()
      return
    }

    serverProcess.on('error', (err) => {
      showFatal('无法启动内置服务。', `${err?.message || err}\n\n${logHint}`)
      app.quit()
    })

    serverProcess.on('exit', (code, signal) => {
      if (shuttingDown) return
      if (code === 0 || code === null) return
      setTimeout(() => {
        const tail = readLogTail(logPath)
        showFatal(
          '内置服务已意外退出。',
          `退出代码: ${code}${signal ? ` (${signal})` : ''}\n\n${logHint}` +
            (tail
              ? `\n\n--- 日志尾部 ---\n${tail}`
              : '\n\n（日志仍为空时可尝试：安装 VC++ 运行库 x64、暂时关闭杀毒、或将本日志路径文件发给开发人员。）'),
        )
        app.quit()
      }, 400)
    })

    try {
      await waitForServer(`http://127.0.0.1:${PORT}/`)
    } catch (e) {
      const tail = readLogTail(logPath)
      showFatal(
        '内置网页服务未在预计时间内启动。',
        `${e?.message || e}\n端口 ${PORT} 可能被占用。\n\n${logHint}` +
          (tail ? `\n\n--- 日志尾部 ---\n${tail}` : ''),
      )
      shuttingDown = true
      serverProcess.kill()
      serverProcess = null
      app.quit()
      return
    }
  }

  createWindow(logHint)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(logHint)
    }
  })
}).catch((err) => {
  console.error('[desktop] whenReady', err)
  try {
    dialog.showErrorBox(APP_DISPLAY_NAME, `启动失败：\n\n${err?.message || err}`)
  } catch {
    // ignore
  }
  app.quit()
})

app.on('window-all-closed', () => {
  shuttingDown = true
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  app.quit()
})
