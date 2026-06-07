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
const backupKind = "skill-md-description-zh";
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

const scanRoots = [
  path.join(homeDir, ".codex", "skills"),
  ...ancestorCodexSubdirs(projectRoot, "skills"),
  path.join(homeDir, ".codex", "plugins", "cache"),
  path.join(homeDir, ".codex", "vendor_imports", "skills"),
  path.join(homeDir, ".codex", ".tmp", "plugins"),
  path.join(homeDir, ".codex", ".tmp", "bundled-marketplaces", "openai-bundled"),
  path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "plugins", "openai-primary-runtime"),
].filter(uniquePath);

const descriptionTranslations = {
  "agent-skills": "工程规则库：用于代码审查、实现质量、测试、发布准备、产品/工程取舍分析和 Agent 工作流纪律。",
  "andrej-karpathy-guidelines": "个人工程护栏：避免无依据假设、避免过度工程、保留用户改动、优先简单方案并保持实证。",
  "baoyu-url-to-markdown": "抓取网页并转换为 Markdown，适合保存网页内容、HTML 快照和 YouTube 字幕等资料。",
  "cloakbrowser-automation": "使用 CloakBrowser 做本地项目、授权网站、UI 测试和截图自动化。",
  "control-chrome": "控制用户 Chrome 浏览器，适合依赖登录态、标签页、Cookie 或扩展状态的任务。",
  "control-in-app-browser": "控制 Codex 内置浏览器，适合打开、点击、检查、截图和验证本地或网页目标。",
  "documents": "创建、编辑、修订和校验 Word、DOCX 或 Google Docs 目标文档。",
  "gh-address-comments": "处理 GitHub PR 中可执行的审查反馈、未解决评论和 requested changes。",
  "gh-fix-ci": "调试并修复 GitHub Actions 中失败的 PR 检查。",
  "github": "读取和整理 GitHub 仓库、PR、Issue 与 CI 上下文。",
  "humanizer": "润色中文/英文文案，让表达更自然、清楚、专业并保持合规。",
  "huggingface-datasets": "使用 Hugging Face Dataset Viewer API 获取子集/切分元数据、分页读取行、搜索文本、应用过滤器、下载 parquet URL，并读取数据大小或统计信息。",
  "imagegen": "生成或编辑位图图片，适合照片、插画、纹理、精灵图、mockup 和透明背景素材。",
  "larksuite-cli": "处理飞书/Lark 文档、云盘、表格、日历、消息、Base、任务、Wiki、审批、联系人和会议纪要。",
  "llm-wiki": "个人知识库构建系统：消化网页、文章、视频、PDF 和本地文件并整理成结构化 wiki。",
  "llm-wiki-upgrade": "升级 llm-wiki 到最新版本，并按需刷新相关提取依赖。",
  "markitdown-wrapper": "把 PDF、DOCX、PPTX、XLSX、图片或 HTML 等本地文件转换成 Markdown。",
  "openai-docs": "参考 OpenAI 官方文档、Codex 自身知识、模型迁移和提示词升级指导。",
  "openspec-apply-change": "执行 OpenSpec 变更中的任务，适合开始或继续落地变更。",
  "openspec-archive-change": "归档已经完成的 OpenSpec 变更，并把实现结果沉淀到规格中。",
  "openspec-explore": "进入探索模式，帮助梳理想法、调查问题并澄清需求。",
  "openspec-global": "用于正式产品/功能需求、行为变更、验收标准、规格、提案、设计、任务和变更治理。",
  "openspec-propose": "快速生成 OpenSpec 提案、设计、规格和任务文件，适合描述新变更。",
  "openspec-sync-specs": "把变更中的增量规格同步到主规格，但不归档变更。",
  "planning-with-files": "用于长期、多步骤、需求模糊或研究量大的任务，把计划、进展和发现写入文件。",
  "plugin-creator": "创建和更新 Codex 插件目录、manifest、插件文件结构和个人 marketplace 条目。",
  "presentations": "创建、渲染和导出 PowerPoint PPTX 演示文稿。",
  "skill-creator": "创建或更新 Codex Skill，沉淀专门知识、流程或工具集成。",
  "skill-installer": "从精选列表或 GitHub 仓库安装 Codex Skill 到本地 skills 目录。",
  "slack": "读取 Slack 上下文，并按任务路由到合适的 Slack 工作流。",
  "slack-channel-summarization": "总结 Slack 频道活动，生成简明回顾、可发布更新或摘要文档。",
  "slack-daily-digest": "从指定 Slack 频道或主题生成每日摘要。",
  "slack-notification-triage": "把近期 Slack 通知整理成优先级队列或任务列表。",
  "slack-outgoing-message": "撰写、起草或润色外发 Slack 消息。",
  "slack-reply-drafting": "根据已有上下文起草 Slack 回复。",
  "spreadsheets": "创建、修改、分析、可视化和美化 XLSX、CSV、TSV 或 Google Sheets 目标表格。",
  "spec-kit-global": "用于 0 到 1 新产品、MVP 或绿地系统，建立原则、规格、技术计划、任务和实现流程。",
  "superpowers": "用于模糊需求、复杂项目、头脑风暴、规格发现、规划、实现策略和评审发布流程。",
  "ui-ux-pro-max": "UI/UX 设计智能库，适合界面审查、设计建议和可搜索设计知识。",
  "youtube-transcript": "提取 YouTube 视频字幕或转写文本，可选择保留时间戳。",
  "yeet": "发布本地改动到 GitHub：确认范围、提交、推送并打开草稿 PR。",
  "ios-app-intents": "设计 iOS App Intents、App Entities 和 App Shortcuts，接入系统快捷操作。",
  "ios-debugger-agent": "在 iOS Simulator 上构建、运行和调试应用，检查 UI、日志和运行问题。",
  "ios-ettrace-performance": "采集并分析 iOS Simulator ETTrace 性能轨迹。",
  "ios-memgraph-leaks": "采集并分析 iOS 内存泄漏、retain cycle 和 memgraph。",
  "ios-simulator-browser": "把 iOS Simulator 镜像到 Codex 内置浏览器，并支持 SwiftUI preview 热更新。",
  "swiftui-liquid-glass": "实现或审查 iOS SwiftUI Liquid Glass 界面。",
  "swiftui-performance-audit": "从代码角度审计 SwiftUI 运行时性能、滚动卡顿和渲染开销。",
  "swiftui-ui-patterns": "用 SwiftUI 组件模式构建或重构导航、状态、布局和控件。",
  "swiftui-view-refactor": "把 SwiftUI View 拆分成稳定、可测试、数据流清晰的结构。",
  "appkit-interop": "在 macOS SwiftUI 中窄范围桥接 AppKit。",
  "build-run-debug": "用 shell-first 的 Xcode/Swift 工作流构建、运行和调试 macOS 应用。",
  "liquid-glass": "实现或审查 macOS SwiftUI Liquid Glass 界面。",
  "packaging-notarization": "准备 macOS 打包、公证、归档和分发验证流程。",
  "signing-entitlements": "检查 macOS 签名、entitlements、Gatekeeper、沙盒和 hardened runtime 问题。",
  "swiftpm-macos": "构建、运行和测试 SwiftPM macOS 包和可执行文件。",
  "swiftui-patterns": "构建 macOS SwiftUI 场景、窗口、命令、工具栏、设置和分栏界面。",
  "telemetry": "添加并验证轻量 macOS 运行时 telemetry 和 Logger 事件。",
  "test-triage": "排查 macOS 测试失败，区分断言、崩溃和环境设置问题。",
  "view-refactor": "重构 macOS SwiftUI View 和 Scene，收紧状态和 AppKit 逃逸边界。",
  "window-management": "定制 macOS SwiftUI 窗口行为、窗口 chrome、拖拽区域、恢复和启动逻辑。",
};

