#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveRuntimeConfig } from "./resolve-runtime-config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDir, "..");

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "harness-runtime-check-"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function completeCapabilities() {
  return {
    claudeCode: {
      subagents: true,
      resume: true,
      roleModel: true,
      roleEffort: true,
      models: ["claude-team-model"],
      efforts: ["low", "high"],
    },
    codex: {
      subagents: true,
      resume: true,
      roleModel: true,
      roleEffort: true,
      models: ["codex-team-model", "codex-personal-model"],
      efforts: ["medium", "high"],
    },
  };
}

const checks = [];
function check(name, run) {
  run();
  checks.push(name);
}

check("no config uses balanced plus inherit", () => {
  const result = resolveRuntimeConfig({ root: fixture() });
  assert.equal(result.lifecycle.mode, "balanced");
  assert.equal(result.hosts.claudeCode.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.codex.roles.evaluator.effort.effective, "inherit");
});

check("personal config overrides one leaf only", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    lifecycle: "fresh",
    hosts: {
      codex: {
        roles: {
          planner: { model: "codex-team-model", effort: "high" },
          generator: { model: "codex-team-model", effort: "medium" },
        },
      },
    },
  });
  writeJson(path.join(root, ".harness/config.local.json"), {
    hosts: { codex: { roles: { planner: { model: "codex-personal-model" } } } },
  });
  const result = resolveRuntimeConfig({ root, capabilityOverrides: completeCapabilities() });
  assert.equal(result.lifecycle.mode, "fresh");
  assert.equal(result.hosts.codex.roles.planner.model.effective, "codex-personal-model");
  assert.equal(result.hosts.codex.roles.planner.model.source, "personal");
  assert.equal(result.hosts.codex.roles.planner.effort.effective, "high");
  assert.equal(result.hosts.codex.roles.planner.effort.source, "shared");
  assert.equal(result.hosts.codex.roles.generator.model.effective, "codex-team-model");
});

check("invalid and unavailable values fall back per leaf", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    lifecycle: "turbo",
    hosts: {
      claudeCode: { roles: { planner: { model: "missing-model", effort: 99 } } },
    },
  });
  const result = resolveRuntimeConfig({ root, capabilityOverrides: completeCapabilities() });
  assert.equal(result.lifecycle.mode, "balanced");
  assert.equal(result.hosts.claudeCode.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.claudeCode.roles.planner.effort.effective, "inherit");
  assert.ok(result.warnings.some((item) => item.code === "invalid-lifecycle"));
  assert.ok(result.warnings.some((item) => item.code === "unavailable-value"));
  assert.ok(result.warnings.some((item) => item.code === "invalid-value"));
});

check("host values remain isolated", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: {
      claudeCode: { roles: { evaluator: { model: "claude-team-model" } } },
      codex: { roles: { evaluator: { model: "codex-team-model" } } },
    },
  });
  const result = resolveRuntimeConfig({ root, capabilityOverrides: completeCapabilities() });
  assert.equal(result.hosts.claudeCode.roles.evaluator.model.effective, "claude-team-model");
  assert.equal(result.hosts.codex.roles.evaluator.model.effective, "codex-team-model");
});

check("balanced and fresh lifecycle honor Sprint boundaries and retry", () => {
  const balancedRoot = fixture();
  const balanced = resolveRuntimeConfig({
    root: balancedRoot,
    event: "sprint-change",
    capabilityOverrides: completeCapabilities(),
  });
  assert.equal(balanced.hosts.claudeCode.roles.generator.lifecycle.action, "resume");
  assert.equal(balanced.hosts.claudeCode.roles.evaluator.lifecycle.action, "resume");
  assert.notEqual(
    balanced.hosts.claudeCode.roles.generator,
    balanced.hosts.claudeCode.roles.evaluator,
  );

  const freshRoot = fixture();
  writeJson(path.join(freshRoot, ".harness/config.json"), { lifecycle: "fresh" });
  const boundary = resolveRuntimeConfig({
    root: freshRoot,
    event: "sprint-change",
    capabilityOverrides: completeCapabilities(),
  });
  const retry = resolveRuntimeConfig({
    root: freshRoot,
    event: "retry",
    capabilityOverrides: completeCapabilities(),
  });
  assert.equal(boundary.hosts.claudeCode.roles.generator.lifecycle.action, "fresh");
  assert.equal(boundary.hosts.claudeCode.roles.evaluator.lifecycle.action, "fresh");
  assert.equal(retry.hosts.claudeCode.roles.generator.lifecycle.action, "resume");
});

