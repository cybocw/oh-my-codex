# Codebase Map

This is a directory guide for contributors who need to find the right place to change OMX behavior.

## Top-level layout

| Path | What lives here |
| --- | --- |
| `AGENTS.md` | Repository-wide operating contract used by Codex sessions inside this repo. |
| `README.md` | Public product overview and recommended usage path. |
| `CONTRIBUTING.md` | Short contributor setup and verification checklist. |
| `package.json` | Node package metadata, CLI scripts, and the main TypeScript build/test entrypoints. |
| `Cargo.toml` | Rust workspace manifest for native sidecars. |
| `src/` | Main TypeScript implementation. |
| `crates/` | Rust binaries and libraries used by explore, sparkshell, mux, and runtime contracts. |
| `prompts/` | Installable role prompts used by `/prompts:name` and native agent generation. |
| `skills/` | Installable workflow skills used by `$name` triggers. |
| `templates/` | Template assets such as installable `AGENTS.md` scaffolding and catalog mirrors. |
| `docs/` | User-facing HTML docs, release notes, integration guides, and maintainer docs like this one. |
| `missions/`, `playground/` | Supporting assets, experiments, and local development materials. |

## TypeScript source map

### CLI and operator surfaces

- `src/cli/index.ts` - main `omx` command dispatcher and help surface
- `src/cli/setup.ts` - install prompts, skills, agents, config, and scoped AGENTS assets
- `src/cli/doctor.ts` - install/runtime health checks, including team diagnostics
- `src/cli/team.ts` - CLI entry for durable worker orchestration
- `src/cli/ralph.ts` - Ralph launcher and persistence-mode glue
- `src/cli/explore.ts` - read-only exploration surface and harness selection
- `src/cli/sparkshell.ts` - shell summarization surface and tmux-pane capture path
- `src/cli/agents.ts`, `src/cli/agents-init.ts` - native-agent management and AGENTS bootstrap
- `src/cli/session-search.ts` - local session-history search
- `src/cli/autoresearch.ts` - thin-supervisor research workflow entry

### Prompt, agent, and catalog metadata

- `src/agents/definitions.ts` - role metadata such as category, posture, and reasoning defaults
- `src/agents/native-config.ts` - generated native-agent TOML/config composition
- `src/catalog/manifest.json` - source-of-truth catalog manifest for prompts and skills
- `src/catalog/reader.ts`, `src/catalog/schema.ts` - manifest validation and public-contract generation
- `src/scripts/generate-catalog-docs.ts` - keeps generated catalog artifacts and public docs aligned

### Session overlays, routing, and prompt guidance

- `src/hooks/agents-overlay.ts` - injects runtime overlay blocks into `AGENTS.md`
- `src/hooks/codebase-map.ts` - produces compact codebase summaries for overlay injection
- `src/hooks/keyword-detector.ts` - detects `$skill` and keyword-based workflow triggers
- `src/hooks/explore-routing.ts` - steers simple read-only tasks toward `explore` or `sparkshell`
- `src/hooks/prompt-guidance-contract.ts` - helpers/tests around the prompt guidance contract
- `src/config/generator.ts` - generated top-level Codex guidance/config text

### Modes, planning, and execution state

- `src/modes/base.ts` - shared mode lifecycle helpers
- `src/planning/artifacts.ts` - reads PRDs, test specs, and deep-interview artifacts from `.omx/`
- `src/ralplan/runtime.ts` - consensus loop for plan drafting and review
- `src/ralph/contract.ts`, `src/ralph/persistence.ts` - Ralph state validation and canonical artifact persistence
- `src/state/` - shared state-path and runtime-context helpers

### Team runtime and worker coordination

- `src/team/runtime.ts` - main durable team runtime
- `src/team/orchestrator.ts` - phase model and orchestration contracts
- `src/team/team-ops.ts` - persistent team-state read/write helpers
- `src/team/mcp-comm.ts` - mailbox/inbox communication helpers
- `src/team/worker-bootstrap.ts` - worker instructions, overlays, and startup files
- `src/team/tmux-session.ts` - tmux or psmux interaction helpers
- `src/team/worktree.ts` - worker worktree creation and cleanup logic
- `src/team/model-contract.ts` - model and reasoning-effort resolution for workers
- `src/team/runtime-cli.ts` - CLI-facing runtime helpers

### Runtime bridge, notifications, and integrations

- `src/runtime/bridge.ts` - TS bridge around the Rust runtime binary
- `src/mcp/` - MCP bootstrap plus state, trace, memory, code-intel, and team servers
- `src/notifications/` - hook config, template rendering, dispatch, reply listeners, and tmux-aware notification logic
- `src/openclaw/` - OpenClaw-specific config, gateway resolution, and dispatch implementation
- `src/hud/` - terminal HUD rendering and state summaries

### Miscellaneous supporting areas

- `src/autoresearch/` - autoresearch workflow contracts/runtime
- `src/session-history/` - transcript and artifact search helpers
- `src/verification/` - verification evidence helpers
- `src/visual/` - visual-verdict constants and evaluation helpers
- `src/utils/` - shared low-level helpers used across the repo
- `src/scripts/` - build, packaging, smoke-test, and developer automation scripts

## Rust crate map

| Crate | Purpose |
| --- | --- |
| `crates/omx-explore` | Read-only harness that shells out to Codex with a constrained contract and fallback model behavior. |
| `crates/omx-sparkshell` | Runs direct commands or tmux-pane captures and summarizes large output when needed. |
| `crates/omx-mux` | Shared mux/tmux transport contracts and adapters. |
| `crates/omx-runtime-core` | Runtime state model for authority, dispatch, mailbox, replay, and readiness. |
| `crates/omx-runtime` | CLI wrapper over `omx-runtime-core` used by the TS bridge and diagnostics. |

## Prompt and skill assets

- `prompts/` contains the role prompt catalog installed into Codex prompt locations.
- `skills/` contains workflow skills installed as `SKILL.md` directories.
- `templates/AGENTS.md` is the installable template source for project-level guidance scaffolding.

If a change affects prompt wording, role behavior, or workflow contracts, inspect the matching prompt/skill/template asset as well as the TypeScript loader or generator that consumes it.

## Where to look first for common tasks

| Task | Start here |
| --- | --- |
| Add or modify an `omx` subcommand | `src/cli/index.ts` and the matching `src/cli/*.ts` module |
| Change install behavior | `src/cli/setup.ts`, `src/config/generator.ts`, `src/config/mcp-registry.ts` |
| Change health checks | `src/cli/doctor.ts` |
| Change prompt behavior | `prompts/*.md`, `AGENTS.md`, `templates/AGENTS.md`, `src/config/generator.ts`, then read `docs/prompt-guidance-contract.md` |
| Change workflow keyword routing | `AGENTS.md`, `src/hooks/keyword-detector.ts`, `src/hooks/keyword-registry.ts` |
| Change planning artifact rules | `src/planning/artifacts.ts`, `src/ralplan/runtime.ts`, `src/ralph/persistence.ts` |
| Change team orchestration | `src/team/runtime.ts`, `src/team/team-ops.ts`, `src/team/worker-bootstrap.ts`, `src/team/worktree.ts` |
| Change notifications or OpenClaw | `src/notifications/*`, `src/openclaw/*`, and `docs/openclaw-integration.md` |
| Change explore or sparkshell behavior | `src/cli/explore.ts`, `src/cli/sparkshell.ts`, `crates/omx-explore`, `crates/omx-sparkshell` |
