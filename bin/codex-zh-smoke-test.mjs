#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-zh-localizer-"));
const fakeHome = path.join(tempRoot, "home");
const backupRoot = path.join(tempRoot, "backups");

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, value) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function writeJson(filePath, value) {
  write(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function run(args) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, "codex-zh.mjs"), ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`Command failed: ${args.join(" ")}`);
  }
  return result.stdout;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value));
}

try {
  const pluginRoot = path.join(fakeHome, ".codex", ".tmp", "plugins", "plugins", "github");
  const pluginJsonPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  const marketplacePath = path.join(fakeHome, ".codex", ".tmp", "plugins", ".agents", "plugins", "marketplace.json");
  const appJsonPath = path.join(pluginRoot, ".app.json");
  const skillYamlPath = path.join(pluginRoot, "skills", "github", "agents", "openai.yaml");
  const vendorSkillYamlPath = path.join(
    fakeHome,
    ".codex",
    "vendor_imports",
    "skills",
    "skills",
    ".curated",
    "playwright",
    "agents",
    "openai.yaml",
  );
  const skillMdPath = path.join(fakeHome, ".codex", "skills", "openai-docs", "SKILL.md");
  const appDirectoryPath = path.join(fakeHome, ".codex", "cache", "codex_app_directory", "fixture.json");

  writeJson(pluginJsonPath, {
    name: "github",
    description: "Inspect repositories, issues, pull requests, and CI.",
    interface: {
      displayName: "GitHub",
      shortDescription: "Inspect PRs, issues, CI, and publish flows",
      longDescription: "Use GitHub with Codex.",
      defaultPrompt: ["Review my pull request"],
      category: "Developer Tools",
    },
  });
  writeJson(marketplacePath, {
    interface: { displayName: "OpenAI Plugins" },
    plugins: [],
  });
  writeJson(appJsonPath, {
    apps: {
      github: { id: "connector_test_github" },
    },
  });
  write(skillYamlPath, [
    '  display_name: "GitHub"',
    '  short_description: "Inspect PRs, issues, CI, and publish flows"',
    '  default_prompt: "$github inspect PRs"',
    "",
  ].join("\n"));
  write(vendorSkillYamlPath, [
    "interface:",
    '  display_name: "Playwright CLI Skill"',
    '  short_description: "Automate real browsers from the terminal"',
    '  default_prompt: "Automate this browser workflow."',
    "",
  ].join("\n"));
  write(skillMdPath, [
    "---",
    "name: openai-docs",
    "description: Reference OpenAI docs, Codex self-knowledge, and model migration guidance.",
    "metadata:",
    "  short-description: Reference OpenAI docs",
    "---",
    "# OpenAI Docs",
    "",
  ].join("\n"));
  writeJson(appDirectoryPath, {
    schema_version: 1,
    connectors: [
      {
        id: "connector_test_github",
        name: "GitHub",
        description: "Access repositories, issues, and pull requests.",
      },
    ],
  });

  run(["apply", "--home", fakeHome, "--backup-root", backupRoot]);
  run(["audit", "--strict", "--home", fakeHome]);

  const localizedPlugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
  const localizedSkill = fs.readFileSync(skillYamlPath, "utf8");
  const localizedVendorSkill = fs.readFileSync(vendorSkillYamlPath, "utf8");
  const localizedSkillMd = fs.readFileSync(skillMdPath, "utf8");
  const localizedApp = JSON.parse(fs.readFileSync(appDirectoryPath, "utf8"));
  assert(hasCjk(localizedPlugin.interface.shortDescription), "plugin shortDescription should be Chinese");
  assert(hasCjk(localizedSkill), "skill YAML should contain Chinese");
  assert(hasCjk(localizedVendorSkill), "vendor skill YAML should contain Chinese");
  assert(hasCjk(localizedSkillMd), "SKILL.md description should contain Chinese");
  assert(hasCjk(localizedApp.connectors[0].description), "connector description should be Chinese");

  run(["restore-marketplace", "latest", "--home", fakeHome, "--backup-root", backupRoot]);
  run(["restore-components", "latest", "--home", fakeHome, "--backup-root", backupRoot]);
  run(["restore-skill-md", "latest", "--home", fakeHome, "--backup-root", backupRoot]);

  const restoredPlugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
  const restoredSkill = fs.readFileSync(skillYamlPath, "utf8");
  const restoredVendorSkill = fs.readFileSync(vendorSkillYamlPath, "utf8");
  const restoredSkillMd = fs.readFileSync(skillMdPath, "utf8");
  const restoredApp = JSON.parse(fs.readFileSync(appDirectoryPath, "utf8"));
  assert(!hasCjk(restoredPlugin.interface.shortDescription), "plugin restore should return English fixture");
  assert(!hasCjk(restoredSkill), "skill restore should return English fixture");
  assert(!hasCjk(restoredVendorSkill), "vendor skill restore should return English fixture");
  assert(!hasCjk(restoredSkillMd), "SKILL.md restore should return English fixture");
  assert(!hasCjk(restoredApp.connectors[0].description), "connector restore should return English fixture");

  console.log("Smoke test passed");
  console.log(`Fake HOME: ${fakeHome}`);
  console.log(`Backups: ${backupRoot}`);
} finally {
  if (!process.env.CODEX_ZH_KEEP_SMOKE_TMP) fs.rmSync(tempRoot, { recursive: true, force: true });
}
