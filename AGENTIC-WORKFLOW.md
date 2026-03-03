# Agentic Workflow — cmux + Claude Code

This document defines how Claude Code should work with cmux to parallelize tasks using visible, context-aware agent sessions.

## Core Principle

When a task can be split into independent work streams (features, refactors, bug fixes), **proactively offer to spawn parallel agents in cmux workspaces**. Each agent gets its own git worktree and a forked copy of the current conversation context.

## When to Offer Agent Spawning

Proactively suggest spawning agents when:

- The user describes **2+ independent features** to implement
- A task naturally decomposes into **parallel work streams** that don't touch the same files
- The user says anything like "implement these", "do all of them", "in parallel", "can you work on X and Y"
- A plan has **3+ items** that can be worked on concurrently
- After presenting suggestions/ideas, the user picks multiple items

**Offer format:**
> These 3 features are independent — I can spawn them as parallel agents in cmux, each in its own worktree. You'll see them working in separate tabs. Want me to launch them?

## How to Spawn

### Get the current session ID

```bash
ls -t ~/.claude/projects/$(pwd | tr '/' '-')//*.jsonl | head -1
# Extract UUID from filename
```

### Spawn a visible agent with full context

```bash
cmux new-workspace --command "cd <project-root> && claude --resume <session-id> --fork-session -w <worktree-name> --print '<task prompt>'"
cmux rename-workspace "<short-label>"
```

**Flags explained:**
- `--resume <id> --fork-session` — forks the current conversation so the agent knows all prior context (files read, decisions made, architecture discussed)
- `-w <name>` — creates an isolated git worktree automatically
- `--print` — non-interactive, runs to completion and exits
- Remove `--print` if the user wants to interact with the agent

### Monitor agents

```bash
# Check what an agent is doing
cmux read-screen --workspace workspace:<n> --lines 30

# Get full scrollback when done
cmux capture-pane --workspace workspace:<n> --scrollback

# Show progress in sidebar
cmux set-status <agent-name> "running" --color "#FFaa00"
cmux set-status <agent-name> "done" --icon "✓" --color "#00FF88"
cmux set-progress <0.0-1.0> --label "<n>/<total> agents complete"
```

### Pull results

```bash
# Structured output
claude --resume <id> --fork-session --print --output-format json '<prompt>' | jq '.result'

# Read agent's screen output
cmux capture-pane --workspace workspace:<n> --scrollback
```

## Worktree Management

Each agent works in `.claude/worktrees/<name>/`. After agents complete:

1. Review changes: `git diff main...<worktree-branch>`
2. Merge into main working tree (resolve conflicts if files overlap)
3. Clean up: `git worktree remove .claude/worktrees/<name>`

## Worktree Decision

**Always offer a worktree** when:
- The task involves changing 3+ files
- The feature is experimental or exploratory
- The user might want to discard the changes
- Multiple features are being worked on (each gets its own worktree)

**Skip worktree** when:
- Single-file fix or tweak
- The user explicitly says "just do it here"
- The change is trivial (<10 lines)

**Offer format for single tasks:**
> This will touch store.js, audio.js, and a new component. Want me to work in a worktree so you can review before merging, or just make the changes directly?

**If already inside a worktree:** Do not create nested worktrees. Work directly. Note in any output that changes are in the worktree, not the main tree.

## Task Decomposition Rules

**Good candidates for parallel agents:**
- Features that touch different files (new component + new audio module)
- Independent bug fixes
- One agent for code, another for tests
- Refactors that affect separate modules

**Do NOT parallelize:**
- Tasks that modify the same file heavily (merge conflicts)
- Sequential dependencies (B needs A's output)
- Small tasks that take <30 seconds — just do them inline

## Dev Environment Setup

Spawn the full dev environment in cmux:

```bash
# Terminal: Vite dev server
cmux new-workspace --command "cd <project-root> && npm run dev"
cmux rename-workspace "vite"

# Terminal: Caddy reverse proxy (for HTTPS + API proxy)
cmux new-workspace --command "cd <project-root> && caddy run"
cmux rename-workspace "caddy"

# Browser: live preview
cmux new-pane --type browser --url "https://test.localhost"
```

## Browser-in-the-Loop Testing

After code changes, verify UI through cmux browser:

```bash
cmux browser open "https://test.localhost"
cmux browser snapshot --compact                    # DOM snapshot
cmux browser click "button:has-text('DARK')"       # interact
cmux browser wait --text "Scene:" --timeout-ms 5000 # wait for async
cmux browser eval "document.querySelectorAll('.knob').length"  # assert
```

## Example Session

User: "Add track mute/solo, tap tempo, and randomize patterns"

Claude response:
> These are 3 independent features. I'll spawn parallel agents in cmux:
> 1. **mute-solo** — Track mute/solo buttons on TrackBar
> 2. **tap-tempo** — Tap tempo button in Transport
> 3. **randomize** — Randomize button with musical constraints
>
> Each gets its own worktree and full conversation context. You'll see them in separate cmux tabs.

```bash
cmux new-workspace --command "cd $(pwd) && claude --resume SESSION --fork-session -w mute-solo --print 'implement track mute/solo...'"
cmux rename-workspace "agent: mute-solo"

cmux new-workspace --command "cd $(pwd) && claude --resume SESSION --fork-session -w tap-tempo --print 'implement tap tempo...'"
cmux rename-workspace "agent: tap-tempo"

cmux new-workspace --command "cd $(pwd) && claude --resume SESSION --fork-session -w randomize --print 'implement randomize...'"
cmux rename-workspace "agent: randomize"

cmux set-progress 0.0 --label "0/3 agents complete"
```
