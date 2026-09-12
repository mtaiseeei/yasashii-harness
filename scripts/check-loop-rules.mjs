#!/usr/bin/env node

// Check canonical rule reachability, packaged integrity and executable hook behavior.
// Instruction choices still need independent scenario evaluation; static checks do not prove model behavior.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve, relative, isAbsolute, sep } from "node:path";
import { toGitBashPath } from "../plugins/harness/scripts/git-bash-path.mjs";
import { fileURLToPath } from "node:url";

const DEFAULT_REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

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

// Rules are checked once at their canonical owner, never copied into every adapter.
const REQUIRED = [
  ["plugins/harness/skills/harness-loop/SKILL.md", ["オーケストレーターのみ", "Lineage Dispatches", "limits.max_lineage_dispatches", "limits.max_spec_issue_returns", "done-by-user-decision"]],
  ["plugins/harness/skills/harness-loop/references/scope.md", ["期待結果・合否条件・証拠要件を変えず", "独立再評価", "同一Sprintで1回", "意味不変", "Spec-Issue Count", "Lineage Dispatches", "2 回連続"]],
  ["plugins/harness/skills/harness-loop/references/evaluation.md", ["safe harbor", "無関係なdirty", "関連変更", "依存物", "証跡の無い合格", "CLI・API・plugin"]],
  ["plugins/harness/skills/harness-loop/references/runtime.md", ["native direct dispatch", "built-in/default Agent", "Unknown model", "unknown field", "host metadata", "resume: true"]],
  ["plugins/harness/skills/harness-loop/references/state.md", ["runtime-migration", "unknown", "no-overwrite", "deferred", "superseded"]],
  ["plugins/harness/agents/planner.md", ["Grilling gate", "検証基盤の実装仕様を書かない", "未決", "safe harbor"]],
];
const FORBIDDEN = [
  ["plugins/harness/skills/harness-loop/SKILL.md", ["harness_luna_worker", "provision-codex-agent.mjs"]],
  ["plugins/harness/templates/.harness/config.toml", ["[hosts.codex.custom_agents]"]],
];

function validateReachability(repoRoot) {
  const plugin = resolve(repoRoot, "plugins/harness");
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    const local = relative(plugin, file);
    assert.ok(local && !isAbsolute(local) && local !== ".." && !local.startsWith(`..${sep}`), `reference escapes plugin: ${file}`);
    visited.add(file);
    const source = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const [, target] of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(https?:|#)/.test(target)) continue;
      visit(resolve(dirname(file), target.split("#")[0]));
    }
  }
  visit(resolve(plugin, "skills/using-harness/SKILL.md"));
  for (const file of ["scope.md", "evaluation.md", "runtime.md", "state.md", "planner-templates.md"]) {
    assert.ok(visited.has(resolve(plugin, "skills/harness-loop/references", file)), `unreachable reference: ${file}`);
  }
  for (const file of ["templates/AGENTS.md", "templates/CLAUDE.md", "templates/docs/harness-guidance.md"]) {
    const source = readFileSync(resolve(plugin, file), "utf8");
    assert.ok(source.includes("skills/using-harness/SKILL.md"), `${file}: missing installed entrypoint`);
  }
  visit(resolve(plugin, "commands/harness.md"));
  return visited.size;
}

function validateHook(repoRoot) {
  const plugin = resolve(repoRoot, "plugins/harness");
  const hook = resolve(plugin, "hooks/session-start.sh");
  const env = { ...process.env };
  delete env.CLAUDE_PLUGIN_ROOT;
  const absent = spawnSync("bash", [toGitBashPath(hook)], { env, encoding: "utf8" });
  assert.equal(absent.status, 0, absent.stderr);
  assert.equal(absent.stdout, "");
  const hooks = JSON.parse(readFileSync(resolve(plugin, "hooks/hooks.json"), "utf8"));
  assert.equal(hooks.hooks.SessionStart[0].matcher, "startup|clear|compact");
  const present = spawnSync("bash", [toGitBashPath(hook)], { env: { ...env, CLAUDE_PLUGIN_ROOT: toGitBashPath(plugin) }, encoding: "utf8" });
  assert.equal(present.status, 0, present.stderr);
  const payload = JSON.parse(present.stdout).hookSpecificOutput;
  assert.equal(payload.hookEventName, "SessionStart");
  assert.ok(payload.additionalContext.includes(toGitBashPath(resolve(plugin, "skills/using-harness/SKILL.md"))));
  assert.ok(payload.additionalContext.length < 1200, "hook must remain a short applicability pointer");
  assert.ok(!payload.additionalContext.includes("<SUBAGENT-STOP>"), "hook injected Skill body");
}

