import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { guidanceSources } from "./node-guidance-initializer.mjs";

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
function stat(file) {
  try { return fs.lstatSync(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function safePath(root, relative, { existing = true } = {}) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || /[\\\x00:]/u.test(relative)
    || relative.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`unsafe path: ${relative}`);
  let current = root;
  const parts = relative.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    const entry = stat(current);
    if (entry?.isSymbolicLink() || (entry && index < parts.length - 1 && !entry.isDirectory())) throw new Error(`unsafe path component: ${relative}`);
    if (!entry && existing) throw new Error(`missing path: ${relative}`);
  }
  return current;
}
function documentPath(root, relative) {
  if (typeof relative !== "string" || !relative.endsWith(".md")
    || relative.split("/").some((part) => part.startsWith("."))
    || /(?:^|\/)(?:agents|roles|skills|templates|plugins|scripts|vendor|node_modules)(?:\/|$)/iu.test(relative)
    || /(?:^|\/)(?:SKILL|planner|generator|evaluator)\.md$/iu.test(relative)) throw new Error(`maintenance only accepts existing Markdown guidance, not configuration, plugin implementation or Agent definitions: ${relative}`);
  const file = safePath(root, relative);
  if (!stat(file)?.isFile()) throw new Error(`expected a regular document: ${relative}`);
  return file;
}
function protectedText(content) {
  const lines = [];
  let protectedSection = false;
  let sectionDepth = 0;
  for (const line of content.split(/\r?\n/u)) {
    const heading = /^(#{1,6})\s+(.+)/u.exec(line);
    if (heading) {
      if (heading[1].length <= sectionDepth) protectedSection = false;
      if (/unresolved|open questions|pending|authorization|approval|constraints|未解決|未決|承認|制約|申し送り/iu.test(heading[2])) {
        protectedSection = true; sectionDepth = heading[1].length;
      }
    } else if (line.trim() && (protectedSection || /^\s*[-*]\s+\[ \]/u.test(line)
      || /^\s*[-*]?\s*(?:Unresolved|Authorization|Constraints|未解決|承認|制約)\s*[:：/]/iu.test(line))) lines.push(line);
  }
  return lines;
}
function links(content) {
  return [...content.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/gu)].map((match) => match[1]);
}
function verifyLinks(root, relative, content, plannedArchives = new Set()) {
  for (const link of links(content)) {
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(link)) continue;
    let value;
    try { value = decodeURIComponent(link.split("#")[0]); } catch { throw new Error(`invalid link in ${relative}: ${link}`); }
    if (!value) continue;
    const resolved = path.resolve(path.dirname(path.join(root, relative)), value);
    const target = path.relative(root, resolved).split(path.sep).join("/");
    if (target === "") continue;
    safePath(root, target, { existing: !plannedArchives.has(target) });
  }
}
function readPlan(root, planPath) {
  if (!planPath) throw new Error("upgrade requires --plan REVIEWED.json; preview is read-only (use --apply after reviewing the diff)");
  const rootStat = stat(root);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw new Error("root must be a real directory");
  const planFile = path.resolve(planPath);
  if (!stat(planFile)?.isFile() || stat(planFile).isSymbolicLink()) throw new Error("plan must be a regular file");
  const raw = fs.readFileSync(planFile);
  const plan = JSON.parse(raw);
  if (plan.version !== 1 || !Array.isArray(plan.files) || !plan.files.length) throw new Error("expected plan version 1 and nonempty files");
  if (plan.id !== undefined && !/^[a-z0-9][a-z0-9-]{7,63}$/u.test(plan.id)) throw new Error("plan id must be 8-64 lowercase letters/digits/hyphens");
  const id = plan.id ?? sha(raw).slice(0, 24);
  const plannedArchives = new Set(plan.files.filter((entry) => typeof entry?.path === "string").map((entry) => `.harness/migrations/${id}/originals/${entry.path}`));
  const seen = new Set();
  const entries = plan.files.map((entry) => {
    if (!entry || typeof entry.path !== "string" || seen.has(entry.path.toLowerCase())) throw new Error("duplicate or missing document path");
    seen.add(entry.path.toLowerCase());
    const file = documentPath(root, entry.path);
    if (!/^[a-f0-9]{64}$/u.test(entry.beforeSha256) || typeof entry.content !== "string" || !entry.content.trim()
      || !Array.isArray(entry.preserve) || !Array.isArray(entry.retire)
      || [...entry.preserve, ...entry.retire].some((text) => typeof text !== "string" || !text.trim())) throw new Error(`invalid reviewed plan entry: ${entry.path}`);
    const before = fs.readFileSync(file);
    const currentSha = sha(before);
    const after = Buffer.from(entry.content, "utf8");
    const afterSha = sha(after);
    if (currentSha !== entry.beforeSha256 && currentSha !== afterSha) throw new Error(`stale source: ${entry.path}; regenerate and review the plan against current bytes`);
    if (currentSha !== afterSha) {
      const content = before.toString("utf8");
      if (!Buffer.from(content, "utf8").equals(before)) throw new Error(`document is not UTF-8: ${entry.path}`);
      for (const text of [...protectedText(content), ...entry.preserve]) {
        if (!content.includes(text) || !entry.content.includes(text)) throw new Error(`protected text missing in ${entry.path}: ${text}`);
      }
      for (const text of entry.retire) {
        if (!content.includes(text) || entry.content.includes(text)) throw new Error(`superseded rule absent from source or still present in ${entry.path}: ${text}`);
      }
    }
    verifyLinks(root, entry.path, entry.content, plannedArchives);
    return { ...entry, file, before, after, afterSha, currentSha, mode: stat(file).mode & 0o777 };
  });
  return { raw, id, entries };
}

