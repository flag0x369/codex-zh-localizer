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
const backupRoot = path.resolve(
  argValue("--backup-root") ||
  process.env.CODEX_ZH_BACKUP_ROOT ||
  path.join(workspaceRoot, "codex-plugin-marketplace-zh-backups"),
);
const backupKind = "plugin-components-zh";

const args = new Set(rawArgs);
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;
const force = args.has("--force");
const onlyName = argValue("--only");
const restoreIndex = rawArgs.indexOf("--restore");
const restoreValue = argValue("--restore");

const roots = [
  path.join(homeDir, ".codex", ".tmp", "plugins"),
  path.join(homeDir, ".codex", ".tmp", "bundled-marketplaces", "openai-bundled"),
  path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "plugins", "openai-primary-runtime"),
  path.join(homeDir, ".codex", "plugins", "cache"),
];

const appDirectory = path.join(homeDir, ".codex", "cache", "codex_app_directory");

const skillTitles = {
  "plugin-creator": "插件创建器",
  "airtable-cli": "Airtable CLI",
  "airtable-filters": "Airtable 过滤器",
  "airtable-overview": "Airtable 概览",
  "capture-tasks-from-meeting-notes": "从会议纪要创建任务",
  "generate-status-report": "生成状态报告",
  "search-company-knowledge": "搜索公司知识",
  "spec-to-backlog": "规格转待办",
  "triage-issue": "分流 Issue",
  "base44-cli": "Base44 CLI",
  "base44-sdk": "Base44 SDK",
  "base44-troubleshooter": "Base44 排障",
  "gh-address-comments": "PR 反馈处理",
  "gh-fix-ci": "CI 调试",
  github: "GitHub 工作流",
  yeet: "发布变更",
  "attack-path-analysis": "攻击路径分析",
  "deep-security-scan": "深度安全扫描",
  "finding-discovery": "安全发现挖掘",
  "fix-finding": "修复安全发现",
  "security-diff-scan": "安全差异扫描",
  "security-scan": "安全扫描",
  "threat-model": "威胁模型",
  validation: "安全验证",
};

const skillPurposes = {
  "plugin-creator": "创建插件目录和插件市场条目",
  "airtable-cli": "检查 Airtable base、架构和记录",
  "airtable-filters": "按字段类型构建 Airtable 记录过滤器",
  "airtable-overview": "解释 Airtable base、表、字段、记录、视图和界面",
  "capture-tasks-from-meeting-notes": "从会议纪要提取行动项并创建 Jira 任务",
  "generate-status-report": "基于 Jira 生成项目状态报告",
  "search-company-knowledge": "搜索 Confluence、Jira 和内部 Atlassian 上下文",
  "spec-to-backlog": "把 Confluence 规格转成 Jira 待办列表",
  "triage-issue": "查找重复项并准备 Jira 缺陷报告",
  "base44-cli": "初始化、配置、部署和管理 Base44 项目",
  "base44-sdk": "使用 Base44 JavaScript 和 TypeScript SDK 构建功能",
  "base44-troubleshooter": "结合函数日志排查 Base44 生产问题",
  "gh-address-comments": "处理可执行的 PR 审查反馈",
  "gh-fix-ci": "排查失败的 GitHub Actions 检查",
  github: "检查 PR、Issue、CI 和发布流程",
  yeet: "提交、推送并打开 PR",
  "attack-path-analysis": "分析安全发现的攻击路径和严重性",
  "deep-security-scan": "运行更深入的仓库级安全扫描",
  "finding-discovery": "发现候选安全问题",
  "fix-finding": "修复并验证指定安全问题",
  "security-diff-scan": "对 Git diff 做安全审查",
  "security-scan": "运行仓库或指定路径安全扫描",
  "threat-model": "构建仓库威胁模型",
  validation: "验证候选安全问题是否成立",
};

const appTitles = {
  github: "GitHub 代码协作",
  gmail: "Gmail 邮箱",
  "google-drive": "Google 云端硬盘",
  "google-calendar": "Google 日历",
  slack: "Slack 团队沟通",
  teams: "Microsoft Teams",
  sharepoint: "SharePoint",
  notion: "Notion 知识与项目",
  linear: "Linear 项目管理",
};

