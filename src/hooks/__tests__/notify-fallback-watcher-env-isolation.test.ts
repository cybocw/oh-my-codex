import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const WATCHER_ISOLATED_HOME = join(tmpdir(), 'omx-notify-test-home');
const WATCHER_RECENT_EVENT_FUTURE_MS = 30_000;

function todaySessionDir(baseHome: string): string {
  const now = new Date();
  return join(
    baseHome,
    '.codex',
    'sessions',
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0')
  );
}

function buildCleanNotifyEnv(
  overrides: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const inheritedEnv: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(inheritedEnv)) {
    if (key.startsWith('OMX_')) delete inheritedEnv[key];
  }
  const isolatedHome = overrides.HOME ?? overrides.USERPROFILE ?? WATCHER_ISOLATED_HOME;
  return {
    ...inheritedEnv,
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    OMX_SESSION_ID: '',
    CODEX_SESSION_ID: '',
    SESSION_ID: '',
    OMX_TEAM_WORKER: '',
    OMX_TEAM_STATE_ROOT: '',
    OMX_TEAM_LEADER_CWD: '',
    OMX_MODEL_INSTRUCTIONS_FILE: '',
    TMUX: '',
    TMUX_PANE: '',
    ...overrides,
  };
}

describe('notify-fallback watcher env isolation', () => {
  it('strips OMX_TEST_* before invoking notify hook child', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omx-fallback-env-isolation-'));
    const tempHome = await mkdtemp(join(tmpdir(), 'omx-fallback-env-home-'));
    const sessionDir = todaySessionDir(tempHome);
    const rolloutPath = join(sessionDir, 'rollout-env-isolation.jsonl');
    const notifyOutputPath = join(wd, 'notify-child-env.json');
    const notifyScript = join(wd, 'capture-notify-env.mjs');

    try {
      await mkdir(join(wd, '.omx', 'logs'), { recursive: true });
      await mkdir(join(wd, '.omx', 'state'), { recursive: true });
      await mkdir(sessionDir, { recursive: true });

      const freshIso = new Date(Date.now() + WATCHER_RECENT_EVENT_FUTURE_MS).toISOString();
      const threadId = 'thread-env-isolation';
      const turnId = 'turn-env-isolation';

      await writeFile(
        rolloutPath,
        [
          JSON.stringify({
            timestamp: freshIso,
            type: 'session_meta',
            payload: { id: threadId, cwd: wd },
          }),
          JSON.stringify({
            timestamp: freshIso,
            type: 'event_msg',
            payload: {
              type: 'task_complete',
              turn_id: turnId,
              last_agent_message: 'fresh message',
            },
          }),
        ].join('\n') + '\n'
      );

      await writeFile(
        notifyScript,
        [
          "import { writeFile } from 'node:fs/promises';",
          'const payload = JSON.parse(process.argv[2] || "{}");',
          'const outPath = process.env.NOTIFY_ENV_OUTPUT_FILE;',
          'if (!outPath) throw new Error("missing NOTIFY_ENV_OUTPUT_FILE");',
          'await writeFile(outPath, JSON.stringify({',
          '  captureSequence: process.env.OMX_TEST_CAPTURE_SEQUENCE_FILE ?? null,',
          '  captureCounter: process.env.OMX_TEST_CAPTURE_COUNTER_FILE ?? null,',
          '  payload,',
          '}, null, 2));',
        ].join('\n')
      );

      const watcherScript = new URL('../../../dist/scripts/notify-fallback-watcher.js', import.meta.url).pathname;
      const env = buildCleanNotifyEnv({
        HOME: tempHome,
        NOTIFY_ENV_OUTPUT_FILE: notifyOutputPath,
        OMX_TEST_CAPTURE_SEQUENCE_FILE: join(wd, 'capture-seq.txt'),
        OMX_TEST_CAPTURE_COUNTER_FILE: join(wd, 'capture-seq.idx'),
      });

      const result = spawnSync(
        process.execPath,
        [watcherScript, '--once', '--cwd', wd, '--notify-script', notifyScript, '--poll-ms', '50'],
        { encoding: 'utf-8', env }
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);

      const childEnv = JSON.parse(await readFile(notifyOutputPath, 'utf-8'));
      assert.equal(childEnv.captureSequence, null);
      assert.equal(childEnv.captureCounter, null);
      assert.equal(childEnv.payload?.['thread-id'], threadId);
      assert.equal(childEnv.payload?.['turn-id'], turnId);
      assert.equal(childEnv.payload?.source, 'notify-fallback-watcher');
    } finally {
      await rm(wd, { recursive: true, force: true });
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
