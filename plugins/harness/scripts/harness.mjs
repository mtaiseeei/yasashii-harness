#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDir, "..");
const initializer = path.join(scriptDir, "init-guidance.sh");
const templatesRoot = path.join(pluginRoot, "templates");
const ignoreRules = ["config.local.toml", "config.local.json"];

const directoryTargets = [
  ".harness",
  "docs",
  "docs/spec",
  "docs/sprints",
  "docs/progress",
  "docs/feedback",
];

const alwaysFileTargets = [
  ".harness/.gitignore",
  "docs/spec.md",
  "docs/spec/product.md",
  "docs/spec/features.md",
  "docs/spec/constraints.md",
  "docs/spec/domain.md",
  "docs/spec/ui.md",
  "docs/spec/rubric.md",
  "docs/sprints/state.md",
];

const possibleFileTargets = [
  ".harness/config.toml",
  "docs/harness-guidance.md",
];

function usage() {
  return `Usage: node harness.mjs <init|check> [--root PATH]

Commands:
  init   Safely create missing Harness guidance without overwriting existing files.
  check  Read-only report of Harness initialization readiness.

Harness upgrade is not implemented. init and check never determine whether installed
files are the latest version.`;
}

function parseArgs(argv) {
  if (argv.length === 0) throw new Error("a command is required");
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  const command = argv[0];
  let root = process.cwd();
  let rootSeen = false;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      if (rootSeen) throw new Error("--root may be specified only once");
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a path");
      root = path.resolve(value);
      rootSeen = true;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return { command, root: path.resolve(root), help: false };
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

function hasLegacyConfig(root) {
  return [".harness/config.json", ".harness/config.local.json"].some((relative) => {
    const stat = lstat(path.join(root, relative));
    return stat?.isFile() && !stat.isSymbolicLink();
  });
}

function inspectLegacyConfigTypes(root, unsafe) {
  for (const relative of [".harness/config.json", ".harness/config.local.json"]) {
    const stat = lstat(path.join(root, relative));
    if (stat && (stat.isSymbolicLink() || !stat.isFile())) {
      unsafe.push(`[unsafe] ${relative}: legacy config must be a real regular file`);
    }
  }
}

function customGuidanceExists(root) {
  return ["AGENTS.md", "CLAUDE.md"].some((relative) => {
    const target = path.join(root, relative);
    const stat = lstat(target);
    if (!stat?.isFile() || stat.isSymbolicLink()) return false;
    return !sameFile(target, path.join(templatesRoot, relative));
  });
}

function nearestExistingAncestor(target) {
  let current = path.dirname(target);
  while (true) {
    const stat = lstat(current);
    if (stat) return { path: current, stat };
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function canAccess(target, mode) {
  try {
    fs.accessSync(target, mode);
    return true;
  } catch {
    return false;
  }
}

function modeAllows(stat, mask) {
  return (stat.mode & mask) !== 0;
}

function inspect(root, { includePermissions = false } = {}) {
  const entries = [];
  const unsafe = [];
  const gaps = [];
  const writeNeeds = [];
  const rootStat = lstat(root);

  if (!rootStat) {
    unsafe.push(`[unsafe] ${root}: target root does not exist`);
    return { entries, unsafe, gaps };
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    unsafe.push(`[unsafe] ${root}: target root must be a real directory, not a symlink or other file type`);
    return { entries, unsafe, gaps };
  }
  const inspectDirectory = (relative) => {
    const target = path.join(root, relative);
    const stat = lstat(target);
    if (!stat) {
      entries.push(`[missing] ${relative}/`);
      gaps.push(relative);
      writeNeeds.push(target);
    } else if (stat.isSymbolicLink() || !stat.isDirectory()) {
      unsafe.push(`[unsafe] ${relative}: expected a real directory`);
    } else {
      entries.push(`[present] ${relative}/`);
    }
  };

  const inspectFile = (relative, { required = true } = {}) => {
    const target = path.join(root, relative);
    const stat = lstat(target);
    if (!stat) {
      if (required) {
        entries.push(`[missing] ${relative}`);
        gaps.push(relative);
        writeNeeds.push(target);
      }
    } else if (stat.isSymbolicLink() || !stat.isFile()) {
      unsafe.push(`[unsafe] ${relative}: expected a real regular file`);
    } else {
      entries.push(`[present] ${relative}`);
    }
  };

  const inspectRootGuidance = (relative) => {
    const target = path.join(root, relative);
    const stat = lstat(target);
    if (!stat) {
      entries.push(`[missing] ${relative}`);
      gaps.push(relative);
      writeNeeds.push(target);
    } else if (stat.isSymbolicLink() || !stat.isFile()) {
      unsafe.push(`[unsafe] ${relative}: expected a real regular file`);
    } else if (sameFile(target, path.join(templatesRoot, relative))) {
      entries.push(`[present] ${relative}`);
    } else {
      entries.push(`[preserved] ${relative} (custom guidance is not compared or replaced)`);
    }
  };

  for (const relative of directoryTargets) inspectDirectory(relative);
  for (const relative of alwaysFileTargets) inspectFile(relative);
  for (const relative of ["AGENTS.md", "CLAUDE.md"]) inspectRootGuidance(relative);
  inspectLegacyConfigTypes(root, unsafe);

  const configPath = path.join(root, ".harness/config.toml");
  const configStat = lstat(configPath);
  if (!configStat) {
    if (hasLegacyConfig(root)) {
      entries.push("[preserved] legacy Harness JSON config");
      entries.push("[warning] legacy JSON config is supported; init will not create competing TOML");
    } else {
      entries.push("[missing] .harness/config.toml");
      gaps.push(".harness/config.toml");
      writeNeeds.push(configPath);
    }
  } else if (configStat.isSymbolicLink() || !configStat.isFile()) {
    unsafe.push("[unsafe] .harness/config.toml: expected a real regular file");
  } else {
    entries.push("[preserved] .harness/config.toml (existing config is not compared or replaced)");
  }

  const guidanceRequired = customGuidanceExists(root);
  inspectFile("docs/harness-guidance.md", { required: guidanceRequired });
  if (!guidanceRequired && !lstat(path.join(root, "docs/harness-guidance.md"))) {
    entries.push("[preserved] docs/harness-guidance.md is not needed without custom root guidance");
  }

  const ignorePath = path.join(root, ".harness/.gitignore");
  const ignoreStat = lstat(ignorePath);
  if (ignoreStat?.isFile() && !ignoreStat.isSymbolicLink()) {
    if (!modeAllows(ignoreStat, 0o444) || !canAccess(ignorePath, fs.constants.R_OK)) {
      unsafe.push("[unsafe] .harness/.gitignore: file is not readable");
    } else {
      const rules = new Set(fs.readFileSync(ignorePath, "utf8").split(/\r?\n/u));
      for (const rule of ignoreRules) {
        if (!rules.has(rule)) {
          entries.push(`[would-update] .harness/.gitignore: add ${rule}`);
          gaps.push(`.harness/.gitignore:${rule}`);
          writeNeeds.push(ignorePath);
        }
      }
    }
  }

  if (includePermissions && unsafe.length === 0) {
    const checked = new Set();
    for (const target of writeNeeds) {
      const stat = lstat(target);
      if (stat?.isFile()) {
        if (!checked.has(target)
          && (!modeAllows(stat, 0o222) || !canAccess(target, fs.constants.W_OK))) {
          unsafe.push(`[unsafe] ${path.relative(root, target)}: file is not writable`);
        }
        checked.add(target);
        continue;
      }
      const ancestor = nearestExistingAncestor(target);
      if (!ancestor || ancestor.stat.isSymbolicLink() || !ancestor.stat.isDirectory()) {
        unsafe.push(`[unsafe] ${path.relative(root, target)}: no safe parent directory is available`);
        continue;
      }
      if (!checked.has(ancestor.path)
        && (!modeAllows(ancestor.stat, 0o222)
          || !modeAllows(ancestor.stat, 0o111)
          || !canAccess(ancestor.path, fs.constants.W_OK | fs.constants.X_OK))) {
        unsafe.push(`[unsafe] ${path.relative(root, ancestor.path) || "."}: directory is not writable`);
      }
      checked.add(ancestor.path);
    }
  }

  // Keep this list explicit so future initializer destinations must be added to this preflight.
  for (const relative of possibleFileTargets) {
    const stat = lstat(path.join(root, relative));
    if (stat && (stat.isSymbolicLink() || !stat.isFile())
      && !unsafe.some((message) => message.includes(`${relative}:`))) {
      unsafe.push(`[unsafe] ${relative}: expected a real regular file`);
    }
  }

  return { entries, unsafe, gaps };
}

function printInspection(result) {
  for (const entry of result.entries) console.log(entry);
  for (const entry of result.unsafe) console.error(entry);
}

function runCheck(root) {
  const result = inspect(root, { includePermissions: true });
  printInspection(result);
  if (result.unsafe.length > 0) {
    console.error("Harness check: unsafe; no files were changed.");
    return 2;
  }
  if (result.gaps.length > 0) {
    console.log("Harness check: incomplete; safe missing files or updates were found; no files were changed.");
    return 1;
  }
  console.log("Harness check: ready; no files were changed.");
  return 0;
}

function runInit(root) {
  const result = inspect(root, { includePermissions: true });
  if (result.unsafe.length > 0) {
    printInspection(result);
    console.error("Harness init refused: unsafe target; no files were changed.");
    return 2;
  }

  const initialized = spawnSync("bash", [initializer, root], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (initialized.stdout) process.stdout.write(initialized.stdout);
  if (initialized.stderr) process.stderr.write(initialized.stderr);
  if (initialized.error) {
    console.error(`Harness init failed: ${initialized.error.message}`);
    return 2;
  }
  if (initialized.status !== 0) {
    console.error("Harness init failed; initialization may be incomplete.");
    return 2;
  }

  console.log("Initialization complete; no Planner or Sprint was started.");
  return 0;
}

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Harness command error: ${error.message}`);
  console.error(usage());
  process.exitCode = 2;
}

try {
  if (parsed?.help) {
    console.log(usage());
  } else if (parsed) {
    if (parsed.command === "check") process.exitCode = runCheck(parsed.root);
    else if (parsed.command === "init") process.exitCode = runInit(parsed.root);
    else if (parsed.command === "upgrade") {
      console.error("Harness upgrade is not implemented; no files were changed.");
      process.exitCode = 2;
    } else {
      console.error(`Harness command error: unknown command: ${parsed.command}`);
      console.error(usage());
      process.exitCode = 2;
    }
  }
} catch (error) {
  const code = error?.code ? `${error.code}: ` : "";
  console.error(`[unsafe] Harness path inspection failed (${code}${error.message})`);
  console.error("Harness command refused; no files were changed.");
  process.exitCode = 2;
}
