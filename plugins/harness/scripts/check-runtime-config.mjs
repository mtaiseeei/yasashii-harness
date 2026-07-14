#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveRuntimeConfig } from "./resolve-runtime-config.mjs";

const require = createRequire(import.meta.url);
const { parse: parseToml, stringify: stringifyToml } = require("../vendor/smol-toml/index.cjs");

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

function writeToml(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stringifyToml(value));
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

check("shared TOML is parseable and self-documents lifecycle, inheritance, fallback, and official references", () => {
  const template = path.join(pluginRoot, "templates/.harness/config.toml");
  const source = fs.readFileSync(template, "utf8");
  const config = parseToml(source);
  assert.match(source, /parent main session/i);
  assert.match(source, /current chat/i);
  assert.match(source, /never fuzzy-matched/i);
  assert.match(source, /lifecycle = "balanced" reuses/i);
  assert.match(source, /retry inside the same Sprint resumes/i);
  assert.equal(config.lifecycle, "balanced");
  assert.equal((source.match(/https:\/\//g) || []).length, 7);
  assert.equal(JSON.stringify(config).includes("https://"), false);
  const root = fixture();
  fs.mkdirSync(path.join(root, ".harness"), { recursive: true });
  fs.copyFileSync(template, path.join(root, ".harness/config.toml"));
  const resolved = resolveRuntimeConfig({ root });
  assert.equal(resolved.configFiles.format, "toml");
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
  writeToml(path.join(root, ".harness/config.toml"), {
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
  writeToml(path.join(root, ".harness/config.local.toml"), {
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
  writeToml(path.join(root, ".harness/config.toml"), {
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
  writeToml(path.join(root, ".harness/config.toml"), {
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
  writeToml(path.join(root, ".harness/config.toml"), {
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
  writeToml(path.join(freshRoot, ".harness/config.toml"), { lifecycle: "fresh" });
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
  writeToml(path.join(root, ".harness/config.toml"), { lifecycle: "fresh" });
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
  writeToml(path.join(root, ".harness/config.toml"), {
    hosts: { codex: { roles: { planner: { model: "codex-team-model", effort: "high" } } } },
  });
  const result = resolveRuntimeConfig({ root, host: "codex" });
  assert.equal(result.hosts.codex.roles.planner.model.effective, "inherit");
  assert.equal(result.hosts.codex.roles.planner.effort.effective, "inherit");
  assert.ok(result.warnings.every((item) => item.source));
});

check("capability CLI accepts a file and degrades broken files without stopping", () => {
  const root = fixture();
  writeToml(path.join(root, ".harness/config.toml"), {
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
  writeToml(path.join(root, ".harness/config.toml"), {
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

check("all role agents protect canonical TOML and identify JSON only as legacy compatibility", () => {
  for (const role of ["planner", "generator", "evaluator"]) {
    const definition = fs.readFileSync(path.join(pluginRoot, `agents/${role}.md`), "utf8");
    assert.match(definition, /\.harness\/config\.toml/);
    assert.match(definition, /\.harness\/config\.local\.toml/);
    assert.match(definition, /編集・上書きせず/);
    assert.match(definition, /旧 `.harness\/config\.json` \/ `.harness\/config\.local\.json` もlegacy互換入力/);
    assert.doesNotMatch(definition, /config\*\.json/);
  }
});

check("TOML syntax, type, and unknown-key errors are diagnosed with safe effective values", () => {
  const brokenRoot = fixture();
  const broken = path.join(brokenRoot, ".harness/config.toml");
  const brokenInput = 'lifecycle = "fresh"\n[hosts.codex.roles.planner\n';
  fs.mkdirSync(path.dirname(broken), { recursive: true });
  fs.writeFileSync(broken, brokenInput);
  const brokenResult = resolveRuntimeConfig({ root: brokenRoot });
  assert.equal(brokenResult.lifecycle.mode, "balanced");
  const invalidToml = brokenResult.warnings.find((item) => item.code === "invalid-toml");
  assert.equal(invalidToml.path, ".harness/config.toml");
  assert.equal(invalidToml.source, "shared");
  assert.equal(invalidToml.effective, "inherit");
  assert.equal(invalidToml.input, brokenInput);
  assert.match(invalidToml.reason, /Invalid TOML document/);
  assert.match(invalidToml.reason, /incomplete key-value/);
  assert.match(invalidToml.reason, /line 2, column 2/);
  assert.doesNotMatch(invalidToml.reason, /truncated/);
  assert.doesNotMatch(invalidToml.reason, /lifecycle = "fresh"/);
  assert.equal(invalidToml.line, 2);
  assert.equal(invalidToml.column, 2);

  const oversizedRoot = fixture();
  const oversizedFile = path.join(oversizedRoot, ".harness/config.local.toml");
  const tailSentinel = "UNREDACTED_TAIL_SENTINEL";
  const oversizedInput = `[${"a".repeat(5000)}${tailSentinel}`;
  fs.mkdirSync(path.dirname(oversizedFile), { recursive: true });
  writeToml(path.join(oversizedRoot, ".harness/config.toml"), { lifecycle: "fresh" });
  fs.writeFileSync(oversizedFile, oversizedInput);
  const oversizedResult = resolveRuntimeConfig({ root: oversizedRoot });
  const oversizedWarning = oversizedResult.warnings.find(
    (item) => item.code === "invalid-toml" && item.source === "personal",
  );
  assert.equal(oversizedResult.lifecycle.mode, "fresh");
  assert.ok(oversizedWarning.input.length <= 4096);
  assert.ok(oversizedWarning.reason.length <= 1024);
  assert.equal(
    oversizedWarning.input,
    `[redacted oversized TOML input; size=${oversizedInput.length} characters]`,
  );
  assert.match(oversizedWarning.reason, /source details redacted for oversized input/);
  assert.doesNotMatch(oversizedWarning.input, /truncated \d+ characters/);
  assert.ok(Number.isInteger(oversizedWarning.line));
  assert.ok(Number.isInteger(oversizedWarning.column));
  assert.doesNotMatch(oversizedWarning.input, new RegExp(tailSentinel));
  assert.doesNotMatch(oversizedWarning.reason, new RegExp(tailSentinel));
  assert.doesNotMatch(JSON.stringify(oversizedWarning), new RegExp(tailSentinel));

  const typedRoot = fixture();
  fs.mkdirSync(path.join(typedRoot, ".harness"), { recursive: true });
  fs.writeFileSync(path.join(typedRoot, ".harness/config.toml"), [
    'lifecycle = "unexpected"',
    'mystery = true',
    '[hosts.codex.roles.planner]',
    'model = 42',
    'unknownLeaf = "value"',
    '',
  ].join("\n"));
  const typed = resolveRuntimeConfig({ root: typedRoot });
  assert.equal(typed.lifecycle.mode, "balanced");
  assert.equal(typed.hosts.codex.roles.planner.model.effective, "inherit");
  assert.ok(typed.warnings.some((item) => item.code === "invalid-lifecycle" && item.input === "unexpected"));
  assert.ok(typed.warnings.some((item) => item.code === "invalid-value" && item.input === 42));
  assert.ok(typed.warnings.some((item) => item.code === "unknown-config-key" && item.path.endsWith("unknownLeaf")));
  assert.ok(typed.warnings.some((item) => item.code === "unknown-config-key" && item.path.endsWith("mystery")));
});

check("oversized TOML diagnostics redact all content across resolver and CLI serialization", () => {
  const variants = [
    { seed: "alpha", normalValueAfterPadding: false },
    { seed: "beta", normalValueAfterPadding: true },
  ];

  for (const { seed, normalValueAfterPadding } of variants) {
    const root = fixture();
    const sharedFile = path.join(root, ".harness/config.toml");
    const normalValueMarker = `NORMAL_VALUE_${seed.toUpperCase()}_PRIVATE`;
    const tailValueMarker = `TAIL_VALUE_${seed.toUpperCase()}_PRIVATE`;
    const invalidFragmentMarker = `INVALID_FRAGMENT_${seed.toUpperCase()}_PRIVATE`;
    const padding = Array.from(
      { length: 280 },
      (_, index) => `# padding-${seed}-${String(index).padStart(3, "0")}-${"x".repeat(12)}`,
    );
    const split = normalValueAfterPadding ? 220 : 0;
    const lines = [
      'lifecycle = "fresh"',
      "[hosts.codex.roles.planner]",
      ...padding.slice(0, split),
      `model = "${normalValueMarker}"`,
      ...padding.slice(split),
      `effort = "${tailValueMarker}"`,
      `broken = "${invalidFragmentMarker}`,
    ];
    const input = `${lines.join("\n")}\n`;
    fs.mkdirSync(path.dirname(sharedFile), { recursive: true });
    fs.writeFileSync(sharedFile, input);
    assert.ok(input.length > 4096);

    const result = resolveRuntimeConfig({ root, host: "codex" });
    const diagnostic = result.warnings.find(
      (item) => item.code === "invalid-toml" && item.source === "shared",
    );
    assert.ok(diagnostic);
    assert.equal(result.lifecycle.mode, "balanced");
    assert.equal(result.hosts.codex.roles.planner.model.effective, "inherit");
    assert.equal(diagnostic.path, ".harness/config.toml");
    assert.equal(diagnostic.effective, "inherit");
    assert.equal(diagnostic.input, `[redacted oversized TOML input; size=${input.length} characters]`);
    assert.match(diagnostic.reason, /Invalid TOML document/);
    assert.match(diagnostic.reason, /source details redacted for oversized input/);
    assert.match(diagnostic.reason, /line \d+, column \d+/);
    assert.equal(diagnostic.line, lines.length);
    assert.ok(Number.isInteger(diagnostic.column));
    assert.ok(diagnostic.input.length <= 4096);
    assert.ok(diagnostic.reason.length <= 1024);

    const serializedWarning = JSON.stringify(diagnostic);
    const serializedResult = JSON.stringify(result);
    assert.ok(serializedWarning.length < 2048);
    for (const marker of [normalValueMarker, tailValueMarker, invalidFragmentMarker]) {
      assert.equal(diagnostic.input.includes(marker), false);
      assert.equal(diagnostic.reason.includes(marker), false);
      assert.equal(serializedWarning.includes(marker), false);
      assert.equal(serializedResult.includes(marker), false);
    }

    const cli = runCli(["--root", root, "--host", "codex", "--json"]);
    assert.equal(cli.status, 0, cli.stderr);
    const cliResult = JSON.parse(cli.stdout);
    assert.equal(cliResult.lifecycle.mode, "balanced");
    assert.equal(cliResult.hosts.codex.roles.planner.model.effective, "inherit");
    for (const marker of [normalValueMarker, tailValueMarker, invalidFragmentMarker]) {
      assert.equal(cli.stdout.includes(marker), false);
    }
  }
});

check("legacy JSON is compatible alone, ignored beside TOML, and never leaf-merged into TOML", () => {
  const legacyRoot = fixture();
  writeJson(path.join(legacyRoot, ".harness/config.json"), {
    lifecycle: "fresh",
    hosts: { codex: { roles: { planner: { model: "codex-team-model" } } } },
  });
  const legacyDigest = sha(path.join(legacyRoot, ".harness/config.json"));
  const legacy = resolveRuntimeConfig({ root: legacyRoot, capabilityOverrides: completeCapabilities() });
  assert.equal(legacy.configFiles.format, "legacy-json");
  assert.equal(legacy.lifecycle.mode, "fresh");
  assert.equal(legacy.hosts.codex.roles.planner.model.effective, "codex-team-model");
  assert.ok(legacy.warnings.some((item) => item.code === "legacy-json-config"));
  assert.equal(sha(path.join(legacyRoot, ".harness/config.json")), legacyDigest);
  const initializedLegacy = runInitializer(legacyRoot);
  assert.equal(initializedLegacy.status, 0, initializedLegacy.stderr);
  assert.match(initializedLegacy.stderr, /no competing TOML was created/);
  assert.equal(fs.existsSync(path.join(legacyRoot, ".harness/config.toml")), false);
  assert.equal(sha(path.join(legacyRoot, ".harness/config.json")), legacyDigest);

  const coexistRoot = fixture();
  writeToml(path.join(coexistRoot, ".harness/config.toml"), { lifecycle: "balanced" });
  writeJson(path.join(coexistRoot, ".harness/config.json"), {
    lifecycle: "fresh",
    hosts: { codex: { roles: { planner: { model: "codex-team-model" } } } },
  });
  writeJson(path.join(coexistRoot, ".harness/config.local.json"), {
    hosts: { codex: { roles: { planner: { effort: "high" } } } },
  });
  const coexist = resolveRuntimeConfig({ root: coexistRoot, capabilityOverrides: completeCapabilities() });
  assert.equal(coexist.configFiles.format, "toml");
  assert.equal(coexist.lifecycle.mode, "balanced");
  assert.equal(coexist.hosts.codex.roles.planner.model.effective, "inherit");
  assert.equal(coexist.hosts.codex.roles.planner.effort.effective, "inherit");
  assert.equal(coexist.warnings.filter((item) => item.code === "legacy-json-ignored").length, 2);
});

check("vendored smol-toml is fixed, licensed, self-contained, and loadable without target dependencies", () => {
  const vendor = path.join(pluginRoot, "vendor/smol-toml");
  const readme = fs.readFileSync(path.join(vendor, "README.md"), "utf8");
  assert.match(readme, /Version: 1\.7\.0 \(fixed\)/);
  assert.match(readme, /Runtime dependencies: none/);
  assert.match(readme, /Supported Node\.js: >=18/);
  assert.match(fs.readFileSync(path.join(vendor, "LICENSE"), "utf8"), /Redistribution and use in source and binary forms/);
  assert.equal(sha(path.join(vendor, "index.cjs")), "173006d8b690034d636c1af4dc6836db8dc6a708bcd4fea90c8d04ea250afa7d");
  assert.deepEqual(parseToml('lifecycle = "balanced"\n'), { lifecycle: "balanced" });
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
    ".harness/config.toml": 'lifecycle = "fresh"\ncustom = true\n',
    ".harness/config.local.toml": '[hosts.codex.roles.planner]\nmodel = "inherit"\n',
    ".harness/config.json": '{"lifecycle":"fresh","custom":true}\n',
    ".harness/.gitignore": "custom-local-name.json\nconfig.local.toml\nconfig.local.json\n",
  };
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  const before = Object.fromEntries(Object.keys(files).map((file) => [file, sha(path.join(root, file))]));
  const initialized = runInitializer(root);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.match(initialized.stdout, /kept existing .*config\.toml/);
  for (const [relative, digest] of Object.entries(before)) {
    assert.equal(sha(path.join(root, relative)), digest, `${relative} was overwritten`);
  }
});

check("initializer creates shared config, preserves custom ignore rules, verifies git, and is idempotent", () => {
  const root = fixture();
  execFileSync("git", ["init", "-q"], { cwd: root });
  const ignore = path.join(root, ".harness/.gitignore");
  const localConfig = path.join(root, ".harness/config.local.toml");
  const original = "custom-local-name.json\n# keep this project rule";
  fs.mkdirSync(path.dirname(ignore), { recursive: true });
  fs.writeFileSync(ignore, original);
  fs.writeFileSync(localConfig, "# personal overrides\n");

  const first = runInitializer(root);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /verified git ignore/);
  const afterFirst = fs.readFileSync(ignore, "utf8");
  assert.equal(afterFirst, `${original}\nconfig.local.toml\nconfig.local.json\n`);
  assert.equal(afterFirst.match(/^config\.local\.toml$/gm)?.length, 1);
  assert.equal(afterFirst.match(/^config\.local\.json$/gm)?.length, 1);
  execFileSync("git", ["check-ignore", "-q", "--no-index", ".harness/config.local.toml"], { cwd: root });
  execFileSync("git", ["check-ignore", "-q", "--no-index", ".harness/config.local.json"], { cwd: root });
  assert.equal(parseToml(fs.readFileSync(path.join(root, ".harness/config.toml"), "utf8")).lifecycle, "balanced");
  assert.equal(fs.existsSync(path.join(root, "package.json")), false);
  assert.equal(fs.existsSync(path.join(root, "package-lock.json")), false);
  assert.equal(fs.existsSync(path.join(root, "node_modules")), false);
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
  assert.equal(fs.existsSync(path.join(symlinkRoot, ".harness/config.toml")), false);
  assert.equal(fs.existsSync(path.join(symlinkRoot, "docs")), false);

  const directoryRoot = fixture();
  fs.mkdirSync(path.join(directoryRoot, ".harness/.gitignore"), { recursive: true });
  const directoryResult = runInitializer(directoryRoot);
  assert.notEqual(directoryResult.status, 0);
  assert.equal(fs.existsSync(path.join(directoryRoot, ".harness/config.toml")), false);

  const unreadableRoot = fixture();
  fs.mkdirSync(path.join(unreadableRoot, ".harness"), { recursive: true });
  const unreadable = path.join(unreadableRoot, ".harness/.gitignore");
  fs.writeFileSync(unreadable, "owner-rule\n");
  fs.chmodSync(unreadable, 0o000);
  try {
    const unreadableResult = runInitializer(unreadableRoot);
    assert.notEqual(unreadableResult.status, 0);
    assert.equal(fs.existsSync(path.join(unreadableRoot, ".harness/config.toml")), false);
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
