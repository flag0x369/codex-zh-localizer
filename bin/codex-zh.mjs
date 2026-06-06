#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rawArgs = process.argv.slice(2);
const command = rawArgs[0] || "audit";
const passthrough = rawArgs.slice(1);

const scripts = {
  audit: path.join(scriptDir, "codex-zh-audit.mjs"),
  marketplace: path.join(scriptDir, "codex-plugin-marketplace-zh.mjs"),
  components: path.join(scriptDir, "codex-plugin-components-zh.mjs"),
};

function usage() {
  console.log(`
Codex 中文化统一入口

用法:
  node scripts/codex-zh.mjs audit
  node scripts/codex-zh.mjs dry-run
  node scripts/codex-zh.mjs apply
  node scripts/codex-zh.mjs restore-marketplace latest
  node scripts/codex-zh.mjs restore-components latest

常用:
  # Codex 更新或缓存刷新后，重新中文化支持范围内的元数据
  node scripts/codex-zh.mjs apply

  # 只检查覆盖率，不写入
  node scripts/codex-zh.mjs audit --strict

  # 对临时 HOME 做测试
  node scripts/codex-zh.mjs apply --home /tmp/fake-home --backup-root /tmp/backups
`);
}

function run(label, filePath, args) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, [filePath, ...args], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (command === "--help" || command === "-h" || command === "help") {
  usage();
  process.exit(0);
}

if (command === "audit" || command === "status") {
  run("审计覆盖率", scripts.audit, passthrough);
} else if (command === "dry-run") {
  run("插件卡片 dry-run", scripts.marketplace, ["--dry-run", ...passthrough]);
  run("详情组件 dry-run", scripts.components, ["--dry-run", ...passthrough]);
  run("审计覆盖率", scripts.audit, passthrough);
} else if (command === "apply") {
  run("插件卡片中文化", scripts.marketplace, ["--apply", ...passthrough]);
  run("详情组件中文化", scripts.components, ["--apply", ...passthrough]);
  run("审计覆盖率", scripts.audit, ["--strict", ...passthrough]);
} else if (command === "restore-marketplace") {
  run("恢复插件卡片备份", scripts.marketplace, ["--restore", passthrough[0] || "latest", ...passthrough.slice(1)]);
} else if (command === "restore-components") {
  run("恢复详情组件备份", scripts.components, ["--restore", passthrough[0] || "latest", ...passthrough.slice(1)]);
} else {
  console.error(`未知命令：${command}`);
  usage();
  process.exit(1);
}
