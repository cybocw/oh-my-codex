# Project Overview

This document is a maintainer-oriented overview of `oh-my-codex` (OMX).
It complements, but does not replace, the user-facing docs in `README.md` and `docs/*.html`.

## What OMX is

OMX is a workflow and runtime layer around OpenAI Codex CLI.
It does not replace Codex as the execution engine. Instead, it adds:

- reusable prompt and skill catalogs installed into Codex-compatible locations
- a consistent in-session workflow built around `$deep-interview`, `$ralplan`, `$team`, and `$ralph`
- runtime overlays for `AGENTS.md` so each session sees current project state, plans, and guidance
- durable project state under `.omx/` for plans, logs, memory, and active-mode state
- optional team orchestration, tmux-backed worker routing, notifications, and local helper binaries

A useful mental model is:

```text
Codex CLI = execution engine
OMX = orchestration, workflow, runtime state, and helper tooling
```

## What this repository contains

At a high level, the repository combines five layers:

1. `src/cli/` exposes the `omx` command and subcommands such as `setup`, `doctor`, `team`, `ralph`, `explore`, and `sparkshell`.
2. `prompts/` and `skills/` hold the reusable prompt and workflow assets that `omx setup` installs into Codex.
3. `src/hooks/`, `src/modes/`, `src/planning/`, `src/ralplan/`, and `src/ralph/` implement the orchestration rules that shape a session.
4. `src/team/`, `src/runtime/`, `src/notifications/`, and `src/openclaw/` provide durable runtime, worker coordination, and notification plumbing.
5. `crates/` contains Rust sidecars used for read-only exploration, shell summarization, mux/runtime contracts, and compatibility state.

## Primary user surfaces

Most users will encounter OMX through the following paths:

- `omx setup` installs prompts, skills, config, native agents, and scoped `AGENTS.md` support.
- `omx doctor` validates that the install and runtime dependencies are healthy.
- `omx` launches Codex with OMX guidance injection and optional model/runtime flags.
- `omx explore` is the read-only repo lookup surface.
- `omx sparkshell` runs bounded shell commands or summarizes noisy output.
- `omx team` launches a durable multi-worker runtime, usually backed by tmux or psmux.
- `omx ralph` activates the persistent completion loop.
- `omx autoresearch` runs the thin-supervisor research workflow.

Inside Codex sessions, the main human-facing workflow is keyword driven:

```text
$deep-interview -> $ralplan -> $team or $ralph
```

## Runtime model

When a Codex session starts through OMX, the runtime typically works like this:

1. OMX resolves installation/config state and session flags.
2. OMX applies a temporary runtime overlay to `AGENTS.md` so the session sees current project context.
3. Keyword detection and prompt routing decide whether work stays solo, enters planning, or escalates to team mode.
4. Active modes write state under `.omx/state` and planning artifacts under `.omx/plans` or `.omx/specs`.
5. Team mode may add worker panes, worktrees, and mailbox/dispatch state.
6. Optional notification integrations mirror session events to external systems.

This is why `.omx/` is a first-class part of the product, not a cache afterthought.

## Important persistent artifacts under `.omx/`

OMX stores project-local runtime state in `.omx/`. The exact contents vary by workflow, but the important buckets are:

- `.omx/state/` for active mode state, team runtime state, and session scoping
- `.omx/plans/` for approved PRDs and test specs used by execution lanes
- `.omx/specs/` for deep-interview style requirement artifacts
- `.omx/logs/` for durable logs and debug traces
- `.omx/notepad.md` for session-priority notes
- `.omx/project-memory.json` for persistent project memory

## How this document fits with the rest of the docs

Use the existing docs for specialized topics, and use the new docs in this directory for maintainer context:

- `README.md` for onboarding, installation, and the public mental model
- `CONTRIBUTING.md` for the short contributor checklist and baseline commands
- `docs/prompt-guidance-contract.md` before changing `AGENTS.md`, `templates/AGENTS.md`, `prompts/*.md`, or prompt-generation code
- `docs/openclaw-integration.md` for notification/OpenClaw setup and operational details
- `docs/architecture-overview.md` for subsystem relationships
- `docs/codebase-map.md` for directory-to-responsibility mapping
- `docs/development-guide.md` for build, test, and verification loops

## Suggested reading order for new maintainers

1. `README.md`
2. `CONTRIBUTING.md`
3. `docs/project-overview.md`
4. `docs/architecture-overview.md`
5. `docs/codebase-map.md`
6. `docs/development-guide.md`
7. topic-specific docs such as `docs/prompt-guidance-contract.md` or `docs/openclaw-integration.md`
