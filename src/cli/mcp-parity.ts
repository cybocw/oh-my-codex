import process from 'node:process';

export interface ParsedMcpCliArgs {
  toolName: string | null;
  input: Record<string, unknown>;
  json: boolean;
  help: boolean;
}

interface McpToolDescriptor {
  name: string;
  description?: string;
}

interface McpCommandDescriptor {
  commandName: McpParityCommandName;
  title: string;
  tools: McpToolDescriptor[];
  aliases?: Record<string, string>;
}

interface McpToolCallResult {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

type McpToolHandler = (request: {
  params: { name: string; arguments?: Record<string, unknown> };
}) => Promise<McpToolCallResult>;

type LoadedMcpCommandDescriptor = McpCommandDescriptor & {
  handle: McpToolHandler;
};

export type McpParityCommandName =
  | 'state'
  | 'notepad'
  | 'project-memory'
  | 'trace'
  | 'code-intel';

export type McpParityCommandResult =
  | { ok: true; help: string }
  | { ok: true; data: unknown }
  | { ok: false; error: unknown };

function buildDescriptorHelp(descriptor: McpCommandDescriptor): string {
  const toolLines = descriptor.tools
    .map((tool) => `  - ${tool.name}${tool.description ? ` — ${tool.description}` : ''}`)
    .join('\n');

  return [
    `Usage: omx ${descriptor.commandName} <tool-name> [--input <json>] [--json]`,
    '',
    descriptor.title,
    '',
    'Available tools:',
    toolLines,
    '',
    'Examples:',
    `  omx ${descriptor.commandName} ${descriptor.tools[0]?.name ?? '<tool>'} --input '{}' --json`,
  ].join('\n');
}

function parseInputJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('input JSON must decode to an object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Invalid --input JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function parseMcpCliArgs(args: readonly string[]): ParsedMcpCliArgs {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    return { toolName: null, input: {}, json: false, help: true };
  }

  const [toolName, ...rest] = args;
  let input: Record<string, unknown> = {};
  let json = false;

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === '--json') {
      json = true;
      continue;
    }
    if (token === '--input') {
      const next = rest[index + 1];
      if (!next) throw new Error('Missing value for --input');
      input = parseInputJson(next);
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h' || token === 'help') {
      return { toolName: null, input: {}, json: false, help: true };
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return { toolName, input, json, help: false };
}

