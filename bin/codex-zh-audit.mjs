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
  统计插件卡片 JSON、技能 YAML、应用连接器缓存的中文覆盖情况。
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
  const files = roots.flatMap((root) =>
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
      localized: hasCjk(yamlScalar(text, "short_description")),
    });
  }
  return summarize("skillYaml", items);
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
