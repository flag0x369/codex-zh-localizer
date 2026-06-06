# Contributing

[简体中文](#简体中文) | [English](#english)

## 简体中文

感谢你愿意改进 Codex 中文化工具。

### 可以贡献什么

- 新增或修正插件名翻译
- 新增或修正技能描述翻译
- 新增安全的本地缓存路径支持
- 改进审计、备份、恢复、测试流程
- 补充 README 或使用案例

### 翻译规则

- 品牌名、产品名、API 名、命令、路径、配置 key 保持原文。
- 能精确映射时优先精确映射，不要只靠宽泛正则。
- 正则规则要使用单词边界，避免把 `Airtable` 改成 `Air表` 这类误伤。
- 说明要偏“用户能理解用途”，不必逐词直译英文。

### 安全规则

- 不修改 `/Applications/Codex.app`。
- 不修改 `app.asar`。
- 不读取或输出 token、cookie、私钥、密码。
- 新增写入目标时必须同时提供备份和恢复逻辑。
- 新增功能默认应支持 dry-run。

### 提交前检查

```bash
npm run check
npm run smoke
npm run audit -- --strict
```

## English

Thank you for improving Codex Zh Localizer.

### Good Contributions

- Add or fix plugin name translations
- Add or fix skill description translations
- Add safe local cache targets
- Improve audit, backup, restore, or tests
- Improve README or examples

### Translation Rules

- Keep brand names, product names, API names, commands, paths, and config keys unchanged.
- Prefer exact mappings over broad regex replacements.
- Use word boundaries in regex rules to avoid corrupting brand names.
- Optimize descriptions for user understanding instead of literal word-by-word translation.

### Safety Rules

- Do not modify `/Applications/Codex.app`.
- Do not modify `app.asar`.
- Do not read or print tokens, cookies, private keys, or passwords.
- Any new write target must include backup and restore support.
- New features should support dry-run by default.

### Before Submitting

```bash
npm run check
npm run smoke
npm run audit -- --strict
```
