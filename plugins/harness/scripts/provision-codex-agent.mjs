#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODEX_LUNA_AGENT_TOML,
  inspectCodexLunaAgent,
  resolveCodexHome,
} from "./codex-custom-agent.mjs";

function usage() {
  return `Usage: node provision-codex-agent.mjs [options]\n\n` +
    `  --codex-home PATH  target Codex home (default: CODEX_HOME or ~/.codex)\n` +
    `  --approve          confirm creation of the missing global agent definition\n` +
    `  --json             machine-readable output\n`;
}

function requireArg(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = { approve: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--codex-home") options.codexHome = path.resolve(requireArg(argv, index++, arg));
    else if (arg === "--approve") options.approve = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function resultFor(definition, overrides = {}) {
  return {
    changed: false,
    approvalRequired: false,
    newTaskRequired: false,
    definition,
    proposedToml: CODEX_LUNA_AGENT_TOML,
    options: [],
    ...overrides,
  };
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  console.log(`Codex Luna agent: ${result.definition.status}`);
  console.log(`Path: ${result.definition.path}`);
  if (result.approvalRequired) {
    console.log("Approval is required before creating the file. Proposed definition:\n");
    process.stdout.write(result.proposedToml);
  }
  for (const issue of result.definition.issues) console.log(`Issue: ${issue}`);
  for (const option of result.options) console.log(`Option: ${option}`);
  if (result.newTaskRequired) console.log("Start a new Codex task so the new agent definition is discovered.");
}

function nearestExistingAncestor(target) {
  let current = target;
  while (true) {
    try {
      return { path: current, stat: fs.lstatSync(current) };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error("no existing parent is available for the Codex home");
    current = parent;
  }
}

export function provisionCodexAgent({ codexHome, approve = false } = {}) {
  const resolvedHome = resolveCodexHome(codexHome);
  let definition = inspectCodexLunaAgent({ codexHome: resolvedHome });
  if (definition.status === "compatible") return { code: 0, result: resultFor(definition) };
  if (definition.status === "conflict") {
    return {
      code: 2,
      result: resultFor(definition, {
        options: [
          "Review and edit the existing file manually, then run the read-only resolver again.",
          "Set hosts.codex.custom_agents.enabled = false to keep direct dispatch.",
        ],
      }),
    };
  }
  if (!approve) {
    return { code: 3, result: resultFor(definition, { approvalRequired: true }) };
  }

  const agentsDirectory = path.dirname(definition.path);
  const ancestor = nearestExistingAncestor(resolvedHome);
  if (ancestor.stat.isSymbolicLink() || !ancestor.stat.isDirectory()) {
    throw new Error(`nearest existing Codex home parent must be a real directory: ${ancestor.path}`);
  }
  fs.mkdirSync(resolvedHome, { recursive: true, mode: 0o700 });
  const homeStat = fs.lstatSync(resolvedHome);
  if (homeStat.isSymbolicLink() || !homeStat.isDirectory()) {
    throw new Error("Codex home must be a real directory");
  }
  fs.mkdirSync(agentsDirectory, { recursive: true, mode: 0o700 });
  const agentsStat = fs.lstatSync(agentsDirectory);
  if (agentsStat.isSymbolicLink() || !agentsStat.isDirectory()) {
    throw new Error("agents path must be a real directory");
  }
  fs.writeFileSync(definition.path, CODEX_LUNA_AGENT_TOML, { encoding: "utf8", flag: "wx", mode: 0o600 });

  definition = inspectCodexLunaAgent({ codexHome: resolvedHome });
  if (definition.status !== "compatible") {
    throw new Error(`created agent definition failed verification: ${definition.issues.join("; ")}`);
  }
  return {
    code: 0,
    result: resultFor(definition, { changed: true, newTaskRequired: true }),
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
    } else {
      const outcome = provisionCodexAgent(options);
      printResult(outcome.result, options.json);
      process.exitCode = outcome.code;
    }
  } catch (error) {
    const result = {
      changed: false,
      approvalRequired: false,
      newTaskRequired: false,
      error: error.message,
    };
    if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else console.error(`Codex agent provision failed: ${error.message}`);
    process.exitCode = 2;
  }
}
