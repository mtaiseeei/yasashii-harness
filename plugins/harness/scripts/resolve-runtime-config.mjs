#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parse: parseToml } = require("../vendor/smol-toml/index.cjs");

const HOSTS = ["claudeCode", "codex"];
const ROLES = ["planner", "generator", "evaluator"];
const FIELDS = ["model", "effort"];
const ESCALATION_FIELDS = ["model", "effort", "after_failures", "on_evaluator_recommendation"];
const CAPABILITY_FLAGS = ["subagents", "resume", "roleModel", "roleEffort"];
const CAPABILITY_LISTS = ["models", "efforts"];
const MAX_DIAGNOSTIC_INPUT_LENGTH = 4096;
const MAX_DIAGNOSTIC_REASON_LENGTH = 1024;

export const DEFAULT_CONFIG = Object.freeze({
  version: 1,
  lifecycle: "balanced",
  hosts: Object.fromEntries(
    HOSTS.map((host) => [
      host,
      {
        roles: Object.fromEntries(ROLES.map((role) => {
          if (host === "codex" && role === "planner") {
            return [role, { model: "gpt-5.6-sol", effort: "high" }];
          }
          if (host === "codex" && role === "generator") {
            return [role, {
              model: "gpt-5.6-luna",
              effort: "xhigh",
              escalation: {
                model: "gpt-5.6-sol",
                effort: "high",
                after_failures: 2,
                on_evaluator_recommendation: true,
              },
            }];
          }
          if (host === "codex" && role === "evaluator") {
            return [role, { model: "gpt-5.6-sol", effort: "high" }];
          }
          return [role, { model: "inherit", effort: "inherit" }];
        })),
      },
    ]),
  ),
});

