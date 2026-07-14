#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveRuntimeConfig } from "./resolve-runtime-config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDir, "..");
const resolver = path.join(scriptDir, "resolve-runtime-config.mjs");
const initializer = path.join(pluginRoot, "scripts/init-guidance.sh");
const fixtureRoots = new Set();

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-runtime-check-${process.pid}-`));
  fixtureRoots.add(root);
  return root;
}

function cleanupFixtures() {
  for (const root of fixtureRoots) fs.rmSync(root, { recursive: true, force: true });
}

process.on("exit", cleanupFixtures);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanupFixtures();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

if (process.env.HARNESS_RUNTIME_CLEANUP_PROBE === "fail") {
  const probeRoot = fixture();
  fs.writeFileSync(process.env.HARNESS_RUNTIME_CLEANUP_MARKER, probeRoot);
  throw new Error("intentional cleanup probe failure");
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function runInitializer(root) {
  return spawnSync(initializer, [root], { encoding: "utf8" });
}

function runCli(args) {
  return spawnSync(process.execPath, [resolver, ...args], { encoding: "utf8" });
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
      applicationPaths: {
        roleModel: "Claude Code subagent model control",
        roleEffort: "project .claude/agents frontmatter",
      },
    },
    codex: {
      subagents: true,
      resume: true,
      roleModel: true,
      roleEffort: true,
      models: ["codex-team-model", "codex-personal-model"],
      efforts: ["medium", "high"],
      applicationPaths: {
        roleModel: "project .codex/agents model",
        roleEffort: "project .codex/agents model_reasoning_effort",
      },
    },
  };
}

const checks = [];
function check(name, run) {
  checks.push({ name, run });
}

check("shared config is valid, self-describing JSON with official references", () => {
  const template = path.join(pluginRoot, "templates/.harness/config.json");
  const config = JSON.parse(fs.readFileSync(template, "utf8"));
  assert.match(config.$comment, /never guessed|never converted/i);
  assert.equal(config.lifecycle, "balanced");
  assert.deepEqual(Object.keys(config.references).sort(), [
    "anthropicModels",
    "claudeCodeModelConfig",
    "claudeCodeSubagents",
    "codexConfig",
    "codexModels",
    "codexSubagents",
    "openaiApiModels",
  ]);
  for (const url of Object.values(config.references)) assert.match(url, /^https:\/\//);
  const root = fixture();
  fs.mkdirSync(path.join(root, ".harness"), { recursive: true });
  fs.copyFileSync(template, path.join(root, ".harness/config.json"));
  const resolved = resolveRuntimeConfig({ root });
  assert.equal(resolved.lifecycle.mode, "balanced");
  assert.equal(resolved.hosts.claudeCode.roles.planner.model.effective, "inherit");
});

check("no config uses balanced plus inherit without overstating Claude effort", () => {
  const result = resolveRuntimeConfig({ root: fixture() });
  assert.equal(result.lifecycle.mode, "balanced");
  assert.equal(result.hosts.claudeCode.capabilities.roleEffort, null);
  assert.equal(result.hosts.claudeCode.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.codex.roles.evaluator.effort.effective, "inherit");
});

check("personal leaves override shared leaves and explicit inherit cancels shared model", () => {
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
    hosts: { codex: { roles: { planner: { model: " inherit " } } } },
  });
  const result = resolveRuntimeConfig({ root, capabilityOverrides: completeCapabilities() });
  assert.equal(result.lifecycle.mode, "fresh");
  assert.equal(result.hosts.codex.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.codex.roles.planner.model.source, "personal");
  assert.equal(result.hosts.codex.roles.planner.effort.effective, "high");
  assert.equal(result.hosts.codex.roles.planner.effort.source, "shared");
  assert.equal(result.hosts.codex.roles.generator.model.effective, "codex-team-model");
});

check("model input is trimmed but never guessed; warnings identify source and candidates", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: {
      claudeCode: {
        roles: {
          planner: { model: " ambiguous model ", effort: "inherit " },
          generator: { model: "" },
        },
      },
    },
  });
  const result = resolveRuntimeConfig({ root, capabilityOverrides: completeCapabilities() });
  const planner = result.hosts.claudeCode.roles.planner;
  assert.equal(planner.model.requested, "ambiguous model");
  assert.equal(planner.model.effective, "inherit");
  assert.equal(planner.effort.status, "inherited");
  const unavailable = result.warnings.find((item) => item.code === "unavailable-value");
  assert.equal(unavailable.source, "shared");
  assert.deepEqual(unavailable.candidates, ["claude-team-model"]);
  assert.equal(unavailable.effective, "inherit");
  const invalid = result.warnings.find((item) => item.code === "invalid-value");
  assert.equal(invalid.source, "shared");
});

check("Claude role effort applies only with an explicit observed application path", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: { claudeCode: { roles: { planner: { effort: "high" } } } },
  });
  const unconfirmed = resolveRuntimeConfig({ root });
  assert.equal(unconfirmed.hosts.claudeCode.roles.planner.effort.status, "pending-validation");
  assert.equal(unconfirmed.hosts.claudeCode.roles.planner.effort.effective, "inherit");

  const capabilities = completeCapabilities();
  const applied = resolveRuntimeConfig({ root, capabilityOverrides: capabilities });
  assert.equal(applied.hosts.claudeCode.roles.planner.effort.status, "applied");
  assert.equal(applied.hosts.claudeCode.roles.planner.effort.effective, "high");
  assert.match(applied.hosts.claudeCode.roles.planner.effort.applicationPath, /frontmatter/);
});

check("host values stay isolated", () => {
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

check("balanced, fresh, retry, rotation, and role identity contracts are explicit", () => {
  const capabilities = completeCapabilities();
  const balanced = resolveRuntimeConfig({
    root: fixture(), event: "sprint-change", capabilityOverrides: capabilities,
  });
  const generator = balanced.hosts.claudeCode.roles.generator;
  const evaluator = balanced.hosts.claudeCode.roles.evaluator;
  assert.equal(generator.lifecycle.action, "resume");
  assert.equal(evaluator.lifecycle.action, "resume");
  assert.equal(generator.identity.role, "generator");
  assert.equal(evaluator.identity.role, "evaluator");
  assert.notEqual(generator.identity.sessionPolicyKey, evaluator.identity.sessionPolicyKey);
  assert.ok(generator.identity.mustNotShareWith.includes("evaluator"));
  assert.ok(evaluator.identity.mustNotShareWith.includes("generator"));

  const freshRoot = fixture();
  writeJson(path.join(freshRoot, ".harness/config.json"), { lifecycle: "fresh" });
  const boundary = resolveRuntimeConfig({
    root: freshRoot, event: "sprint-change", capabilityOverrides: capabilities,
  });
  const retry = resolveRuntimeConfig({
    root: freshRoot, event: "retry", capabilityOverrides: capabilities,
  });
  const rotation = resolveRuntimeConfig({
    root: freshRoot, event: "sprint-change", rotate: ["planner"], capabilityOverrides: capabilities,
  });
  assert.equal(boundary.hosts.claudeCode.roles.generator.lifecycle.action, "fresh");
  assert.equal(boundary.hosts.claudeCode.roles.evaluator.lifecycle.action, "fresh");
  assert.equal(retry.hosts.claudeCode.roles.generator.lifecycle.action, "resume");
  assert.equal(retry.hosts.claudeCode.roles.evaluator.lifecycle.action, "resume");
  assert.equal(rotation.hosts.claudeCode.roles.planner.lifecycle.action, "fresh");
});

check("subagents false normalizes every new execution path to isolated-work-unit", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), { lifecycle: "fresh" });
  const capabilities = completeCapabilities();
  capabilities.claudeCode.subagents = false;
  for (const options of [
    { event: "initial" },
    { event: "sprint-change" },
    { event: "sprint-change", rotate: ["generator"] },
  ]) {
    const result = resolveRuntimeConfig({ root, capabilityOverrides: capabilities, ...options });
    assert.equal(result.hosts.claudeCode.roles.generator.lifecycle.action, "isolated-work-unit");
    assert.equal(result.hosts.claudeCode.roles.evaluator.lifecycle.action, "isolated-work-unit");
  }
});

check("Codex conservative defaults use isolated work units and source-aware resume warnings", () => {
  const result = resolveRuntimeConfig({ root: fixture(), host: "codex", event: "sprint-change" });
  assert.equal(result.hosts.codex.roles.generator.lifecycle.action, "isolated-work-unit");
  const warning = result.warnings.find((item) => item.code === "resume-unconfirmed");
  assert.equal(warning.source, "plugin");
  assert.equal(warning.effective, "isolated-work-unit");
});

check("unsupported role settings warn and inherit", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: { codex: { roles: { planner: { model: "codex-team-model", effort: "high" } } } },
  });
  const result = resolveRuntimeConfig({ root, host: "codex" });
  assert.equal(result.hosts.codex.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.codex.roles.planner.effort.effective, "inherit");
  assert.ok(result.warnings.every((item) => item.source));
});

check("capability CLI accepts a file and degrades broken files without stopping", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: { codex: { roles: { planner: { model: "codex-team-model" } } } },
  });
  const capabilityFile = path.join(root, "capabilities.json");
  writeJson(capabilityFile, { observedAt: "test", hosts: completeCapabilities() });
  const applied = runCli(["--root", root, "--host", "codex", "--capabilities", capabilityFile, "--json"]);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).hosts.codex.roles.planner.model.status, "applied");

  const missing = runCli(["--root", root, "--host", "codex", "--capabilities", path.join(root, "missing.json"), "--json"]);
  assert.equal(missing.status, 0, missing.stderr);
  const missingResult = JSON.parse(missing.stdout);
  assert.ok(missingResult.warnings.some((item) => item.code === "invalid-capability-file"));
  assert.notEqual(missingResult.hosts.codex.roles.planner.model.status, "applied");

  const brokenFile = path.join(root, "broken.json");
  fs.writeFileSync(brokenFile, "{broken\n");
  const broken = runCli(["--root", root, "--host", "codex", "--capabilities", brokenFile, "--json"]);
  assert.equal(broken.status, 0, broken.stderr);
  assert.ok(JSON.parse(broken.stdout).warnings.some((item) => item.source.startsWith("capability:")));

  const typedFile = path.join(root, "typed.json");
  writeJson(typedFile, { hosts: { codex: { roleModel: "yes", models: "all" } } });
  const typed = runCli(["--root", root, "--host", "codex", "--capabilities", typedFile, "--json"]);
  assert.equal(typed.status, 0, typed.stderr);
  assert.ok(JSON.parse(typed.stdout).warnings.some((item) => item.code === "invalid-capability-value"));
});

check("invalid application path leaves warn and fall back without erasing valid siblings", () => {
  const root = fixture();
  writeJson(path.join(root, ".harness/config.json"), {
    hosts: {
      claudeCode: {
        roles: { planner: { model: "claude-team-model", effort: "high" } },
      },
    },
  });
  const capabilityFile = path.join(root, "capabilities.json");
  writeJson(capabilityFile, {
    hosts: {
      claudeCode: {
        subagents: true,
        resume: true,
        roleModel: true,
        roleEffort: true,
        models: ["claude-team-model"],
        efforts: ["high"],
        applicationPaths: {
          roleModel: "Claude Code subagent model control",
          roleEffort: 42,
        },
      },
    },
  });
  const cli = runCli(["--root", root, "--host", "claudeCode", "--capabilities", capabilityFile, "--json"]);
  assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(
    result.hosts.claudeCode.capabilities.applicationPaths.roleModel,
    "Claude Code subagent model control",
  );
  assert.equal(result.hosts.claudeCode.capabilities.applicationPaths.roleEffort, null);
  assert.equal(result.hosts.claudeCode.roles.planner.model.status, "applied");
  assert.equal(result.hosts.claudeCode.roles.planner.effort.status, "pending-validation");
  assert.equal(result.hosts.claudeCode.roles.planner.effort.effective, "inherit");
  const diagnostic = result.warnings.find(
    (item) => item.path === "capabilities.claudeCode.applicationPaths.roleEffort",
  );
  assert.equal(diagnostic.code, "invalid-capability-value");
  assert.equal(diagnostic.input, 42);
  assert.equal(diagnostic.effective, "inherit");
  assert.equal(diagnostic.source, `capability:${capabilityFile}`);
  assert.equal(diagnostic.causeSource, `capability:${capabilityFile}`);

  const siblingFile = path.join(root, "capabilities-invalid-model-path.json");
  writeJson(siblingFile, {
    hosts: {
      claudeCode: {
        roleModel: true,
        roleEffort: true,
        models: ["claude-team-model"],
        efforts: ["high"],
        applicationPaths: {
          roleModel: "",
          roleEffort: "project .claude/agents/planner.md frontmatter",
        },
      },
    },
  });
  const siblingCli = runCli([
    "--root", root, "--host", "claudeCode", "--capabilities", siblingFile, "--json",
  ]);
  assert.equal(siblingCli.status, 0, siblingCli.stderr);
  const siblingResult = JSON.parse(siblingCli.stdout);
  assert.equal(siblingResult.hosts.claudeCode.capabilities.applicationPaths.roleModel, null);
  assert.equal(
    siblingResult.hosts.claudeCode.capabilities.applicationPaths.roleEffort,
    "project .claude/agents/planner.md frontmatter",
  );
  assert.equal(siblingResult.hosts.claudeCode.roles.planner.model.status, "pending-validation");
  assert.equal(siblingResult.hosts.claudeCode.roles.planner.effort.status, "applied");
  const siblingDiagnostic = siblingResult.warnings.find(
    (item) => item.path === "capabilities.claudeCode.applicationPaths.roleModel",
  );
  assert.equal(siblingDiagnostic.input, "");
  assert.equal(siblingDiagnostic.source, `capability:${siblingFile}`);
  assert.equal(siblingDiagnostic.causeSource, `capability:${siblingFile}`);
});

check("unknown rotate roles fail visibly", () => {
  assert.throws(() => resolveRuntimeConfig({ root: fixture(), rotate: ["bogusrole"] }), /invalid --rotate/);
  const cli = runCli(["--root", fixture(), "--rotate", "bogusrole", "--json"]);
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /invalid --rotate role/);
});

check("initializer never overwrites guidance, agents, config, or complete ignore", () => {
  const root = fixture();
  fs.accessSync(initializer, fs.constants.X_OK);
  execFileSync("git", ["init", "-q"], { cwd: root });
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
  const initialized = runInitializer(root);
  assert.equal(initialized.status, 0, initialized.stderr);
  for (const [relative, digest] of Object.entries(before)) {
    assert.equal(sha(path.join(root, relative)), digest, `${relative} was overwritten`);
  }
});

check("initializer creates shared config, preserves custom ignore rules, verifies git, and is idempotent", () => {
  const root = fixture();
  execFileSync("git", ["init", "-q"], { cwd: root });
  const ignore = path.join(root, ".harness/.gitignore");
  const localConfig = path.join(root, ".harness/config.local.json");
  const original = "custom-local-name.json\n# keep this project rule";
  fs.mkdirSync(path.dirname(ignore), { recursive: true });
  fs.writeFileSync(ignore, original);
  fs.writeFileSync(localConfig, "{}\n");

  const first = runInitializer(root);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /verified git ignore/);
  const afterFirst = fs.readFileSync(ignore, "utf8");
  assert.equal(afterFirst, `${original}\nconfig.local.json\n`);
  assert.equal(afterFirst.match(/^config\.local\.json$/gm)?.length, 1);
  execFileSync("git", ["check-ignore", "-q", "--no-index", ".harness/config.local.json"], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".harness/config.json"), "utf8")).lifecycle, "balanced");
  assert.equal(fs.existsSync(path.join(root, ".harness/README.md")), false);

  const digest = sha(ignore);
  const second = runInitializer(root);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(sha(ignore), digest);
});

check("initializer refuses symlink, directory, and unreadable ignore surfaces before other writes", () => {
  const symlinkRoot = fixture();
  fs.mkdirSync(path.join(symlinkRoot, ".harness"), { recursive: true });
  const external = path.join(fixture(), "owned-ignore");
  fs.writeFileSync(external, "owner-rule\n");
  fs.symlinkSync(external, path.join(symlinkRoot, ".harness/.gitignore"));
  const symlinkResult = runInitializer(symlinkRoot);
  assert.notEqual(symlinkResult.status, 0);
  assert.equal(fs.readFileSync(external, "utf8"), "owner-rule\n");
  assert.equal(fs.existsSync(path.join(symlinkRoot, ".harness/config.json")), false);
  assert.equal(fs.existsSync(path.join(symlinkRoot, "docs")), false);

  const directoryRoot = fixture();
  fs.mkdirSync(path.join(directoryRoot, ".harness/.gitignore"), { recursive: true });
  const directoryResult = runInitializer(directoryRoot);
  assert.notEqual(directoryResult.status, 0);
  assert.equal(fs.existsSync(path.join(directoryRoot, ".harness/config.json")), false);

  const unreadableRoot = fixture();
  fs.mkdirSync(path.join(unreadableRoot, ".harness"), { recursive: true });
  const unreadable = path.join(unreadableRoot, ".harness/.gitignore");
  fs.writeFileSync(unreadable, "owner-rule\n");
  fs.chmodSync(unreadable, 0o000);
  try {
    const unreadableResult = runInitializer(unreadableRoot);
    assert.notEqual(unreadableResult.status, 0);
    assert.equal(fs.existsSync(path.join(unreadableRoot, ".harness/config.json")), false);
  } finally {
    fs.chmodSync(unreadable, 0o600);
  }
});

check("temporary fixtures are cleaned after a failing regression process", () => {
  const root = fixture();
  const marker = path.join(root, "cleanup-probe.txt");
  const probe = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    encoding: "utf8",
    env: {
      ...process.env,
      HARNESS_RUNTIME_CLEANUP_PROBE: "fail",
      HARNESS_RUNTIME_CLEANUP_MARKER: marker,
    },
  });
  assert.notEqual(probe.status, 0);
  const childFixture = fs.readFileSync(marker, "utf8");
  assert.equal(fs.existsSync(childFixture), false);
});

const completed = [];
try {
  for (const { name, run } of checks) {
    run();
    completed.push(name);
  }
  const roots = [...fixtureRoots];
  cleanupFixtures();
  assert.ok(roots.every((root) => !fs.existsSync(root)));
  completed.push("temporary fixtures are cleaned after the run");
} finally {
  cleanupFixtures();
}

console.log(`runtime config regression: ${completed.length} checks passed`);
for (const name of completed) console.log(`  ok - ${name}`);
