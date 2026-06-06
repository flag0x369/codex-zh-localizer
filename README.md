# Codex 中文化工具

**简体中文** | [English](README.en.md)

把 Codex 插件市场和插件详情页里可安全处理的本地英文元数据转换成中文。非官方、可审计、可恢复，不修改 Codex App 本体。

```bash
npx --yes github:flag0x369/codex-zh-localizer dry-run
npx --yes github:flag0x369/codex-zh-localizer apply
```

## 为什么做它

Codex 插件市场里的插件、技能和应用很多，但不少说明仍是英文。对中文用户来说，真正的阻碍不是不会用 Codex，而是不知道每个插件到底能做什么。

这个工具解决的是一个很具体的问题：让插件市场、插件详情页、技能说明、应用连接器说明尽量中文可读，同时不破坏 Codex 更新、签名和本地环境。

## 它适合谁

| 场景 | 你会得到什么 |
| --- | --- |
| 插件市场里英文太多 | 插件名、简介、详情、示例提示词中文化 |
| 插件详情页的技能看不懂 | 技能名、技能描述、默认提示词中文化 |
| 应用连接器描述还是英文 | 应用名和连接器描述中文化 |
| Codex 更新后又变回英文 | 重新运行 `apply` 即可恢复支持范围内的中文 |
| 担心工具影响 Codex | 默认 dry-run，每次写入前备份，支持恢复 |

## 30 秒开始

先看会改什么，不写入：

```bash
npx --yes github:flag0x369/codex-zh-localizer dry-run
npx --yes github:flag0x369/codex-zh-localizer audit --strict
```

确认后应用中文化：

```bash
npx --yes github:flag0x369/codex-zh-localizer apply
```

如果你是从源码运行：

```bash
git clone https://github.com/flag0x369/codex-zh-localizer.git
cd codex-zh-localizer
npm run dry-run
npm run apply
```

Codex 更新或插件缓存刷新后，再跑一次：

```bash
npx --yes github:flag0x369/codex-zh-localizer apply
```

## 当前覆盖范围

工具默认扫描这些本地缓存：

| 类型 | 路径 |
| --- | --- |
| 官方插件缓存 | `~/.codex/.tmp/plugins` |
| OpenAI 内置市场缓存 | `~/.codex/.tmp/bundled-marketplaces/openai-bundled` |
| primary runtime 插件缓存 | `~/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime` |
| 已安装插件缓存 | `~/.codex/plugins/cache` |
| 应用连接器目录缓存 | `~/.codex/cache/codex_app_directory` |

本机当前审计样例：

```text
pluginJson: 190/190 已中文化
marketplaceJson: 3/3 已中文化
skillYaml: 563/563 已中文化
appConnectors: 140/140 已中文化
```

## 命令

```bash
# 只读审计
npx --yes github:flag0x369/codex-zh-localizer audit

# dry-run，不写文件
npx --yes github:flag0x369/codex-zh-localizer dry-run

# 应用中文化
npx --yes github:flag0x369/codex-zh-localizer apply

# 恢复最近一次插件卡片补丁
npx --yes github:flag0x369/codex-zh-localizer restore-marketplace latest

# 恢复最近一次详情组件补丁
npx --yes github:flag0x369/codex-zh-localizer restore-components latest
```

高级用法：

```bash
# 对临时 HOME 测试，不碰真实 ~/.codex
npx --yes github:flag0x369/codex-zh-localizer apply --home /tmp/fake-home --backup-root /tmp/codex-zh-backups

# 用于 CI 或本地检查，发现待中文化项时退出非 0
npx --yes github:flag0x369/codex-zh-localizer audit --strict
```

## 安全边界

这个工具默认不做这些事：

- 不修改 `/Applications/Codex.app`
- 不修改 `app.asar`
- 不修改签名文件、系统设置、shell 启动文件或用户凭据
- 不读取或输出 token、cookie、私钥、密码
- 不默认安装 LaunchAgent、cron、shell hook 或后台常驻进程

它只处理本地插件元数据缓存，并且每次 `apply` 前都会创建可恢复备份。

## 为什么不直接改 app.asar

Codex 前端内置 UI 文案位于 App bundle 资源中，其中包括 `app.asar`。直接 patch App 本体可能影响：

- macOS App 签名
- Codex 自动更新
- 完整性校验
- 下次升级后的可恢复性

所以当前版本选择更稳的路线：只中文化插件市场、技能和应用连接器这些可恢复的本地元数据。

## 本地开发

```bash
npm run check
npm run smoke
npm run audit -- --strict
```

`npm run smoke` 会创建临时 HOME，完整验证 apply、audit、restore，不会触碰真实 `~/.codex`。

## 贡献翻译

欢迎提交 PR 改进翻译。请遵守：

- 品牌名、API 名、命令、路径、配置 key 保持原文
- 新增翻译规则后运行 `npm run smoke`
- 正则规则要避免误伤品牌词
- 新增目标路径时必须说明为什么安全、如何备份、如何恢复

## 免责声明

这是非官方工具，不是 OpenAI 官方语言包。Codex 更新可能改变缓存结构。如果审计发现待处理项，先重新运行 `apply`，仍有问题再提交 issue。