const DEFAULT_CAPABILITIES = Object.freeze({
  claudeCode: {
    subagents: true,
    // Follow-up support alone does not prove that a resumed role keeps its
    // routed model/effort. Require an observed capability snapshot.
    resume: null,
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
  line,
  column,
} = {}) {
  const item = { code, path: configPath, reason, effective, source };
  if (input !== undefined) item.input = input;
  if (Array.isArray(candidates) && candidates.length) item.candidates = candidates;
  if (causeSource) item.causeSource = causeSource;
  if (Number.isInteger(line) && line > 0) item.line = line;
  if (Number.isInteger(column) && column > 0) item.column = column;
  return item;
}

function own(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}

function truncateDiagnosticText(value, maxLength) {
  if (typeof value !== "string" || value.length <= maxLength) return value;
  let prefixLength = maxLength;
  for (let index = 0; index < 4; index += 1) {
    const suffix = `\n...[truncated ${value.length - prefixLength} characters]`;
    const nextPrefixLength = Math.max(0, maxLength - suffix.length);
    if (nextPrefixLength === prefixLength) break;
    prefixLength = nextPrefixLength;
  }
  const suffix = `\n...[truncated ${value.length - prefixLength} characters]`;
  return `${value.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`;
}

function oversizedTomlInputMarker(length) {
  return `[redacted oversized TOML input; size=${length} characters]`;
}

function tomlParseDiagnostic(error, { redactDetails }) {
  const line = Number.isInteger(error?.line) && error.line > 0 ? error.line : undefined;
  const column = Number.isInteger(error?.column) && error.column > 0 ? error.column : undefined;

  let summary;
  if (redactDetails) {
    summary = "Invalid TOML document; source details redacted for oversized input";
  } else {
    let message = typeof error?.message === "string" ? error.message : "Invalid TOML document";
    if (typeof error?.codeblock === "string" && error.codeblock) {
      message = message.replace(error.codeblock, "");
    }
    message = message.replace(/```[\s\S]*?```/g, "");
    summary = message.split(/\r?\n/).map((part) => part.trim()).find(Boolean)
      || "Invalid TOML document";
    summary = summary.replace(/\s+/g, " ");
    if (!/^Invalid TOML document\b/.test(summary)) {
      summary = `Invalid TOML document: ${summary}`;
    }
  }

  const position = line && column
    ? ` (line ${line}, column ${column})`
    : line
      ? ` (line ${line})`
      : "";
  return {
    reason: truncateDiagnosticText(`${summary}${position}`, MAX_DIAGNOSTIC_REASON_LENGTH),
    line,
    column,
  };
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

function readToml(file, label, source, warnings) {
  if (!fs.existsSync(file)) return null;
  let input;
  try {
    input = fs.readFileSync(file, "utf8");
    const value = parseToml(input);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      warnings.push(warning("invalid-config", label, "top level must be a TOML table", { source }));
      return null;
    }
    return value;
  } catch (error) {
    const oversized = typeof input === "string" && input.length > MAX_DIAGNOSTIC_INPUT_LENGTH;
    const diagnosticInput = oversized
      ? oversizedTomlInputMarker(input.length)
      : input ?? null;
    const diagnostic = tomlParseDiagnostic(error, { redactDetails: oversized });
    warnings.push(warning("invalid-toml", label, diagnostic.reason, {
      source,
      input: diagnosticInput,
      line: diagnostic.line,
      column: diagnostic.column,
    }));
    return null;
  }
}

function validateConfig(config, label, source, warnings, { legacy = false } = {}) {
  if (!config) return;
  const inspectTable = (value, configPath, allowed) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      warnings.push(warning("invalid-config-type", configPath, "expected a table", {
        source,
        input: value,
      }));
      return false;
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) {
        warnings.push(warning("unknown-config-key", `${configPath}.${key}`, "unknown configuration key", {
          source,
          input: value[key],
        }));
      }
    }
    return true;
  };

  inspectTable(config, label, ["version", "lifecycle", "hosts", ...(legacy ? ["$comment", "references", "policy"] : [])]);
  if (own(config, "version") && config.version !== 1) {
    warnings.push(warning("invalid-config-value", `${label}.version`, "expected integer 1", {
      source,
      input: config.version,
    }));
  }
  if (!own(config, "hosts")) return;
  if (!inspectTable(config.hosts, `${label}.hosts`, HOSTS)) return;
  for (const host of HOSTS) {
    if (!own(config.hosts, host)) continue;
    const hostValue = config.hosts[host];
    if (!inspectTable(hostValue, `${label}.hosts.${host}`, ["roles"])) continue;
    if (!own(hostValue, "roles")) continue;
    if (!inspectTable(hostValue.roles, `${label}.hosts.${host}.roles`, ROLES)) continue;
    for (const role of ROLES) {
      if (!own(hostValue.roles, role)) continue;
      const roleValue = hostValue.roles[role];
      const allowsEscalation = host === "codex" && role === "generator";
      if (!inspectTable(
        roleValue,
        `${label}.hosts.${host}.roles.${role}`,
        [...FIELDS, ...(allowsEscalation ? ["escalation"] : [])],
      )) continue;
      if (!allowsEscalation || !own(roleValue, "escalation")) continue;
      const escalationPath = `${label}.hosts.${host}.roles.generator.escalation`;
      if (!inspectTable(roleValue.escalation, escalationPath, ESCALATION_FIELDS)) continue;
      const escalation = roleValue.escalation;
      if (own(escalation, "after_failures")
        && (!Number.isInteger(escalation.after_failures)
          || escalation.after_failures < 1
          || escalation.after_failures >= 3)) {
        warnings.push(warning(
          "invalid-config-value",
          `${escalationPath}.after_failures`,
          "expected an integer from 1 to 2; 3 consecutive failures stop for user input",
          { source, input: escalation.after_failures },
        ));
      }
      if (own(escalation, "on_evaluator_recommendation")
        && typeof escalation.on_evaluator_recommendation !== "boolean") {
        warnings.push(warning(
          "invalid-config-value",
          `${escalationPath}.on_evaluator_recommendation`,
          "expected true or false",
          { source, input: escalation.on_evaluator_recommendation },
        ));
      }
    }
  }
}

