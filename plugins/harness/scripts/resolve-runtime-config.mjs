#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOSTS = ["claudeCode", "codex"];
const ROLES = ["planner", "generator", "evaluator"];
const FIELDS = ["model", "effort"];
const CAPABILITY_FLAGS = ["subagents", "resume", "roleModel", "roleEffort"];
const CAPABILITY_LISTS = ["models", "efforts"];

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
    // Claude Code effort is applied through agent-definition frontmatter, not
    // a generic per-dispatch control. Keep it unconfirmed until the active
    // project/host exposes a concrete role-level application path.
    roleEffort: null,
    models: null,
    efforts: null,
    applicationPaths: {
      roleModel: "Claude Code subagent model control",
      roleEffort: null,
    },
  },
  codex: {
    // The Codex plugin manifest distributes skills, not agent definitions.
    // A project custom agent or capable spawn surface must opt in explicitly.
    subagents: null,
    resume: null,
    roleModel: false,
    roleEffort: false,
    models: null,
    efforts: null,
    applicationPaths: {
      roleModel: null,
      roleEffort: null,
    },
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function warning(code, configPath, reason, {
  effective = "inherit",
  source = "plugin",
  input,
  candidates,
  causeSource,
} = {}) {
  const item = { code, path: configPath, reason, effective, source };
  if (input !== undefined) item.input = input;
  if (Array.isArray(candidates) && candidates.length) item.candidates = candidates;
  if (causeSource) item.causeSource = causeSource;
  return item;
}

function own(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}

function readJson(file, label, source, warnings) {
  if (!fs.existsSync(file)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      warnings.push(warning("invalid-config", label, "top level must be an object", { source }));
      return null;
    }
    return value;
  } catch (error) {
    warnings.push(warning("invalid-json", label, error.message, { source }));
    return null;
  }
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

function normalizeRuntimeValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function capabilityPayload(overrides) {
  return overrides && typeof overrides === "object" && !Array.isArray(overrides) && own(overrides, "hosts")
    ? overrides.hosts
    : overrides;
}

function normalizeCapabilities(overrides, warnings, capabilitySource) {
  const capabilities = clone(DEFAULT_CAPABILITIES);
  const sources = Object.fromEntries(
    HOSTS.map((host) => [
      host,
      Object.fromEntries(
        [...CAPABILITY_FLAGS, ...CAPABILITY_LISTS, "applicationPaths"].map((key) => [key, "plugin"]),
      ),
    ]),
  );
  const payload = capabilityPayload(overrides);

  if (payload === undefined || payload === null) return { capabilities, sources };
  if (typeof payload !== "object" || Array.isArray(payload)) {
    warnings.push(warning("invalid-capabilities", "capabilities", "capability top level must be an object", {
      source: capabilitySource,
      causeSource: "capability",
    }));
    return { capabilities, sources };
  }

  for (const host of HOSTS) {
    if (!own(payload, host)) continue;
    const override = payload[host];
    if (!override || typeof override !== "object" || Array.isArray(override)) {
      warnings.push(warning("invalid-capability-host", `capabilities.${host}`, "host capability must be an object", {
        source: capabilitySource,
        causeSource: "capability",
      }));
      for (const key of CAPABILITY_FLAGS) capabilities[host][key] = null;
      continue;
    }

    for (const key of CAPABILITY_FLAGS) {
      if (!own(override, key)) continue;
      const value = override[key];
      if (value === true || value === false || value === null) {
        capabilities[host][key] = value;
        sources[host][key] = capabilitySource;
      } else {
        capabilities[host][key] = null;
        sources[host][key] = capabilitySource;
        warnings.push(warning("invalid-capability-value", `capabilities.${host}.${key}`, "expected true, false, or null", {
          source: capabilitySource,
          input: value,
          causeSource: "capability",
        }));
      }
    }

    for (const key of CAPABILITY_LISTS) {
      if (!own(override, key)) continue;
      const value = override[key];
      if (value === null) {
        capabilities[host][key] = null;
        sources[host][key] = capabilitySource;
      } else if (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim())) {
        capabilities[host][key] = value.map((item) => item.trim());
        sources[host][key] = capabilitySource;
      } else {
        capabilities[host][key] = null;
        sources[host][key] = capabilitySource;
        warnings.push(warning("invalid-capability-value", `capabilities.${host}.${key}`, "expected null or an array of non-empty strings", {
          source: capabilitySource,
          input: value,
          causeSource: "capability",
        }));
      }
    }

    if (own(override, "applicationPaths")) {
      const value = override.applicationPaths;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const key of ["roleModel", "roleEffort"]) {
          if (!own(value, key)) continue;
          const pathValue = value[key];
          if (pathValue === null) {
            capabilities[host].applicationPaths[key] = null;
          } else if (typeof pathValue === "string" && pathValue.trim()) {
            capabilities[host].applicationPaths[key] = pathValue.trim();
          } else {
            capabilities[host].applicationPaths[key] = null;
            warnings.push(warning(
              "invalid-capability-value",
              `capabilities.${host}.applicationPaths.${key}`,
              "expected null or a non-empty string",
              {
                source: capabilitySource,
                input: pathValue,
                causeSource: capabilitySource,
              },
            ));
          }
        }
        sources[host].applicationPaths = capabilitySource;
      } else {
        capabilities[host].applicationPaths = { roleModel: null, roleEffort: null };
        sources[host].applicationPaths = capabilitySource;
        warnings.push(warning("invalid-capability-value", `capabilities.${host}.applicationPaths`, "expected an object", {
          source: capabilitySource,
          input: value,
          causeSource: "capability",
        }));
      }
    }
  }

  return { capabilities, sources };
}