const appPurposes = {
  github: "访问代码仓库、Issue 和 Pull Request；部分 Codex 功能需要它",
  gmail: "读取、整理和管理 Gmail 邮件",
  "google-drive": "访问 Drive、Docs、Sheets 和 Slides 文件",
  "google-calendar": "管理日历、会议和空闲时间",
  slack: "读取和管理 Slack 消息与频道",
  teams: "读取和管理 Microsoft Teams 对话与会议上下文",
  sharepoint: "读取和整理 SharePoint 站点与文件",
  notion: "读取和整理 Notion 页面、数据库和项目资料",
  linear: "查找和引用 Linear Issue 与项目",
};

const phraseReplacements = [
  [/Best Practices/gi, "最佳实践"],
  [/Troubleshooting|Troubleshooter/gi, "排障"],
  [/Status Report/gi, "状态报告"],
  [/Meeting Notes/gi, "会议纪要"],
  [/Action Items?/gi, "行动项"],
  [/Task Management/gi, "任务管理"],
  [/Task Extraction/gi, "任务提取"],
  [/Tasks?/gi, "任务"],
  [/Project Status/gi, "项目状态"],
  [/Company Knowledge/gi, "公司知识"],
  [/Spec to Backlog/gi, "规格转待办"],
  [/Spec to Implementation/gi, "规格转实施"],
  [/Backlogs?/gi, "待办列表"],
  [/Bug Reports?/gi, "缺陷报告"],
  [/Record Filters?/gi, "记录过滤器"],
  [/Content Flows?/gi, "内容流程"],
  [/Content API/gi, "内容 API"],
  [/Data Hygiene/gi, "数据清理"],
  [/Customer Prep/gi, "客户准备"],
  [/Pipeline Health/gi, "管道健康度"],
  [/Inbox Triage/gi, "收件箱分流"],
  [/Daily Brief/gi, "每日简报"],
  [/Free Up Time/gi, "腾出时间"],
  [/Group Scheduler/gi, "群组排期"],
  [/Meeting Prep/gi, "会议准备"],
  [/Shared Calendars?/gi, "共享日历"],
  [/Shared Mailboxes?/gi, "共享邮箱"],
  [/Subscription Cleanup/gi, "订阅清理"],
  [/Reply Drafting/gi, "回复草稿"],
  [/Channel Summarization/gi, "频道总结"],
  [/Notification Triage/gi, "通知分流"],
  [/Outgoing Message/gi, "外发消息"],
  [/Messages?/gi, "消息"],
  [/Knowledge Capture/gi, "知识沉淀"],
  [/Meeting Intelligence/gi, "会议智能"],
  [/Research & Documentation/gi, "研究与文档整理"],
  [/Research Documentation/gi, "研究文档整理"],
  [/Site Discovery/gi, "站点发现"],
  [/Shared Doc Maintenance/gi, "共享文档维护"],
  [/Formula Builder/gi, "公式构建器"],
  [/Word Docs/gi, "Word 文档"],
  [/PowerPoint/gi, "PowerPoint"],
  [/Image CDN/gi, "图片 CDN"],
  [/Edge Functions?/gi, "边缘函数"],
  [/Serverless Functions?/gi, "无服务器函数"],
  [/Runtime Cache/gi, "运行时缓存"],
  [/Environment Variables?|Env Vars/gi, "环境变量"],
  [/Cron Jobs?/gi, "定时任务"],
  [/Deployments? CI\/CD|Deployments? Cicd/gi, "部署与 CI/CD"],
  [/CLI & Deploy/gi, "CLI 与部署"],
  [/App Store Review/gi, "应用商店审核"],
  [/Custom Data/gi, "自定义数据"],
  [/Developer Onboarding/gi, "开发者入门"],
  [/Merchant Onboarding/gi, "商家入门"],
  [/Storefront GraphQL/gi, "店面 GraphQL"],
  [/Admin GraphQL/gi, "Admin GraphQL"],
  [/Checkout Extensions?/gi, "结账扩展"],
  [/Customer Account Extensions?/gi, "客户账户扩展"],
  [/Point[- ]of[- ]Sale|POS/gi, "POS"],
  [/Call Recordings?/gi, "通话录音"],
  [/Conference Calls?/gi, "电话会议"],
  [/Content Template Builder/gi, "内容模板构建器"],
  [/Conversation Intelligence/gi, "对话智能"],
  [/Conversation Orchestrator/gi, "对话编排"],
  [/Customer Memory/gi, "客户记忆"],
  [/Customer Support Architect/gi, "客户支持架构"],
  [/Debugging Observability/gi, "调试与可观测性"],
  [/Email Deliverability Advisor/gi, "邮件送达率顾问"],
  [/Email Send/gi, "发送邮件"],
  [/Enterprise Knowledge/gi, "企业知识"],
  [/Identity Verification Advisor/gi, "身份验证顾问"],
  [/Lookup Phone Intelligence/gi, "号码情报查询"],
  [/Marketing Promotions Advisor/gi, "营销活动顾问"],
  [/Messaging Channel Advisor/gi, "消息渠道顾问"],
  [/Messaging Overview/gi, "消息概览"],
  [/Messaging Services?/gi, "消息服务"],
  [/Messaging Webhooks?/gi, "消息 Webhook"],
  [/Notifications? Alerts? Advisor/gi, "通知告警顾问"],
  [/Numbers? Senders?/gi, "号码与发送方"],
  [/Organizations? Setup/gi, "组织设置"],
  [/Regulatory Compliance Bundles?/gi, "监管合规包"],
  [/Reliability Patterns?/gi, "可靠性模式"],
  [/Security API Auth/gi, "安全 API 认证"],
  [/Security Compliance HIPAA/gi, "HIPAA 安全合规"],
  [/Security Hardening/gi, "安全加固"],
  [/Send Message/gi, "发送消息"],
  [/Inbound Parse/gi, "入站解析"],
  [/Suppressions?/gi, "退订与抑制列表"],
  [/Taskrouter Routing/gi, "TaskRouter 路由"],
  [/Verify Send OTP/gi, "发送验证码"],
  [/Voice Outbound Calls?/gi, "语音外呼"],
  [/Webhook Architecture/gi, "Webhook 架构"],
  [/WhatsApp Manage Senders?/gi, "WhatsApp 发送方管理"],
  [/WhatsApp Send Message/gi, "WhatsApp 发送消息"],
  [/AI Agent Architect/gi, "AI 智能体架构"],
  [/Agent Augmentation Architect/gi, "智能体增强架构"],
  [/Agent Connect/gi, "智能体连接"],
  [/Account Setup/gi, "账户设置"],
  [/Compliance Onboarding/gi, "合规入门"],
  [/Compliance Traffic/gi, "合规流量"],
  [/RCS Messaging/gi, "RCS 消息"],
  [/SMS Send Message/gi, "短信发送"],
  [/ISV SMS Best Practices/gi, "ISV 短信最佳实践"],
  [/SendGrid Account Setup/gi, "SendGrid 账户设置"],
  [/SendGrid Deliverability Advisor/gi, "SendGrid 送达率顾问"],
  [/SendGrid Email Send/gi, "SendGrid 发送邮件"],
  [/SendGrid Email Settings/gi, "SendGrid 邮件设置"],
  [/SendGrid Engagement Quality/gi, "SendGrid 互动质量"],
  [/SendGrid Inbound Parse/gi, "SendGrid 入站解析"],
  [/SendGrid Suppressions/gi, "SendGrid 抑制列表"],
  [/SendGrid Webhooks/gi, "SendGrid Webhook"],
  [/Voice Conversation Relay/gi, "语音对话中继"],
  [/TwiML/gi, "TwiML"],
  [/IAM Auth Setup/gi, "IAM 认证设置"],
  [/Agent Browser Verify/gi, "智能体浏览器验证"],
  [/Agent Browser/gi, "智能体浏览器"],
  [/AI Elements/gi, "AI 组件"],
  [/AI Generation Persistence/gi, "AI 生成持久化"],
  [/Chat SDK/gi, "Chat SDK"],
  [/Project Bootstrapping|Bootstrap/gi, "项目初始化"],
  [/Investigation Mode/gi, "调查模式"],
  [/JSON Render/gi, "JSON 渲染"],
  [/Routing Middleware/gi, "路由中间件"],
  [/Sign In With Vercel/gi, "使用 Vercel 登录"],
  [/Full-story Verification/gi, "完整流程验证"],
  [/Workflow/gi, "工作流"],
  [/Wix App Builder/gi, "Wix 应用构建器"],
  [/Wix Design System/gi, "Wix 设计系统"],
  [/Wix Headless/gi, "Wix Headless"],
  [/Wix Manage/gi, "Wix 管理"],
  [/Choose Zoom Approach/gi, "选择 Zoom 方案"],
  [/Debug Zoom Integration/gi, "调试 Zoom 集成"],
  [/Zoom General/gi, "Zoom 通用"],
  [/Meeting SDK/gi, "Meeting SDK"],
  [/Video SDK/gi, "Video SDK"],
  [/Contact Center/gi, "联系中心"],
  [/Team Chat/gi, "团队聊天"],
  [/UI Toolkit/gi, "UI Toolkit"],
  [/Virtual Agent/gi, "虚拟智能体"],
  [/Realtime Media Streams/gi, "实时媒体流"],
  [/REST API/gi, "REST API"],
  [/WebSockets?/gi, "WebSocket"],
  [/Webhooks?/gi, "Webhook"],
  [/OAuth/gi, "OAuth"],
  [/Phone/gi, "电话"],
  [/Start/gi, "开始"],
  [/General/gi, "通用"],
  [/Component View/gi, "组件视图"],
  [/Client View/gi, "客户端视图"],
  [/Emulator QA/gi, "模拟器 QA"],
  [/Android Performance/gi, "Android 性能"],
  [/Native UI/gi, "原生 UI"],
  [/Run Actions/gi, "运行按钮动作"],
  [/API Routes?/gi, "API 路由"],
  [/CI\/CD Workflows?/gi, "CI/CD 工作流"],
  [/Dev Client/gi, "开发客户端"],
  [/Tailwind Setup/gi, "Tailwind 设置"],
  [/Data Fetching/gi, "数据获取"],
  [/Game Playtest/gi, "游戏试玩测试"],
  [/Game Studio/gi, "游戏工作室"],
  [/Game UI Frontend/gi, "游戏 UI 前端"],
  [/Sprite Pipeline/gi, "精灵图流程"],
  [/Asset Pipeline/gi, "资产流程"],
  [/Game Foundations/gi, "游戏基础"],
  [/Cashflow Forecast/gi, "现金流预测"],
  [/Portfolio Company One[- ]Pager/gi, "被投公司一页纸"],
  [/Fund Comparison/gi, "基金比较"],
  [/Fund Screener/gi, "基金筛选"],
  [/Fund Summarizer/gi, "基金总结"],
  [/Capital Allocation/gi, "资本配置"],
  [/Earnings Flash/gi, "财报快讯"],
  [/Earnings Prep/gi, "财报准备"],
  [/Earnings Review/gi, "财报复盘"],
  [/Guidance Tracker/gi, "指引跟踪"],
  [/Investment Banking/gi, "投资银行"],
  [/Precedent Transactions/gi, "可比交易"],
  [/Research Note/gi, "研究报告"],
  [/Supply Chain/gi, "供应链"],
  [/Tearsheet/gi, "一页概览"],
  [/Unit Economics/gi, "单位经济模型"],
  [/Working Capital/gi, "营运资本"],
  [/Bull Bear/gi, "牛熊情景"],
  [/Comp Sheet/gi, "可比公司表"],
  [/Comps/gi, "可比公司"],
  [/Industry/gi, "行业"],
  [/Inflection/gi, "拐点"],
  [/Initiate/gi, "覆盖启动"],
  [/Build Model/gi, "构建模型"],
  [/Amplicon Microbiome/gi, "扩增子微生物组"],
  [/NGS Router/gi, "NGS 路由"],
  [/Peaks QC/gi, "峰值 QC"],
  [/BCL to FASTQ/gi, "BCL 转 FASTQ"],
  [/Bulk RNA-seq Counts/gi, "Bulk RNA-seq 计数"],
  [/Bulk RNA-seq DE/gi, "Bulk RNA-seq 差异表达"],
  [/Bulk RNA-seq/gi, "Bulk RNA-seq"],
  [/Germline DNA Variants/gi, "生殖系 DNA 变异"],
  [/Somatic DNA Variants/gi, "体细胞 DNA 变异"],
  [/UMI Panel Variants/gi, "UMI Panel 变异"],
  [/DNA Variants/gi, "DNA 变异"],
  [/Epigenomics Peaks/gi, "表观组学峰值"],
  [/FASTQ QC/gi, "FASTQ QC"],
  [/Single-cell RNA-seq/gi, "单细胞 RNA-seq"],
  [/Shotgun Metagenomics/gi, "宏基因组测序"],
  [/scRNA-seq QC/gi, "scRNA-seq QC"],
  [/NGS Runtime/gi, "NGS 运行环境"],
  [/Attack Path Analysis/gi, "攻击路径分析"],
  [/Deep Security Scan/gi, "深度安全扫描"],
  [/Finding Discovery/gi, "安全发现挖掘"],
  [/Fix Finding/gi, "修复安全发现"],
  [/Security Diff Scan/gi, "安全差异扫描"],
  [/Security Scan/gi, "安全扫描"],
  [/Threat Model/gi, "威胁模型"],
  [/Review Follow-up/gi, "审查反馈跟进"],
  [/Publish Changes/gi, "发布变更"],
  [/CI Debug/gi, "CI 调试"],
  [/Pull Request|PR/gi, "PR"],
  [/GitHub Actions/gi, "GitHub Actions"],
  [/Code Review/gi, "代码审查"],
  [/App Intents/gi, "App Intents"],
  [/Liquid Glass/gi, "Liquid Glass"],
  [/SwiftUI/gi, "SwiftUI"],
  [/AppKit/gi, "AppKit"],
  [/SwiftPM/gi, "SwiftPM"],
  [/Overview/gi, "概览"],
  [/Filters?/gi, "过滤器"],
  [/Reports?/gi, "报告"],
  [/\bRecords?\b/gi, "记录"],
  [/\bViews?\b/gi, "视图"],
  [/\bInterfaces?\b/gi, "界面"],
  [/\bFields?\b/gi, "字段"],
  [/\bTables?\b/gi, "表"],
  [/\bBases?\b/gi, "库"],
  [/Schema/gi, "架构"],
  [/Logs?/gi, "日志"],
  [/Production Issues?/gi, "生产问题"],
  [/Simulator/gi, "模拟器"],
  [/Performance Audit/gi, "性能审计"],
  [/View Refactor/gi, "视图重构"],
  [/UI Patterns/gi, "UI 模式"],
  [/Window Management/gi, "窗口管理"],
  [/Build \/ Run \/ Debug/gi, "构建 / 运行 / 调试"],
  [/Chrome/gi, "Chrome"],
  [/Browser/gi, "浏览器"],
  [/Documents?/gi, "文档"],
  [/Spreadsheets?/gi, "表格"],
  [/Presentations?/gi, "演示文稿"],
  [/Data Visualization/gi, "数据可视化"],
  [/Visualization/gi, "可视化"],
  [/Analytics?/gi, "分析"],
  [/Dashboard/gi, "仪表盘"],
  [/Meeting/gi, "会议"],
  [/Knowledge/gi, "知识"],
  [/Research/gi, "研究"],
  [/Documentation/gi, "文档整理"],
  [/Implementation/gi, "实施"],
  [/Planning/gi, "规划"],
  [/Capture/gi, "沉淀"],
  [/Summarization/gi, "总结"],
  [/Daily Digest/gi, "每日摘要"],
  [/Notification Triage/gi, "通知分流"],
  [/Reply Drafting/gi, "回复草稿"],
  [/Outgoing Message/gi, "外发消息"],
  [/Channel/gi, "频道"],
  [/Triage/gi, "分流"],
  [/Debug/gi, "调试"],
  [/Build/gi, "构建"],
  [/Run/gi, "运行"],
  [/Test/gi, "测试"],
  [/Deploy/gi, "部署"],
  [/Publish/gi, "发布"],
  [/Create/gi, "创建"],
  [/Generate/gi, "生成"],
  [/Implement/gi, "实现"],
  [/Refactor/gi, "重构"],
  [/Inspect/gi, "检查"],
  [/Search/gi, "搜索"],
  [/Query/gi, "查询"],
  [/Analyze|Analysis/gi, "分析"],
  [/Summarize/gi, "总结"],
  [/Draft/gi, "草拟"],
  [/Fix/gi, "修复"],
  [/Validate|Validation/gi, "验证"],
  [/Manage/gi, "管理"],
  [/Use/gi, "使用"],
  [/Design/gi, "设计"],
  [/Performance/gi, "性能"],
  [/Audit/gi, "审计"],
  [/Telemetry/gi, "遥测"],
  [/Window Management/gi, "窗口管理"],
  [/Packaging/gi, "打包"],
  [/Notarization/gi, "公证"],
  [/Signing/gi, "签名"],
  [/Entitlements/gi, "权限声明"],
  [/Security/gi, "安全"],
  [/\bFrom\b/gi, "从"],
  [/\bInto\b/gi, "转为"],
  [/\bAnd\b/gi, "与"],
  [/\bFor\b/gi, "用于"],
  [/\bWith\b/gi, "使用"],
];

