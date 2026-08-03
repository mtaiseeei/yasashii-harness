import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parse: parseToml } = require("../vendor/smol-toml/index.cjs");

export const CODEX_LUNA_AGENT_NAME = "harness_luna_worker";
export const CODEX_LUNA_MODEL = "gpt-5.6-luna";
export const CODEX_LUNA_AGENT_FILENAME = "harness-luna-worker.toml";
export const CODEX_LUNA_AGENT_DESCRIPTION = "Luna worker for a narrowly scoped Harness role task.";
export const CODEX_LUNA_DEVELOPER_INSTRUCTIONS = `Handle only the task assigned by the parent agent.
Follow the role, scope, file ownership, and output contract supplied in that task.
Do not make unrelated changes.
Verify the result when practical.
Return a concise result with evidence, relevant paths, and caveats.`;
export const CODEX_LUNA_AGENT_TOML = `name = "${CODEX_LUNA_AGENT_NAME}"
description = "${CODEX_LUNA_AGENT_DESCRIPTION}"
model = "${CODEX_LUNA_MODEL}"
developer_instructions = """
${CODEX_LUNA_DEVELOPER_INSTRUCTIONS}
"""
`;

function own(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}

function lstat(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function resolveCodexHome(explicitCodexHome) {
  if (explicitCodexHome !== undefined) {
    if (typeof explicitCodexHome !== "string" || !explicitCodexHome.trim()) {
      throw new Error("codexHome must be a non-empty path when provided");
    }
    return path.resolve(explicitCodexHome.trim());
  }
  const configured = process.env.CODEX_HOME;
  return configured && configured.trim()
    ? path.resolve(configured.trim())
    : path.join(os.homedir(), ".codex");
}

export function codexLunaAgentPath(explicitCodexHome) {
  return path.join(resolveCodexHome(explicitCodexHome), "agents", CODEX_LUNA_AGENT_FILENAME);
}

export function inspectCodexLunaAgent({ codexHome, enabled = true } = {}) {
  const resolvedHome = resolveCodexHome(codexHome);
  const agentsDirectory = path.join(resolvedHome, "agents");
  const target = path.join(agentsDirectory, CODEX_LUNA_AGENT_FILENAME);
  const base = { path: target, name: CODEX_LUNA_AGENT_NAME, model: CODEX_LUNA_MODEL };

  if (!enabled) return { ...base, status: "not-checked", issues: [] };

  try {
    const homeStat = lstat(resolvedHome);
    if (homeStat && (homeStat.isSymbolicLink() || !homeStat.isDirectory())) {
      return { ...base, status: "conflict", issues: ["Codex home must be a real directory"] };
    }
    const agentsStat = lstat(agentsDirectory);
    if (agentsStat && (agentsStat.isSymbolicLink() || !agentsStat.isDirectory())) {
      return { ...base, status: "conflict", issues: ["agents path must be a real directory"] };
    }
    const targetStat = lstat(target);
    if (!targetStat) return { ...base, status: "missing", issues: [] };
    if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
      return { ...base, status: "conflict", issues: ["agent definition must be a real regular file"] };
    }

    let parsed;
    try {
      parsed = parseToml(fs.readFileSync(target, "utf8"));
    } catch {
      return { ...base, status: "conflict", issues: ["agent definition is not valid TOML"] };
    }
    const issues = [];
    if (parsed?.name !== CODEX_LUNA_AGENT_NAME) {
      issues.push(`name must be ${JSON.stringify(CODEX_LUNA_AGENT_NAME)}`);
    }
    if (parsed?.description !== CODEX_LUNA_AGENT_DESCRIPTION) {
      issues.push("description does not match the Harness Luna worker definition");
    }
    if (parsed?.model !== CODEX_LUNA_MODEL) {
      issues.push(`model must be ${JSON.stringify(CODEX_LUNA_MODEL)}`);
    }
    if (own(parsed, "model_reasoning_effort")) {
      issues.push("model_reasoning_effort must be omitted");
    }
    if (typeof parsed?.developer_instructions !== "string"
      || parsed.developer_instructions.trim() !== CODEX_LUNA_DEVELOPER_INSTRUCTIONS) {
      issues.push("developer_instructions do not match the role-neutral Harness contract");
    }
    return { ...base, status: issues.length ? "conflict" : "compatible", issues };
  } catch (error) {
    return { ...base, status: "conflict", issues: [`agent definition could not be inspected: ${error.code ?? error.message}`] };
  }
}
