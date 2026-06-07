# Safety

[简体中文](#安全说明) | [English](#safety-notes)

## 安全说明

Codex Zh Localizer 的目标是中文化 Codex 插件相关的本地元数据，同时保持可审计、可恢复、低风险。

### 默认不做什么

| 不做 | 原因 |
| --- | --- |
| 不修改 `/Applications/Codex.app` | 避免破坏 macOS App 签名、自动更新和完整性校验 |
| 不修改 `app.asar` | 避免 patch App bundle 带来的不可恢复风险 |
| 不读取 token、cookie、私钥、密码 | 工具不需要用户凭据 |
| 不安装后台进程 | 不默认写入 LaunchAgent、cron、shell hook |
| 不翻译技能 `name`、技能正文、prompt 正文、命令、路径、API key、配置 key | 避免破坏触发、执行规则和配置 |

### 会写入哪里

工具只处理 Codex 本地插件元数据缓存，典型目标包括：

| 目标 | 说明 |
| --- | --- |
| `~/.codex/.tmp/plugins` | 官方插件缓存 |
| `~/.codex/.tmp/bundled-marketplaces/openai-bundled` | OpenAI bundled marketplace 缓存 |
| `~/.codex/plugins/cache` | 已安装插件缓存 |
| `~/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime` | primary runtime 插件缓存 |
| `~/.codex/cache/codex_app_directory` | 应用连接器目录缓存 |
| `~/.codex/skills/**/SKILL.md` | 用户和系统技能描述 |
| `.codex/skills/**/SKILL.md` | 当前项目技能描述 |
| `**/skills/**/agents/openai.yaml` | 技能列表和插件详情页技能展示描述 |
| `~/.codex/prompts/*.md` | 用户 prompt 列表描述 |
| `.codex/prompts/*.md` | 当前项目 prompt 列表描述 |

这些路径可能随 Codex 版本变化。请以 `audit` 输出为准。

### 写入前如何确认

先运行 dry-run：

```bash
npx --yes github:flag0x369/codex-zh-localizer dry-run
```

再运行严格审计：

```bash
npx --yes github:flag0x369/codex-zh-localizer audit --strict
```

确认后再应用：

```bash
npx --yes github:flag0x369/codex-zh-localizer apply
```

### 如何恢复

每次 `apply` 前都会创建备份。恢复最近一次 marketplace 补丁：

```bash
npx --yes github:flag0x369/codex-zh-localizer restore-marketplace latest
```

恢复最近一次插件详情组件补丁：

```bash
npx --yes github:flag0x369/codex-zh-localizer restore-components latest
```

恢复最近一次技能描述补丁：

```bash
npx --yes github:flag0x369/codex-zh-localizer restore-skill-md latest
```

恢复最近一次 prompt 描述补丁：

```bash
npx --yes github:flag0x369/codex-zh-localizer restore-prompts latest
```

### 如何安全测试

可以对临时 HOME 运行，不触碰真实 `~/.codex`：

```bash
npx --yes github:flag0x369/codex-zh-localizer apply --home /tmp/fake-home --backup-root /tmp/codex-zh-backups
```

项目内置的 smoke test 也是这个思路：

```bash
npm run smoke
```

## Safety Notes

Codex Zh Localizer localizes Codex plugin metadata while keeping changes auditable, reversible, and scoped.

It does not modify `/Applications/Codex.app`, `app.asar`, app signing assets, credentials, background services, shell startup files, system settings, skill `name`, skill body instructions, or prompt body instructions.

It only writes to local plugin, skill, and prompt metadata caches, including `SKILL.md` descriptions, `skills/**/agents/openai.yaml` display descriptions, and `.codex/prompts/*.md` descriptions, and creates backups before applying changes. Use `dry-run` and `audit --strict` before `apply`, and use the restore commands if you need to roll back.
