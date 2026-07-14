#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(pluginRoot, "../..");

const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");
const json = (path) => JSON.parse(read(path));

const readme = read("README.md");
const skill = read("plugins/harness/skills/using-harness/SKILL.md");
const loop = read("plugins/harness/skills/harness-loop/SKILL.md");
const command = read("plugins/harness/commands/harness.md");
const hook = read("plugins/harness/hooks/session-start.sh");
const knowledge = read("docs/KNOWLEDGE.md");
const claudeManifest = json("plugins/harness/.claude-plugin/plugin.json");
const codexManifest = json("plugins/harness/.codex-plugin/plugin.json");
const claudeMarketplace = json(".claude-plugin/marketplace.json");
const codexMarketplace = json(".agents/plugins/marketplace.json");

function includesAll(label, value, fragments) {
  for (const fragment of fragments) {
    assert.ok(value.includes(fragment), `${label} is missing: ${fragment}`);
  }
}

function appearsNear(label, value, first, second, distance = 360) {
  const firstIndex = value.indexOf(first);
  const secondIndex = value.indexOf(second, firstIndex);
  assert.ok(firstIndex >= 0, `${label} is missing: ${first}`);
  assert.ok(secondIndex >= 0, `${label} is missing after ${first}: ${second}`);
  assert.ok(secondIndex - firstIndex <= distance, `${label} separates ${first} from ${second} by more than ${distance} characters`);
}

includesAll("README", readme, [
  "短い指示は入口。大きな開発を継続的に前へ進めることが本体。",
  "Planner / Generator / Evaluator の3 role",
  "### 短い新規開発の例",
  "### 既存repoを継続する例",
  "docs/sprints/state.md",
  "enterprise規模、期間、品質結果を保証するものではありません",
]);
appearsNear("README host fallback", readme, "ホストが対応する場合は複数Agent", "roleごとの独立作業単位");

includesAll("using-harness", skill, [
  "大きな開発を継続",
  "次Sprint・Patch",
  "次のSprintを進めて",
  "非管理下のリポジトリ",
  "typo、1行変更、設定変更",
  "どう動くか（3 role）",
]);
appearsNear("using-harness host fallback", skill, "ホストが複数Agentを扱える場合", "独立作業単位へfallback");
appearsNear("harness-loop host fallback", loop, "ホストが対応する場合", "roleごとの独立作業単位");
appearsNear("command host fallback", command, "ホストが対応する場合", "roleごとの独立作業単位");
includesAll("SessionStart hook", hook, ["starting or continuing substantial, multi-sprint development", "continue a Harness-managed repository"]);

includesAll("KNOWLEDGE", knowledge, [
  "A short instruction is the entry point. Keeping substantial development moving over time is the core product.",
  "three roles, not a promise",
  "continue an existing",
  "skills rather than",
  "role-agent",
]);

for (const [label, manifest] of [["Claude manifest", claudeManifest], ["Codex manifest", codexManifest]]) {
  includesAll(label, manifest.description, ["file-backed", "multi-sprint", "long-running development", "roles"]);
}

includesAll("Claude marketplace", claudeMarketplace.metadata.description, ["短い指示", "3 role", "Sprint", "独立評価", "継続"]);
includesAll("Claude marketplace plugin", claudeMarketplace.plugins[0].description, ["File-backed", "multi-sprint", "long-running development", "roles"]);
includesAll("Codex marketplace", codexMarketplace.interface.displayName, ["Agentic Harness", "Long-running development"]);

includesAll("Codex short description", codexManifest.interface.shortDescription, ["long-running development", "file-backed sprints", "independent evaluation"]);
includesAll("Codex long description", codexManifest.interface.longDescription, ["short instruction", "substantial development", "Three separate roles", "multiple agents", "independent work units", "existing repository"]);
assert.equal(codexManifest.interface.defaultPrompt.length, 2, "Codex defaultPrompt must retain two entry directions");
includesAll("Codex new-project prompt", codexManifest.interface.defaultPrompt[0], ["short new-service idea", "multi-sprint", "first sprint"]);
includesAll("Codex existing-repo prompt", codexManifest.interface.defaultPrompt[1], ["existing repository", "docs/sprints/state.md", "Planner", "Generator", "Evaluator"]);
assert.ok(codexManifest.skills, "Codex manifest must distribute skills");
assert.ok(!Object.hasOwn(codexManifest, "agents"), "Codex manifest must not claim to distribute agents");
assert.ok(!Object.hasOwn(codexManifest, "commands"), "Codex manifest must not claim to distribute Claude commands");

const installSurfaces = [
  ["README", readme],
  ["using-harness", skill],
  ["harness-loop", loop],
  ["harness command", command],
  ["SessionStart hook", hook],
  ["KNOWLEDGE", knowledge],
  ["Claude manifest", JSON.stringify(claudeManifest)],
  ["Codex manifest", JSON.stringify(codexManifest)],
  ["Claude marketplace", JSON.stringify(claudeMarketplace)],
  ["Codex marketplace", JSON.stringify(codexMarketplace)],
];

const staleClaims = [
  /build a small web app/i,
  /3エージェント/,
  /自律ループでアプリを作り上げる/,
  /three subagents build everything/i,
];

for (const [label, value] of installSurfaces) {
  for (const pattern of staleClaims) {
    assert.ok(!pattern.test(value), `${label} contains stale positioning: ${pattern}`);
  }
}

console.log("positioning regression: all checks passed");
