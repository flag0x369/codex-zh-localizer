#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const rawArgs = process.argv.slice(2);

function argValue(name) {
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : null;
}

const homeDir = path.resolve(argValue("--home") || process.env.CODEX_ZH_HOME || os.homedir());
const projectRoot = path.resolve(argValue("--project-root") || process.env.CODEX_ZH_PROJECT_ROOT || process.cwd());
const backupRoot = path.resolve(
  argValue("--backup-root") ||
  process.env.CODEX_ZH_BACKUP_ROOT ||
  path.join(workspaceRoot, "codex-plugin-marketplace-zh-backups"),
);
const backupKind = "prompt-md-description-zh";
const onlyName = argValue("--only");
const restoreIndex = rawArgs.indexOf("--restore");
const restoreValue = argValue("--restore");

const args = new Set(rawArgs);
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;
const force = args.has("--force");

const seenPaths = new Set();

function uniquePath(filePath) {
  if (seenPaths.has(filePath)) return false;
  seenPaths.add(filePath);
  return true;
}

function ancestorCodexSubdirs(startDir, subdir) {
  const roots = [];
  let current = path.resolve(startDir);
  const stopAt = path.dirname(homeDir);
  while (current && current !== path.dirname(current)) {
    roots.push(path.join(current, ".codex", subdir));
    if (current === homeDir || current === stopAt) break;
    current = path.dirname(current);
  }
  return roots;
}

const promptRoots = [
  path.join(homeDir, ".codex", "prompts"),
  ...ancestorCodexSubdirs(projectRoot, "prompts"),
].filter(uniquePath);

const descriptionTranslations = {
  "opsx-apply": "执行 OpenSpec 变更中的任务（实验性）",
  "opsx-archive": "归档已完成的实验性变更",
  "opsx-explore": "进入探索模式：梳理想法、调查问题并澄清需求",
  "opsx-propose": "提出新变更：一次生成所有相关工件",
  "opsx-sync": "把变更中的增量规格同步到主规格",
};

const phraseReplacements = [
  [/Implement tasks from an OpenSpec change(?: \(Experimental\))?/gi, "执行 OpenSpec 变更中的任务（实验性）"],
  [/Archive a completed change in the experimental workflow/gi, "归档已完成的实验性变更"],
  [/Enter explore mode - think through ideas, investigate problems, clarify requirements/gi, "进入探索模式：梳理想法、调查问题并澄清需求"],
  [/Propose a new change - create it and generate all artifacts in one step/gi, "提出新变更：一次生成所有相关工件"],
  [/Sync delta specs from a change to main specs/gi, "把变更中的增量规格同步到主规格"],
  [/OpenSpec change/gi, "OpenSpec 变更"],
  [/experimental workflow/gi, "实验性工作流"],
  [/requirements/gi, "需求"],
  [/artifacts/gi, "工件"],
];

