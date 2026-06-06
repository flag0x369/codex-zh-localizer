#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const rawArgs = process.argv.slice(2);
function argValue(name) {
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : null;
}

const args = new Set(rawArgs);
const homeDir = path.resolve(argValue("--home") || process.env.CODEX_ZH_HOME || os.homedir());
const projectRoot = path.resolve(argValue("--project-root") || process.env.CODEX_ZH_PROJECT_ROOT || process.cwd());
const asJson = args.has("--json");
const strict = args.has("--strict");

const roots = [
  path.join(homeDir, ".codex", ".tmp", "plugins"),
  path.join(homeDir, ".codex", ".tmp", "bundled-marketplaces", "openai-bundled"),
  path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "plugins", "openai-primary-runtime"),
  path.join(homeDir, ".codex", "plugins", "cache"),
];

const appDirectory = path.join(homeDir, ".codex", "cache", "codex_app_directory");
const codexAppResources = "/Applications/Codex.app/Contents/Resources";

const skillRoots = [
  path.join(homeDir, ".codex", "skills"),
  path.join(projectRoot, ".codex", "skills"),
  path.join(homeDir, ".codex", "plugins", "cache"),
  path.join(homeDir, ".codex", "vendor_imports", "skills"),
  path.join(homeDir, ".codex", ".tmp", "plugins"),
  path.join(homeDir, ".codex", ".tmp", "bundled-marketplaces", "openai-bundled"),
  path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "plugins", "openai-primary-runtime"),
];

function usage() {
  console.log(`
Codex 中文化覆盖率审计

用法:
  node scripts/codex-zh-audit.mjs
  node scripts/codex-zh-audit.mjs --strict
  node scripts/codex-zh-audit.mjs --json
  node scripts/codex-zh-audit.mjs --home /tmp/fake-home

说明:
  只读扫描，不修改任何 Codex 文件。
  统计插件卡片 JSON、技能 agents/openai.yaml、SKILL.md 描述、应用连接器缓存的中文覆盖情况。
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

function isLocalizedDisplayText(value) {
  return hasCjk(value) && !/\bOriginal:/.test(String(value || ""));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function yamlScalar(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*["']?([^"'\\n]*)["']?\\s*$`, "m"));
  return match ? match[1].trim() : "";
}

function parseFrontmatter(text) {
  const open = text.match(/^---\r?\n/);
  if (!open) return null;
  const start = open[0].length;
  const rest = text.slice(start);
  const endMatch = rest.match(/\r?\n---(?:\r?\n|$)/);
  if (!endMatch || endMatch.index == null) return null;
  return text.slice(start, start + endMatch.index);
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
}

function frontmatterValue(content, key) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!match) continue;
    const rest = match[1] || "";
    if (rest.trim() === "|" || rest.trim() === ">") {
      const block = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^[A-Za-z0-9_-]+:\s*/.test(lines[j])) break;
        block.push(lines[j].replace(/^ {2}/, ""));
      }
      return block.join("\n").trim();
    }
    return unquoteYamlScalar(rest);
  }
  return "";
}

function frontmatterShortDescriptions(content) {
  const values = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*short[-_]description:\s*(.*)$/);
    if (match) values.push(unquoteYamlScalar(match[1] || ""));
  }
  return values;
}

function summarize(name, items) {
  const total = items.length;
  const localized = items.filter((item) => item.localized).length;
  const pending = total - localized;
  return {
    name,
    total,
    localized,
    pending,
    samples: items.filter((item) => !item.localized).slice(0, 10),
  };
}

function auditPluginJson() {
  const files = roots.flatMap((root) =>
    walk(root, (filePath) => filePath.endsWith(path.join(".codex-plugin", "plugin.json"))));
  const seen = new Set();
  const items = [];
  for (const filePath of files) {
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    try {
      const json = readJson(filePath);
      const iface = json.interface || {};
      const localized = hasCjk(iface.shortDescription) &&
        hasCjk(iface.longDescription) &&
        hasCjk(json.description);
      items.push({
        filePath,
        plugin: json.name || path.basename(path.dirname(path.dirname(filePath))),
        localized,
      });
    } catch (error) {
      items.push({ filePath, plugin: path.basename(filePath), localized: false, error: error.message });
    }
  }
  return summarize("pluginJson", items);
}

function auditMarketplaceJson() {
  const files = roots
    .map((root) => path.join(root, ".agents", "plugins", "marketplace.json"))
    .filter(exists);
  const items = files.map((filePath) => {
    try {
      const json = readJson(filePath);
      return {
        filePath,
        marketplace: json.interface?.displayName || path.basename(path.dirname(filePath)),
        localized: hasCjk(json.interface?.displayName),
      };
    } catch (error) {
      return { filePath, marketplace: path.basename(filePath), localized: false, error: error.message };
    }
  });
  return summarize("marketplaceJson", items);
}