const shortDescriptionTranslations = {
  "appkit-interop": "桥接 SwiftUI 与 AppKit，适配原生 macOS 行为",
  "build-run-debug": "使用 shell-first 工作流构建和调试 macOS 应用",
  "control-chrome": "控制用户 Chrome 浏览器",
  "control-in-app-browser": "控制 Codex 内置浏览器",
  "gh-fix-ci": "调试失败的 GitHub Actions 检查",
  "ios-app-intents": "构建和调试 iOS App Intents 集成",
  "ios-debugger-agent": "在 Simulator 上调试 iOS 应用",
  "ios-ettrace-performance": "用 ETTrace 分析 iOS Simulator 性能轨迹",
  "ios-memgraph-leaks": "捕获并验证 iOS Simulator 内存泄漏",
  "openspec-apply-change": "执行 OpenSpec 变更中的任务",
  "openspec-archive-change": "归档已完成的 OpenSpec 变更",
  "openspec-explore": "进入探索模式，梳理想法并澄清需求",
  "openspec-propose": "提出新变更并生成相关工件",
  "openspec-sync-specs": "把变更中的增量规格同步到主规格",
  "skill-creator": "创建或更新 Codex Skill",
  "skill-installer": "从 openai/skills 或其它仓库安装精选技能",
  slack: "总结 Slack 线程并草拟帖子",
  "slack-channel-summarization": "总结一个 Slack 频道",
  "slack-notification-triage": "分流和整理 Slack 通知信号",
  "slack-outgoing-message": "撰写最终外发 Slack 文案",
  "swiftpm-macos": "构建、运行和测试 macOS Swift 包",
  "swiftui-liquid-glass": "构建 SwiftUI Liquid Glass 功能",
  "swiftui-patterns": "构建原生 SwiftUI 场景、菜单、设置和窗口",
  "ui-ux-pro-max": "UI/UX 设计智能库，支持搜索设计知识",
  "view-refactor": "把 macOS SwiftUI 视图和场景重构为稳定结构",
  "window-management": "定制 SwiftUI 窗口 chrome、拖拽区域、行为和位置",
};

