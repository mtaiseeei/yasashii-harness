#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repo, "plugins/harness/scripts/harness.mjs");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "harness-migration-"));
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const write = (root, relative, content) => { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); return file; };
const snapshot = (root) => Object.fromEntries(fs.readdirSync(root, { recursive: true }).filter((relative) => fs.lstatSync(path.join(root, relative)).isFile()).map((relative) => [relative, digest(fs.readFileSync(path.join(root, relative)))]));
let pass = 0;
function check(name, run) { run(); console.log(`PASS ${name}`); pass += 1; }
function command(root, args) { return spawnSync(process.execPath, [cli, ...args, "--root", root], { encoding: "utf8" }); }
function fixture(name) { const root = path.join(workspace, name); fs.mkdirSync(root); return root; }
function plan(root, entries) {
  const file = path.join(workspace, `plan-${crypto.randomUUID()}.json`);
  fs.writeFileSync(file, JSON.stringify({ version: 1, files: entries.map((entry) => ({ beforeSha256: digest(fs.readFileSync(path.join(root, entry.path))), preserve: [], retire: [], ...entry })) }));
  return file;
}
try {
  check("fresh init stays minimal and repeated init preserves all existing bytes", () => {
    const root = fixture("fresh");
    let result = command(root, ["init"]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(root, "docs/spec.md")));
    assert.ok(fs.existsSync(path.join(root, "docs/sprints/state.md")));
    for (const name of ["product", "features", "constraints", "domain", "ui", "rubric"]) assert.equal(fs.existsSync(path.join(root, `docs/spec/${name}.md`)), false);
    assert.equal(fs.existsSync(path.join(root, "CONTEXT.md")), false);
    const before = snapshot(root);
    result = command(root, ["init"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(snapshot(root), before);
  });
  check("existing canonical sources are reused without duplicate state/spec or history reads", () => {
    const root = fixture("existing");
    write(root, "AGENTS.md", "Use [spec](docs/requirements.md) and [current](docs/state.md).\nOwner rule: never upload data.\n");
    write(root, "docs/requirements.md", "# Existing requirements\nOwner requirement.\n");
    write(root, "docs/state.md", "# Current\n- Unresolved: retain this choice\n");
    // An unreadable, large legacy history is irrelevant to canonical discovery.
    write(root, "docs/history/old.md", "historical detail\n".repeat(10000));
    fs.chmodSync(path.join(root, "docs/history/old.md"), 0);
    const result = command(root, ["init"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(path.join(root, "docs/spec.md")), false);
    assert.equal(fs.existsSync(path.join(root, "docs/sprints/state.md")), false);
    assert.match(result.stdout, /canonical state: docs\/state.md/);
    assert.equal(command(root, ["check"]).status, 0);
    fs.chmodSync(path.join(root, "docs/history/old.md"), 0o600);
  });
  check("explicit sources support other layouts and reject source symlinks without writing", () => {
    const root = fixture("explicit");
    write(root, "planning/intent.md", "# Intent\n");
    write(root, "planning/current.md", "# Current\n");
    const args = ["--spec-path", "planning/intent.md", "--state-path", "planning/current.md"];
    assert.equal(command(root, ["init", ...args]).status, 0);
    assert.equal(fs.existsSync(path.join(root, "docs/spec.md")), false);
    assert.equal(fs.existsSync(path.join(root, "docs/sprints/state.md")), false);
    fs.symlinkSync(path.join(root, "planning/current.md"), path.join(root, "planning/link.md"));
    const before = snapshot(root);
    const result = command(root, ["init", "--state-path", "planning/link.md"]);
    assert.equal(result.status, 2);
    assert.deepEqual(snapshot(root), before);
  });
  check("preview is read-only; apply preserves custom/dirty bytes, history and runtime; repeat is idempotent", () => {
    const root = fixture("migration");
    spawnSync("git", ["init", "-q", root]);
    const old = "# Instructions\r\nEvery Sprint read all history.\r\nOwner rule: no uploads.\r\n";
    write(root, "AGENTS.md", old);
    write(root, "docs/spec.md", "# Spec\n");
    write(root, ".harness/config.toml", 'lifecycle = "balanced"\n');
    write(root, "docs/history/old.md", "# Old history\n");
    write(root, "owner.txt", "dirty owner text\n");
    const next = "# Instructions\nRead current state and relevant [spec](docs/spec.md).\nOwner rule: no uploads.\n";
    const file = plan(root, [{ path: "AGENTS.md", content: next, preserve: ["Owner rule: no uploads."], retire: ["Every Sprint read all history."] }]);
    const before = snapshot(root);
    let result = command(root, ["upgrade"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /inspect legacy candidate/);
    result = command(root, ["upgrade", "--plan", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--- a\/AGENTS.md/);
    assert.deepEqual(snapshot(root), before);
    result = command(root, ["upgrade", "--plan", file, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), next);
    const backups = fs.readdirSync(path.join(root, ".harness/migrations"));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(root, ".harness/migrations", backups[0], "originals/AGENTS.md"), "utf8"), old);
    for (const name of [".harness/config.toml", "owner.txt", "docs/history/old.md"]) assert.equal(snapshot(root)[name], before[name]);
    const after = snapshot(root);
    result = command(root, ["upgrade", "--plan", file, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Already applied/);
    assert.deepEqual(snapshot(root), after);
  });
  check("stale plans, broken links, unresolved loss and old-rule retention fail before mutation", () => {
    const root = fixture("rejections");
    const original = "# State\nLegacy rule.\n## Unresolved\n- [ ] Owner must decide export destination.\n## Work\nKeep custom rule.\n";
    write(root, "docs/state.md", original);
    const cases = [
      { content: original.replace("Keep custom rule.", "Changed."), beforeSha256: "0".repeat(64), pattern: /stale source/ },
      { content: original + "[missing](missing.md)\n", pattern: /missing path/ },
      { content: original.replace("- [ ] Owner must decide export destination.\n", ""), pattern: /protected text missing/ },
      { content: original + "New guidance.\n", retire: ["Legacy rule."], pattern: /still present/ },
      { content: original.replace("Keep custom rule.", "Changed."), preserve: ["Keep custom rule."], pattern: /protected text missing/ },
    ];
    for (const { pattern, ...entry } of cases) {
      const file = plan(root, [{ path: "docs/state.md", ...entry }]);
      const before = snapshot(root);
      const result = command(root, ["upgrade", "--plan", file, "--apply"]);
      assert.equal(result.status, 2, result.stdout);
      assert.match(result.stderr, pattern);
      assert.deepEqual(snapshot(root), before);
    }
  });
  check("custom canonical state can shrink while linking a stable original archive", () => {
    const root = fixture("custom-state");
    const old = "# Current state\n## Unresolved\n- [ ] Owner decision remains.\n## History\n" + "Old event.\n".repeat(2000);
    write(root, "planning/current.md", old);
    const content = "# Current state\n## Unresolved\n- [ ] Owner decision remains.\n## History\n[Previous detail](../.harness/migrations/state-maintenance-01/originals/planning/current.md)\n";
    const file = plan(root, [{ path: "planning/current.md", content }]);
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    manifest.id = "state-maintenance-01";
    fs.writeFileSync(file, JSON.stringify(manifest));
    let result = command(root, ["upgrade", "--plan", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(path.join(root, ".harness")), false);
    result = command(root, ["upgrade", "--plan", file, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(root, ".harness/migrations/state-maintenance-01/originals/planning/current.md"), "utf8"), old);
    assert.equal(fs.readFileSync(path.join(root, "planning/current.md"), "utf8"), content);
  });
  check("configuration, Agent definitions, traversal and backup symlinks are refused", () => {
    const root = fixture("unsafe");
    write(root, ".harness/config.toml", "custom\n");
    write(root, ".claude/agents/planner.md", "custom\n");
    write(root, "AGENTS.md", "custom\n");
    for (const relative of [".harness/config.toml", ".claude/agents/planner.md", "../unsafe/AGENTS.md"]) {
      const file = plan(root, [{ path: relative, content: "replacement\n" }]);
      const before = snapshot(root);
      const result = command(root, ["upgrade", "--plan", file, "--apply"]);
      assert.equal(result.status, 2, result.stdout);
      assert.deepEqual(snapshot(root), before);
    }
    const outside = fixture("outside");
    fs.symlinkSync(outside, path.join(root, ".harness/migrations"));
    const file = plan(root, [{ path: "AGENTS.md", content: "replacement\n" }]);
    const result = command(root, ["upgrade", "--plan", file, "--apply"]);
    assert.equal(result.status, 2);
    assert.deepEqual(fs.readdirSync(outside), []);
    assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), "custom\n");
  });
  console.log(`GUIDANCE_MIGRATION_PASS=${pass} FAIL=0`);
} finally { fs.rmSync(workspace, { recursive: true, force: true }); }
