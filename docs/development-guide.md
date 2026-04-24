# Development Guide

This guide complements `CONTRIBUTING.md` with a slightly more operational view of how to work in the OMX codebase.

## Prerequisites

Baseline requirements:

- Node.js 20+
- npm
- Codex CLI for end-to-end local CLI testing

Additional tools by area:

- Rust toolchain when touching anything under `crates/` or the TS bridge/runtime integration
- `tmux` on macOS/Linux or `psmux` on Windows when touching durable team mode
- `jq` is helpful for config inspection, but not required

## Standard contributor loop

Use this loop for most changes:

```bash
npm install
npm run lint
npm run build
npm test
```

For local CLI testing after build:

```bash
npm link
omx setup
omx doctor
```

If your change specifically targets team runtime behavior, also run:

```bash
omx doctor --team
```

## Verification matrix

Choose the lightest command that proves your claim, then escalate to broader checks when the change touches shared behavior.

| Change type | Minimum useful verification |
| --- | --- |
| Docs-only change | Review rendered markdown/diff and check referenced paths/commands still exist |
| General TypeScript change | `npm run build` plus targeted `node --test ...` for touched areas |
| Shared CLI/config/install behavior | `npm run build`, `npm run lint`, `npm test` |
| Team/state runtime change | `npm run coverage:team-critical`, related targeted tests, and often `omx doctor --team` |
| Explore harness change | `npm run build:explore:release` and `npm run test:explore` |
| Sparkshell change | `npm run build:sparkshell` and `npm run test:sparkshell` |
| Compat/runtime bridge change | `npm run test:compat:node` or `npm run test:compat:rust` as appropriate |

`npm test` already includes:

- `npm run build`
- the Node test suite over built `dist/`
- `node dist/scripts/generate-catalog-docs.js --check`

That means catalog drift and generated catalog artifacts are part of the default verification path.

## Working with prompt and skill surfaces

Before changing any of these, read `docs/prompt-guidance-contract.md`:

- `AGENTS.md`
- `templates/AGENTS.md`
- `prompts/*.md`
- generated top-level developer guidance in `src/config/generator.ts`

For prompt and skill additions:

- new prompts live in `prompts/`
- new skills live in `skills/<name>/SKILL.md`
- `omx setup --force` is the fastest way to reinstall changed assets into the active Codex environment

## Working with installation scope

OMX supports both user-scoped and project-scoped setup.

- user scope installs into `~/.codex/...`
- project scope installs into `./.codex/...` within the current repository

The install and doctor logic for scope handling lives primarily in:

- `src/cli/setup.ts`
- `src/cli/doctor.ts`
- `src/utils/paths.ts`

When changing setup behavior, verify both scope assumptions and backup/overwrite behavior.

## Working with `.omx/` state

Many workflows depend on project-local state in `.omx/`. Before changing state layout or mode semantics, inspect:

- `src/modes/base.ts`
- `src/mcp/state-paths.ts`
- `src/planning/artifacts.ts`
- `src/ralph/persistence.ts`
- `src/team/team-ops.ts`

Important rule of thumb: `.omx/` is part of the product contract. Avoid treating it like disposable scratch space unless the command is explicitly a cleanup path.

## Team runtime tips

When changing team mode, expect the behavior to span several layers:

- CLI entry in `src/cli/team.ts`
- runtime in `src/team/runtime.ts`
- persistent state helpers in `src/team/team-ops.ts`
- pane/worktree bootstrapping in `src/team/worker-bootstrap.ts` and `src/team/worktree.ts`
- transport/runtime contracts in `src/runtime/bridge.ts` and `crates/omx-runtime*`

Team changes often need both targeted tests and an operator-level smoke check with `omx doctor --team`.

## Native sidecar workflow

If you touch `crates/`, prefer verifying the affected binary directly instead of relying only on TS tests.

Useful commands:

```bash
cargo build
npm run build:explore
npm run build:explore:release
npm run build:sparkshell
npm run test:explore
npm run test:sparkshell
npm run test:compat:rust
```

The TS bridge in `src/runtime/bridge.ts` is intentionally thin. Put runtime semantics in Rust when they belong to the contract layer, and keep the TS side focused on invocation and compatibility reads.

## Documentation maintenance rules

When documenting behavior:

- prefer linking to an existing specialized doc instead of duplicating long guidance
- keep public onboarding in `README.md` and `docs/*.html`
- keep maintainer-oriented repository docs in markdown under `docs/`
- if you change catalog counts or public catalog behavior, ensure catalog checks still pass

Useful references:

- `README.md`
- `CONTRIBUTING.md`
- `docs/project-overview.md`
- `docs/architecture-overview.md`
- `docs/codebase-map.md`
- `docs/prompt-guidance-contract.md`
- `docs/openclaw-integration.md`

## Common maintenance playbooks

### Add a new CLI surface

1. Add or update the subcommand module in `src/cli/`.
2. Register it in `src/cli/index.ts`.
3. Update help text and any relevant docs.
4. Add targeted tests under the nearest `__tests__` directory.
5. Run `npm run build` and targeted tests, then `npm test` if the change is shared.

### Add a new prompt or skill

1. Create the asset under `prompts/` or `skills/`.
2. Update any loader/catalog metadata if required.
3. Reinstall locally with `omx setup --force`.
4. Verify the asset is discoverable in the installed Codex location.
5. Run the relevant tests plus `npm test` if the catalog/public docs are affected.

### Change team/runtime contracts

1. Update the TS runtime code.
2. Update the Rust contract/binary if the change crosses the bridge boundary.
3. Run targeted runtime/team tests.
4. Run `npm run coverage:team-critical`.
5. Run `omx doctor --team` for an operator-level sanity check.
