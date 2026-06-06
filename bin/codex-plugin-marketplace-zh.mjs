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
const defaultBackupRoot = path.resolve(
  argValue("--backup-root") ||
  process.env.CODEX_ZH_BACKUP_ROOT ||
  path.join(workspaceRoot, "codex-plugin-marketplace-zh-backups"),
);
const backupKind = "plugin-marketplace-zh";

const args = new Set(rawArgs);
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;
const force = args.has("--force");
const translateCategories = args.has("--translate-categories");
const onlyName = argValue("--only");
const restoreIndex = rawArgs.indexOf("--restore");
const restoreValue = argValue("--restore");

const targetRoots = [
  {
    label: "Codex official marketplace cache",
    root: path.join(homeDir, ".codex", ".tmp", "plugins"),
    marketplace: path.join(homeDir, ".codex", ".tmp", "plugins", ".agents", "plugins", "marketplace.json"),
    marketplaceName: "Codex 官方插件（中文）",
  },
  {
    label: "OpenAI bundled marketplace cache",
    root: path.join(homeDir, ".codex", ".tmp", "bundled-marketplaces", "openai-bundled"),
    marketplace: path.join(homeDir, ".codex", ".tmp", "bundled-marketplaces", "openai-bundled", ".agents", "plugins", "marketplace.json"),
    marketplaceName: "OpenAI 内置插件（中文）",
  },
  {
    label: "OpenAI primary runtime marketplace cache",
    root: path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "plugins", "openai-primary-runtime"),
    marketplace: path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "plugins", "openai-primary-runtime", ".agents", "plugins", "marketplace.json"),
    marketplaceName: "OpenAI 文档运行时（中文）",
  },
  {
    label: "Installed plugin cache",
    root: path.join(homeDir, ".codex", "plugins", "cache"),
    marketplace: null,
    marketplaceName: null,
  },
];

const categoryZh = {
  Productivity: "生产力",
  "Developer Tools": "开发工具",
  Design: "设计创作",
  Research: "研究分析",
  Security: "安全",
  Engineering: "工程",
  Lifestyle: "生活服务",
};