check("unsupported role settings warn and inherit", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: { codex: { roles: { planner: { model: "codex-team-model", effort: "high" } } } },
  });
  const result = resolveRuntimeConfig({ root, host: "codex" });
  assert.equal(result.hosts.codex.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.codex.roles.planner.effort.effective, "inherit");
  assert.ok(result.warnings.some((item) => item.code === "unsupported-role-setting"));
});

check("initializer never overwrites guidance, agents, or config", () => {
  const root = fixture();
  const files = {
    "AGENTS.md": "custom agents guidance\n",
    "CLAUDE.md": "custom claude guidance\n",
    ".claude/agents/custom.md": "custom claude agent\n",
    ".codex/agents/custom.toml": "custom codex agent\n",
    ".harness/config.json": '{"lifecycle":"fresh","custom":true}\n',
    ".harness/.gitignore": "custom-local-name.json\nconfig.local.json\n",
  };
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  const before = Object.fromEntries(Object.keys(files).map((file) => [file, sha(path.join(root, file))]));
  execFileSync("bash", [path.join(pluginRoot, "scripts/init-guidance.sh"), root], { stdio: "pipe" });
  for (const [relative, digest] of Object.entries(before)) {
    assert.equal(sha(path.join(root, relative)), digest, `${relative} was overwritten`);
  }
});

check("initializer creates missing shared config and local ignore once", () => {
  const root = fixture();
  execFileSync("bash", [path.join(pluginRoot, "scripts/init-guidance.sh"), root], { stdio: "pipe" });
  const config = path.join(root, ".harness/config.json");
  const ignore = path.join(root, ".harness/.gitignore");
  assert.equal(JSON.parse(fs.readFileSync(config, "utf8")).lifecycle, "balanced");
  assert.match(fs.readFileSync(ignore, "utf8"), /^config\.local\.json/m);
  const before = [sha(config), sha(ignore)];
  execFileSync("bash", [path.join(pluginRoot, "scripts/init-guidance.sh"), root], { stdio: "pipe" });
  assert.deepEqual([sha(config), sha(ignore)], before);
});

check("initializer preserves custom ignore rules and appends local config rule idempotently", () => {
  const root = fixture();
  const ignore = path.join(root, ".harness/.gitignore");
  const localConfig = path.join(root, ".harness/config.local.json");
  const original = "custom-local-name.json\n# keep this project rule";
  fs.mkdirSync(path.dirname(ignore), { recursive: true });
  fs.writeFileSync(ignore, original);
  fs.writeFileSync(localConfig, "{}\n");
  execFileSync("git", ["init", "-q"], { cwd: root, stdio: "pipe" });

  execFileSync("bash", [path.join(pluginRoot, "scripts/init-guidance.sh"), root], { stdio: "pipe" });
  const afterFirst = fs.readFileSync(ignore, "utf8");
  assert.equal(afterFirst, `${original}\nconfig.local.json\n`);
  assert.equal(afterFirst.match(/^config\.local\.json$/gm)?.length, 1);
  execFileSync("git", ["check-ignore", "-q", ".harness/config.local.json"], {
    cwd: root,
    stdio: "pipe",
  });

  const firstDigest = sha(ignore);
  execFileSync("bash", [path.join(pluginRoot, "scripts/init-guidance.sh"), root], { stdio: "pipe" });
  assert.equal(sha(ignore), firstDigest);
  assert.equal(fs.readFileSync(ignore, "utf8"), afterFirst);
});

console.log(`runtime config regression: ${checks.length} checks passed`);
for (const name of checks) console.log(`  ok - ${name}`);
