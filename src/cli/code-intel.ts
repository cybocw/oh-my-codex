import {
  executeMcpParityCommand,
  mcpParityCommand,
  parseMcpCliArgs,
  type McpParityCommandResult,
  type ParsedMcpCliArgs,
} from './mcp-parity.js';

export const CODE_INTEL_USAGE = 'Usage: omx code-intel <tool-name> [--input <json>] [--json]';

export type ParsedCodeIntelCliArgs = ParsedMcpCliArgs;
export type CodeIntelCommandResult = McpParityCommandResult;

export const parseCodeIntelCliArgs = parseMcpCliArgs;

export async function executeCodeIntelCommand(
  args: readonly string[],
): Promise<CodeIntelCommandResult> {
  return await executeMcpParityCommand('code-intel', args);
}

export async function codeIntelCommand(args: readonly string[]): Promise<void> {
  await mcpParityCommand('code-intel', args);
}
