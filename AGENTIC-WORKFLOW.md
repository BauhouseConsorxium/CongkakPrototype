# Agentic Workflow — cmux + Claude Code

This document defines how Claude Code should parallelize tasks using **visible Claude Code sessions in cmux**, NOT the built-in subprocess Agent tool.

## Why cmux Instead of Agent Tool

The built-in Agent tool spawns invisible subprocesses — the user can't see what they're doing, can't interact, and can't interrupt. Instead, we spawn full `claude` CLI sessions in cmux workspaces:

- **Visible** — each agent runs in its own cmux tab, user watches live
- **Interactive** — user can type corrections mid-task or interrupt
- **Context-aware** — `--fork-session` copies the full conversation history so agents know everything discussed
- **Isolated** — each agent gets its own git worktree via `-w`

**NEVER use the Agent tool for parallel work. Always use cmux + claude CLI.**

## Core Principle

When a task can be split into independent work streams (features, refactors, bug fixes), **proactively offer to spawn parallel Claude Code sessions in cmux workspaces**. Each agent gets its own git worktree and a forked copy of the current conversation context.

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

### Option A: Simple spawn (recommended)

No `--resume` needed. The agent picks up CLAUDE.md automatically, which provides full project context. Pass a detailed task prompt with all the info the agent needs.

```bash
cmux new-workspace --command "cd <project-root> && claude -w <worktree-name> '<detailed task prompt>'"
cmux rename-workspace "agent: <short-label>"
cmux set-status <agent-name> "running" --color "#FFaa00"
```

**Flags:**
- `-w <name>` — creates an isolated git worktree automatically
- The task prompt should be self-contained: list files to create/modify, expected behavior, constraints
- Agent runs interactively — user can watch and type corrections

### Option B: Fork with conversation context

Use `--resume --fork-session` to give the agent the full conversation history. **Important:** this only works when launched from the **same project directory** (not from inside a worktree), because `--resume` looks up sessions by project path.

```bash
# Step 1: Get the current session ID
ls -t ~/.claude/projects/$(pwd | tr '/' '-')/*.jsonl | head -1
# Extract UUID from filename

# Step 2: Spawn — do NOT combine --resume with -w (worktree changes the project path, breaking session lookup)
# Instead, create worktree manually first:
git worktree add .claude/worktrees/<name>
cmux new-workspace --command "cd <project-root>/.claude/worktrees/<name> && claude --resume <session-id> --fork-session '<task prompt>'"
cmux rename-workspace "agent: <short-label>"
```

### Known gotcha: `--resume` + `-w` don't work together

`-w` creates a worktree first, then `--resume` looks for sessions under the **worktree's path** (not the original project). The session won't be found. Workaround:
- Use Option A (no `--resume`) for most cases — CLAUDE.md provides enough context
- Use Option B (manual worktree + `--resume` without `-w`) when conversation history is essential

### Add `--print` for non-interactive mode

Add `--print` to run to completion and exit without user interaction:

```bash
cmux new-workspace --command "cd <project-root> && claude -w <name> --print '<task prompt>'"
```

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
# Read agent's screen output
cmux capture-pane --workspace workspace:<n> --scrollback

# Structured output (non-interactive)
claude --print --output-format json '<prompt>' | jq '.result'
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
> These are 3 independent features. I'll spawn parallel agents in cmux, each in its own worktree. You'll see them working in separate tabs. Want me to launch them?

```bash
cmux new-workspace --command "cd $(pwd) && claude -w mute-solo 'Implement track mute/solo for this drum machine. Add mute[] and solo state to store.js. Tap track label in TrackBar.jsx to mute (dim + strikethrough), double-tap to solo. Muted tracks skip playSound in the tick handler. Run npm run build to verify. Do NOT commit.'"
cmux rename-workspace "agent: mute-solo"
cmux set-status mute-solo "running" --color "#FFaa00"

cmux new-workspace --command "cd $(pwd) && claude -w tap-tempo 'Implement tap tempo for this drum machine. Add a TAP button in Transport.jsx. Track last 4 tap timestamps, compute average interval, derive BPM and call setBpm. Debounce resets after 2s of no taps. Run npm run build to verify. Do NOT commit.'"
cmux rename-workspace "agent: tap-tempo"
cmux set-status tap-tempo "running" --color "#FFaa00"

cmux new-workspace --command "cd $(pwd) && claude -w randomize 'Implement randomize pattern button for this drum machine. Add RANDOM button near the transport. When clicked, generate a musically-aware random pattern for the selected track — weight toward common rhythmic positions (beats 1,5,9,13 for kick, offbeats for hihat, etc). Use the track type from constants.js to pick appropriate density. Dispatch SET_PATTERN. Run npm run build to verify. Do NOT commit.'"
cmux rename-workspace "agent: randomize"
cmux set-status randomize "running" --color "#FFaa00"

cmux set-progress 0.0 --label "0/3 agents complete"
```

**Key points in prompts:**
- Self-contained: list exact files, expected behavior, constraints
- End with "Run npm run build to verify. Do NOT commit."
- No `--resume` needed — CLAUDE.md provides project context automatically
