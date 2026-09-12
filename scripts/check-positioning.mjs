#!/usr/bin/env node

// Static distribution checks complement, but do not replace, independent scenario evaluation.
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
  "plugins/harness/commands/harness.md",
  "plugins/harness/scripts/harness.mjs",
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
  const readme = read("README.md");
  const agents = read("AGENTS.md");
  const claude = read("CLAUDE.md");
  const skill = read("plugins/harness/skills/using-harness/SKILL.md");
  const loop = read("plugins/harness/skills/harness-loop/SKILL.md");
  const command = read("plugins/harness/commands/harness.md");
  const harnessCommand = read("plugins/harness/scripts/harness.mjs");
  const hook = read("plugins/harness/hooks/session-start.sh");
  const knowledge = read("docs/KNOWLEDGE.md");
  const claudeManifest = json("plugins/harness/.claude-plugin/plugin.json");
  const codexManifest = json("plugins/harness/.codex-plugin/plugin.json");
  const claudeMarketplace = json(".claude-plugin/marketplace.json");
  const codexMarketplace = json(".agents/plugins/marketplace.json");

  // These are packaging and entrypoint checks. Routing decisions, proportional
  // planning, reading scope and interview stopping require scenario evaluation;
  // matching an instruction's wording cannot establish those behaviors.
  check("documented entrypoints resolve to the canonical workflow", () => {
    for (const [path, source] of [
      ["README.md", readme], ["AGENTS.md", agents], ["CLAUDE.md", claude],
    ]) {
      assert.ok(source.includes("using-harness"), `${path}: missing workflow entrypoint`);
    }
    assert.ok(command.includes("../skills/using-harness/SKILL.md"), "command must route work to the canonical entry");
    assert.ok(!command.includes("init-guidance.sh"), "command must not bypass harness.mjs preflight");
    assert.ok(skill.includes("scripts/harness.mjs"), "entry must reach the init/check/upgrade CLI");
    assert.ok(!harnessCommand.includes("upgrade is not implemented"), "CLI still advertises migration as unimplemented");
  });

  check("plugin and marketplace identities and versions stay synchronized", () => {
    assert.match(claudeManifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    assert.equal(claudeManifest.name, "harness");
    assert.equal(claudeManifest.name, codexManifest.name);
    assert.equal(claudeManifest.version, codexManifest.version);
    assert.equal(claudeMarketplace.metadata.version, claudeManifest.version);
    const claudeEntry = claudeMarketplace.plugins.find((entry) => entry.name === claudeManifest.name);
    const codexEntry = codexMarketplace.plugins.find((entry) => entry.name === codexManifest.name);
    assert.ok(claudeEntry, "Claude marketplace is missing harness");
    assert.ok(codexEntry, "Codex marketplace is missing harness");
    assert.equal(claudeEntry.version, claudeManifest.version);
    assert.equal(resolve(repoRoot, claudeEntry.source), resolve(repoRoot, "plugins/harness"));
    assert.equal(codexEntry.source.source, "local");
    assert.equal(resolve(repoRoot, codexEntry.source.path), resolve(repoRoot, "plugins/harness"));
    assert.equal(codexMarketplace.name, "agentic-harness-local");
    assert.equal(claudeMarketplace.name, "agentic-harness");
  });

  check("manifests retain install-facing discovery metadata", () => {
    for (const [path, manifest] of [
      ["Claude manifest", claudeManifest], ["Codex manifest", codexManifest],
    ]) {
      for (const field of ["description", "homepage", "repository", "license"]) {
        assert.equal(typeof manifest[field], "string", `${path}: missing ${field}`);
        assert.ok(manifest[field].trim(), `${path}: empty ${field}`);
      }
    }
    assert.equal(codexManifest.interface.displayName, "Agentic Harness");
    for (const field of ["shortDescription", "longDescription"]) {
      assert.ok(codexManifest.interface[field]?.trim(), `Codex interface: missing ${field}`);
    }
    assert.ok(Array.isArray(codexManifest.interface.defaultPrompt));
    assert.equal(codexManifest.interface.defaultPrompt.length, 2, "retain new-project and existing-repository entry directions");
    for (const prompt of codexManifest.interface.defaultPrompt) assert.ok(typeof prompt === "string" && prompt.trim());
    assert.equal(resolve(repoRoot, "plugins/harness", codexManifest.skills), resolve(repoRoot, "plugins/harness/skills"));
    assert.ok(!Object.hasOwn(codexManifest, "agents"), "Codex package must not distribute Claude agents");
    assert.ok(!Object.hasOwn(codexManifest, "commands"), "Codex package must not distribute Claude commands");
  });

  check("root guidance points to the checkout validator", () => {
    assert.ok(agents.includes("node scripts/check-positioning.mjs"), "AGENTS.md: missing checkout validation command");
    assert.ok(claude.includes("node scripts/check-positioning.mjs"), "CLAUDE.md: missing checkout validation command");
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
    ["plugins/harness/scripts/harness.mjs", harnessCommand],
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