const displayNameTranslations = {
  "agent-skills": "工程规则库",
  "andrej-karpathy-guidelines": "Karpathy 工程准则",
  "appkit-interop": "AppKit 互操作",
  "baoyu-url-to-markdown": "宝玉网页转 Markdown",
  "build-run-debug": "构建 / 运行 / 调试",
  "control-chrome": "Chrome 控制",
  "control-in-app-browser": "内置浏览器控制",
  "gh-fix-ci": "CI 调试",
  "ios-app-intents": "iOS App Intents",
  "ios-debugger-agent": "iOS 调试代理",
  "ios-ettrace-performance": "iOS ETTrace 性能",
  "ios-memgraph-leaks": "iOS 内存图泄漏",
  "openspec-apply-change": "OpenSpec 应用变更",
  "openspec-archive-change": "OpenSpec 归档变更",
  "openspec-explore": "OpenSpec 探索",
  "openspec-global": "OpenSpec 全局",
  "openspec-propose": "OpenSpec 提案",
  "openspec-sync-specs": "OpenSpec 同步规格",
  "slack-channel-summarization": "频道总结",
  "ui-ux-pro-max": "UI/UX 专业设计库",
  "view-refactor": "视图重构",
  "window-management": "窗口管理",
  "youtube-transcript": "YouTube 字幕提取",
};

