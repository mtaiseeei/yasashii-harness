#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  guidanceSources,
  ignoreRules,
  runNodeGuidanceInitializer,
} from "./node-guidance-initializer.mjs";
import { runGuidanceMigration } from "./guidance-migration.mjs";
import { permissionBitsAllow } from "./platform-permissions.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDir, "..");
const templatesRoot = path.join(pluginRoot, "templates");

const directoryTargets = [".harness", "docs"];
const alwaysFileTargets = [".harness/.gitignore"];

const possibleFileTargets = [
  ".harness/config.toml",
  "docs/harness-guidance.md",
];

function usage() {
  return `Usage: node harness.mjs <init|check|upgrade> [--root PATH]

  init/check [--spec-path EXISTING.md] [--state-path EXISTING.md]
    Create missing minimal guidance / inspect read-only. Existing files are preserved.
  upgrade --plan REVIEWED.json [--apply]
    Preview an explicit maintenance plan without writing; --apply preserves originals
    in .harness/migrations and refuses stale sources or unsafe document paths.
    Plan schema: {version:1, files:[{path,beforeSha256,content,preserve:[],retire:[]}]}.
    preserve lists exact custom rules, active approvals and unresolved text to retain;
    retire lists exact superseded rules to remove. Author candidates from existing
    specifications; the CLI does not summarize or decide semantic equivalence.`;
}

function parseArgs(argv) {
  if (argv.length === 0) throw new Error("a command is required");
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  const command = argv[0];
  let root = process.cwd();
  let rootSeen = false;
  const options = {};
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
    if (["--plan", "--spec-path", "--state-path"].includes(argument)) {
      const key = {"--plan": "plan", "--spec-path": "specPath", "--state-path": "statePath"}[argument];
      if (options[key] || !argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error(`${argument} requires one value`);
      options[key] = argv[++index];
      continue;
    }
    if (argument === "--apply" && !options.apply) { options.apply = true; continue; }
    throw new Error(`unknown argument: ${argument}`);
  }
  if (command === "upgrade" && (options.specPath || options.statePath)) throw new Error("upgrade does not accept source selection flags");
  if (command !== "upgrade" && (options.plan || options.apply)) throw new Error("--plan/--apply are only for upgrade");
  return { command, root: path.resolve(root), help: false, ...options };
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

function inspect(root, { includePermissions = false, specPath, statePath } = {}) {
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

  const sources = guidanceSources(root, { specPath, statePath });
  const sourceFiles = [...new Set([...sources.spec, ...sources.state])];
  const sourceDirs = new Set(directoryTargets);
  for (const relative of sourceFiles) {
    let parent = path.dirname(relative);
    while (parent !== ".") { sourceDirs.add(parent); parent = path.dirname(parent); }
  }
  for (const relative of [...sourceDirs].sort()) inspectDirectory(relative);
  for (const relative of sourceFiles) inspectFile(relative);
  for (const [kind, relatives] of Object.entries(sources)) entries.push(`[canonical ${kind}] ${relatives.join(", ")}`);
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
    if (!permissionBitsAllow(ignoreStat, 0o444) || !canAccess(ignorePath, fs.constants.R_OK)) {
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
          && (!permissionBitsAllow(stat, 0o222) || !canAccess(target, fs.constants.W_OK))) {
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
        && (!permissionBitsAllow(ancestor.stat, 0o222)
          || !permissionBitsAllow(ancestor.stat, 0o111)
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

function runCheck(root, options) {
  const result = inspect(root, { ...options, includePermissions: true });
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

function runInit(root, options) {
  const result = inspect(root, { ...options, includePermissions: true });
  if (result.unsafe.length > 0) {
    printInspection(result);
    console.error("Harness init refused: unsafe target; no files were changed.");
    return 2;
  }

  let initialized;
  try {
    initialized = runNodeGuidanceInitializer(root, { ...options, pluginRoot });
  } catch (error) {
    console.error(`Harness init failed: ${error.message}`);
    return 2;
  }
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
    if (parsed.command === "check") process.exitCode = runCheck(parsed.root, parsed);
    else if (parsed.command === "init") process.exitCode = runInit(parsed.root, parsed);
    else if (parsed.command === "upgrade") {
      process.exitCode = runGuidanceMigration(parsed.root, parsed);
    } else {
      console.error(`Harness command error: unknown command: ${parsed.command}`);
      console.error(usage());
      process.exitCode = 2;
    }
  }
} catch (error) {
  const code = error?.code ? `${error.code}: ` : "";
  console.error(`[unsafe] Harness path inspection failed (${code}${error.message})`);
  console.error("Harness command refused; inspect the error and any reported migration recovery path.");
  process.exitCode = 2;
}