export function runGuidanceMigration(root, { plan: planPath, apply = false } = {}) {
  if (!planPath) {
    if (apply) throw new Error("--apply requires --plan REVIEWED.json");
    const rootStat = stat(root);
    if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw new Error("root must be a real directory");
    const sources = guidanceSources(root);
    const candidates = [...new Set(["AGENTS.md", "CLAUDE.md", "docs/harness-guidance.md", ...sources.spec, ...sources.state])];
    console.log("Harness maintenance inventory (read-only; bounded current guidance/spec/state discovery):");
    for (const relative of candidates) {
      safePath(root, relative, { existing: false });
      if (!stat(path.join(root, relative))) continue;
      const file = documentPath(root, relative);
      const bytes = fs.readFileSync(file);
      const content = bytes.toString("utf8");
      console.log(`${relative}: ${bytes.length} bytes, ${content.split("\n").length} lines, beforeSha256=${sha(bytes)}`);
      for (const [index, line] of content.split(/\r?\n/u).entries()) {
        if (/(?:every|all|全|毎).{0,25}(?:sprint|履歴)|micro.{0,20}(?:contract|契約)|(?:必ず|mandatory|must).{0,30}(?:3役|three.roles|independent.review)|Model Tier:/iu.test(line)) console.log(`  inspect legacy candidate ${index + 1}: ${line.slice(0, 240)}`);
      }
    }
    console.log("Prepare a scoped JSON plan: {version:1,files:[{path,beforeSha256,content,preserve:[],retire:[]}]}. Preserve custom rules, active approvals and unresolved items; list exact retired rules. Run upgrade --plan <file> to inspect the complete diff, then the same command with --apply within existing authorization. No files were changed.");
    return 0;
  }
  const { raw, id, entries } = readPlan(root, planPath);
  const changed = entries.filter((entry) => entry.currentSha !== entry.afterSha);
  if (!changed.length) for (const entry of entries) verifyLinks(root, entry.path, entry.content);
  console.log(`Harness maintenance ${apply ? "apply" : "preview"}: ${id}`);
  for (const entry of entries) {
    console.log(`${entry.path}: ${entry.before.length} -> ${entry.after.length} bytes; ${entry.currentSha} -> ${entry.afterSha}`);
    if (entry.currentSha !== entry.afterSha) {
      // A complete before/after diff is intentional: no hidden truncation conceals
      // removed custom instructions or unresolved text in a reviewed replacement.
      console.log(`--- a/${entry.path}\n+++ b/${entry.path}`);
      for (const line of entry.before.toString("utf8").split("\n")) console.log(`-${line}`);
      for (const line of entry.content.split("\n")) console.log(`+${line}`);
    }
  }
  console.log("Checks: source hashes, document paths, explicit preserved text, unresolved/approval sections, retired rules and relative links passed. Semantic completeness remains the reviewing Agent's responsibility.");
  if (!apply) { console.log("Preview only; no files were changed."); return 0; }
  if (!changed.length) { console.log("Already applied; no files were changed."); return 0; }
  if (changed.length !== entries.filter((entry) => entry.beforeSha256 !== entry.afterSha).length) throw new Error("partially applied plan; inspect recovery history before preparing a new plan");
  const backupRelative = `.harness/migrations/${id}`;
  const backupRoot = safePath(root, backupRelative, { existing: false });
  if (stat(backupRoot)) throw new Error("migration backup already exists; inspect recovery history before retrying");
  // Recheck immediately before making any mutation; never use Git reset/stash or
  // touch the index. The backup preserves dirty source bytes, not just HEAD.
  for (const entry of changed) {
    documentPath(root, entry.path);
    if (sha(fs.readFileSync(entry.file)) !== entry.beforeSha256) throw new Error(`stale source: ${entry.path}`);
    fs.accessSync(path.dirname(entry.file), fs.constants.W_OK);
  }
  fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(backupRoot, "plan.json"), raw, { flag: "wx", mode: 0o600 });
  for (const entry of entries) {
    const backup = path.join(backupRoot, "originals", entry.path);
    fs.mkdirSync(path.dirname(backup), { recursive: true, mode: 0o700 });
    fs.writeFileSync(backup, entry.before, { flag: "wx", mode: 0o600 });
  }
  const written = [];
  const temporary = [];
  try {
    for (const entry of changed) {
      documentPath(root, entry.path);
      if (sha(fs.readFileSync(entry.file)) !== entry.beforeSha256) throw new Error(`stale source during apply: ${entry.path}`);
      const temp = `${entry.file}.harness-${id}.tmp`;
      fs.writeFileSync(temp, entry.after, { flag: "wx", mode: entry.mode });
      temporary.push(temp);
      fs.renameSync(temp, entry.file);
      written.push(entry);
    }
    for (const entry of changed) {
      if (sha(fs.readFileSync(entry.file)) !== entry.afterSha) throw new Error(`post-write verification failed: ${entry.path}`);
      verifyLinks(root, entry.path, entry.content);
    }
    fs.writeFileSync(path.join(backupRoot, "result.json"), JSON.stringify({ status: "applied", files: changed.map(({ path: filePath, beforeSha256, afterSha }) => ({ path: filePath, beforeSha256, afterSha })) }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  } catch (error) {
    for (const entry of written.reverse()) {
      // Do not roll back another writer's intervening edit.
      if (sha(fs.readFileSync(entry.file)) === entry.afterSha) fs.writeFileSync(entry.file, entry.before);
    }
    throw new Error(`maintenance failed; originals retained at ${backupRoot}: ${error.message}`);
  } finally {
    for (const temp of temporary) { if (stat(temp)?.isFile() && !stat(temp).isSymbolicLink()) fs.unlinkSync(temp); }
  }
  console.log(`Applied and verified ${changed.length} document(s). Original bytes and plan: ${backupRoot}`);
  return 0;
}
