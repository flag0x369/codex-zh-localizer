# Codex Zh Localizer / Codex 中文化工具

[简体中文](README.md) | **English**

[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)
![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-0F766E.svg)
![Dry-run first](https://img.shields.io/badge/Safety-dry--run_first-2563EB.svg)
![No app.asar patch](https://img.shields.io/badge/Codex-no_app.asar_patch-7C3AED.svg)

Codex Zh Localizer is an unofficial OpenAI Codex Chinese localization CLI. It localizes Codex plugin marketplace cards, plugin detail skills, skill picker descriptions, and app connector descriptions into Simplified Chinese while only touching reversible local plugin and skill metadata caches.

It targets users searching for Codex Chinese localization, OpenAI Codex plugin marketplace localization, Codex zh-CN, and Codex plugin metadata translation.

![Codex Zh Localizer install effect comparison: plugin marketplace, skill descriptions, and app connectors become readable in Chinese](assets/codex-zh-localizer-cover.svg)

Install effect comparison: after running `apply`, Codex plugin marketplace cards, skill descriptions, skill picker descriptions, and app connector copy become readable in Chinese. The illustration contains no real account, path, or private workspace data.

```bash
npx --yes github:flag0x369/codex-zh-localizer dry-run
npx --yes github:flag0x369/codex-zh-localizer apply
```

## What It Solves

Codex has a growing plugin marketplace, but plugin names, skill descriptions, and app connector copy are often still in English. This tool makes the plugin marketplace easier to scan for Chinese users while keeping the safety boundary explicit.

| Problem | What this tool does |
| --- | --- |
| Plugin marketplace cards are in English | Localizes plugin names, summaries, details, and example prompts |
| Plugin detail skills are hard to scan | Localizes skill names, descriptions, and default prompts |
| Skill picker descriptions are still English | Localizes display descriptions in `SKILL.md` and `agents/openai.yaml` while preserving `name` and body |
| App connector descriptions are English | Localizes app names and connector descriptions |
| Codex updates or new skills reset metadata | Rerun `apply` to relocalize supported metadata |
| You care about safety | Dry-run by default, backups before writes, restore commands included |

## 30-Second Start

Preview changes without writing:

```bash
npx --yes github:flag0x369/codex-zh-localizer dry-run
npx --yes github:flag0x369/codex-zh-localizer audit --strict
```

Apply localization:

```bash
npx --yes github:flag0x369/codex-zh-localizer apply
```

Run from source:

```bash
git clone https://github.com/flag0x369/codex-zh-localizer.git
cd codex-zh-localizer
npm run dry-run
npm run apply
```

After Codex updates or refreshes plugin caches, run it again:

```bash
npx --yes github:flag0x369/codex-zh-localizer apply
```

## Supported Scope

| Target | Supported | Notes |
| --- | --- | --- |
| Plugin marketplace cards | Yes | `plugin.json` and marketplace JSON |
| Plugin detail skills | Yes | `skills/*/agents/openai.yaml` |
| Skill picker descriptions | Yes | `SKILL.md` frontmatter `description` / `metadata.short-description` and `agents/openai.yaml` `short_description` |
| Plugin detail apps | Yes | app connector directory cache |
| Built-in Codex frontend buttons and menus | Not yet | Usually inside app bundle / `app.asar` |
| Skill `name`, body, brand names, commands, API keys | Preserved | Avoid changing Codex skill triggering, execution, and config |

Example audit result:

```text
pluginJson: 190/190 localized
marketplaceJson: 3/3 localized
skillYaml: 607/607 localized
skillMd: 656/656 localized
appConnectors: 140/140 localized
```

## Commands

```bash
# Read-only audit
npx --yes github:flag0x369/codex-zh-localizer audit

# Dry-run, no writes
npx --yes github:flag0x369/codex-zh-localizer dry-run

# Apply localization
npx --yes github:flag0x369/codex-zh-localizer apply

# Restore the latest marketplace backup
npx --yes github:flag0x369/codex-zh-localizer restore-marketplace latest

# Restore the latest component backup
npx --yes github:flag0x369/codex-zh-localizer restore-components latest

# Restore the latest skill-description backup
npx --yes github:flag0x369/codex-zh-localizer restore-skill-md latest
```

Advanced:

```bash
# Test against a fake HOME without touching real ~/.codex
npx --yes github:flag0x369/codex-zh-localizer apply --home /tmp/fake-home --backup-root /tmp/codex-zh-backups

# Exit non-zero when supported metadata still has pending English text
npx --yes github:flag0x369/codex-zh-localizer audit --strict
```

## Safety Boundary

This tool does not:

| It does not | Why |
| --- | --- |
| Modify `/Applications/Codex.app` | Avoid breaking app signing and updates |
| Modify `app.asar` | Avoid integrity issues |
| Read tokens, cookies, private keys, or passwords | It does not touch credentials |
| Install background services | No LaunchAgent, cron, or shell hook by default |
| Translate skill `name`, skill body, brand names, or commands | Avoid changing Codex skill triggering, execution, and config |

Every `apply` creates backups first. `restore-marketplace`, `restore-components`, and `restore-skill-md` restore by patch type, so backup streams do not get mixed.

## Why Not Patch app.asar

Codex built-in frontend UI text lives inside app bundle resources, including `app.asar`. Patching the app bundle can affect macOS app signing, Codex auto-updates, integrity checks, and recoverability after upgrades.

This project intentionally takes the safer path: localize reversible plugin marketplace, skill description, and app connector metadata only.

## FAQ

### Is this an official language pack?

No. This is an unofficial local tool for safely localizing Codex plugin-related metadata.

### Will localization survive Codex updates?

Codex updates may refresh plugin caches and overwrite localized metadata. Rerun `apply` to relocalize supported metadata.

### Can this break Codex?

The tool defaults to dry-run and writes only to local plugin metadata caches after creating backups. It does not modify the Codex app bundle.

### Can I restore changes?

Yes:

```bash
npx --yes github:flag0x369/codex-zh-localizer restore-marketplace latest
npx --yes github:flag0x369/codex-zh-localizer restore-components latest
npx --yes github:flag0x369/codex-zh-localizer restore-skill-md latest
```

### Why is some text still English?

Brand names, commands, API names, paths, and config keys are preserved. Built-in Codex frontend UI and remote copy are outside the current safe patch scope.

## Development

```bash
npm run check
npm run smoke
npm run audit -- --strict
```

`npm run smoke` creates a temporary HOME and verifies apply, audit, and restore without touching the real `~/.codex`.

## Contributing Translations

Pull requests are welcome. Please follow these rules:

- Keep brand names, API names, commands, paths, and config keys in their original language
- Run `npm run smoke` after changing translation rules
- Avoid regex rules that can corrupt brand names
- Any new target path must explain why it is safe, how it is backed up, and how it can be restored

## Disclaimer

This is an unofficial tool, not an official OpenAI language pack. Codex updates may change cache structures. If the audit reports pending items, rerun `apply` first, then open an issue if needed.
