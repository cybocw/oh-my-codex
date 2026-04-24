import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseTeamWorkerLaunchArgs } from "../team/model-contract.js";
import { codexConfigPath } from "../utils/paths.js";

const CONFIG_FLAG = "-c";
const SUMMARY_KEY = "model_reasoning_summary";
const CODEX_HELP_FLAGS = new Set(["--help", "-h"]);
const CODEX_VERSION_FLAGS = new Set(["--version", "-V"]);

function parseTomlStringValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function readTopLevelTomlString(
  content: string,
  key: string,
): string | null {
  let inTopLevel = true;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^\[[^[\]]+\]\s*(#.*)?$/.test(trimmed)) {
      inTopLevel = false;
      continue;
    }
    if (!inTopLevel) continue;
    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (!match || match[1] !== key) continue;
    return parseTomlStringValue(match[2]);
  }
  return null;
}

function readConfiguredLaunchModel(codexHomeOverride?: string): string | null {
  const configPath = codexHomeOverride
    ? join(codexHomeOverride, "config.toml")
    : codexConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    return readTopLevelTomlString(readFileSync(configPath, "utf-8"), "model");
  } catch {
    return null;
  }
}

function isSparkModel(model?: string | null): boolean {
  return typeof model === "string" && model.trim().toLowerCase().includes("spark");
}

function isCodexVersionRequest(args: readonly string[]): boolean {
  return args.some((arg) => CODEX_VERSION_FLAGS.has(arg));
}

function hasCodexHelpFlag(args: readonly string[]): boolean {
  return args.some((arg) => CODEX_HELP_FLAGS.has(arg));
}

export function injectSparkReasoningSummaryCompatArgs(
  args: string[],
  codexHomeOverride?: string,
): string[] {
  if (hasCodexHelpFlag(args) || isCodexVersionRequest(args)) return [...args];

  const parsed = parseTeamWorkerLaunchArgs(args);
  const selectedModel = parsed.modelOverride ?? readConfiguredLaunchModel(codexHomeOverride);
  if (!isSparkModel(selectedModel) || parsed.summaryOverride) return [...args];

  return [...args, CONFIG_FLAG, `${SUMMARY_KEY}="none"`];
}