const phraseReplacements = [
  [/Use when/gi, "适用于"],
  [/Use for/gi, "用于"],
  [/Use as/gi, "作为"],
  [/Create, edit, redline, and comment on/gi, "创建、编辑、修订和评论"],
  [/Create, edit/gi, "创建和编辑"],
  [/Build, run, and debug/gi, "构建、运行和调试"],
  [/Build, run, and test/gi, "构建、运行和测试"],
  [/Build and refactor/gi, "构建和重构"],
  [/Implement and review/gi, "实现和审查"],
  [/Capture and interpret/gi, "采集和解读"],
  [/Capture and inspect/gi, "采集和检查"],
  [/Inspect/gi, "检查"],
  [/Read and manage/gi, "读取和管理"],
  [/Summarize/gi, "总结"],
  [/Draft/gi, "起草"],
  [/Prepare/gi, "准备"],
  [/Design/gi, "设计"],
  [/Create/gi, "创建"],
  [/Build/gi, "构建"],
  [/Refactor/gi, "重构"],
  [/Debug/gi, "调试"],
  [/Profile/gi, "分析性能"],
  [/Convert/gi, "转换"],
  [/Fetch/gi, "抓取"],
  [/Extract/gi, "提取"],
  [/Install/gi, "安装"],
  [/Upgrade/gi, "升级"],
  [/OpenAI docs/gi, "OpenAI 文档"],
  [/Codex self-knowledge/gi, "Codex 自身知识"],
  [/model migration guidance/gi, "模型迁移指导"],
  [/formal product\/feature requirements/gi, "正式产品/功能需求"],
  [/behavior changes/gi, "行为变更"],
  [/acceptance criteria/gi, "验收标准"],
  [/proposal\/design\/tasks files/gi, "提案/设计/任务文件"],
  [/change governance/gi, "变更治理"],
  [/thinking partner/gi, "思考搭档"],
  [/exploring ideas/gi, "探索想法"],
  [/investigating problems/gi, "调查问题"],
  [/clarifying requirements/gi, "澄清需求"],
  [/GitHub pull request review feedback/gi, "GitHub PR 审查反馈"],
  [/GitHub Actions checks/gi, "GitHub Actions 检查"],
  [/pull request|PR/gi, "PR"],
  [/issues/gi, "Issue"],
  [/repository|repositories/gi, "仓库"],
  [/Slack channel/gi, "Slack 频道"],
  [/Slack/gi, "Slack"],
  [/PowerPoint PPTX decks/gi, "PowerPoint PPTX 演示文稿"],
  [/spreadsheet files/gi, "表格文件"],
  [/Word documents/gi, "Word 文档"],
  [/Google Docs/gi, "Google Docs"],
  [/browser automation/gi, "浏览器自动化"],
  [/screenshots?/gi, "截图"],
  [/local projects/gi, "本地项目"],
  [/authorized systems/gi, "授权系统"],
  [/UI\/screenshot\/compatibility tests/gi, "UI、截图和兼容性测试"],
  [/SwiftUI/gi, "SwiftUI"],
  [/AppKit/gi, "AppKit"],
  [/macOS/gi, "macOS"],
  [/iOS/gi, "iOS"],
  [/Simulator/gi, "Simulator"],
  [/performance/gi, "性能"],
  [/memory leaks/gi, "内存泄漏"],
  [/retain cycles/gi, "retain cycle"],
  [/workflows?/gi, "工作流"],
  [/documents?/gi, "文档"],
  [/spreadsheets?/gi, "表格"],
  [/presentations?/gi, "演示文稿"],
  [/messages?/gi, "消息"],
  [/calendar/gi, "日历"],
  [/cloud drive/gi, "云盘"],
  [/knowledge-base/gi, "知识库"],
  [/knowledge base/gi, "知识库"],
  [/wiki/gi, "wiki"],
  [/MVPs?/gi, "MVP"],
  [/greenfield/gi, "绿地"],
  [/planning/gi, "规划"],
  [/implementation strategy/gi, "实现策略"],
  [/review\/ship workflows/gi, "评审/发布流程"],
  [/\bwithout\b/gi, "不"],
  [/\bwith\b/gi, "使用"],
  [/\band\b/gi, "和"],
  [/\bor\b/gi, "或"],
];

function usage() {
  console.log(`
Codex SKILL.md 描述中文化工具

用法:
  node bin/codex-skill-md-zh.mjs --dry-run
  node bin/codex-skill-md-zh.mjs --apply
  node bin/codex-skill-md-zh.mjs --apply --force
  node bin/codex-skill-md-zh.mjs --restore latest
  node bin/codex-skill-md-zh.mjs --dry-run --home /tmp/fake-home --backup-root /tmp/backups

说明:
  默认 dry-run，不写入。
  中文化 SKILL.md frontmatter description、metadata.short-description，
  以及 agents/openai.yaml 里的 display_name 和 short_description。
  不修改技能 name 或正文执行规则。
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
  const closeEnd = end + endMatch[0].length;
  return {
    bodyStart: closeEnd,
    content: text.slice(start, end),
    end,
    prefix: text.slice(0, start),
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

function readFrontmatterValue(content, key) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(new RegExp(`^(${key}):\\s*(.*)$`));
    if (!match) continue;
    const rest = match[2] ?? "";
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

function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function setFrontmatterValue(content, key, value) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let replaced = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (new RegExp(`^${key}:\\s*`).test(lines[i])) {
      out.push(`${key}: ${yamlQuote(value)}`);
      replaced = true;
      const rest = lines[i].replace(new RegExp(`^${key}:\\s*`), "").trim();
      if (rest === "|" || rest === ">") {
        while (i + 1 < lines.length && !/^[A-Za-z0-9_-]+:\s*/.test(lines[i + 1])) i += 1;
      }
    } else {
      out.push(lines[i]);
    }
  }
  if (!replaced) out.push(`${key}: ${yamlQuote(value)}`);
  return out.join("\n");
}

function readNestedShortDescription(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*short[-_]description:\s*(.*)$/);
    if (match) return unquoteYamlScalar(match[1] || "");
  }
  return "";
}

function setNestedShortDescription(content, value) {
  const lines = content.split(/\r?\n/);
  let replaced = false;
  const out = lines.map((line) => {
    const match = line.match(/^(\s*)(short[-_]description):\s*(.*)$/);
    if (!match || replaced) return line;
    replaced = true;
    return `${match[1]}${match[2]}: ${yamlQuote(value)}`;
  });
  return out.join("\n");
}

function yamlScalar(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*(.*)$`, "m"));
  return match ? unquoteYamlScalar(match[1] || "") : "";
}