function usage() {
  console.log(`
Codex 插件组件中文化工具

用法:
  node scripts/codex-plugin-components-zh.mjs --dry-run
  node scripts/codex-plugin-components-zh.mjs --apply
  node scripts/codex-plugin-components-zh.mjs --apply --force
  node scripts/codex-plugin-components-zh.mjs --apply --force --only github
  node scripts/codex-plugin-components-zh.mjs --restore latest
  node scripts/codex-plugin-components-zh.mjs --dry-run --home /tmp/fake-home --backup-root /tmp/backups

说明:
  默认 dry-run，不写入。
  会中文化插件详情页里的“技能”和“应用”展示元数据。
  技能目标：skills/*/agents/openai.yaml。
  应用目标：~/.codex/cache/codex_app_directory/*.json 中被插件 .app.json 引用的 connector。
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

function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function getYamlScalar(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*["']?([^"'\\n]*)["']?\\s*$`, "m"));
  return match ? match[1].trim() : "";
}

function setYamlScalar(text, key, value) {
  const re = new RegExp(`^(\\s*${key}:\\s*).*$`, "m");
  if (re.test(text)) return text.replace(re, `$1${yamlQuote(value)}`);
  return `${text.trimEnd()}\n  ${key}: ${yamlQuote(value)}\n`;
}