function resolveField({ host, role, field, selected, capabilities, capabilitySources, warnings }) {
  const configPath = `hosts.${host}.roles.${role}.${field}`;
  const rawRequested = selected.value;
  const requested = normalizeRuntimeValue(rawRequested);

  if (typeof requested !== "string" || requested.length === 0) {
    warnings.push(warning("invalid-value", configPath, "value must be a non-empty string", {
      source: selected.source,
      input: rawRequested,
    }));
    return { requested, effective: "inherit", source: "fallback", inputSource: selected.source, status: "fallback" };
  }
  if (requested === "inherit") {
    return { requested, effective: "inherit", source: selected.source, status: "inherited" };
  }

  const supportedKey = field === "model" ? "roleModel" : "roleEffort";
  const availableKey = field === "model" ? "models" : "efforts";
  const applicationPath = capabilities.applicationPaths?.[supportedKey];
  if (capabilities[supportedKey] === false) {
    warnings.push(warning("unsupported-role-setting", configPath, `${host} cannot apply per-role ${field} through the detected dispatch surface`, {
      source: selected.source,
      input: requested,
      causeSource: capabilitySources[supportedKey],
    }));
    return { requested, effective: "inherit", source: "fallback", inputSource: selected.source, status: "fallback" };
  }

  const available = capabilities[availableKey];
  if (Array.isArray(available) && !available.includes(requested)) {
    warnings.push(warning("unavailable-value", configPath, `${JSON.stringify(requested)} is not available on ${host}`, {
      source: selected.source,
      input: requested,
      candidates: available,
      causeSource: capabilitySources[availableKey],
    }));
    return { requested, effective: "inherit", source: "fallback", inputSource: selected.source, status: "fallback" };
  }

  if (capabilities[supportedKey] !== true || !Array.isArray(available) || !applicationPath) {
    warnings.push(warning("runtime-validation-required", configPath, `${JSON.stringify(requested)} has no confirmed ${host} role-level application path and availability evidence`, {
      source: selected.source,
      input: requested,
      candidates: available,
      causeSource: capabilitySources[supportedKey],
    }));
    return { requested, effective: "inherit", source: "fallback", inputSource: selected.source, status: "pending-validation" };
  }

  return {
    requested,
    effective: requested,
    source: selected.source,
    status: "applied",
    applicationPath,
  };
}

function lifecycleAction({ mode, event, role, capabilities, capabilitySources, rotate, warnings, host }) {
  if (role === "planner" && event === "retry" && !rotate.includes(role)) {
    return { action: "idle", reason: "implementation retry does not require Planner" };
  }
  if (capabilities.subagents === false) {
    return { action: "isolated-work-unit", reason: "subagents unavailable" };
  }
  if (rotate.includes(role)) return { action: "fresh", reason: "explicit rotation" };
  if (event === "initial") return { action: "fresh", reason: "no prior role session" };

  const wantsResume = event === "retry" || mode === "balanced" || role === "planner";
  if (!wantsResume) return { action: "fresh", reason: "fresh mode at Sprint boundary" };
  if (capabilities.resume === true) {
    return { action: "resume", reason: event === "retry" ? "same Sprint retry" : "balanced role reuse" };
  }

  const configPath = `lifecycle.${host}.${role}`;
  const code = capabilities.resume === false ? "resume-unsupported" : "resume-unconfirmed";
  const reason = capabilities.resume === false
    ? `${host} cannot resume this role; starting a new isolated work unit`
    : `${host} resume capability is unconfirmed; use a new isolated work unit unless the host confirms resume`;
  warnings.push(warning(code, configPath, reason, {
    effective: "isolated-work-unit",
    source: capabilitySources.resume,
    input: capabilities.resume,
    causeSource: "capability",
  }));
  return { action: "isolated-work-unit", reason: "resume unavailable or unconfirmed" };
}

function validateRotate(rotate) {
  if (!Array.isArray(rotate)) throw new Error("rotate must be an array of role names");
  const normalized = rotate.map((role) => typeof role === "string" ? role.trim() : role).filter(Boolean);
  const invalid = normalized.filter((role) => !ROLES.includes(role));
  if (invalid.length) {
    throw new Error(`invalid --rotate role(s): ${invalid.join(", ")}; expected ${ROLES.join(", ")}`);
  }
  return [...new Set(normalized)];
}

