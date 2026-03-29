# Rdesign 桌面版 — 分发与使用说明

## 产品目标：单机、任意电脑可用

**本意**是把 Rdesign 做成 **单机桌面程序**：用户 **不需要** 安装 Node、不需要连你们开发机、不需要登录你们内网；在常见 **64 位 Windows 10/11** 上，拿到 **完整安装包或绿色文件夹** 后即可本地运行。内置网页服务（Next standalone）与界面资源均 **随安装包/解压目录携带**；`prepare-next` 已避免把本机符号链接打进包内，以免换盘符或他人电脑出现 `Cannot find module 'next'`。

**对方电脑仍需满足（与多数桌面软件一致）：** 系统为 **Windows x64**；建议安装 **[VC++ 2015–2022 x64 运行库](https://aka.ms/vs/17/release/vc_redist.x64.exe)**（若启动报错再装）；若遇 SmartScreen/杀毒拦截，需按提示放行。未做 **代码签名** 时，Windows 可能提示「未知发布者」，属正常现象，与是否单机无关。

---

## 打包（仅用 npm，推荐）

全程用 **PowerShell**，路径按你本机改为 `D:\Reditor-main`。

```powershell
Set-Location D:\Reditor-main
npm install
```

**从 bun 换 npm、或曾混用两种安装方式时，务必先清掉所有 workspace 的依赖树再装：**

```powershell
Set-Location D:\Reditor-main
npm run reinstall
```

（等价：先 **`npm run clean:node_modules`** 再 **`npm install`**。仅删根目录 `node_modules` **不够**：`packages/core/node_modules/.bin` 等里若残留 **`tsc.exe` / `tsc.bunx`**，会继续指向不存在的 `packages/.../typescript`，`turbo` / `tsc --build` 会报 **`MODULE_NOT_FOUND`**。）

仓库根目录已提供 **`.npmrc`**（`legacy-peer-deps=true`）。

**`npm error Invalid Version:`**（冒号后为空）：多为 **损坏的 `package-lock.json`**（含大量 `"path": {}` 且无 `version`）或 **旧 `node_modules` 与 npm 11 dedupe 冲突**。处理：**`npm run reinstall`**；若仍失败再删 **`package-lock.json`** 后 **`npm install`**。根目录 **`package-lock.json` 已纳入版本管理**，请勿再忽略该文件。

**若仍出现 `Cannot read properties of null (reading 'matches')`：** 根目录已移除未使用的 **`portless`**（旧版 npm 11 会在此处崩溃）。请先同步仓库再装依赖。

仍失败时可依次尝试：

1. 清缓存后 **`npm run reinstall`**
2. **`npm cache clean --force`** 后再装
3. 关闭占用 `.node` 文件的进程（Next / Electron / IDE）后再装；若 **`EBUSY` / `EPERM`**，在任务管理器结束相关 **node** 进程
4. 仍不行时试用 **Node 20 LTS** + 自带 npm 10（[nvm-windows](https://github.com/coreybutler/nvm-windows)）

打桌面前建议 **显式装好桌面工作区的 dev 依赖**（含 **`electron` postinstall** 与 **`app-builder-bin`**），避免 hoist 不完整：

```powershell
Set-Location D:\Reditor-main
npm install --workspace=desktop --foreground-scripts
```

然后 **强制重编 editor + 打桌面包**（一条链，避免旧 standalone）：

```powershell
npx turbo run build --filter=editor --force
npm run build:desktop
```

**`ERR_ELECTRON_BUILDER_CANNOT_EXECUTE`（指向 `app-builder.exe`）** 常见含义：

1. **根本没有 `app-builder.exe`**（根目录 `node_modules\app-builder-bin\win\x64\`）→ 执行上一段 **`npm install --workspace=desktop --foreground-scripts`**，或 **`npm run reinstall`**。
2. **exe 在，但子进程失败退出**（网络拉 **NSIS / winCodeSign** 超时、7z 解压符号链失败等）→ 看终端里 **app-builder 上方几行** 的真实报错；网络不稳时可设镜像后重试，例如（PowerShell 当前会话）：
   ```powershell
   $env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
   npm run build:desktop
   ```
3. **杀软拦截 `app-builder.exe`** → 暂时排除 `node_modules`，或关闭实时防护后再装依赖、再打包。
4. **只要绿色目录、不装 NSIS**（少下载工具链）→ 在 **`apps\desktop`** 执行 **`npm run build:desktop:dir`**，产物仍为 **`release\win-unpacked`**。

`build:desktop` 前会自动跑 **`ensure-app-builder.cjs`**：缺文件会直接在终端提示，而不会在 electron-builder 里才报含糊的 `CANNOT_EXECUTE`。

桌面壳若单独缺依赖（例如 **`sharp`**），再执行：

```powershell
Set-Location D:\Reditor-main\apps\desktop
npm install
```

（若仍失败，可 `npm install --legacy-peer-deps`。）

**可选：跳过在线下载 Electron**（本机已有解压目录且含 `electron.exe`）：

```powershell
$env:REDITOR_ELECTRON_DIST = "C:\Users\Admin\Downloads\electron-v34.5.8-win32-x64"
Set-Location D:\Reditor-main\apps\desktop
npm install
npm run build:desktop:local-electron
```

**产物：** `apps\desktop\release\win-unpacked\Rdesign.exe` 等。

---

本文供 **你本人先按「自测清单」验证**，确认无误后，将 **「给同事」** 一节原样或略改后发给对方即可。

---

## 一、你本人：打包后自测清单（建议逐项打勾）

在把文件发给同事前，在 **你的电脑** 上完成：

| 序号 | 检查项 | 说明 |
|------|--------|------|
| 1 | 已从仓库完成构建 | **推荐一条命令（先编 editor 再桌面包，避免旧 standalone）：** 在 **仓库根目录** `D:\Reditor-main` 执行 `npm run build:desktop` 或 `npx turbo run build --filter=editor --force` 后 `cd apps/desktop && npm run build:desktop`。也可在 **`apps/desktop`** 执行 **`npm run build:desktop:from-root`**（内部会 `turbo run build:desktop`）。**不要**在没重新构建 editor 的情况下反复只跑 `npm run build:desktop`，否则会沿用旧的 `.next/standalone`，易出现缺 `next` / `@swc/helpers`。 |
| 2 | 已确认产物存在 | `apps/desktop/release/` 下至少有 **`win-unpacked`** 文件夹；若有 **`Rdesign-*-Portable.exe`** 或 **`Rdesign-Setup-*.exe`** 也可一并验证。 |
| 3 | **解压目录** 能启动 | 进入 **`release\win-unpacked`**，双击 **`Rdesign.exe`**，能正常进编辑器、无明显报错。 |
| 4 | **不要**在 zip 里直接点 exe | 将 `win-unpacked` **打成 zip 后**，自己再 **解压到新文件夹**，只运行解压后的 **`Rdesign.exe`**，确认仍能打开。（模拟同事操作） |
| 5 | （可选）便携包 | 若生成了 **`Rdesign-*-Portable.exe`**，双击运行，确认可用。 |
| 6 | （可选）安装包 | 若需使用 **Setup.exe**，在本机试装一遍；若双击无反应，多为 SmartScreen/杀毒拦截，属未签名安装包常见情况，可改发 **便携 exe** 或 **win-unpacked 整夹 zip**。 |

> **若启动后提示内置服务退出、日志里是 `Cannot find module 'next'`：** 多为旧版打包脚本把 Bun 生成的 **符号链接式 `node_modules/next`** 原样打进包内所致。请更新仓库中的 `prepare-next.cjs` 后 **重新 `turbo build` + `build:desktop`**，再测解压目录与 zip。  
> **若日志为 `Cannot find module '@swc/helpers/...'`：** 需在 **`apps/editor`** 中保证 **`@swc/helpers`** 打入 standalone（已配置 **`outputFileTracingIncludes`** 与直接依赖），然后 **重新 `turbo build --filter=editor` 并重新打桌面包**。

**结论：** 第 3、4 步都通过，再发给同事最稳妥。

---

## 二、给同事（方式 A：压缩包 — 推荐与你们当前做法一致）

把 **`win-unpacked` 整个文件夹** 打成 **zip** 发给对方后，请对方 **严格按顺序** 操作：

### 步骤 1：解压（必须）

1. 将收到的 **zip 文件** 保存到电脑本地（如桌面或 `D:\` 下）。
2. **右键 zip →「全部解压…」**（或「解压到 xxx\」），选一个 **普通文件夹**，例如：`桌面\Rdesign` 或 `D:\Rdesign`。  
3. 等待解压完成，应能看到文件夹里有 **`Rdesign.exe`**，以及多个 **`.dll`**、**`resources`** 文件夹等。

> **重要：** 不要在压缩软件或资源管理器里 **不解压、直接双击压缩包里的 `Rdesign.exe`**。程序依赖同目录下的文件，否则会无法启动或异常。

### 步骤 2：启动

1. 打开 **解压后** 的那个文件夹（不是 zip 里面）。  
2. 双击 **`Rdesign.exe`**。  
3. 若出现 **Windows 已保护你的电脑** / **SmartScreen**：请点击 **「更多信息」**，再点 **「仍要运行」**。  
4. 若杀毒软件提示拦截，请选择 **「允许」** 或将本程序加入信任（视公司安全策略而定）。

### 步骤 3：无法打开时

- 确认是 **64 位 Windows 10/11**（本版本为 x64）。  
- 若提示缺少运行库，请安装 **Microsoft Visual C++ 2015–2022 可再发行组件（x64）**：  
  https://aka.ms/vs/17/release/vc_redist.x64.exe  
- 仍失败：在解压目录查找或让用户提供日志路径（若程序曾弹出错误框，一般会写明日志路径），联系 **（此处填你的名字/技术支持）**。

---

## 三、给同事（方式 B：便携版 — 单文件，说明更简单）

若你提供的是 **`Rdesign-x.x.x-Portable.exe`**（名称以实际打包为准）：

1. 将 exe 保存到本地任意文件夹（**不要**放在只读网盘根目录若被策略限制写入）。  
2. 双击运行；同样可能遇到 SmartScreen / 杀毒，处理方式见 **方式 A 步骤 2**。  
3. 首次运行可能略慢（释放到临时目录），属正常现象。

---

## 四、给同事（方式 C：安装包 Setup — 可选）

若提供 **`Rdesign-Setup-x.x.x.exe`**：

1. **不要**在 zip 里直接运行安装包；先 **解压到文件夹** 再双击 Setup（若你是把 Setup 也打在 zip 里发出的）。  
2. 双击 Setup，按向导选择安装目录并完成安装。  
3. 若 **双击完全无反应**：多为系统或杀毒拦截未签名的安装程序，可改用 **方式 A** 或 **方式 B**。

---

## 五、给你自己的备忘（版本与路径）

- **构建输出目录：** `D:\Reditor-main\apps\desktop\release\`（路径随你本机仓库而定）。  
- **绿色版（整夹）：** `release\win-unpacked\` → 打 zip 分发。  
- **便携单文件：** `release\Rdesign-*-Portable.exe`（若已配置 portable 目标）。  
- **安装包：** `release\Rdesign-Setup-*.exe`。  
- 更技术向的记录见同目录 **`项目调试阶段记录.md`** 中「阶段 16」。

---

## 六、可直接复制给同事的「极简版」话术

```
【Rdesign 使用步骤】
1. 把我发你的压缩包保存到电脑，右键选择「全部解压」到一个文件夹（例如桌面上的 Rdesign 文件夹）。
2. 打开解压后的文件夹（不要直接在 zip 里点开程序）。
3. 双击 Rdesign.exe 启动。
4. 若提示 Windows 已保护你的电脑，请点击「更多信息」→「仍要运行」。
5. 打不开请联系我，并说明系统版本与是否有报错截图。
```

（若发的是 Portable.exe，把第 1～2 步改成：「保存 exe 到任意文件夹，双击运行」即可。）