function extractPayload(result: McpToolCallResult): unknown {
  const text = result.content
    ?.filter((entry) => entry.type === 'text' && typeof entry.text === 'string')
    .map((entry) => entry.text)
    .join('\n')
    .trim() ?? '';

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function importWithAutoStartDisabled<T>(
  envName: string,
  importer: () => Promise<T>,
): Promise<T> {
  const previous = process.env[envName];
  process.env[envName] = '1';
  try {
    return await importer();
  } finally {
    if (typeof previous === 'string') {
      process.env[envName] = previous;
    } else {
      delete process.env[envName];
    }
  }
}

async function executeDescriptorCommand(
  args: readonly string[],
  loadDescriptor: () => Promise<LoadedMcpCommandDescriptor>,
): Promise<McpParityCommandResult> {
  const descriptor = await loadDescriptor();
  const parsed = parseMcpCliArgs(args);

  if (parsed.help || !parsed.toolName) {
    return { ok: true, help: buildDescriptorHelp(descriptor) };
  }

  const toolName = descriptor.aliases?.[parsed.toolName] ?? parsed.toolName;
  const allowedTools = new Set(descriptor.tools.map((tool) => tool.name));
  if (!allowedTools.has(toolName)) {
    throw new Error(
      `Unknown ${descriptor.commandName} tool: ${parsed.toolName}\n${buildDescriptorHelp(descriptor)}`,
    );
  }

  const result = await descriptor.handle({
    params: {
      name: toolName,
      arguments: parsed.input,
    },
  });
  const payload = extractPayload(result);

  return result.isError ? { ok: false, error: payload } : { ok: true, data: payload };
}

async function runDescriptorCommand(
  args: readonly string[],
  loadDescriptor: () => Promise<LoadedMcpCommandDescriptor>,
): Promise<void> {
  const parsed = parseMcpCliArgs(args);
  const result = await executeDescriptorCommand(args, loadDescriptor);

  if ('help' in result) {
    console.log(result.help);
    return;
  }

  const payload = 'data' in result ? result.data : result.error;
  if (parsed.json) {
    console.log(JSON.stringify(payload));
  } else if (typeof payload === 'string') {
    console.log(payload);
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function loadStateDescriptor(): Promise<LoadedMcpCommandDescriptor> {
  const { buildStateServerTools, handleStateToolCall } = await importWithAutoStartDisabled(
    'OMX_STATE_SERVER_DISABLE_AUTO_START',
    async () => await import('../mcp/state-server.js'),
  );

  return {
    commandName: 'state',
    title: 'CLI parity surface for OMX state MCP tools.',
    tools: buildStateServerTools().map(({ name, description }) => ({ name, description })),
    aliases: {
      read: 'state_read',
      write: 'state_write',
      clear: 'state_clear',
      'list-active': 'state_list_active',
      'get-status': 'state_get_status',
    },
    handle: handleStateToolCall,
  };
}

async function loadMemoryDescriptor(
  commandName: 'notepad' | 'project-memory',
  prefix: 'notepad_' | 'project_memory_',
  title: string,
): Promise<LoadedMcpCommandDescriptor> {
  const { buildMemoryServerTools, handleMemoryToolCall } = await importWithAutoStartDisabled(
    'OMX_MEMORY_SERVER_DISABLE_AUTO_START',
    async () => await import('../mcp/memory-server.js'),
  );

  return {
    commandName,
    title,
    tools: buildMemoryServerTools()
      .filter((tool) => tool.name.startsWith(prefix))
      .map(({ name, description }) => ({ name, description })),
    aliases:
      commandName === 'notepad'
        ? {
            read: 'notepad_read',
            'write-priority': 'notepad_write_priority',
            'write-working': 'notepad_write_working',
            'write-manual': 'notepad_write_manual',
            prune: 'notepad_prune',
            stats: 'notepad_stats',
          }
        : {
            read: 'project_memory_read',
            write: 'project_memory_write',
            'add-note': 'project_memory_add_note',
            'add-directive': 'project_memory_add_directive',
          },
    handle: handleMemoryToolCall,
  };
}

async function loadTraceDescriptor(): Promise<LoadedMcpCommandDescriptor> {
  const { buildTraceServerTools, handleTraceToolCall } = await importWithAutoStartDisabled(
    'OMX_TRACE_SERVER_DISABLE_AUTO_START',
    async () => await import('../mcp/trace-server.js'),
  );

  return {
    commandName: 'trace',
    title: 'CLI parity surface for OMX trace MCP tools.',
    tools: buildTraceServerTools().map(({ name, description }) => ({ name, description })),
    aliases: {
      timeline: 'trace_timeline',
      summary: 'trace_summary',
    },
    handle: handleTraceToolCall,
  };
}

async function loadCodeIntelDescriptor(): Promise<LoadedMcpCommandDescriptor> {
  const { buildCodeIntelServerTools, handleCodeIntelToolCall } =
    await importWithAutoStartDisabled(
      'OMX_CODE_INTEL_SERVER_DISABLE_AUTO_START',
      async () => await import('../mcp/code-intel-server.js'),
    );

  return {
    commandName: 'code-intel',
    title: 'CLI parity surface for OMX code-intel MCP tools.',
    tools: buildCodeIntelServerTools().map(({ name, description }) => ({ name, description })),
    handle: handleCodeIntelToolCall,
  };
}

function descriptorLoader(commandName: McpParityCommandName) {
  switch (commandName) {
    case 'state':
      return loadStateDescriptor;
    case 'notepad':
      return async () =>
        await loadMemoryDescriptor(
          'notepad',
          'notepad_',
          'CLI parity surface for OMX notepad MCP tools.',
        );
    case 'project-memory':
      return async () =>
        await loadMemoryDescriptor(
          'project-memory',
          'project_memory_',
          'CLI parity surface for OMX project-memory MCP tools.',
        );
    case 'trace':
      return loadTraceDescriptor;
    case 'code-intel':
      return loadCodeIntelDescriptor;
  }
}

export async function mcpParityCommand(
  commandName: McpParityCommandName,
  args: readonly string[],
): Promise<void> {
  await runDescriptorCommand(args, descriptorLoader(commandName));
}

export async function executeMcpParityCommand(
  commandName: McpParityCommandName,
  args: readonly string[],
): Promise<McpParityCommandResult> {
  return await executeDescriptorCommand(args, descriptorLoader(commandName));
}