export function resolveRuntimeConfig({
  root = process.cwd(),
  event = "initial",
  host: selectedHost = "all",
  capabilityOverrides,
  capabilitySource = "capability",
  capabilityDiagnostics = [],
  rotate = [],
} = {}) {
  const warnings = [...capabilityDiagnostics];
  const normalizedRotate = validateRotate(rotate);
  const sharedPath = path.join(root, ".harness", "config.json");
  const personalPath = path.join(root, ".harness", "config.local.json");
  const shared = readJson(sharedPath, ".harness/config.json", "shared", warnings);
  const personal = readJson(personalPath, ".harness/config.local.json", "personal", warnings);
  const { capabilities, sources: capabilitySources } = normalizeCapabilities(
    capabilityOverrides,
    warnings,
    capabilitySource,
  );

  let lifecycle = own(personal, "lifecycle")
    ? { value: personal.lifecycle, source: "personal" }
    : own(shared, "lifecycle")
      ? { value: shared.lifecycle, source: "shared" }
      : { value: DEFAULT_CONFIG.lifecycle, source: "plugin" };
  lifecycle.value = normalizeRuntimeValue(lifecycle.value);
  if (!["balanced", "fresh"].includes(lifecycle.value)) {
    warnings.push(warning("invalid-lifecycle", "lifecycle", "expected balanced or fresh", {
      effective: "balanced",
      source: lifecycle.source,
      input: lifecycle.value,
    }));
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
      const settings = {
        identity: {
          role,
          sessionPolicyKey: `${host}:${role}`,
          mustNotShareWith: ROLES.filter((otherRole) => otherRole !== role),
        },
      };
      for (const field of FIELDS) {
        settings[field] = resolveField({
          host,
          role,
          field,
          selected: chooseValue(personal, shared, host, role, field),
          capabilities: capabilities[host],
          capabilitySources: capabilitySources[host],
          warnings,
        });
      }
      settings.lifecycle = lifecycleAction({
        mode: lifecycle.value,
        event,
        role,
        capabilities: capabilities[host],
        capabilitySources: capabilitySources[host],
        rotate: normalizedRotate,
        warnings,
        host,
      });
      roles[role] = settings;
    }
    resolvedHosts[host] = {
      capabilities: capabilities[host],
      capabilitySources: capabilitySources[host],
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
    lifecycle: { mode: lifecycle.value, source: lifecycle.source, event, rotate: normalizedRotate },
    hosts: resolvedHosts,
    invariants: {
      separateGeneratorEvaluator: true,
      sessionPolicyKeys: {
        generator: "host:generator",
        evaluator: "host:evaluator",
      },
      stateSource: "canonical files",
      retryScope: "same Sprint",
    },
    warnings,
  };
}

function requireArg(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = { root: process.cwd(), event: "initial", host: "all", rotate: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = path.resolve(requireArg(argv, index++, arg));
    else if (arg === "--event") options.event = requireArg(argv, index++, arg);
    else if (arg === "--host") options.host = requireArg(argv, index++, arg);
    else if (arg === "--capabilities") options.capabilitiesPath = path.resolve(requireArg(argv, index++, arg));
    else if (arg === "--rotate") options.rotate = requireArg(argv, index++, arg).split(",").map((item) => item.trim()).filter(Boolean);
    else if (arg === "--json") options.json = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function readCapabilityFile(file) {
  if (!file) return { capabilityOverrides: undefined, capabilityDiagnostics: [], capabilitySource: "plugin" };
  const source = `capability:${file}`;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("capability input must be a regular file, not a symlink or directory");
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("capability top level must be an object");
    return { capabilityOverrides: value, capabilityDiagnostics: [], capabilitySource: source };
  } catch (error) {
    return {
      capabilityOverrides: undefined,
      capabilitySource: source,
      capabilityDiagnostics: [warning("invalid-capability-file", "capabilities", error.message, {
        source,
        causeSource: "capability",
      })],
    };
  }
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
      console.log(`  [${item.code}] ${item.path}: ${item.reason}; source=${item.source}; effective=${item.effective}`);
    }
  }
}

function usage() {
  return `Usage: node resolve-runtime-config.mjs [options]\n\n` +
    `  --root PATH             target repository (default: cwd)\n` +
    `  --host HOST             claudeCode, codex, or all\n` +
    `  --event EVENT           initial, sprint-change, or retry\n` +
    `  --capabilities FILE     observed host capabilities JSON file\n` +
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
    const capabilityInput = readCapabilityFile(options.capabilitiesPath);
    const result = resolveRuntimeConfig({ ...options, ...capabilityInput });
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else printText(result);
  } catch (error) {
    console.error(`Harness runtime configuration error: ${error.message}`);
    process.exit(1);
  }
}
