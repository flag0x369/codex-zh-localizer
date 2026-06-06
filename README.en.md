# Codex Zh Localizer

[简体中文](README.md) | **English**

Localize safe, local Codex plugin metadata into Chinese. Unofficial, auditable, reversible, and it does not modify the Codex app bundle.

```bash
npx --yes github:flag0x369/codex-zh-localizer dry-run
npx --yes github:flag0x369/codex-zh-localizer apply
```

## Why

Codex has a growing plugin marketplace, but many plugin, skill, and connector descriptions are still in English. For Chinese users, the main friction is often not using Codex itself, but understanding what each plugin does.

This tool solves that narrow problem: make supported plugin marketplace metadata, plugin detail skills, and app connector descriptions readable in Chinese without touching Codex signing, updates, or app internals.

## Who It Is For

| Scenario | What you get |
| --- | --- |
| Plugin marketplace text is mostly English | Chinese plugin names, summaries, details, and example prompts |
| Skill lists are hard to scan | Chinese skill names, descriptions, and default prompts |
| App connector descriptions are English | Chinese app names and connector descriptions |
| Codex updates reset the cache | Rerun `apply` to relocalize supported metadata |
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

Default scan targets:

| Type | Path |
| --- | --- |
| Official plugin cache | `~/.codex/.tmp/plugins` |
| OpenAI bundled marketplace cache | `~/.codex/.tmp/bundled-marketplaces/openai-bundled` |
| Primary runtime plugin cache | `~/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime` |
| Installed plugin cache | `~/.codex/plugins/cache` |
| App connector directory cache | `~/.codex/cache/codex_app_directory` |

Example audit result on a fully localized machine:

```text
pluginJson: 190/190 localized
marketplaceJson: 3/3 localized
skillYaml: 563/563 localized
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

- modify `/Applications/Codex.app`
- modify `app.asar`
- modify signing assets, system settings, shell startup files, or user credentials
- read or print tokens, cookies, private keys, or passwords
- install LaunchAgent, cron, shell hooks, or background services by default

It only patches local plugin metadata caches and creates restore backups before every write.

## Why Not Patch app.asar

Codex built-in frontend UI text lives inside app bundle resources, including `app.asar`. Patching the app bundle can affect:

- macOS app signing
- Codex auto-updates
- integrity checks
- recoverability after upgrades

This project intentionally takes the safer path: localize reversible plugin marketplace, skill, and app connector metadata only.

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