function readConfigFamily(root, warnings) {
  const harnessDir = path.join(root, ".harness");
  const paths = {
    sharedToml: path.join(harnessDir, "config.toml"),
    personalToml: path.join(harnessDir, "config.local.toml"),
    sharedJson: path.join(harnessDir, "config.json"),
    personalJson: path.join(harnessDir, "config.local.json"),
  };
  const hasToml = fs.existsSync(paths.sharedToml) || fs.existsSync(paths.personalToml);
  let shared;
  let personal;
  let format;

  if (hasToml) {
    format = "toml";
    shared = readToml(paths.sharedToml, ".harness/config.toml", "shared", warnings);
    personal = readToml(paths.personalToml, ".harness/config.local.toml", "personal", warnings);
    for (const [kind, file, label] of [
      ["shared", paths.sharedJson, ".harness/config.json"],
      ["personal", paths.personalJson, ".harness/config.local.json"],
    ]) {
      if (fs.existsSync(file)) {
        warnings.push(warning("legacy-json-ignored", label, "TOML configuration is present; legacy JSON is not merged", {
          effective: "toml",
          source: kind,
          input: file,
        }));
      }
    }
  } else {
    const hasLegacy = fs.existsSync(paths.sharedJson) || fs.existsSync(paths.personalJson);
    format = hasLegacy ? "legacy-json" : "default";
    shared = readJson(paths.sharedJson, ".harness/config.json", "shared", warnings);
    personal = readJson(paths.personalJson, ".harness/config.local.json", "personal", warnings);
    if (hasLegacy) {
      for (const [kind, file, label] of [
        ["shared", paths.sharedJson, ".harness/config.json"],
        ["personal", paths.personalJson, ".harness/config.local.json"],
      ]) {
        if (fs.existsSync(file)) {
          warnings.push(warning(
            "legacy-json-config",
            label,
            "legacy JSON configuration was loaded for compatibility; migrate to .harness/config.toml and .harness/config.local.toml",
            { effective: "legacy-json", source: kind, input: file },
          ));
        }
      }
    }
  }

  validateConfig(shared, format === "toml" ? ".harness/config.toml" : ".harness/config.json", "shared", warnings, { legacy: format === "legacy-json" });
  validateConfig(personal, format === "toml" ? ".harness/config.local.toml" : ".harness/config.local.json", "personal", warnings, { legacy: format === "legacy-json" });
  return { shared, personal, paths, format };
}

function explicitValue(config, host, role, field) {
  const roleConfig = config?.hosts?.[host]?.roles?.[role];
  return own(roleConfig, field) ? roleConfig[field] : undefined;
}

function explicitEscalationValue(config, field) {
  const escalation = config?.hosts?.codex?.roles?.generator?.escalation;
  return own(escalation, field) ? escalation[field] : undefined;
}

function chooseValue(personal, shared, host, role, field) {
  const personalValue = explicitValue(personal, host, role, field);
  if (personalValue !== undefined) return { value: personalValue, source: "personal" };
  const sharedValue = explicitValue(shared, host, role, field);
  if (sharedValue !== undefined) return { value: sharedValue, source: "shared" };
  return { value: DEFAULT_CONFIG.hosts[host].roles[role][field], source: "plugin" };
}

function chooseEscalationValue(personal, shared, field, warnings) {
  const personalValue = explicitEscalationValue(personal, field);
  const sharedValue = explicitEscalationValue(shared, field);
  const defaultValue = DEFAULT_CONFIG.hosts.codex.roles.generator.escalation[field];
  const selected = personalValue !== undefined
    ? { value: personalValue, source: "personal" }
    : sharedValue !== undefined
      ? { value: sharedValue, source: "shared" }
      : { value: defaultValue, source: "plugin" };
  const configPath = `hosts.codex.roles.generator.escalation.${field}`;

  if (field === "after_failures") {
    if (!Number.isInteger(selected.value) || selected.value < 1 || selected.value >= 3) {
      return { value: defaultValue, source: "fallback", inputSource: selected.source };
    }
  } else if (field === "on_evaluator_recommendation") {
    if (typeof selected.value !== "boolean") {
      return { value: defaultValue, source: "fallback", inputSource: selected.source };
    }
  } else {
    const normalized = normalizeRuntimeValue(selected.value);
    if (typeof normalized !== "string" || !normalized) {
      warnings.push(warning("invalid-value", configPath, "value must be a non-empty string", {
        source: selected.source,
        input: selected.value,
      }));
      return { value: defaultValue, source: "fallback", inputSource: selected.source };
    }
    selected.value = normalized;
  }
  return selected;
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

function resolveField({ host, role, field, selected, capabilities, capabilitySources, warnings, configPath: explicitPath }) {
  const configPath = explicitPath ?? `hosts.${host}.roles.${role}.${field}`;
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
    status: "dispatch-ready",
    applicationPath,
    launchVerified: false,
  };
}

