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
  skillMd: path.join(scriptDir, "codex-skill-md-zh.mjs"),
  prompts: path.join(scriptDir, "codex-prompt-md-zh.mjs"),
};

function usage() {
  console.log(`
Codex 中文化统一入口

用法:
  codex-zh-localizer audit
  codex-zh-localizer dry-run
  codex-zh-localizer apply
  codex-zh-localizer restore-marketplace latest
  codex-zh-localizer restore-components latest
  codex-zh-localizer restore-skill-md latest
  codex-zh-localizer restore-prompts latest

常用:
  # Codex 更新或缓存刷新后，重新中文化支持范围内的元数据
  codex-zh-localizer apply

  # 只检查覆盖率，不写入
  codex-zh-localizer audit --strict

  # 对临时 HOME 做测试
  codex-zh-localizer apply --home /tmp/fake-home --backup-root /tmp/backups
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
  run("技能描述 dry-run", scripts.skillMd, ["--dry-run", ...passthrough]);
  run("提示词描述 dry-run", scripts.prompts, ["--dry-run", ...passthrough]);
  run("审计覆盖率", scripts.audit, passthrough);
} else if (command === "apply") {
  run("插件卡片中文化", scripts.marketplace, ["--apply", ...passthrough]);
  run("详情组件中文化", scripts.components, ["--apply", ...passthrough]);
  run("技能描述中文化", scripts.skillMd, ["--apply", ...passthrough]);
  run("提示词描述中文化", scripts.prompts, ["--apply", ...passthrough]);
  run("审计覆盖率", scripts.audit, ["--strict", ...passthrough]);
} else if (command === "restore-marketplace") {
  run("恢复插件卡片备份", scripts.marketplace, ["--restore", passthrough[0] || "latest", ...passthrough.slice(1)]);
} else if (command === "restore-components") {
  run("恢复详情组件备份", scripts.components, ["--restore", passthrough[0] || "latest", ...passthrough.slice(1)]);
} else if (command === "restore-skill-md") {
  run("恢复技能描述备份", scripts.skillMd, ["--restore", passthrough[0] || "latest", ...passthrough.slice(1)]);
} else if (command === "restore-prompts") {
  run("恢复提示词描述备份", scripts.prompts, ["--restore", passthrough[0] || "latest", ...passthrough.slice(1)]);
} else {
  console.error(`未知命令：${command}`);
  usage();
  process.exit(1);
}
