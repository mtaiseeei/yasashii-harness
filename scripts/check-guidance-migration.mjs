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
    for (const name of ["AGENTS.md", "CLAUDE.md"]) {
      assert.equal(fs.readFileSync(path.join(root, name), "utf8"), fs.readFileSync(path.join(repo, "plugins/harness/templates", name), "utf8"));
    }
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
  check("PROJECT and legacy current sources keep unresolved work without a second current state", () => {
    for (const source of ["PROJECT.md", "docs/sprints/current.md", "planning/current.md"]) {
      const root = fixture(`current-${source.replaceAll("/", "-")}`);
      const original = "# Current work\n- Unresolved: choose retention\n- Authorization: local only\n";
      write(root, source, original);
      write(root, "AGENTS.md", `Current source: [current](${source}).\n`);
      const result = command(root, ["init"]);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(path.join(root, source), "utf8"), original);
      assert.equal(fs.existsSync(path.join(root, "docs/sprints/state.md")), false);
      assert.ok(result.stdout.includes(`canonical state: ${source}`));
      const before = snapshot(root);
      assert.equal(command(root, ["check"]).status, 0);
      assert.deepEqual(snapshot(root), before);
    }
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
  check("both host guidance migrations preserve approvals, dirty bytes and old global until a separate fallback plan", () => {
    const root = fixture("host-guidance");
    spawnSync("git", ["init", "-q", root]);
    const owner = "Owner rule: never upload customer data.\nAuthorization: local implementation and tests only.\n";
    const obsolete = ["Fix every product finding.", "Deferred findings still fail the review.", "Append every progress report to state."];
    const global = "<!-- review-convergence:v1 -->\nSynthetic existing global rule: F*I >= 20 or F >= 1 and I >= 8.\nPreserve mandatory exceptions and do not repeat unchanged deferred findings.\n<!-- /review-convergence:v1 -->\n";
    const old = owner + "\n## Harness\n" + obsolete.join("\n") + "\n\n" + global;
    for (const name of ["AGENTS.md", "CLAUDE.md"]) write(root, name, old);
    write(root, "owner.txt", "unrelated dirty owner content\n");
    const original = snapshot(root);
    const initialized = command(root, ["init"]);
    assert.equal(initialized.status, 0, initialized.stderr);
    for (const name of ["AGENTS.md", "CLAUDE.md", "owner.txt"]) assert.equal(snapshot(root)[name], original[name]);
    const supplement = fs.readFileSync(path.join(root, "docs/harness-guidance.md"), "utf8");
    assert.equal(supplement, fs.readFileSync(path.join(repo, "plugins/harness/templates/docs/harness-guidance.md"), "utf8"));
    const pointer = supplement.match(/```markdown\n([\s\S]*?)```/)[1];
    const names = ["AGENTS.md", "CLAUDE.md"];
    const next = owner + "\n" + pointer + "\n" + global;
    const file = plan(root, names.map((name) => ({ path: name, content: next, preserve: [owner, global], retire: obsolete })));
    const before = snapshot(root);
    assert.equal(command(root, ["upgrade"]).status, 0);
    let result = command(root, ["upgrade", "--plan", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(snapshot(root), before);
    result = command(root, ["upgrade", "--plan", file, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    const archives = fs.readdirSync(path.join(root, ".harness/migrations"));
    for (const name of names) {
      assert.equal(fs.readFileSync(path.join(root, name), "utf8"), next);
      assert.equal(fs.readFileSync(path.join(root, ".harness/migrations", archives[0], "originals", name), "utf8"), old);
    }
    for (const name of ["owner.txt", ".harness/config.toml", "docs/harness-guidance.md"]) assert.equal(snapshot(root)[name], before[name]);
    // Synthetic, separately reviewed second plan. A real global edit still requires actual
    // rule reading/reconciliation and its own authorization; this CLI test cannot prove either.
    const migration = fs.readFileSync(path.join(repo, "plugins/harness/skills/harness-loop/references/migration.md"), "utf8");
    const fallback = migration.match(/```markdown\n(<!-- review-convergence:v1 -->[\s\S]*?)```/)[1];
    assert.ok(fallback.trimEnd().split("\n").length <= 10);
    const compact = next.replace(global, fallback);
    const separate = plan(root, names.map((name) => ({ path: name, content: compact, preserve: [owner, pointer], retire: [global.trimEnd()] })));
    const beforeFallback = snapshot(root);
    result = command(root, ["upgrade", "--plan", separate]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(snapshot(root), beforeFallback);
    result = command(root, ["upgrade", "--plan", separate, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    for (const name of names) assert.equal(fs.readFileSync(path.join(root, name), "utf8"), compact);
    assert.equal(snapshot(root)["owner.txt"], before["owner.txt"]);
    assert.equal(command(root, ["check"]).status, 0);
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
  check("10k-line state keeps late active values and exact archive through preview/apply", () => {
    const root = fixture("custom-state");
    const active = [
      "- Authorization: local implementation and tests only.",
      "- Constraints: do not deploy or upload customer data.",
      "- Unresolved: production validation is pending separate authorization.",
      "- Retry Count: 1", "- Spec-Issue Count: 1", "- Lineage Dispatches: 4",
      "- Model Tier: standard", "- Rotate: none",
      "- Return: finish repair B, then resume A regression checks.",
    ];
    const lines = Array(10000).fill("Old synthetic event.");
    lines[0] = "# Old state";
    lines[4544] = "- Current ID: sprint-001";
    lines[4779] = "- Current ID: sprint-002";
    lines.splice(9500, active.length, ...active);
    const old = lines.join("\n") + "\n";
    write(root, "planning/current.md", old);
    write(root, "planning/spec.md", "# A\nFinish local regression before requesting production approval.\n");
    write(root, "planning/evidence.md", "# Synthetic evidence\nLocal repair check passed on fixture-v1; production unverified.\n");
    // A reviewed candidate is authored by the Agent; the CLI must not infer it from old IDs.
    const content = ["# State", "", "## 現在地", "",
      "- Purpose: complete feature A; completion requires local regression and authorized production validation.",
      "- Current ID: sprint-003", "- Status: active", ...active,
      "- Work: repair B. Exit: local repair check passes. Next action: run A local regression.",
      "- Implemented: B; Verified: B local check; Deployed: none.",
      "- Specification: [A](spec.md); target fixture-v1, [evidence](evidence.md).", "",
      "## 旧状態（履歴・現行値は先頭の現在地へ移管済み）",
      "[Previous detail](../.harness/migrations/state-maintenance-01/originals/planning/current.md)", ""].join("\n");
    const file = plan(root, [{ path: "planning/current.md", content, preserve: active }]);
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    manifest.id = "state-maintenance-01";
    fs.writeFileSync(file, JSON.stringify(manifest));
    const before = snapshot(root);
    let result = command(root, ["upgrade", "--plan", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(snapshot(root), before);
    result = command(root, ["upgrade", "--plan", file, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(root, ".harness/migrations/state-maintenance-01/originals/planning/current.md"), "utf8"), old);
    const actual = fs.readFileSync(path.join(root, "planning/current.md"), "utf8");
    assert.equal(actual, content);
    for (const value of active) assert.ok(actual.includes(value));
    assert.equal((actual.match(/Current ID:/gu) ?? []).length, 1);
    assert.ok(!actual.includes("sprint-001") && !actual.includes("sprint-002"));
    console.log(`  synthetic state: ${lines.length} lines / ${Buffer.byteLength(old)} bytes -> ${actual.split("\n").length - 1} lines / ${Buffer.byteLength(actual)} bytes`);
  });
  check("protection refusal preserves the body; fallback and repeated handoffs replace one current section", () => {
    const root = fixture("state-fallback");
    const old = "# Old state\n- Current ID: sprint-001\n## Pending\n- [ ] Legacy release approval is unresolved.\n## History\n- Current ID: sprint-002\n";
    write(root, "docs/state.md", old);
    const current = "# State\n\n## 現在地\n\n- Purpose: finish A local checks.\n- Current ID: sprint-003\n- Retry Count: 1\n- Spec-Issue Count: 1\n- Lineage Dispatches: 4\n- Authorization: local repair and tests only; no release approval.\n- Unresolved: release is held.\n- 整理未完了: protected pending item; separate maintenance must reconcile it.\n";
    const phases = [
      "- Work: B repair implemented; next: B tests; return: A local checks after B passes.\n",
      "- Work: B tests passed; next: independent B review; return: A local checks after review.\n",
      "- Work: B review passed; next: resume A local checks; production remains unverified.\n",
    ];
    const rejected = plan(root, [{ path: "docs/state.md", content: current + phases[0] }]);
    const before = snapshot(root);
    const refusal = command(root, ["upgrade", "--plan", rejected, "--apply"]);
    assert.equal(refusal.status, 2);
    assert.match(refusal.stderr, /protected text missing/);
    assert.deepEqual(snapshot(root), before);
    const history = "\n## 旧状態（履歴・現行値は先頭の現在地へ移管済み）\n\n" + old;
    const fallback = plan(root, [{ path: "docs/state.md", content: current + phases[0] + history }]);
    assert.equal(command(root, ["upgrade", "--plan", fallback]).status, 0);
    assert.deepEqual(snapshot(root), before);
    const result = command(root, ["upgrade", "--plan", fallback, "--apply"]);
    assert.equal(result.status, 0, result.stderr);
    const archives = fs.readdirSync(path.join(root, ".harness/migrations"));
    assert.equal(archives.length, 1);
    assert.equal(fs.readFileSync(path.join(root, ".harness/migrations", archives[0], "originals/docs/state.md"), "utf8"), old);
    // Subsequent ordinary handoffs replace current values, not another migration/daily log.
    for (const phase of phases) {
      const previous = fs.readFileSync(path.join(root, "docs/state.md"), "utf8");
      const retained = previous.slice(previous.indexOf("\n## 旧状態"));
      write(root, "docs/state.md", current + phase + retained);
      const actual = fs.readFileSync(path.join(root, "docs/state.md"), "utf8");
      assert.equal(actual, current + phase + history);
      assert.equal((actual.match(/^## 現在地$/gmu) ?? []).length, 1);
      const live = actual.slice(0, actual.indexOf("\n## 旧状態"));
      assert.equal((live.match(/Current ID:/gu) ?? []).length, 1);
      assert.ok(live.includes("sprint-003") && live.includes("整理未完了"));
      assert.equal(actual.slice(actual.indexOf("# Old state")), old);
    }
    assert.deepEqual(fs.readdirSync(path.join(root, ".harness/migrations")), archives);
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
