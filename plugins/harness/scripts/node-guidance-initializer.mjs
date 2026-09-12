import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPluginRoot = path.resolve(scriptDir, "..");

export const ignoreRules = ["config.local.toml", "config.local.json"];

export const seedFiles = new Map([
  ["docs/spec.md", `# Spec Index

<!-- Reuse existing specifications. Link only the relevant domain documents; create detail when needed. -->
`],
  ["docs/sprints/state.md", `# Current State

<!-- Update current state; retain prior detail in history. Do not duplicate this source in NEXT_SESSION or PROJECT. -->

- Purpose: TBD
- Current work: none
- Unresolved: none recorded
- Next action: identify the requested change and relevant specification
- Authorization / constraints: inherit the user's request and project rules
- Specification: resolve existing canonical specifications before adding documents
- Implemented: none recorded
- Verified: none recorded (record target revision and evidence)
- Deployed: none recorded
`],
]);

export function guidanceSources(root, options = {}) {
  const result = {};
  // Bounded discovery: conventional names and links in root guidance, never all
  // Sprint history. Explicit paths support a project's other existing layouts.
  const links = [];
  for (const name of ["AGENTS.md", "CLAUDE.md"]) {
    const stat = lstat(path.join(root, name));
    if (stat?.isFile() && !stat.isSymbolicLink()) {
      const content = fs.readFileSync(path.join(root, name), "utf8");
      for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)#]+)(?:#[^)]*)?\)/gu)) links.push(match[1]);
    }
  }
  for (const [kind, names, defaultPath] of [
    ["spec", ["docs/spec.md", "SPEC.md", "spec.md", "docs/SPEC.md", "docs/requirements.md", "docs/PRD.md", "PROJECT.md"], "docs/spec.md"],
    ["state", ["docs/sprints/state.md", "docs/sprints/current.md", "state.md", "STATE.md", "current.md", "CURRENT.md", "docs/state.md", "NEXT_SESSION.md", "PROJECT.md"], "docs/sprints/state.md"],
  ]) {
    const explicit = options[`${kind}Path`];
    const candidates = explicit ? [explicit] : [...new Set([...names, ...links.filter((value) => kind === "state" ? /(?:state|current|next.session|project)\.md$/iu.test(value) : /(?:spec|requirements|prd|project)[^/]*\.md$/iu.test(value))])];
    const existing = [];
    for (const relative of candidates) {
      if (typeof relative !== "string" || path.isAbsolute(relative) || relative.includes("\\") || relative.split("/").some((part) => !part || part === "." || part === "..") || !relative.endsWith(".md")) {
        if (explicit) throw new Error(`unsafe ${kind} path: ${relative}`);
        continue;
      }
      const stat = lstat(path.join(root, relative));
      if (stat) existing.push(relative); // preflight checks every component/type
    }
    if (explicit && existing.length !== 1) throw new Error(`--${kind}-path must name an existing Markdown file`);
    result[kind] = existing.length ? existing : [defaultPath];
  }
  return result;
}

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
  return "node"; // A single portable writer keeps initialization behavior aligned.
}

export function runNodeGuidanceInitializer(targetRoot, { pluginRoot = defaultPluginRoot, specPath, statePath } = {}) {
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
  // calling this shared writer; init-guidance.sh delegates to that same CLI.
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

  const sources = guidanceSources(targetRoot, { specPath, statePath });
  for (const [kind, relatives] of Object.entries(sources)) {
    out(`canonical ${kind}: ${relatives.join(", ")}${relatives.length > 1 ? " (resolve existing candidates; no competing source created)" : ""}`);
    for (const relative of relatives) {
      ensureDir(path.dirname(path.join(targetRoot, relative)));
      if (!lstat(path.join(targetRoot, relative))) seedFile(path.join(targetRoot, relative), seedFiles.get(relative));
    }
  }
  ensureDir(path.join(targetRoot, "docs"));

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
