import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildFastSingleFileTscArgs,
  buildProjectTscArgs,
  buildReferenceSearchCommand,
} from '../code-intel.js';

const REQUIRED_TOOLS = [
  'lsp_diagnostics',
  'lsp_diagnostics_directory',
  'lsp_document_symbols',
  'lsp_workspace_symbols',
  'lsp_hover',
  'lsp_find_references',
  'lsp_servers',
  'ast_grep_search',
  'ast_grep_replace',
] as const;

describe('mcp/code-intel-server module contract', () => {
  it('builds a fast single-file tsc command with safe defaults', () => {
    const args = buildFastSingleFileTscArgs('src/hud/render.ts');

    assert.deepEqual(args, [
      '--noEmit',
      '--pretty',
      'false',
      '--skipLibCheck',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      'src/hud/render.ts',
    ]);
  });

  it('preserves project-level diagnostics args for directory checks', () => {
    assert.deepEqual(buildProjectTscArgs('/repo/tsconfig.json'), [
      '--noEmit',
      '--pretty',
      'false',
      '--project',
      '/repo/tsconfig.json',
    ]);
  });

  it('builds ripgrep reference search commands that skip generated directories', () => {
    const command = buildReferenceSearchCommand('sanitizeDynamicText', '/repo', 'rg');

    assert.equal(command.cmd, 'rg');
    assert.deepEqual(command.args, [
      '--line-number',
      '--with-filename',
      '--glob',
      '!node_modules/**',
      '--glob',
      '!dist/**',
      '--glob',
      '!.git/**',
      '--type-add',
      'omxcode:*.ts',
      '--type-add',
      'omxcode:*.tsx',
      '--type-add',
      'omxcode:*.js',
      '--type-add',
      'omxcode:*.jsx',
      '--type-add',
      'omxcode:*.py',
      '--type-add',
      'omxcode:*.go',
      '--type-add',
      'omxcode:*.rs',
      '--word-regexp',
      '--type',
      'omxcode',
      'sanitizeDynamicText',
      '/repo',
    ]);
  });

  it('falls back to grep with exclude-dir flags when ripgrep is unavailable', () => {
    const command = buildReferenceSearchCommand('sanitizeDynamicText', '/repo', 'grep');

    assert.equal(command.cmd, 'grep');
    assert.deepEqual(command.args, [
      '-rn',
      '--exclude-dir=node_modules',
      '--exclude-dir=dist',
      '--exclude-dir=.git',
      '--include=*.ts',
      '--include=*.tsx',
      '--include=*.js',
      '--include=*.jsx',
      '--include=*.py',
      '--include=*.go',
      '--include=*.rs',
      '-w',
      'sanitizeDynamicText',
      '/repo',
    ]);
  });

  it('declares expected MCP tools and diagnostics command shape', async () => {
    const src = await readFile(join(process.cwd(), 'src/mcp/code-intel-server.ts'), 'utf8');

    const toolNames = Array.from(src.matchAll(/name:\s*'([^']+)'/g)).map((m) => m[1]);
    for (const tool of REQUIRED_TOOLS) {
      assert.ok(toolNames.includes(tool), `missing tool declaration: ${tool}`);
    }

    assert.match(src, /new Server\(\s*\{ name: 'omx-code-intel', version: '0\.1\.0' \}/);
  });

  it('delegates stdio lifecycle bootstrapping to the shared MCP bootstrap helper', async () => {
    const src = await readFile(join(process.cwd(), 'src/mcp/code-intel-server.ts'), 'utf8');

    assert.match(src, /autoStartStdioMcpServer\('code_intel', server\)/);
    assert.doesNotMatch(src, /new StdioServerTransport\(\)/);
    assert.doesNotMatch(src, /server\.connect\(transport\)\.catch\(console\.error\);/);
  });

  it('applies ast-grep rewrites only when dryRun=false', async () => {
    const src = await readFile(join(process.cwd(), 'src/mcp/code-intel-server.ts'), 'utf8');
    assert.match(src, /export function buildAstGrepRunArgs/);
    assert.match(src, /if \(!options\.dryRun\) \{\s*args\.push\('--update-all'\);/);
    assert.match(src, /args\.push\('--rewrite', options\.replacement\);/);
  });

  it('keeps dry-run/search behavior distinct from apply mode', async () => {
    const src = await readFile(join(process.cwd(), 'src/mcp/code-intel-server.ts'), 'utf8');
    assert.match(src, /if \(options\.replacement\) \{/);
    assert.match(src, /else \{\s*args\.push\('--json'\);/);
  });
});