function setYamlScalar(text, key, value) {
  const lines = text.split(/\r?\n/);
  let replaced = false;
  const out = lines.map((line) => {
    const match = line.match(new RegExp(`^(\\s*)(${key}):\\s*(.*)$`));
    if (!match || replaced) return line;
    replaced = true;
    return `${match[1]}${match[2]}: ${yamlQuote(value)}`;
  });
  return replaced ? out.join("\n") : text;
}

function titleize(value) {
  return String(value || "")
    .split(/[-_:]+/g)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

function firstSentence(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const match = text.match(/^(.{1,180}?[.!?。！？])\s/);
  return (match ? match[1] : text).slice(0, 220).trim();
}

function translateWithPhrases(description) {
  let text = firstSentence(description);
  for (const [pattern, replacement] of phraseReplacements) text = text.replace(pattern, replacement);
  text = text
    .replace(/\s+/g, " ")
    .replace(/\s+([，。；：])/g, "$1")
    .trim();
  return hasCjk(text) ? text : "";
}

function inferDescription(name, description) {
  const lower = `${name} ${description}`.toLowerCase();
  if (/github|pull request|\bpr\b|issue|actions|ci/.test(lower)) return "处理 GitHub 仓库、PR、Issue、CI 和发布相关工作。";
  if (/slack|message|channel|reply|digest|notification/.test(lower)) return "读取、总结和草拟 Slack 消息与协作内容。";
  if (/browser|chrome|playwright|screenshot|webpage/.test(lower)) return "打开、检查、点击、截图和自动化浏览器页面。";
  if (/document|docx|word|google docs/.test(lower)) return "创建、编辑、修订和校验文档。";
  if (/spreadsheet|xlsx|csv|sheet/.test(lower)) return "创建、分析、修改和美化表格。";
  if (/presentation|ppt|slides/.test(lower)) return "创建、渲染和导出演示文稿。";
  if (/ios|swiftui|simulator|xcode/.test(lower)) return "开发、调试和优化 iOS 应用。";
  if (/macos|appkit|swiftpm|notarization|entitlements|gatekeeper/.test(lower)) return "开发、调试、打包和优化 macOS 应用。";
  if (/openai|codex|model|prompt/.test(lower)) return "参考 OpenAI、Codex、模型和提示词相关资料完成任务。";
  if (/openspec|spec|requirements|proposal|design|tasks/.test(lower)) return "处理规格、需求、提案、设计和任务治理。";
  if (/wiki|knowledge|markdown|pdf|youtube|transcript/.test(lower)) return "整理资料、提取内容并沉淀为 Markdown 或知识库。";
  if (/ui|ux|design|component/.test(lower)) return "处理 UI/UX 设计、组件和界面体验问题。";
  if (/security|threat|leak|scan|audit/.test(lower)) return "处理安全审计、威胁分析、扫描和风险验证。";
  return `处理 ${titleize(name)} 相关专项工作。`;
}

function localizeDescription(name, description) {
  const rawDescription = String(description || "");
  const originalMatch = rawDescription.match(/\bOriginal:\s*(.*)$/s);
  const cleanDescription = (originalMatch ? originalMatch[1] : rawDescription).replace(/\s+/g, " ").trim();
  const translated = descriptionTranslations[name] ||
    translateWithPhrases(cleanDescription) ||
    inferDescription(name, cleanDescription);
  return translated;
}

function localizeShortDescription(name, description) {
  const rawDescription = String(description || "");
  const originalMatch = rawDescription.match(/\bOriginal:\s*(.*)$/s);
  const cleanDescription = (originalMatch ? originalMatch[1] : rawDescription).replace(/\s+/g, " ").trim();
  return shortDescriptionTranslations[name] ||
    descriptionTranslations[name] ||
    translateWithPhrases(cleanDescription) ||
    inferDescription(name, cleanDescription);
}

function collectSkillFiles() {
  const seen = new Set();
  const files = [];
  for (const root of scanRoots) {
    for (const filePath of walk(root, (candidate) => path.basename(candidate) === "SKILL.md")) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      files.push(filePath);
    }
  }
  return files;
}