// Pinned upstream content and local links must survive plugin packaging. This checks
// integrity, not the model's interview behavior (which needs independent role evaluation).
function validateGrillingPackage(repoRoot) {
  const pluginRoot = resolve(repoRoot, "plugins/harness");
  const skillPath = resolve(pluginRoot, "skills/grilling/SKILL.md");
  const skill = readFileSync(skillPath, "utf8").replace(/\r\n/g, "\n");
  const body = skill.match(/<!-- upstream-body:start -->\n([\s\S]*?)<!-- upstream-body:end -->/);
  const digest = (value) => createHash("sha256").update(value.toString().replace(/\r\n/g, "\n")).digest("hex");
  if (!body || digest(body[1]) !== "e3ff41d7514da8ddec35e322176761a68055c4bf074f489a0e6e392a40bfd8ba") {
    throw new Error("grilling: upstream interview body differs from pinned revision 3cca18b368ae95cdbdebbff572ccafa662551015");
  }
  if (digest(readFileSync(resolve(pluginRoot, "skills/grilling/LICENSE"))) !== "0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5") {
    throw new Error("grilling: pinned upstream license is missing or modified");
  }
  const manifest = JSON.parse(readFileSync(resolve(pluginRoot, ".codex-plugin/plugin.json"), "utf8"));
  if (resolve(pluginRoot, manifest.skills, "grilling/SKILL.md") !== skillPath) {
    throw new Error("grilling: Codex skill discovery does not include the bundled skill");
  }
  for (const relativePath of ["agents/planner.md", "skills/grilling/SKILL.md", "skills/harness-loop/SKILL.md"]) {
    const file = resolve(pluginRoot, relativePath);
    const source = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const [, target] of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (target.startsWith("https:")) continue;
      if (!target.includes("grilling/SKILL.md") && !target.includes("agents/planner.md") && target !== "LICENSE") continue;
      readFileSync(resolve(dirname(file), target.split("#")[0]));
    }
  }
}

function validateLoopRules(repoRoot) {
  validateGrillingPackage(repoRoot);
  validateReachability(repoRoot);
  validateHook(repoRoot);
  const completed = [];
  for (const [relativePath, needles] of REQUIRED) {
    const file = resolve(repoRoot, relativePath);
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch (error) {
      throw new Error(`${relativePath}: unable to read required loop-rule surface (${error.message})`);
    }
    for (const needle of needles) {
      if (!source.includes(needle)) {
        throw new Error(`${relativePath}: missing required loop-rule vocabulary ${JSON.stringify(needle)}`);
      }
    }
    completed.push(relativePath);
  }
  for (const [relativePath, needles] of FORBIDDEN) {
    const file = resolve(repoRoot, relativePath);
    const source = readFileSync(file, "utf8");
    for (const needle of needles) {
      if (source.includes(needle)) {
        throw new Error(`${relativePath}: obsolete custom-agent vocabulary remains ${JSON.stringify(needle)}`);
      }
    }
  }
  return completed;
}

try {
  const { help, repoRoot } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log("usage: node scripts/check-loop-rules.mjs [--root <checkout>]");
    process.exit(0);
  }
  const completed = validateLoopRules(repoRoot);
  console.log(`loop rules regression: ${completed.length} surfaces verified`);
  for (const name of completed) console.log(`  ok - ${name}`);
} catch (error) {
  console.error(`loop rules regression failed: ${error.message}`);
  process.exit(1);
}
