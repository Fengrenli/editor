/**
 * 删除根目录及 apps/*、packages/*、tooling/* 下的 node_modules。
 * 从 bun 改 npm 或出现 Invalid Version / tsc 指向 packages/.../node_modules/typescript 时，应先执行再 npm install。
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const toRemove = [path.join(root, "node_modules")];

for (const sub of ["apps", "packages", "tooling"]) {
	const subRoot = path.join(root, sub);
	if (!fs.existsSync(subRoot)) continue;
	for (const name of fs.readdirSync(subRoot, { withFileTypes: true })) {
		if (!name.isDirectory()) continue;
		toRemove.push(path.join(subRoot, name.name, "node_modules"));
	}
}

let failed = false;
for (const dir of toRemove) {
	if (!fs.existsSync(dir)) continue;
	try {
		fs.rmSync(dir, { recursive: true, force: true });
		console.log("removed", path.relative(root, dir) || "node_modules");
	} catch (e) {
		failed = true;
		console.error("failed:", dir);
		console.error(e instanceof Error ? e.message : e);
	}
}

if (failed) {
	console.error(
		"\n若提示 EPERM/EBUSY：请关闭 dev server、Next、Electron、杀毒对 node_modules 的扫描，再在资源管理器中结束占用该目录的 node 进程后重试。",
	);
	process.exit(1);
}