function collectSkillYamlFiles() {
  const seen = new Set();
  const files = [];
  for (const root of scanRoots) {
    for (const filePath of walk(root, (candidate) =>
      candidate.endsWith(path.join("agents", "openai.yaml")) &&
      candidate.includes(`${path.sep}skills${path.sep}`))) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      files.push(filePath);
    }
  }
  return files;
}

function planSkillMdFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const fm = parseFrontmatter(original);
  if (!fm) return null;
  const name = readFrontmatterValue(fm.content, "name") || path.basename(path.dirname(filePath));
  if (onlyName && name !== onlyName) return null;
  const description = readFrontmatterValue(fm.content, "description");
  const shortDescription = readNestedShortDescription(fm.content);
  if (!description && !shortDescription) return null;

  let nextFrontmatter = fm.content;
  let nextDescription = description;
  let nextShortDescription = shortDescription;

  const hasPreferredDescription = descriptionTranslations[name] && descriptionTranslations[name] !== description;
  if (description && (force || !hasCjk(description) || /\bOriginal:/.test(description) || hasPreferredDescription)) {
    nextDescription = localizeDescription(name, description);
    nextFrontmatter = setFrontmatterValue(nextFrontmatter, "description", nextDescription);
  }

  if (shortDescription && (force || !hasCjk(shortDescription) || /\bOriginal:/.test(shortDescription))) {
    nextShortDescription = localizeShortDescription(name, shortDescription);
    nextFrontmatter = setNestedShortDescription(nextFrontmatter, nextShortDescription);
  }

  const nextText = `---\n${nextFrontmatter}${fm.suffix}`;
  if (nextText === original) return null;
  const preview = nextShortDescription !== shortDescription ? nextShortDescription : nextDescription;
  return { filePath, kind: "SKILL.md", name, description, nextDescription: preview, nextText };
}

function planSkillYamlFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const name = path.basename(path.dirname(path.dirname(filePath)));
  if (onlyName && name !== onlyName) return null;
  const displayName = yamlScalar(original, "display_name");
  const shortDescription = yamlScalar(original, "short_description");
  if (!shortDescription && !displayName) return null;
  const nextDisplayName = displayNameTranslations[name] || displayName;
  const hasPreferredShortDescription = shortDescriptionTranslations[name] &&
    shortDescriptionTranslations[name] !== shortDescription;
  const nextDescription = shortDescription &&
    (force || !hasCjk(shortDescription) || /\bOriginal:/.test(shortDescription) || hasPreferredShortDescription)
    ? localizeShortDescription(name, shortDescription)
    : shortDescription;
  let nextText = original;
  if (displayName && nextDisplayName !== displayName) nextText = setYamlScalar(nextText, "display_name", nextDisplayName);
  if (shortDescription && nextDescription !== shortDescription) {
    nextText = setYamlScalar(nextText, "short_description", nextDescription);
  }
  if (nextText === original) return null;
  return {
    filePath,
    kind: "agents/openai.yaml",
    name,
    description: shortDescription,
    nextDescription: nextDescription || nextDisplayName,
    nextText,
  };
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
    if (candidates.length === 0) throw new Error(`没有找到可恢复的 SKILL.md 备份：${backupRoot}`);
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
  console.log(`已恢复 ${manifest.files.length} 个 SKILL.md 文件。`);
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

const planned = [
  ...collectSkillFiles().map(planSkillMdFile),
  ...collectSkillYamlFiles().map(planSkillYamlFile),
].filter(Boolean);

console.log(`模式：${dryRun ? "dry-run（不写入）" : "apply（会写入）"}`);
console.log(`待中文化技能元数据文件数：${planned.length}`);

if (planned.length > 0) {
  console.log("\n预览：");
  for (const item of planned.slice(0, 12)) {
    console.log(`- ${item.name} (${item.kind}): ${item.nextDescription}`);
  }
  if (planned.length > 12) console.log(`... 另外 ${planned.length - 12} 个`);
}

if (dryRun) {
  console.log("\n未写入任何文件。确认后运行：");
  console.log("node bin/codex-skill-md-zh.mjs --apply");
  process.exit(0);
}

if (planned.length === 0) {
  console.log("\n无需写入，当前支持范围内的技能描述已经是中文。");
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

console.log(`\n已中文化 ${planned.length} 个技能描述文件。`);
console.log(`备份目录：${backupDir}`);
console.log("恢复命令：");
console.log(`node bin/codex-skill-md-zh.mjs --restore ${backupDir}`);
console.log("\n下一步：重启 Codex，然后打开技能列表检查描述。");
