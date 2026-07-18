#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TARGET_PATHS = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/KNOWLEDGE.md",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "plugins/harness/.claude-plugin/plugin.json",
  "plugins/harness/.codex-plugin/plugin.json",
  "plugins/harness/skills/using-harness/SKILL.md",
  "plugins/harness/skills/harness-loop/SKILL.md",
  "plugins/harness/agents/evaluator.md",
  "plugins/harness/commands/harness.md",
  "plugins/harness/hooks/session-start.sh",
];

function parseArgs(argv) {
  let repoRoot = DEFAULT_REPO_ROOT;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a checkout path");
      repoRoot = resolve(value);
      index += 1;
    } else if (arg === "--help") {
      return { help: true, repoRoot };
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { help: false, repoRoot };
}

function validatePositioning(repoRoot) {
  const completed = [];
  const check = (name, run) => {
    run();
    completed.push(name);
  };
  const read = (relativePath) => {
    const file = resolve(repoRoot, relativePath);
    try {
      return readFileSync(file, "utf8");
    } catch (error) {
      throw new Error(`${relativePath}: unable to read required positioning surface (${error.message})`);
    }
  };
  const json = (relativePath) => {
    try {
      return JSON.parse(read(relativePath));
    } catch (error) {
      if (error.message.startsWith(`${relativePath}:`)) throw error;
      throw new Error(`${relativePath}: invalid JSON (${error.message})`);
    }
  };
  const includesAll = (relativePath, value, fragments) => {
    for (const fragment of fragments) {
      assert.ok(value.includes(fragment), `${relativePath}: missing required positioning text: ${fragment}`);
    }
  };
  const appearsNear = (relativePath, value, first, second, distance = 360) => {
    const firstIndex = value.indexOf(first);
    const secondIndex = value.indexOf(second, firstIndex);
    assert.ok(firstIndex >= 0, `${relativePath}: missing required positioning text: ${first}`);
    assert.ok(secondIndex >= 0, `${relativePath}: missing ${second} after ${first}`);
    assert.ok(
      secondIndex - firstIndex <= distance,
      `${relativePath}: ${first} and ${second} are more than ${distance} characters apart`,
    );
  };

  const readme = read("README.md");
  const agents = read("AGENTS.md");
  const claude = read("CLAUDE.md");
  const skill = read("plugins/harness/skills/using-harness/SKILL.md");
  const loop = read("plugins/harness/skills/harness-loop/SKILL.md");
  const evaluator = read("plugins/harness/agents/evaluator.md");
  const command = read("plugins/harness/commands/harness.md");
  const hook = read("plugins/harness/hooks/session-start.sh");
  const knowledge = read("docs/KNOWLEDGE.md");
  const claudeManifest = json("plugins/harness/.claude-plugin/plugin.json");
  const codexManifest = json("plugins/harness/.codex-plugin/plugin.json");
  const claudeMarketplace = json(".claude-plugin/marketplace.json");
  const codexMarketplace = json(".agents/plugins/marketplace.json");

  check("README positioning and local override guidance", () => {
    includesAll("README.md", readme, [
      "短い指示は入口。大きな開発を継続的に前へ進めることが本体。",
      "Planner / Generator / Evaluator の3 role",
      "### 短い新規開発の例",
      "### 既存repoを継続する例",
      "docs/sprints/state.md",
      "enterprise規模、期間、品質結果を保証するものではありません",
      ".harness/config.local.toml",
      "[hosts.codex.roles.generator]",
      "model = \"inherit\"",
      "明示したleafだけ",
      "本チャット",
      "host既定",
    ]);
    appearsNear("README.md", readme, "ホストが対応する場合は複数Agent", "roleごとの独立作業単位");
  });

  check("README separates Codex routing readiness from verified launch", () => {
    includesAll("README.md", readme, [
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "Model Tier: strong",
      "Rotate: model-escalation",
      "dispatch-ready",
      "launch-verified",
      "unverified",
      "3回目の連続失敗",
      "spec-issue",
      "Terra",
    ]);
  });

  check("using-harness triggers and role fallback", () => {
    includesAll("plugins/harness/skills/using-harness/SKILL.md", skill, [
      "大きな開発を継続",
      "次Sprint・Patch",
      "次のSprintを進めて",
      "非管理下のリポジトリ",
      "typo、1行変更、設定変更",
      "どう動くか（3 role）",
    ]);
    appearsNear(
      "plugins/harness/skills/using-harness/SKILL.md",
      skill,
      "ホストが複数Agentを扱える場合",
      "独立作業単位へfallback",
    );
  });

  check("orchestration surfaces preserve host fallback", () => {
    appearsNear(
      "plugins/harness/skills/harness-loop/SKILL.md",
      loop,
      "ホストが対応する場合",
      "roleごとの独立作業単位",
    );
    appearsNear(
      "plugins/harness/commands/harness.md",
      command,
      "ホストが対応する場合",
      "roleごとの独立作業単位",
    );
    includesAll("plugins/harness/hooks/session-start.sh", hook, [
      "starting or continuing substantial, multi-sprint development",
      "continue a Harness-managed repository",
    ]);
  });

  check("KNOWLEDGE positioning rationale", () => {
    includesAll("docs/KNOWLEDGE.md", knowledge, [
      "A short instruction is the entry point. Keeping substantial development moving over time is the core product.",
      "three roles, not a promise",
      "continue an existing",
      "skills rather than",
      "role-agent",
    ]);
  });

  check("runtime knowledge and Evaluator contract describe escalation boundaries", () => {
    includesAll("docs/KNOWLEDGE.md", knowledge, [
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "Model Tier: standard | strong",
      "Rotate: model-escalation",
      "dispatch-ready",
      "launch-verified",
      "Terra",
    ]);
    includesAll("plugins/harness/agents/evaluator.md", evaluator, [
      "評価＋自己レビュー",
      "Escalation Recommendation: strong",
      "Escalation Evidence",
      "オーケストレーター",
      "実装やコード修正は行わない",
    ]);
  });

  check("plugin manifests describe long-running role separation", () => {
    for (const [relativePath, manifest] of [
      ["plugins/harness/.claude-plugin/plugin.json", claudeManifest],
      ["plugins/harness/.codex-plugin/plugin.json", codexManifest],
    ]) {
      includesAll(relativePath, manifest.description, ["file-backed", "multi-sprint", "long-running development", "roles"]);
    }
  });

  check("plugin and marketplace versions stay synchronized", () => {
    assert.equal(claudeManifest.version, codexManifest.version);
    assert.equal(claudeMarketplace.metadata.version, claudeManifest.version);
    assert.equal(claudeMarketplace.plugins[0].version, claudeManifest.version);
  });

  check("marketplaces describe the same product", () => {
    includesAll(".claude-plugin/marketplace.json", claudeMarketplace.metadata.description, [
      "短い指示", "3 role", "Sprint", "独立評価", "継続",
    ]);
    includesAll(".claude-plugin/marketplace.json", claudeMarketplace.plugins[0].description, [
      "File-backed", "multi-sprint", "long-running development", "roles",
    ]);
    includesAll(".agents/plugins/marketplace.json", codexMarketplace.interface.displayName, [
      "Agentic Harness", "Long-running development",
    ]);
  });

  check("Codex interface covers new and existing repositories", () => {
    includesAll("plugins/harness/.codex-plugin/plugin.json", codexManifest.interface.shortDescription, [
      "long-running development", "file-backed sprints", "independent evaluation",
    ]);
    includesAll("plugins/harness/.codex-plugin/plugin.json", codexManifest.interface.longDescription, [
      "short instruction", "substantial development", "Three separate roles", "multiple agents",
      "independent work units", "existing repository",
    ]);
    assert.equal(
      codexManifest.interface.defaultPrompt.length,
      2,
      "plugins/harness/.codex-plugin/plugin.json: defaultPrompt must retain two entry directions",
    );
    includesAll("plugins/harness/.codex-plugin/plugin.json", codexManifest.interface.defaultPrompt[0], [
      "short new-service idea", "multi-sprint", "first sprint",
    ]);
    includesAll("plugins/harness/.codex-plugin/plugin.json", codexManifest.interface.defaultPrompt[1], [
      "existing repository", "docs/sprints/state.md", "Planner", "Generator", "Evaluator",
    ]);
    assert.ok(codexManifest.skills, "plugins/harness/.codex-plugin/plugin.json: must distribute skills");
    assert.ok(!Object.hasOwn(codexManifest, "agents"), "plugins/harness/.codex-plugin/plugin.json: must not distribute agents");
    assert.ok(!Object.hasOwn(codexManifest, "commands"), "plugins/harness/.codex-plugin/plugin.json: must not distribute Claude commands");
  });

  check("root guidance points to the checkout validator", () => {
    includesAll("AGENTS.md", agents, ["node scripts/check-positioning.mjs"]);
    includesAll("CLAUDE.md", claude, ["node scripts/check-positioning.mjs"]);
    const legacyPath = ["plugins", "harness", "scripts", "check-positioning.mjs"].join("/");
    assert.ok(!agents.includes(legacyPath), `AGENTS.md: remove obsolete validator command ${legacyPath}`);
    assert.ok(!claude.includes(legacyPath), `CLAUDE.md: remove obsolete validator command ${legacyPath}`);
    assert.ok(
      !existsSync(resolve(repoRoot, legacyPath)),
      `${legacyPath}: checkout-only validator must not remain in the plugin distribution tree`,
    );
  });

  const installSurfaces = [
    ["README.md", readme],
    ["plugins/harness/skills/using-harness/SKILL.md", skill],
    ["plugins/harness/skills/harness-loop/SKILL.md", loop],
    ["plugins/harness/commands/harness.md", command],
    ["plugins/harness/hooks/session-start.sh", hook],
    ["docs/KNOWLEDGE.md", knowledge],
    ["plugins/harness/.claude-plugin/plugin.json", JSON.stringify(claudeManifest)],
    ["plugins/harness/.codex-plugin/plugin.json", JSON.stringify(codexManifest)],
    [".claude-plugin/marketplace.json", JSON.stringify(claudeMarketplace)],
    [".agents/plugins/marketplace.json", JSON.stringify(codexMarketplace)],
  ];
  const staleClaims = [
    /build a small web app/i,
    /3エージェント/,
    /自律ループでアプリを作り上げる/,
    /three subagents build everything/i,
  ];

  check("install-facing surfaces contain no stale product claims", () => {
    for (const [relativePath, value] of installSurfaces) {
      for (const pattern of staleClaims) {
        assert.ok(!pattern.test(value), `${relativePath}: contains stale positioning claim ${pattern}`);
      }
    }
  });

  return completed;
}

try {
  const { help, repoRoot } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log("Usage: node scripts/check-positioning.mjs [--root CHECKOUT_PATH]");
    process.exit(0);
  }
  const completed = validatePositioning(repoRoot);
  console.log(`positioning regression: ${completed.length} checks passed`);
  for (const name of completed) console.log(`  ok - ${name}`);
  console.log("validated positioning surfaces:");
  for (const relativePath of TARGET_PATHS) console.log(`  - ${relativePath}`);
} catch (error) {
  console.error(`positioning regression failed: ${error.message}`);
  process.exit(1);
}
