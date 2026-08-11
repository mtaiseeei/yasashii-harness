import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPluginRoot = path.resolve(scriptDir, "..");

export const ignoreRules = ["config.local.toml", "config.local.json"];

const seedFiles = new Map([
  ["docs/spec.md", `# Spec Index

<!-- Planner が短い正本インデックスとして書く。詳細本文は docs/spec/*.md へ -->
`],
  ["docs/spec/product.md", `# Product

<!-- Planner が書く: 目的、対象ユーザー、ゴール/非ゴール、成功状態 -->
`],
  ["docs/spec/features.md", `# Features

<!-- Planner が書く: 機能IDとユーザーから見た振る舞い -->
`],
  ["docs/spec/constraints.md", `# Constraints

<!-- Planner が書く: 横断制約、禁止事項、安全方針、絶対に回帰させない条件 -->
`],
  ["docs/spec/domain.md", `# Domain

<!-- Planner が書く: 業務ルール、概念データ、KPI/計算方針 -->
`],
  ["docs/spec/ui.md", `# UI / UX

<!-- Planner が書く: 体験方針と非機能要件 -->
`],
  ["docs/spec/rubric.md", `# Evaluation Rubric

<!-- Planner が書く: プロジェクト種別、基準ごとの閾値、スコアのアンカー例 -->
`],
  ["docs/sprints/state.md", `# Sprint State

<!-- オーケストレーターだけが書く進行状態の正本 -->

- Current ID: TBD
- Retry Count: 0
- Spec-Issue Count: 0
- Lineage Dispatches: 0
- Model Tier: standard
- Rotate: none
- Next Planned: TBD

## スプリント一覧
| ID | Status | Contract | Progress | Feedback |
|----|--------|----------|----------|----------|

## Deferred / Superseded
`],
]);

function lstat(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function sameFile(left, right) {
  try {
    return fs.readFileSync(left).equals(fs.readFileSync(right));
  } catch {
    return false;
  }
}

export function initializerKindForPlatform(platform = process.platform) {
  return platform === "win32" ? "node" : "bash";
}

export function runNodeGuidanceInitializer(targetRoot, { pluginRoot = defaultPluginRoot } = {}) {
  let stdout = "";
  let stderr = "";
  let changedAny = false;
  let refused = false;
  const harnessDir = path.join(targetRoot, ".harness");
  const ignoreFile = path.join(harnessDir, ".gitignore");
  const templatesRoot = path.join(pluginRoot, "templates");

  const out = (line) => {
    stdout += `${line}\n`;
  };
  const warn = (line) => {
    stderr += `${line}\n`;
  };
  const fail = (reason) => {
    warn(`Agentic Harness initialization refused: ${reason}`);
    refused = true;
  };

  const ensureDir = (directory) => {
    if (!lstat(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      out(`created ${directory}`);
      changedAny = true;
    }
  };

  const seedFile = (file, content) => {
    if (!lstat(file)) {
      fs.writeFileSync(file, content, { flag: "wx" });
      out(`created ${file}`);
      changedAny = true;
    }
  };

  const copyIfMissing = (source, destination) => {
    if (!lstat(destination)) {
      fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
      out(`created ${destination}`);
      changedAny = true;
    } else {
      out(`kept existing ${destination}`);
    }
  };

  // harness.mjs performs the complete all-destination safety preflight before
  // calling this writer. Keep the write sequence aligned with init-guidance.sh.
  ensureDir(harnessDir);

  if (!lstat(ignoreFile)) {
    copyIfMissing(path.join(templatesRoot, ".harness/.gitignore"), ignoreFile);
  } else {
    const content = fs.readFileSync(ignoreFile, "utf8");
    const present = new Set(content.split(/\r?\n/u));
    let projected = content;
    let addition = "";
    let added = false;
    for (const rule of ignoreRules) {
      if (present.has(rule)) continue;
      if (projected.length > 0 && !projected.endsWith("\n")) {
        projected += "\n";
        addition += "\n";
      }
      projected += `${rule}\n`;
      addition += `${rule}\n`;
      present.add(rule);
      out(`updated ${ignoreFile} (added ${rule})`);
      changedAny = true;
      added = true;
    }
    if (added) fs.appendFileSync(ignoreFile, addition);
    else out(`kept existing ${ignoreFile}`);
  }

  const gitWorktree = spawnSync("git", ["-C", targetRoot, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (gitWorktree.status === 0) {
    for (const rule of ignoreRules) {
      const verified = spawnSync(
        "git",
        ["-C", targetRoot, "check-ignore", "-q", "--no-index", "--", `.harness/${rule}`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      if (verified.status !== 0) {
        fail(`git did not confirm .harness/${rule} as ignored`);
        return { status: 1, stdout, stderr };
      }
      out(`verified git ignore for ${path.join(targetRoot, ".harness", rule)}`);
    }
  } else {
    warn("warning: ignore rule installed but git verification skipped (target is not a git worktree)");
  }

  for (const relative of ["docs/spec", "docs/sprints", "docs/progress", "docs/feedback"]) {
    ensureDir(path.join(targetRoot, relative));
  }
  for (const [relative, content] of seedFiles) {
    seedFile(path.join(targetRoot, relative), content);
  }

  const hadCustomGuidanceTarget = ["CLAUDE.md", "AGENTS.md"].some((relative) => {
    const target = path.join(targetRoot, relative);
    return Boolean(lstat(target)) && !sameFile(path.join(templatesRoot, relative), target);
  });

  copyIfMissing(path.join(templatesRoot, "CLAUDE.md"), path.join(targetRoot, "CLAUDE.md"));
  copyIfMissing(path.join(templatesRoot, "AGENTS.md"), path.join(targetRoot, "AGENTS.md"));

  const configToml = path.join(harnessDir, "config.toml");
  if (lstat(configToml)) {
    out(`kept existing ${configToml}`);
  } else if (lstat(path.join(harnessDir, "config.json"))
    || lstat(path.join(harnessDir, "config.local.json"))) {
    warn("warning: kept legacy Harness JSON config; migrate manually to .harness/config.toml and .harness/config.local.toml (no competing TOML was created)");
  } else {
    copyIfMissing(path.join(templatesRoot, ".harness/config.toml"), configToml);
  }

  if (hadCustomGuidanceTarget) {
    copyIfMissing(
      path.join(templatesRoot, "docs/harness-guidance.md"),
      path.join(targetRoot, "docs/harness-guidance.md"),
    );
  }

  if (refused) return { status: 1, stdout, stderr };
  out(changedAny
    ? "Agentic Harness guidance initialized."
    : "Agentic Harness guidance already present; no files overwritten.");
  return { status: 0, stdout, stderr };
}