function skillNameFromAgent(filePath) {
  return path.basename(path.dirname(path.dirname(filePath)));
}

function titleizeSlug(value) {
  const acronyms = new Map([
    ["ai", "AI"],
    ["api", "API"],
    ["app", "App"],
    ["atacseq", "ATAC-seq"],
    ["bcl", "BCL"],
    ["cdn", "CDN"],
    ["ci", "CI"],
    ["cicd", "CI/CD"],
    ["cli", "CLI"],
    ["crm", "CRM"],
    ["css", "CSS"],
    ["csv", "CSV"],
    ["de", "DE"],
    ["dna", "DNA"],
    ["doc", "Doc"],
    ["docs", "Docs"],
    ["eas", "EAS"],
    ["gp", "GP"],
    ["graphql", "GraphQL"],
    ["hf", "HF"],
    ["html", "HTML"],
    ["http", "HTTP"],
    ["ios", "iOS"],
    ["isv", "ISV"],
    ["its", "ITS"],
    ["js", "JS"],
    ["json", "JSON"],
    ["lp", "LP"],
    ["mcp", "MCP"],
    ["mms", "MMS"],
    ["ngs", "NGS"],
    ["otp", "OTP"],
    ["pdf", "PDF"],
    ["pm", "PM"],
    ["pos", "POS"],
    ["pr", "PR"],
    ["qa", "QA"],
    ["qc", "QC"],
    ["rcs", "RCS"],
    ["rest", "REST"],
    ["rna", "RNA"],
    ["rnaseq", "RNA-seq"],
    ["sdk", "SDK"],
    ["sms", "SMS"],
    ["sql", "SQL"],
    ["tsx", "TSX"],
    ["ui", "UI"],
    ["umi", "UMI"],
    ["usd", "USD"],
    ["ux", "UX"],
    ["wgs", "WGS"],
    ["wes", "WES"],
    ["yaml", "YAML"],
  ]);
  return String(value)
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => acronyms.get(part.toLowerCase()) || `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

function displaySource(value, skillName) {
  const raw = String(value || "").trim();
  if (!raw) return titleizeSlug(skillName);
  if ((raw.includes("-") || raw.includes("_")) && raw.toLowerCase() === raw) return titleizeSlug(raw);
  return raw;
}

function translateDisplayName(value, skillName) {
  if (skillTitles[skillName]) return skillTitles[skillName];
  let result = displaySource(value, skillName);
  for (const [pattern, replacement] of phraseReplacements) result = result.replace(pattern, replacement);
  return hasCjk(result) ? result : `${result}（技能）`;
}

function inferSkillPurpose(skillName, displayName, shortDescription) {
  if (skillPurposes[skillName]) return skillPurposes[skillName];
  const text = `${skillName} ${displayName} ${shortDescription}`.toLowerCase();
  if (/security|threat|vulnerability|scan|finding|validation/.test(text)) return "处理安全扫描、验证和风险分析";
  if (/github|pull|pr|issue|ci|actions|commit|push/.test(text)) return "处理 GitHub、PR、Issue、CI 和发布流程";
  if (/slack|message|reply|channel|digest|notification/.test(text)) return "总结 Slack 消息并草拟回复";
  if (/document|docx|word|docs/.test(text)) return "创建、编辑和校验文档";
  if (/spreadsheet|xlsx|sheet|csv/.test(text)) return "创建、分析和整理表格";
  if (/presentation|ppt|slides/.test(text)) return "创建、渲染和导出演示文稿";
  if (/browser|chrome|playwright|screenshot/.test(text)) return "打开、检查和自动化网页";
  if (/figma|design|component|ui/.test(text)) return "处理设计、组件和界面实现";
  if (/deploy|cloudflare|vercel|netlify|render/.test(text)) return "部署、调试和管理线上服务";
  if (/data|analytics|dashboard|query|visualization/.test(text)) return "查询数据、分析指标和生成可视化";
  if (/calendar|meeting|schedule/.test(text)) return "管理会议、日程和准备材料";
  return "完成这个插件提供的专项工作流";
}

function defaultPromptFor(existingPrompt, skillName, purpose) {
  const token = String(existingPrompt || "").match(/\$[a-z0-9:_-]+/i)?.[0] || `$${skillName}`;
  return `使用 ${token}：${purpose}。`;
}

function localizeSkillAgent(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const skillName = skillNameFromAgent(filePath);
  if (onlyName && skillName !== onlyName) return original;

  const currentDisplay = getYamlScalar(original, "display_name");
  const currentShort = getYamlScalar(original, "short_description");
  const currentPrompt = getYamlScalar(original, "default_prompt");
  if (!force && hasCjk(currentShort)) return original;

  const displayName = translateDisplayName(currentDisplay, skillName);
  const purpose = inferSkillPurpose(skillName, currentDisplay, currentShort);
  let next = original;
  next = setYamlScalar(next, "display_name", displayName);
  next = setYamlScalar(next, "short_description", purpose);
  next = setYamlScalar(next, "default_prompt", defaultPromptFor(currentPrompt, skillName, purpose));
  return next;
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
        // Ignore malformed app config.
      }
    }
  }
  return ids;
}

function prettyAppName(appKey, currentName) {
  return appTitles[appKey] || currentName || appKey.split(/[-_]/g).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function appDescription(appKey, title) {
  return appPurposes[appKey] || `让 Codex 连接 ${title}，按你的授权范围读取信息或执行相关操作。`;
}

function localizeAppDirectory(filePath, appIds) {
  const json = readJson(filePath);
  let changed = false;
  for (const connector of json.connectors || []) {
    const appKey = appIds.get(connector.id);
    if (!appKey) continue;
    if (onlyName && appKey !== onlyName) continue;
    if (!force && hasCjk(connector.description)) continue;
    const title = prettyAppName(appKey, connector.name);
    connector.name = title;
    connector.description = appDescription(appKey, title);
    changed = true;
  }
  return changed ? json : null;
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
  const targets = [];
  for (const root of roots) {
    const skillFiles = walk(root, (filePath) =>
      filePath.endsWith(path.join("agents", "openai.yaml")) &&
      filePath.includes(`${path.sep}skills${path.sep}`));
    for (const filePath of skillFiles) targets.push({ type: "skill", filePath });
  }

  const appIds = collectAppIds();
  if (exists(appDirectory)) {
    for (const filePath of walk(appDirectory, (candidate) => candidate.endsWith(".json"))) {
      targets.push({ type: "app-directory", filePath, appIds });
    }
  }

  const seen = new Set();
  return targets.filter((target) => {
    if (seen.has(target.filePath)) return false;
    seen.add(target.filePath);
    return true;
  });
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
    if (candidates.length === 0) throw new Error(`没有找到可恢复的备份：${backupRoot}`);
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

const planned = [];
for (const target of collectTargets()) {
  if (target.type === "skill") {
    const nextText = localizeSkillAgent(target.filePath);
    const currentText = fs.readFileSync(target.filePath, "utf8");
    if (nextText !== currentText) planned.push({ ...target, nextText });
  } else if (target.type === "app-directory") {
    const nextJson = localizeAppDirectory(target.filePath, target.appIds);
    if (nextJson) planned.push({ ...target, nextJson });
  }
}

console.log(`模式：${dryRun ? "dry-run（不写入）" : "apply（会写入）"}`);
console.log(`待中文化组件文件数：${planned.length}`);

const skillSamples = planned
  .filter((item) => item.type === "skill")
  .slice(0, 12)
  .map((item) => {
    const skillName = skillNameFromAgent(item.filePath);
    return `- ${skillName}: ${getYamlScalar(item.nextText, "display_name")} | ${getYamlScalar(item.nextText, "short_description")}`;
  });

const appSamples = planned
  .filter((item) => item.type === "app-directory")
  .flatMap((item) => {
    const appIds = item.appIds;
    return (item.nextJson.connectors || [])
      .filter((connector) => appIds.has(connector.id) && hasCjk(connector.description))
      .slice(0, 8)
      .map((connector) => `- 应用 ${connector.name}: ${connector.description}`);
  })
  .slice(0, 8);

if (skillSamples.length || appSamples.length) {
  console.log("\n预览：");
  console.log([...skillSamples, ...appSamples].join("\n"));
}

if (dryRun) {
  console.log("\n未写入任何文件。确认后运行：");
  console.log("node scripts/codex-plugin-components-zh.mjs --apply");
  process.exit(0);
}

if (planned.length === 0) {
  console.log("\n无需写入，当前支持范围内的插件详情组件元数据已经是中文。");
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
for (const item of planned) {
  if (item.type === "skill") fs.writeFileSync(item.filePath, item.nextText);
  else writeJson(item.filePath, item.nextJson);
}
writeJson(path.join(backupDir, "manifest.json"), manifest);

console.log(`\n已中文化 ${planned.length} 个组件文件。`);
console.log(`备份目录：${backupDir}`);
console.log("恢复命令：");
console.log(`node scripts/codex-plugin-components-zh.mjs --restore ${backupDir}`);
console.log("\n下一步：重启 Codex，然后打开插件详情页检查“应用”和“技能”。");