const titleMap = {
  browser: "内置浏览器",
  chrome: "Chrome 浏览器",
  "computer-use": "电脑控制",
  latex: "LaTeX 排版",
  documents: "文档",
  spreadsheets: "电子表格",
  presentations: "演示文稿",
  github: "GitHub 代码协作",
  slack: "Slack 团队沟通",
  gmail: "Gmail 邮箱",
  "google-calendar": "Google 日历",
  "google-drive": "Google 云端硬盘",
  teams: "Microsoft Teams",
  sharepoint: "SharePoint",
  notion: "Notion 知识与项目",
  linear: "Linear 项目管理",
  nvidia: "NVIDIA 开发",
  "build-ios-apps": "iOS 应用开发",
  "build-macos-apps": "macOS 应用开发",
  "build-web-apps": "Web 应用开发",
  "build-web-data-visualization": "Web 数据可视化",
  "test-android-apps": "Android 应用测试",
  "game-studio": "游戏工作室",
  "openai-developers": "OpenAI 开发者",
  "codex-security": "Codex 安全",
  "twilio-developer-kit": "Twilio 开发套件",
  "cloudflare": "Cloudflare 部署",
  "vercel": "Vercel 部署",
  "netlify": "Netlify 部署",
  "render": "Render 部署",
  "supabase": "Supabase 后端",
  "neon-postgres": "Neon Postgres",
  "convex": "Convex 后端",
  "shopify": "Shopify 开发",
  "figma": "Figma 设计",
  "canva": "Canva 设计",
  "picsart": "Picsart 图片编辑",
  "shutterstock": "Shutterstock 素材",
  "remotion": "Remotion 视频",
  "hyperframes": "HyperFrames 视频",
  "heygen": "HeyGen 视频",
  "fal": "Fal 媒体生成",
  "biorender": "BioRender 科研绘图",
  "zotero": "Zotero 文献管理",
  "life-science-research": "生命科学研究",
  "ngs-analysis": "NGS 测序分析",
  "scite": "Scite 学术研究",
  "readwise": "Readwise 阅读",
  "midpage": "Midpage 法律研究",
  "amplitude": "Amplitude 产品分析",
  "posthog": "PostHog 产品分析",
  "mixpanel": "Mixpanel 数据分析",
  "mixpanel-headless": "Mixpanel Headless 分析",
  "metabase": "Metabase BI 分析",
  "omni-analytics": "Omni 数据分析",
  "thoughtspot": "ThoughtSpot 商业智能",
  "deepnote": "Deepnote 数据工作区",
  "coupler-io": "Coupler.io 数据整合",
  "windsor-ai": "Windsor.ai 营销数据",
  "alation": "Alation 数据目录",
  "motherduck": "MotherDuck 数据仓库",
  "cube": "Cube 语义数据",
  "hubspot": "HubSpot CRM",
  "hugging-face": "Hugging Face 模型与数据",
  "pipedrive": "Pipedrive CRM",
  "close": "Close CRM",
  "apollo": "Apollo 销售情报",
  "outreach": "Outreach 销售触达",
  "demandbase": "Demandbase B2B 数据",
  "zoominfo": "ZoomInfo 商业情报",
  "clay": "Clay 客户开发",
  "streak": "Streak Gmail CRM",
  "attio": "Attio CRM",
  "zoho": "Zoho CRM",
  "rox": "Rox 销售自动化",
  "common-room": "Common Room 买家情报",
  "highlevel": "HighLevel CRM",
  "docket": "Docket 销售知识",
  "carta-crm": "Carta CRM",
  "actively": "Actively 客户情报",
  "hg-insights": "HG Insights 增长情报",
  "meticulate": "Meticulate 公司匹配",
  "aiera": "Aiera 财报电话会",
  "alpaca": "Alpaca 市场数据",
  "binance": "Binance 市场数据",
  "cb-insights": "CB Insights 私募研究",
  "chronograph": "Chronograph 私募组合",
  "daloopa": "Daloopa 金融分析",
  "dnb-finance-analytics": "D&B 金融分析",
  "dow-jones-factiva": "Factiva 新闻研究",
  "factset": "FactSet 金融数据",
  "fiscal-ai": "Fiscal AI 金融研究",
  "lseg": "LSEG 市场数据",
  "moody-s": "Moody's 信用研究",
  "morningstar": "Morningstar 基金研究",
  "mt-newswires": "MT Newswires 金融新闻",
  "pitchbook": "PitchBook 私募市场",
  "quartr": "Quartr 投资者关系",
  "s-p": "S&P 市场研究",
  "third-bridge": "Third Bridge 专家洞察",
  "tinman-ai": "Tinman AI 信贷分析",
  "policynote": "PolicyNote 政策研究",
  "similarweb": "Similarweb 流量分析",
  "semrush": "Semrush SEO 分析",
  "brand24": "Brand24 品牌监测",
  "conductor": "Conductor 搜索营销",
  "channel99": "Channel99 市场归因",
  "particl-market-research": "Particl 电商研究",
  "airtable": "Airtable 数据库",
  "asana": "Asana 任务管理",
  "atlassian-rovo": "Atlassian Rovo",
  "box": "Box 文件",
  "clickup": "ClickUp 项目管理",
  "docusign": "DocuSign 电子签署",
  "egnyte": "Egnyte 文件",
  "monday-com": "monday.com 项目管理",
  "outlook-calendar": "Outlook 日历",
  "outlook-email": "Outlook 邮箱",
  "quickbooks": "QuickBooks 财务",
  "signnow": "SignNow 签署",
  "superhuman": "Superhuman 邮件",
  "teamwork-com": "Teamwork 项目管理",
  "zoom": "Zoom 会议",
  "calendly": "Calendly 日程",
  "circleback": "Circleback 会议纪要",
  "fireflies": "Fireflies 会议记录",
  "granola": "Granola 会议记录",
  "otter-ai": "Otter.ai 会议记录",
  "read-ai": "Read AI 会议智能",
};

const namedPurpose = {
  browser: "打开、检查和测试网页或本地应用",
  chrome: "使用你的 Chrome 登录状态操作网页",
  "computer-use": "控制 macOS 桌面应用和图形界面",
  documents: "创建、编辑和校验 Word/Docs 文档",
  spreadsheets: "创建、分析和美化表格",
  presentations: "创建、渲染和导出演示文稿",
  github: "处理代码仓库、PR、Issue 和 CI",
  slack: "读取频道、总结消息并起草回复",
  gmail: "阅读、整理和草拟 Gmail 邮件",
  "google-calendar": "管理日程、空闲时间和会议准备",
  "google-drive": "处理 Drive、Docs、Sheets 和 Slides 文件",
  notion: "沉淀知识、整理会议材料和实施计划",
  linear: "查找、引用和管理 Linear 任务",
  nvidia: "处理 CUDA、GPU、推理、机器人和仿真工作流",
  "hugging-face": "查看模型、数据集、Spaces 和 AI 研究资源",
};