function auditSkills() {
  const files = skillRoots.flatMap((root) =>
    walk(root, (filePath) =>
      filePath.endsWith(path.join("agents", "openai.yaml")) &&
      filePath.includes(`${path.sep}skills${path.sep}`)));
  const seen = new Set();
  const items = [];
  for (const filePath of files) {
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    const text = fs.readFileSync(filePath, "utf8");
    const skill = path.basename(path.dirname(path.dirname(filePath)));
    items.push({
      filePath,
      skill,
      displayName: yamlScalar(text, "display_name"),
      localized: isLocalizedDisplayText(yamlScalar(text, "short_description")),
    });
  }
  return summarize("skillYaml", items);
}

function auditSkillMd() {
  const files = skillRoots.flatMap((root) =>
    walk(root, (filePath) => path.basename(filePath) === "SKILL.md"));
  const seen = new Set();
  const items = [];
  for (const filePath of files) {
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    try {
      const text = fs.readFileSync(filePath, "utf8");
      const fm = parseFrontmatter(text);
      const name = fm ? frontmatterValue(fm, "name") : path.basename(path.dirname(filePath));
      const description = fm ? frontmatterValue(fm, "description") : "";
      const shortDescriptions = fm ? frontmatterShortDescriptions(fm) : [];
      items.push({
        filePath,
        skill: name || path.basename(path.dirname(filePath)),
        localized: isLocalizedDisplayText(description) &&
          shortDescriptions.every((value) => isLocalizedDisplayText(value)),
      });
    } catch (error) {
      items.push({ filePath, skill: path.basename(path.dirname(filePath)), localized: false, error: error.message });
    }
  }
  return summarize("skillMd", items);
}

function collectAppIds() {
  const ids = new Map();
  for (const root of roots) {
    const appFiles = walk(root, (filePath) => path.basename(filePath) === ".app.json");
    for (const filePath of appFiles) {
      try {
        const json = readJson(filePath);
        for (const [appKey, appConfig] of Object.entries(json.apps || {})) {
          if (appConfig && typeof appConfig.id === "string") ids.set(appConfig.id, appKey);
        }
      } catch {
        // Ignore malformed app config during read-only audit.
      }
    }
  }
  return ids;
}

function auditAppConnectors() {
  const appIds = collectAppIds();
  const items = [];
  if (!exists(appDirectory)) return summarize("appConnectors", items);
  for (const filePath of walk(appDirectory, (candidate) => candidate.endsWith(".json"))) {
    try {
      const json = readJson(filePath);
      for (const connector of json.connectors || []) {
        const appKey = appIds.get(connector.id);
        if (!appKey) continue;
        items.push({
          filePath,
          app: appKey,
          connector: connector.name,
          localized: hasCjk(connector.description),
        });
      }
    } catch (error) {
      items.push({ filePath, app: path.basename(filePath), localized: false, error: error.message });
    }
  }
  return summarize("appConnectors", items);
}

function auditAppBundleScope() {
  const asar = path.join(codexAppResources, "app.asar");
  const zhInfoPlist = path.join(codexAppResources, "zh_CN.lproj", "InfoPlist.strings");
  return {
    name: "appBundleScope",
    appAsarExists: exists(asar),
    zhInfoPlistExists: exists(zhInfoPlist),
    supportedByThisTool: false,
    note: "Codex 前端内置 UI 位于 app.asar 等 App bundle 资源中；本工具默认不修改 App 本体。",
  };
}

const report = {
  homeDir,
  generatedAt: new Date().toISOString(),
  sections: [
    auditPluginJson(),
    auditMarketplaceJson(),
    auditSkills(),
    auditSkillMd(),
    auditAppConnectors(),
    auditAppBundleScope(),
  ],
};

const pending = report.sections
  .filter((section) => typeof section.pending === "number")
  .reduce((sum, section) => sum + section.pending, 0);

if (asJson) {
  console.log(JSON.stringify({ ...report, pending }, null, 2));
} else {
  console.log("Codex 中文化覆盖率审计");
  console.log(`HOME: ${homeDir}`);
  for (const section of report.sections) {
    if (typeof section.pending !== "number") {
      console.log(`- ${section.name}: ${section.note}`);
      continue;
    }
    console.log(`- ${section.name}: ${section.localized}/${section.total} 已中文化，待处理 ${section.pending}`);
    for (const sample of section.samples) {
      const label = sample.plugin || sample.marketplace || sample.skill || sample.app || sample.connector || sample.filePath;
      console.log(`  · ${label}`);
    }
  }
  console.log(`总待处理：${pending}`);
}

if (strict && pending > 0) process.exit(1);
