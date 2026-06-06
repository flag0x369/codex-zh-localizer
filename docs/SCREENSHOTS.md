# Screenshots

This directory stores public README screenshots and effect comparison assets.

## Rules

- Do not commit raw screenshots.
- Remove account names, private workspace names, local paths, thread titles, avatars, sidebars, and task panels.
- Keep the README install-effect comparison graphic focused on the user's actual before/after workflow, not data-only charts.
- Prefer screenshots that show the Codex plugin marketplace, plugin detail skills, or app connectors after localization.
- Keep image widths near 1440px so README pages load quickly.

## Sanitizing

```bash
node bin/sanitize-codex-screenshot.mjs \
  --input /tmp/codex-zh-localizer-shots/raw.png \
  --output docs/assets/codex-plugin-marketplace-zh.png
```

Use custom masks when needed:

```bash
node bin/sanitize-codex-screenshot.mjs \
  --input raw.png \
  --output docs/assets/codex-plugin-marketplace-zh.png \
  --crop 2860:1760:280:90 \
  --mask 2860:72:0:0 \
  --mask 310:1760:0:0 \
  --mask 560:760:2260:80
```
