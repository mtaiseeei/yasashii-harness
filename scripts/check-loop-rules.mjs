#!/usr/bin/env node

// Thin presence check for the proportional-verification loop vocabulary.
// It only asserts that the guard rules keep existing in the distributed
// surfaces; it deliberately does not interpret or execute them.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const REQUIRED = [
  ["plugins/harness/skills/harness-loop/SKILL.md", [
    "verification-scope-issue",
    "verification-infra",
    "Spec-Issue Count",
    "Lineage Dispatches",
    "done-by-user-decision",
    "証拠の十分性",
    "厳格化ゲート",
    "検証スコープガード",
    "再評価の増分原則",
    "max_lineage_dispatches",
    "max_spec_issue_returns",
  ]],
  ["plugins/harness/agents/evaluator.md", [
    "verification-scope-issue",
    "verification-infra",
    "証拠の十分性",
    "対象区分",
    "再評価の増分原則",
  ]],
  ["plugins/harness/agents/planner.md", [
    "検証基盤の実装仕様を書かない",
    "safe harbor",
    "検証スコープ（着手時に固定）",
    "厳格化ゲート",
  ]],
  ["plugins/harness/agents/generator.md", [
    "Scope change detected",
    "verification-infra",
    "Lineage Dispatches",
    "Non-scope",
  ]],
  ["plugins/harness/templates/CLAUDE.md", [
    "verification-scope-issue",
    "verification-infra",
    "Lineage Dispatches",
    "done-by-user-decision",
    "safe harbor",
    "Proportional Verification",
    "max_lineage_dispatches",
  ]],
  ["plugins/harness/templates/AGENTS.md", [
    "verification-scope-issue",
    "verification-infra",
    "Lineage Dispatches",
    "done-by-user-decision",
    "safe harbor",
    "Proportional Verification",
    "max_lineage_dispatches",
  ]],
  ["plugins/harness/templates/docs/harness-guidance.md", [
    "verification-scope-issue",
    "safe harbor",
    "done-by-user-decision",
  ]],
  ["plugins/harness/templates/.harness/config.toml", [
    "[limits]",
    "max_lineage_dispatches",
    "max_spec_issue_returns",
  ]],
  ["plugins/harness/commands/harness.md", [
    "Lineage Dispatches",
    "検証スコープガード",
  ]],
  ["plugins/harness/skills/using-harness/SKILL.md", [
    "同一の機能面",
    "Spec-Issue Count",
    "Lineage Dispatches",
  ]],
  ["plugins/harness/scripts/init-guidance.sh", [
    "Spec-Issue Count",
    "Lineage Dispatches",
  ]],
  ["CLAUDE.md", [
    "verification-scope-issue",
    "one feature surface and one flow",
    "done-by-user-decision",
  ]],
  ["AGENTS.md", [
    "verification-scope-issue",
    "one feature surface and one flow",
    "done-by-user-decision",
  ]],
];

function validateLoopRules(repoRoot) {
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
