# Architecture Overview

This document maps the main OMX subsystems to the files that implement them.
It is intentionally brief and should be read together with `docs/codebase-map.md`.

## System shape

```text
omx CLI
  -> setup / launch / operator commands
  -> prompt + skill catalogs
  -> AGENTS runtime overlay + keyword routing
  -> planning and execution modes
  -> optional team runtime and notifications
  -> Rust sidecars for explore, sparkshell, mux, and runtime contracts
```

## Core subsystems

| Subsystem | Primary files | Responsibility |
| --- | --- | --- |
| CLI entry and command routing | `src/cli/index.ts`, `src/cli/omx.ts` | Parse `omx` invocations, dispatch subcommands, pass launch flags, and wire session lifecycle hooks. |
| Installation and health checks | `src/cli/setup.ts`, `src/cli/doctor.ts`, `src/config/generator.ts`, `src/config/mcp-registry.ts` | Install prompts/skills/native agents, generate config, and validate local readiness. |
| Prompt and role catalog | `prompts/*.md`, `src/agents/definitions.ts`, `src/agents/native-config.ts` | Define reusable roles, reasoning defaults, routing metadata, and generated native-agent config. |
| Skill catalog | `skills/*/SKILL.md`, `src/catalog/manifest.json`, `src/catalog/reader.ts` | Define workflow skills, public catalog metadata, and catalog-derived checks/docs. |
| Runtime AGENTS overlay | `src/hooks/agents-overlay.ts`, `src/hooks/codebase-map.ts`, `src/hooks/session.ts` | Inject current session state, codebase map, memory, and mode context into `AGENTS.md`. |
| Keyword detection and routing help | `src/hooks/keyword-detector.ts`, `src/hooks/keyword-registry.ts`, `src/hooks/explore-routing.ts` | Detect workflow triggers, keep routing behavior consistent, and steer simple read-only work toward `explore` or `sparkshell`. |
| Shared mode lifecycle | `src/modes/base.ts`, `src/mcp/state-paths.ts`, `src/state/mode-state-context.ts` | Start, update, read, and cancel active modes with root or session-scoped state. |
| Planning artifacts | `src/planning/artifacts.ts`, `src/ralplan/runtime.ts` | Discover approved plan artifacts and run the draft-review-consensus loop used by `ralplan`. |
| Ralph persistence | `src/ralph/persistence.ts`, `src/ralph/contract.ts` | Persist Ralph PRD/progress artifacts and migrate legacy state into canonical `.omx/plans` files. |
| Team runtime | `src/team/runtime.ts`, `src/team/team-ops.ts`, `src/team/orchestrator.ts`, `src/team/worker-bootstrap.ts`, `src/team/worktree.ts` | Coordinate workers, tmux panes, inbox/mailbox traffic, task claims, worktrees, and lifecycle cleanup. |
| Runtime bridge and contracts | `src/runtime/bridge.ts`, `crates/omx-runtime`, `crates/omx-runtime-core`, `crates/omx-mux` | Provide a Rust-backed contract for authority, dispatch, replay, and mux semantics with TS wrappers. |
| Read-only exploration helpers | `src/cli/explore.ts`, `src/cli/sparkshell.ts`, `crates/omx-explore`, `crates/omx-sparkshell` | Offer low-risk repo exploration, command execution summarization, and adaptive shell-backed lookup. |
| MCP and state servers | `src/mcp/*.ts` | Expose code-intel, memory, trace, team, and state helpers to OMX-compatible runtimes. |
| Notifications and OpenClaw | `src/notifications/*.ts`, `src/openclaw/*.ts` | Format and dispatch session events, temporary routing, webhook/command gateways, and reply plumbing. |
| HUD and monitoring | `src/hud/*.ts` | Render status output for active runtime/session visibility. |

## Request lifecycle

A typical interactive run touches these layers in order:

1. `src/cli/index.ts` resolves command mode and launch arguments.
2. `src/hooks/agents-overlay.ts` prepares session-specific AGENTS overlay content.
3. Prompt/skill catalogs installed by `omx setup` shape how Codex interprets the task.
4. Keyword detection and AGENTS guidance select solo execution, planning, or team mode.
5. `src/modes/base.ts` records current phase and task metadata under `.omx/state`.
6. Specialized runtimes such as `src/ralplan/runtime.ts` or `src/team/runtime.ts` do the heavy lifting.
7. `src/notifications/*` and `src/openclaw/*` optionally mirror important lifecycle events.

## Why Rust exists in this repository

The TypeScript codebase owns most of the product behavior, but Rust is used for sidecars where a small native binary is helpful:

- `crates/omx-explore` launches the low-risk explore harness with command allowlisting and model fallback.
- `crates/omx-sparkshell` executes direct commands or tmux-pane captures and summarizes large output.
- `crates/omx-mux` defines tmux/mux transport contracts.
- `crates/omx-runtime-core` models authority, dispatch, mailbox, replay, and readiness state.
- `crates/omx-runtime` exposes that runtime contract as a CLI used by the TS bridge.

The Rust code supports the orchestration layer; it is not a second full application stack.

## Architecture constraints worth preserving

- OMX should remain a layer around Codex, not a replacement runtime.
- `AGENTS.md`, prompt surfaces, and generated developer guidance must stay aligned; use `docs/prompt-guidance-contract.md` before editing them.
- `.omx/` is the canonical project-local state root and should remain inspectable.
- Team mode is the durable orchestration surface; native Codex subagents are still useful for smaller in-session parallelism.
- `explore` should stay read-only and low-risk, with `sparkshell` as the escape hatch for shell-native inspection.