const categoryPurpose = {
  Productivity: "连接工作软件，整理信息、任务和协作流程",
  "Developer Tools": "辅助开发、部署、调试和工程协作",
  Design: "搜索、生成、编辑和交付设计或视觉素材",
  Research: "检索资料、汇总证据并形成研究判断",
  Security: "分析代码、风险和安全问题",
  Engineering: "辅助工程实现和验证",
  Lifestyle: "处理生活服务相关任务",
};

function usage() {
  console.log(`
Codex 插件市场中文化工具

用法:
  node scripts/codex-plugin-marketplace-zh.mjs --dry-run
  node scripts/codex-plugin-marketplace-zh.mjs --apply
  node scripts/codex-plugin-marketplace-zh.mjs --apply --force
  node scripts/codex-plugin-marketplace-zh.mjs --apply --force --only hugging-face
  node scripts/codex-plugin-marketplace-zh.mjs --apply --translate-categories
  node scripts/codex-plugin-marketplace-zh.mjs --restore latest
  node scripts/codex-plugin-marketplace-zh.mjs --restore /path/to/backup
  node scripts/codex-plugin-marketplace-zh.mjs --dry-run --home /tmp/fake-home --backup-root /tmp/backups

说明:
  默认是 dry-run，不写入任何 ~/.codex 文件。
  --apply 会先备份将要改动的 JSON 文件，再中文化插件展示名、简介、详情和示例提示词。
  --force 会重新生成已中文化条目的文案；默认会跳过已中文化条目，避免重复推断。
  --translate-categories 会同时把分类字段从 Productivity/Developer Tools 等翻成中文；不加时保留英文分类，兼容性更稳。
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hasCjk(value) {
  return typeof value === "string" && /[\u3400-\u9fff]/.test(value);
}

function alreadyLocalized(json) {
  const iface = json.interface || {};
  return hasCjk(iface.shortDescription)
    && hasCjk(iface.longDescription)
    && hasCjk(json.description || "");
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

function titleCaseName(name) {
  return name
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanBrand(name, displayName) {
  return titleMap[name] || displayName || titleCaseName(name);
}

function inferPurpose(name, description, category) {
  if (namedPurpose[name]) return namedPurpose[name];
  const title = titleMap[name] || "";
  if (/(CRM|销售|客户|买家|增长|B2B|GTM|触达|商业情报)/.test(title)) return "处理客户、销售线索和 CRM 流程";
  if (/(市场数据|金融|基金|财报|私募|信用|投资|股权|资本|新闻|估值|银行|S&P)/.test(title)) return "检索金融数据、研究市场和辅助分析";
  if (/(数据|分析|BI|指标|仓库|目录|商业智能|流量|SEO)/.test(title)) return "查询数据、分析指标和生成洞察";
  if (/(设计|图片|视频|素材|绘图|媒体|视觉)/.test(title)) return "生成、编辑和交付设计素材";
  if (/(邮箱|邮件|日历|会议|沟通|纪要|任务|文件|签署|文档|阅读|知识|项目管理)/.test(title)) return "整理信息、任务、文件和协作流程";
  if (/(部署|后端|开发|代码|测试|安全|浏览器|电脑控制|开发者)/.test(title)) return "辅助开发、部署、调试和工程协作";
  const text = `${name} ${description}`.toLowerCase();

  if (/(crm|sales|lead|prospect|account|gtm|customer|deal|pipeline|hubspot|pipedrive|apollo|outreach|zoominfo|clay)/.test(text)) return "处理客户、销售线索和 CRM 流程";
  if (/(finance|financial|market|equity|invest|fund|credit|filing|earnings|research|portfolio|valuation|banking|capital)/.test(text)) return "检索金融数据、研究市场和辅助分析";
  if (/(analytics|data|warehouse|bi|dashboard|metric|funnel|metabase|mixpanel|posthog|amplitude|deepnote|alation|cube|thoughtspot)/.test(text)) return "查询数据、分析指标和生成洞察";
  if (/(gmail|outlook|email|mail|superhuman|sendgrid|fyxer)/.test(text)) return "处理邮件、收件箱和回复";
  if (/(calendar|calendly|schedule|meeting|availability)/.test(text)) return "管理日程、会议和空闲时间";
  if (/(drive|docs|sheets|slides|box|sharepoint|egnyte|document|file|zotero|readwise)/.test(text)) return "查找、整理和处理文件资料";
  if (/(slack|teams|zoom|meeting|transcript|circleback|granola|otter|fireflies|read-ai)/.test(text)) return "总结沟通记录、会议和后续事项";
  if (/(github|git|ci|deploy|cloudflare|vercel|netlify|render|sentry|datadog|supabase|postgres|convex|shopify|expo|temporal|twilio|stripe|openai|sdk|api|code|developer|app)/.test(text)) return "辅助开发、部署、调试和工程协作";
  if (/(figma|canva|design|image|video|creative|asset|remotion|hyperframes|heygen|shutterstock|picsart|biorender|fal)/.test(text)) return "生成、编辑和交付设计素材";
  if (/(security|threat|vulnerability|risk|scan)/.test(text)) return "检查安全风险、漏洞和威胁模型";
  if (/(science|clinical|biology|genetics|omics|research|citation|paper)/.test(text)) return "检索科研资料、整理证据和生成研究结论";
  return categoryPurpose[category] || "连接外部工具并完成相关工作流";
}

function shortDescriptionFor(name, brand, purpose, category) {
  if (name === "browser") return "打开、检查、点击和截图本地或网页目标";
  if (name === "chrome") return "用你的 Chrome 登录状态浏览和操作网页";
  if (name === "computer-use") return "让 Codex 操作 macOS 桌面应用";
  const prefix = categoryZh[category] ? `${categoryZh[category]}：` : "";
  return `${prefix}${purpose}`;
}

function longDescriptionFor(brand, purpose) {
  return `让 Codex 使用 ${brand} 来${purpose}。安装或启用后，涉及外部账号的数据读取或真实写入时，应按你的授权范围执行。`;
}

function defaultPromptsFor(brand, purpose) {
  return [
    `帮我用 ${brand} 总结当前最重要的信息`,
    `在 ${brand} 里查找和当前任务相关的内容`,
    `基于 ${brand} 帮我整理下一步行动`,
  ].map((item) => item.slice(0, 128));
}

function localizePluginJson(filePath) {
  const json = readJson(filePath);
  if (!force && alreadyLocalized(json)) return json;

  const name = json.name || path.basename(path.dirname(path.dirname(filePath)));
  const iface = json.interface || {};
  const category = iface.category || json.category || "";
  const brand = cleanBrand(name, iface.displayName);
  const purpose = inferPurpose(name, `${json.description || ""} ${iface.shortDescription || ""} ${iface.longDescription || ""}`, category);

  json.interface = {
    ...iface,
    displayName: brand,
    shortDescription: shortDescriptionFor(name, brand, purpose, category),
    longDescription: longDescriptionFor(brand, purpose),
    defaultPrompt: defaultPromptsFor(brand, purpose),
  };

  if (translateCategories && json.interface.category && categoryZh[json.interface.category]) {
    json.interface.category = categoryZh[json.interface.category];
  }

  json.description = json.interface.shortDescription;
  return json;
}

function localizeMarketplaceJson(filePath, displayName) {
  const json = readJson(filePath);
  json.interface = {
    ...(json.interface || {}),
    displayName,
  };
  if (translateCategories && Array.isArray(json.plugins)) {
    for (const plugin of json.plugins) {
      if (plugin.category && categoryZh[plugin.category]) plugin.category = categoryZh[plugin.category];
    }
  }
  return json;
}

function jsonChanged(filePath, nextJson) {
  const current = readJson(filePath);
  return JSON.stringify(current) !== JSON.stringify(nextJson);
}

function ensureBackup(filePath, backupDir, manifest) {
  const rel = path.relative(homeDir, filePath);
  const safeRel = rel.startsWith("..") ? path.relative("/", filePath) : rel;
  const backupPath = path.join(backupDir, "files", safeRel);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  manifest.files.push({ original: filePath, backup: backupPath });
}

function collectTargets() {
  const files = [];
  for (const target of targetRoots) {
    const pluginFiles = walk(
      target.root,
      (filePath) => filePath.endsWith(path.join(".codex-plugin", "plugin.json")),
    );
    for (const filePath of pluginFiles) files.push({ type: "plugin", filePath, target });
    if (target.marketplace && exists(target.marketplace)) {
      files.push({ type: "marketplace", filePath: target.marketplace, target });
    }
  }

  const seen = new Set();
  return files.filter((item) => {
    if (seen.has(item.filePath)) return false;
    seen.add(item.filePath);
    if (onlyName && item.type === "marketplace") return false;
    if (onlyName && item.type === "plugin") {
      try {
        return readJson(item.filePath).name === onlyName;
      } catch {
        return false;
      }
    }
    return true;
  });
}

function findBackupDir(value) {
  if (!value || value === "latest") {
    if (!exists(defaultBackupRoot)) throw new Error(`没有找到备份目录：${defaultBackupRoot}`);
    const candidates = fs.readdirSync(defaultBackupRoot)
      .map((name) => path.join(defaultBackupRoot, name))
      .filter((entry) => {
        const manifestPath = path.join(entry, "manifest.json");
        if (!exists(manifestPath)) return false;
        const manifest = readJson(manifestPath);
        return !manifest.kind || manifest.kind === backupKind;
      })
      .sort();
    if (candidates.length === 0) throw new Error(`没有找到可恢复的备份：${defaultBackupRoot}`);
    return candidates[candidates.length - 1];
  }
  return path.resolve(value);
}

function restoreBackup(value) {
  const backupDir = findBackupDir(value);
  const manifestPath = path.join(backupDir, "manifest.json");
  const manifest = readJson(manifestPath);
  for (const entry of manifest.files || []) {
    if (!exists(entry.backup)) throw new Error(`备份文件不存在：${entry.backup}`);
    fs.mkdirSync(path.dirname(entry.original), { recursive: true });
    fs.copyFileSync(entry.backup, entry.original);
  }
  console.log(`已恢复 ${manifest.files.length} 个文件。`);
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

const targets = collectTargets();
const planned = [];

for (const item of targets) {
  try {
    const nextJson = item.type === "plugin"
      ? localizePluginJson(item.filePath)
      : localizeMarketplaceJson(item.filePath, item.target.marketplaceName);
    if (jsonChanged(item.filePath, nextJson)) {
      planned.push({ ...item, nextJson });
    }
  } catch (error) {
    console.warn(`跳过无法解析的 JSON：${item.filePath}`);
    console.warn(`原因：${error.message}`);
  }
}

console.log(`模式：${dryRun ? "dry-run（不写入）" : "apply（会写入）"}`);
console.log(`待中文化 JSON 文件数：${planned.length}`);

const sample = planned
  .filter((item) => item.type === "plugin")
  .slice(0, 12)
  .map((item) => {
    const json = item.nextJson;
    return `- ${json.name}: ${json.interface?.displayName} | ${json.interface?.shortDescription}`;
  });

if (sample.length > 0) {
  console.log("\n预览：");
  console.log(sample.join("\n"));
}

if (dryRun) {
  console.log("\n未写入任何文件。确认后运行：");
  console.log("node scripts/codex-plugin-marketplace-zh.mjs --apply");
  process.exit(0);
}

if (planned.length === 0) {
  console.log("\n无需写入，当前支持范围内的插件市场元数据已经是中文。");
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(defaultBackupRoot, timestamp);
const manifest = {
  createdAt: new Date().toISOString(),
  kind: backupKind,
  files: [],
};

fs.mkdirSync(backupDir, { recursive: true });
for (const item of planned) ensureBackup(item.filePath, backupDir, manifest);
for (const item of planned) writeJson(item.filePath, item.nextJson);
writeJson(path.join(backupDir, "manifest.json"), manifest);

console.log(`\n已中文化 ${planned.length} 个 JSON 文件。`);
console.log(`备份目录：${backupDir}`);
console.log("恢复命令：");
console.log(`node scripts/codex-plugin-marketplace-zh.mjs --restore ${backupDir}`);
console.log("\n下一步：重启 Codex，然后打开插件市场检查显示。");
