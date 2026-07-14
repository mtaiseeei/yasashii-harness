#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOSTS = ["claudeCode", "codex"];
const ROLES = ["planner", "generator", "evaluator"];
const FIELDS = ["model", "effort"];

export const DEFAULT_CONFIG = Object.freeze({
  version: 1,
  lifecycle: "balanced",
  hosts: Object.fromEntries(
    HOSTS.map((host) => [
      host,
      {
        roles: Object.fromEntries(
          ROLES.map((role) => [role, { model: "inherit", effort: "inherit" }]),
        ),
      },
    ]),
  ),
});

const DEFAULT_CAPABILITIES = Object.freeze({
  claudeCode: {
    subagents: true,
    resume: true,
    roleModel: true,
    roleEffort: true,
    models: null,
    efforts: null,
  },
  codex: {
    // Codex can use project custom agents, but the Codex plugin manifest does
    // not distribute them. The runtime must opt in after detecting a usable
    // project/host agent surface.
    subagents: null,
    resume: null,
    roleModel: false,
    roleEffort: false,
    models: null,
    efforts: null,
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function warning(code, configPath, reason, effective = "inherit") {
  return { code, path: configPath, reason, effective };
}

function readJson(file, label, warnings) {
  if (!fs.existsSync(file)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      warnings.push(warning("invalid-config", label, "top level must be an object"));
      return null;
    }
    return value;
  } catch (error) {
    warnings.push(warning("invalid-json", label, error.message));
    return null;
  }
}

function own(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}

function explicitValue(config, host, role, field) {
  const roleConfig = config?.hosts?.[host]?.roles?.[role];
  return own(roleConfig, field) ? roleConfig[field] : undefined;
}

function chooseValue(personal, shared, host, role, field) {
  const personalValue = explicitValue(personal, host, role, field);
  if (personalValue !== undefined) return { value: personalValue, source: "personal" };
  const sharedValue = explicitValue(shared, host, role, field);
  if (sharedValue !== undefined) return { value: sharedValue, source: "shared" };
  return { value: "inherit", source: "plugin" };
}

function validRuntimeValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeCapabilities(overrides = {}) {
  const capabilities = clone(DEFAULT_CAPABILITIES);
  for (const host of HOSTS) {
    const override = overrides?.[host];
    if (!override || typeof override !== "object") continue;
    for (const key of ["subagents", "resume", "roleModel", "roleEffort", "models", "efforts"]) {
      if (own(override, key)) capabilities[host][key] = override[key];
    }
  }
  return capabilities;
}

function resolveField({ host, role, field, selected, capabilities, warnings }) {
  const configPath = `hosts.${host}.roles.${role}.${field}`;
  const requested = selected.value;

  if (!validRuntimeValue(requested)) {
    warnings.push(warning("invalid-value", configPath, "value must be a non-empty string"));
    return { requested, effective: "inherit", source: "fallback", status: "fallback" };
  }
  if (requested === "inherit") {
    return { requested, effective: "inherit", source: selected.source, status: "inherited" };
  }

  const supportedKey = field === "model" ? "roleModel" : "roleEffort";
  const availableKey = field === "model" ? "models" : "efforts";
  if (capabilities[supportedKey] === false) {
    warnings.push(
      warning(
        "unsupported-role-setting",
        configPath,
        `${host} cannot apply per-role ${field} through the detected dispatch surface`,
      ),
    );
    return { requested, effective: "inherit", source: "fallback", status: "fallback" };
  }

  const available = capabilities[availableKey];
  if (Array.isArray(available) && !available.includes(requested)) {
    warnings.push(
      warning("unavailable-value", configPath, `${JSON.stringify(requested)} is not available on ${host}`),
    );
    return { requested, effective: "inherit", source: "fallback", status: "fallback" };
  }

  if (capabilities[supportedKey] !== true || !Array.isArray(available)) {
    warnings.push(
      warning(
        "runtime-validation-required",
        configPath,
        `${JSON.stringify(requested)} must be confirmed against the active ${host} session before dispatch`,
        requested,
      ),
    );
    return { requested, effective: requested, source: selected.source, status: "pending-validation" };
  }

  return { requested, effective: requested, source: selected.source, status: "applied" };
}

function lifecycleAction({ mode, event, role, capabilities, rotate, warnings, host }) {
  if (rotate.includes(role)) return { action: "fresh", reason: "explicit rotation" };
  if (event === "initial") return { action: capabilities.subagents === false ? "isolated-work-unit" : "fresh", reason: "no prior role session" };
  if (role === "planner" && event === "retry") return { action: "idle", reason: "implementation retry does not require Planner" };

  const wantsResume = event === "retry" || mode === "balanced" || role === "planner";
  if (!wantsResume) return { action: "fresh", reason: "fresh mode at Sprint boundary" };

  if (capabilities.resume === true) return { action: "resume", reason: event === "retry" ? "same Sprint retry" : "balanced role reuse" };

  const configPath = `lifecycle.${host}.${role}`;
  if (capabilities.resume === false) {
    warnings.push(warning("resume-unsupported", configPath, `${host} cannot resume this role; starting a new isolated work unit`, "isolated-work-unit"));
  } else {
    warnings.push(warning("resume-unconfirmed", configPath, `${host} resume capability is unconfirmed; use a new isolated work unit unless the host confirms resume`, "isolated-work-unit"));
  }
  return { action: "isolated-work-unit", reason: "resume unavailable or unconfirmed" };
}

export function resolveRuntimeConfig({
  root = process.cwd(),
  event = "initial",
  host: selectedHost = "all",
  capabilityOverrides = {},
  rotate = [],
} = {}) {
  const warnings = [];
  const sharedPath = path.join(root, ".harness", "config.json");
  const personalPath = path.join(root, ".harness", "config.local.json");
  const shared = readJson(sharedPath, ".harness/config.json", warnings);
  const personal = readJson(personalPath, ".harness/config.local.json", warnings);
  const capabilities = normalizeCapabilities(capabilityOverrides);

  let lifecycle = own(personal, "lifecycle")
    ? { value: personal.lifecycle, source: "personal" }
    : own(shared, "lifecycle")
      ? { value: shared.lifecycle, source: "shared" }
      : { value: DEFAULT_CONFIG.lifecycle, source: "plugin" };
  if (!['balanced', 'fresh'].includes(lifecycle.value)) {
    warnings.push(warning("invalid-lifecycle", "lifecycle", "expected balanced or fresh", "balanced"));
    lifecycle = { value: "balanced", source: "fallback" };
  }

  if (!["initial", "sprint-change", "retry"].includes(event)) {
    throw new Error(`invalid --event ${JSON.stringify(event)}; expected initial, sprint-change, or retry`);
  }
  const hosts = selectedHost === "all" ? HOSTS : [selectedHost];
  if (!HOSTS.includes(hosts[0])) {
    throw new Error(`invalid --host ${JSON.stringify(selectedHost)}; expected claudeCode, codex, or all`);
  }

  const resolvedHosts = {};
  for (const host of hosts) {
    const hostWarningsStart = warnings.length;
    const roles = {};
    for (const role of ROLES) {
      const settings = {};
      for (const field of FIELDS) {
        settings[field] = resolveField({
          host,
          role,
          field,
          selected: chooseValue(personal, shared, host, role, field),
          capabilities: capabilities[host],
          warnings,
        });
      }
      settings.lifecycle = lifecycleAction({
        mode: lifecycle.value,
        event,
        role,
        capabilities: capabilities[host],
        rotate,
        warnings,
        host,
      });
      roles[role] = settings;
    }
    resolvedHosts[host] = {
      capabilities: capabilities[host],
      roles,
      warningCount: warnings.length - hostWarningsStart,
    };
  }

  return {
    version: 1,
    root,
    configFiles: {
      shared: { path: sharedPath, present: fs.existsSync(sharedPath), valid: Boolean(shared) },
      personal: { path: personalPath, present: fs.existsSync(personalPath), valid: Boolean(personal) },
    },
    lifecycle: { mode: lifecycle.value, source: lifecycle.source, event },
    hosts: resolvedHosts,
    invariants: {
      separateGeneratorEvaluator: true,
      stateSource: "canonical files",
      retryScope: "same Sprint",
    },
    warnings,
  };
}

function parseArgs(argv) {
  const options = { root: process.cwd(), event: "initial", host: "all", rotate: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = path.resolve(argv[++index]);
    else if (arg === "--event") options.event = argv[++index];
    else if (arg === "--host") options.host = argv[++index];
    else if (arg === "--capabilities") options.capabilitiesPath = path.resolve(argv[++index]);
    else if (arg === "--rotate") options.rotate = argv[++index].split(",").filter(Boolean);
    else if (arg === "--json") options.json = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function printText(result) {
  console.log(`Harness runtime: ${result.lifecycle.mode} (${result.lifecycle.source}), event=${result.lifecycle.event}`);
  for (const [host, hostConfig] of Object.entries(result.hosts)) {
    console.log(`\n${host}`);
    for (const [role, roleConfig] of Object.entries(hostConfig.roles)) {
      console.log(
        `  ${role}: ${roleConfig.lifecycle.action}; model=${roleConfig.model.effective} (${roleConfig.model.source}); effort=${roleConfig.effort.effective} (${roleConfig.effort.source})`,
      );
    }
  }
  if (result.warnings.length) {
    console.log("\nWarnings");
    for (const item of result.warnings) {
      console.log(`  [${item.code}] ${item.path}: ${item.reason}; effective=${item.effective}`);
    }
  }
}

function usage() {
  return `Usage: node resolve-runtime-config.mjs [options]\n\n` +
    `  --root PATH             target repository (default: cwd)\n` +
    `  --host HOST             claudeCode, codex, or all\n` +
    `  --event EVENT           initial, sprint-change, or retry\n` +
    `  --capabilities FILE     detected host capabilities JSON\n` +
    `  --rotate ROLE[,ROLE]    force selected roles fresh\n` +
    `  --json                  machine-readable output\n`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      process.exit(0);
    }
    const capabilityOverrides = options.capabilitiesPath
      ? JSON.parse(fs.readFileSync(options.capabilitiesPath, "utf8"))
      : {};
    const result = resolveRuntimeConfig({ ...options, capabilityOverrides });
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else printText(result);
  } catch (error) {
    console.error(`Harness runtime configuration error: ${error.message}`);
    process.exit(1);
  }
}