function lifecycleAction({
  mode,
  event,
  role,
  capabilities,
  capabilitySources,
  rotate,
  warnings,
  host,
  route,
  forceFreshReason,
}) {
  if (route.stopReason) return { action: "idle", reason: route.stopReason };
  if (route.failureKind === "spec-issue" && role !== "planner") {
    return { action: "idle", reason: "spec issue routes to Planner" };
  }
  if (role === "planner" && event === "retry" && route.failureKind !== "spec-issue" && !rotate.includes(role)) {
    return { action: "idle", reason: "implementation retry does not require Planner" };
  }
  if (capabilities.subagents === false) {
    return { action: "isolated-work-unit", reason: "subagents unavailable" };
  }
  if (forceFreshReason) return { action: "fresh", reason: forceFreshReason };
  if (rotate.includes(role)) return { action: "fresh", reason: "explicit rotation" };
  if (event === "initial") return { action: "fresh", reason: "no prior role session" };

  const wantsResume = event === "retry" || mode === "balanced" || role === "planner";
  if (!wantsResume) return { action: "fresh", reason: "fresh mode at Sprint boundary" };
  // `resume` means more than accepting a follow-up: the observed host path must
  // preserve the routed model and effort for the resumed turn.
  if (capabilities.resume === true) {
    return { action: "resume", reason: event === "retry" ? "same Sprint retry" : "balanced role reuse" };
  }

  const configPath = `lifecycle.${host}.${role}`;
  const code = capabilities.resume === false ? "resume-unsupported" : "resume-unconfirmed";
  const reason = capabilities.resume === false
    ? `${host} cannot preserve routed model/effort on resume; starting a new isolated work unit`
    : `${host} routing-preserving resume is unconfirmed; use a new isolated work unit unless host metadata confirms it`;
  warnings.push(warning(code, configPath, reason, {
    effective: "isolated-work-unit",
    source: capabilitySources.resume,
    input: capabilities.resume,
    causeSource: "capability",
  }));
  return { action: "isolated-work-unit", reason: "resume unavailable or unconfirmed" };
}

function normalizeRoutingInput({ retryCount, failureKind, evaluatorRecommendation, sprintRisk, currentModelTier }) {
  if (!Number.isInteger(retryCount) || retryCount < 0) {
    throw new Error("retryCount must be a non-negative integer");
  }
  if (![undefined, null, "implementation-issue", "spec-issue"].includes(failureKind)) {
    throw new Error("failureKind must be implementation-issue, spec-issue, or omitted");
  }
  if (![undefined, null, "standard", "high"].includes(sprintRisk)) {
    throw new Error("sprintRisk must be standard, high, or omitted");
  }
  if (!["unknown", "standard", "strong"].includes(currentModelTier)) {
    throw new Error("currentModelTier must be unknown, standard, or strong");
  }
  if (evaluatorRecommendation !== undefined && evaluatorRecommendation !== null) {
    if (!evaluatorRecommendation || typeof evaluatorRecommendation !== "object" || Array.isArray(evaluatorRecommendation)) {
      throw new Error("evaluatorRecommendation must be an object or omitted");
    }
    if (evaluatorRecommendation.tier !== "strong"
      || typeof evaluatorRecommendation.evidenceVerified !== "boolean") {
      throw new Error("evaluatorRecommendation requires tier=strong and boolean evidenceVerified");
    }
  }
  const normalizedFailure = failureKind ?? null;
  const stopReason = normalizedFailure === "implementation-issue" && retryCount >= 3
    ? "three-consecutive-failures"
    : null;
  const nextRole = stopReason
    ? "user"
    : normalizedFailure === "spec-issue"
      ? "planner"
      : "generator";
  return {
    retryCount,
    failureKind: normalizedFailure,
    evaluatorRecommendation: evaluatorRecommendation ?? null,
    sprintRisk: sprintRisk ?? "standard",
    currentModelTier,
    nextRole,
    stopReason,
  };
}

function requestedModelAvailable(selected, capabilities) {
  const value = normalizeRuntimeValue(selected.value);
  return typeof value !== "string"
    || value.length === 0
    || value === "inherit"
    || !Array.isArray(capabilities.models)
    || capabilities.models.includes(value);
}