function usage() {
  console.log(`
Codex prompt 描述中文化工具

用法:
  node bin/codex-prompt-md-zh.mjs --dry-run
  node bin/codex-prompt-md-zh.mjs --apply
  node bin/codex-prompt-md-zh.mjs --restore latest

说明:
  默认 dry-run，不写入。
  只中文化 .codex/prompts/*.md frontmatter 的 description。
  不修改 prompt 文件名、命令名、argument-hint 或正文执行规则。
`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function hasCjk(value) {
  return typeof value === "string" && /[\u3400-\u9fff]/.test(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function walk(dir, predicate, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(fullPath, predicate, out);
    } else if (predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function parseFrontmatter(text) {
  const open = text.match(/^---\r?\n/);
  if (!open) return null;
  const start = open[0].length;
  const rest = text.slice(start);
  const endMatch = rest.match(/\r?\n---(?:\r?\n|$)/);
  if (!endMatch || endMatch.index == null) return null;
  const end = start + endMatch.index;
  return {
    content: text.slice(start, end),
    suffix: text.slice(end),
  };
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
}

function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readFrontmatterValue(content, key) {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(new RegExp(`^(${key}):\\s*(.*)$`));
    if (match) return unquoteYamlScalar(match[2] || "");
  }
  return "";
}

function setFrontmatterValue(content, key, value) {
  const lines = content.split(/\r?\n/);
  let replaced = false;
  const out = lines.map((line) => {
    if (new RegExp(`^${key}:\\s*`).test(line) && !replaced) {
      replaced = true;
      return `${key}: ${yamlQuote(value)}`;
    }
    return line;
  });
  if (!replaced) out.push(`${key}: ${yamlQuote(value)}`);
  return out.join("\n");
}

function translateWithPhrases(description) {
  let text = String(description || "").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of phraseReplacements) text = text.replace(pattern, replacement);
  return hasCjk(text) ? text : "";
}

function localizeDescription(name, description) {
  return descriptionTranslations[name] ||
    translateWithPhrases(description) ||
    `执行 ${name} 相关提示词流程`;
}

function collectPromptFiles() {
  const seen = new Set();
  const files = [];
  for (const root of promptRoots) {
    for (const filePath of walk(root, (candidate) => candidate.endsWith(".md"))) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      files.push(filePath);
    }
  }
  return files;
}

function planFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const fm = parseFrontmatter(original);
  if (!fm) return null;
  const name = path.basename(filePath, ".md");
  if (onlyName && name !== onlyName) return null;
  const description = readFrontmatterValue(fm.content, "description");
  if (!description) return null;
  if (!force && hasCjk(description)) return null;
  const nextDescription = localizeDescription(name, description);
  const nextFrontmatter = setFrontmatterValue(fm.content, "description", nextDescription);
  const nextText = `---\n${nextFrontmatter}${fm.suffix}`;
  if (nextText === original) return null;
  return { filePath, name, description, nextDescription, nextText };
}

function ensureBackup(filePath, backupDir, manifest) {
  const rel = path.relative(homeDir, filePath);
  const safeRel = rel.startsWith("..") ? path.relative("/", filePath) : rel;
  const backupPath = path.join(backupDir, "files", safeRel);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  manifest.files.push({ original: filePath, backup: backupPath });
}

function findBackupDir(value) {
  if (!value || value === "latest") {
    if (!exists(backupRoot)) throw new Error(`没有找到备份目录：${backupRoot}`);
    const candidates = fs.readdirSync(backupRoot)
      .map((name) => path.join(backupRoot, name))
      .filter((entry) => {
        const manifestPath = path.join(entry, "manifest.json");
        if (!exists(manifestPath)) return false;
        const manifest = readJson(manifestPath);
        return manifest.kind === backupKind;
      })
      .sort();
    if (candidates.length === 0) throw new Error(`没有找到可恢复的 prompt 备份：${backupRoot}`);
    return candidates[candidates.length - 1];
  }
  return path.resolve(value);
}

function restoreBackup(value) {
  const backupDir = findBackupDir(value);
  const manifest = readJson(path.join(backupDir, "manifest.json"));
  for (const entry of manifest.files || []) {
    if (!exists(entry.backup)) throw new Error(`备份文件不存在：${entry.backup}`);
    fs.mkdirSync(path.dirname(entry.original), { recursive: true });
    fs.copyFileSync(entry.backup, entry.original);
  }
  console.log(`已恢复 ${manifest.files.length} 个 prompt 文件。`);
  console.log(`备份来源：${backupDir}`);
}

if (restoreIndex >= 0) {
  if (!restoreValue) {
    console.error("缺少 --restore 参数。可用：--restore latest");
    process.exit(1);
  }
  restoreBackup(restoreValue);
  process.exit(0);
}

const planned = collectPromptFiles()
  .map(planFile)
  .filter(Boolean);

console.log(`模式：${dryRun ? "dry-run（不写入）" : "apply（会写入）"}`);
console.log(`待中文化 prompt 文件数：${planned.length}`);

if (planned.length > 0) {
  console.log("\n预览：");
  for (const item of planned.slice(0, 12)) {
    console.log(`- ${item.name}: ${item.nextDescription}`);
  }
  if (planned.length > 12) console.log(`... 另外 ${planned.length - 12} 个`);
}

if (dryRun) {
  console.log("\n未写入任何文件。确认后运行：");
  console.log("node bin/codex-prompt-md-zh.mjs --apply");
  process.exit(0);
}

if (planned.length === 0) {
  console.log("\n无需写入，当前支持范围内的 prompt description 已经是中文。");
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(backupRoot, timestamp);
const manifest = {
  createdAt: new Date().toISOString(),
  kind: backupKind,
  files: [],
};

fs.mkdirSync(backupDir, { recursive: true });
for (const item of planned) ensureBackup(item.filePath, backupDir, manifest);
for (const item of planned) fs.writeFileSync(item.filePath, item.nextText);
writeJson(path.join(backupDir, "manifest.json"), manifest);

console.log(`\n已中文化 ${planned.length} 个 prompt description。`);
console.log(`备份目录：${backupDir}`);
console.log("恢复命令：");
console.log(`node bin/codex-prompt-md-zh.mjs --restore ${backupDir}`);
