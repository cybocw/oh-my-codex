export interface FastTscCompilerOptions {
  target?: string;
  module?: string;
  moduleResolution?: string;
  jsx?: string;
  allowJs?: boolean;
  checkJs?: boolean;
}

const DEFAULT_FAST_TSC_COMPILER_OPTIONS: Required<
  Pick<FastTscCompilerOptions, 'target' | 'module' | 'moduleResolution'>
> = {
  target: 'ES2022',
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
};

export function buildProjectTscArgs(tsconfig: string | null): string[] {
  const args = ['--noEmit', '--pretty', 'false'];
  if (tsconfig) {
    args.push('--project', tsconfig);
  }
  return args;
}

export function buildFastSingleFileTscArgs(
  file: string,
  compilerOptions: FastTscCompilerOptions = {},
): string[] {
  const options = {
    ...DEFAULT_FAST_TSC_COMPILER_OPTIONS,
    ...compilerOptions,
  };
  const args = ['--noEmit', '--pretty', 'false', '--skipLibCheck'];

  if (options.target) {
    args.push('--target', options.target);
  }
  if (options.module) {
    args.push('--module', options.module);
  }
  if (options.moduleResolution) {
    args.push('--moduleResolution', options.moduleResolution);
  }
  if (options.jsx) {
    args.push('--jsx', options.jsx);
  }
  if (typeof options.allowJs === 'boolean') {
    args.push('--allowJs', String(options.allowJs));
  }
  if (typeof options.checkJs === 'boolean') {
    args.push('--checkJs', String(options.checkJs));
  }

  args.push(file);
  return args;
}

export function buildReferenceSearchCommand(
  symbol: string,
  dir: string,
  engine: 'rg' | 'grep' = 'rg',
): { cmd: 'rg' | 'grep'; args: string[] } {
  if (engine === 'rg') {
    return {
      cmd: 'rg',
      args: [
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
        symbol,
        dir,
      ],
    };
  }

  return {
    cmd: 'grep',
    args: [
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
      symbol,
      dir,
    ],
  };
}