function generatorTierDecision({ route, escalation, standardModel, capabilities }) {
  if (route.nextRole !== "generator") return { modelTier: null, reason: "generator-not-routed" };
  if (route.sprintRisk === "high") return { modelTier: "strong", reason: "high-risk-sprint" };
  if (escalation.onEvaluatorRecommendation.value
    && route.evaluatorRecommendation?.tier === "strong"
    && route.evaluatorRecommendation.evidenceVerified === true) {
    return { modelTier: "strong", reason: "evaluator-recommendation" };
  }
  if (route.failureKind === "implementation-issue"
    && route.retryCount >= escalation.afterFailures.value) {
    return { modelTier: "strong", reason: "retry-threshold" };
  }
  if (!requestedModelAvailable(standardModel, capabilities)) {
    return { modelTier: "strong", reason: "standard-model-unavailable" };
  }
  return {
    modelTier: "standard",
    reason: route.retryCount > 0 ? "retry-below-threshold" : "standard",
  };
}

function generatorRotateReason({ route, tier }) {
  if (route.nextRole !== "generator" || tier.modelTier === route.currentModelTier) return null;
  if (route.currentModelTier === "unknown") return "runtime-migration";
  if (tier.reason === "standard-model-unavailable") return "model-availability";
  return "model-escalation";
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
  retryCount = 0,
  failureKind,
  evaluatorRecommendation,
  sprintRisk = "standard",
  currentModelTier = "unknown",
} = {}) {
  const warnings = [...capabilityDiagnostics];
  const normalizedRotate = validateRotate(rotate);
  const { shared, personal, paths, format } = readConfigFamily(root, warnings);
  const { capabilities, sources: capabilitySources } = normalizeCapabilities(
    capabilityOverrides,
    warnings,
    capabilitySource,
  );
  const route = normalizeRoutingInput({
    retryCount,
    failureKind,
    evaluatorRecommendation,
    sprintRisk,
    currentModelTier,
  });
  const escalation = {
    model: chooseEscalationValue(personal, shared, "model", warnings),
    effort: chooseEscalationValue(personal, shared, "effort", warnings),
    afterFailures: chooseEscalationValue(personal, shared, "after_failures", warnings),
    onEvaluatorRecommendation: chooseEscalationValue(
      personal,
      shared,
      "on_evaluator_recommendation",
      warnings,
    ),
  };

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
      let forceFreshReason = null;
      if (host === "codex" && role === "generator") {
        const standardModel = chooseValue(personal, shared, host, role, "model");
        const tier = generatorTierDecision({
          route,
          escalation,
          standardModel,
          capabilities: capabilities[host],
        });
        const strong = tier.modelTier === "strong";
        const modelSelection = strong ? escalation.model : standardModel;
        settings.model = resolveField({
          host,
          role,
          field: "model",
          selected: modelSelection,
          capabilities: capabilities[host],
          capabilitySources: capabilitySources[host],
          warnings,
          configPath: strong
            ? "hosts.codex.roles.generator.escalation.model"
            : "hosts.codex.roles.generator.model",
        });
        const effortSelection = settings.model.effective === "inherit" && modelSelection.value !== "inherit"
          ? { value: "inherit", source: "fallback" }
          : strong
            ? escalation.effort
            : chooseValue(personal, shared, host, role, "effort");
        settings.effort = resolveField({
          host,
          role,
          field: "effort",
          selected: effortSelection,
          capabilities: capabilities[host],
          capabilitySources: capabilitySources[host],
          warnings,
          configPath: strong
            ? "hosts.codex.roles.generator.escalation.effort"
            : "hosts.codex.roles.generator.effort",
        });
        settings.routing = {
          modelTier: tier.modelTier,
          reason: tier.reason,
          rotateReason: generatorRotateReason({ route, tier }),
          afterFailures: escalation.afterFailures.value,
          onEvaluatorRecommendation: escalation.onEvaluatorRecommendation.value,
        };
        if (route.nextRole === "generator" && tier.modelTier !== route.currentModelTier) {
          forceFreshReason = `model tier change: ${route.currentModelTier} -> ${tier.modelTier}; ${tier.reason}`;
        }
      } else {
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
        if (role === "generator") {
          settings.routing = route.nextRole === "generator"
            ? { modelTier: "standard", reason: "host-default", rotateReason: null }
            : { modelTier: null, reason: "generator-not-routed", rotateReason: null };
        }
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
        route,
        forceFreshReason,
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
      format,
      shared: {
        path: format === "legacy-json" ? paths.sharedJson : paths.sharedToml,
        present: fs.existsSync(format === "legacy-json" ? paths.sharedJson : paths.sharedToml),
        valid: Boolean(shared),
      },
      personal: {
        path: format === "legacy-json" ? paths.personalJson : paths.personalToml,
        present: fs.existsSync(format === "legacy-json" ? paths.personalJson : paths.personalToml),
        valid: Boolean(personal),
      },
      legacy: {
        shared: { path: paths.sharedJson, present: fs.existsSync(paths.sharedJson) },
        personal: { path: paths.personalJson, present: fs.existsSync(paths.personalJson) },
      },
    },
    lifecycle: { mode: lifecycle.value, source: lifecycle.source, event, rotate: normalizedRotate },
    routing: {
      nextRole: route.nextRole,
      stopReason: route.stopReason,
      retryCount: route.retryCount,
      failureKind: route.failureKind,
      sprintRisk: route.sprintRisk,
      currentModelTier: route.currentModelTier,
      evaluatorRecommendation: route.evaluatorRecommendation,
    },
    verification: {
      configResolved: true,
      dispatchReadyDoesNotProveLaunch: true,
      launchVerified: false,
      launchStatus: "unverified",
      launchEvidence: null,
    },
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
  const options = {
    root: process.cwd(),
    event: "initial",
    host: "all",
    rotate: [],
    retryCount: 0,
    sprintRisk: "standard",
    currentModelTier: "unknown",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = path.resolve(requireArg(argv, index++, arg));
    else if (arg === "--event") options.event = requireArg(argv, index++, arg);
    else if (arg === "--host") options.host = requireArg(argv, index++, arg);
    else if (arg === "--capabilities") options.capabilitiesPath = path.resolve(requireArg(argv, index++, arg));
    else if (arg === "--rotate") options.rotate = requireArg(argv, index++, arg).split(",").map((item) => item.trim()).filter(Boolean);
    else if (arg === "--retry-count") options.retryCount = Number(requireArg(argv, index++, arg));
    else if (arg === "--failure-kind") options.failureKind = requireArg(argv, index++, arg);
    else if (arg === "--evaluator-recommendation") {
      options.evaluatorRecommendation = {
        tier: requireArg(argv, index++, arg),
        evidenceVerified: false,
      };
    }
    else if (arg === "--evaluator-evidence-verified") {
      options.evaluatorEvidenceVerified = true;
    }
    else if (arg === "--sprint-risk") options.sprintRisk = requireArg(argv, index++, arg);
    else if (arg === "--current-model-tier") options.currentModelTier = requireArg(argv, index++, arg);
    else if (arg === "--json") options.json = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (options.evaluatorEvidenceVerified) {
    if (!options.evaluatorRecommendation) {
      throw new Error("--evaluator-evidence-verified requires --evaluator-recommendation strong");
    }
    options.evaluatorRecommendation.evidenceVerified = true;
    delete options.evaluatorEvidenceVerified;
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
  console.log(`Routing: next=${result.routing.nextRole}; current-tier=${result.routing.currentModelTier}; stop=${result.routing.stopReason ?? "none"}; launch-verified=false`);
  for (const [host, hostConfig] of Object.entries(result.hosts)) {
    console.log(`\n${host}`);
    for (const [role, roleConfig] of Object.entries(hostConfig.roles)) {
      console.log(
        `  ${role}: ${roleConfig.lifecycle.action}; model=${roleConfig.model.effective} (${roleConfig.model.source}); effort=${roleConfig.effort.effective} (${roleConfig.effort.source})${roleConfig.routing ? `; tier=${roleConfig.routing.modelTier}` : ""}`,
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
    `  --retry-count N         consecutive implementation failures for the Sprint\n` +
    `  --failure-kind KIND     implementation-issue or spec-issue\n` +
    `  --evaluator-recommendation strong\n` +
    `  --evaluator-evidence-verified  confirm recommendation evidence was checked\n` +
    `  --sprint-risk RISK      standard or high\n` +
    `  --current-model-tier TIER  unknown, standard, or strong from docs/sprints/state.md\n` +
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
