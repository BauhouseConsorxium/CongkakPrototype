# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint (flat config)
```

No test framework is configured. Always run `npm run build` to verify changes compile cleanly.

## Project Context

This is a **rapid web prototype for a hardware synth/sequencer device**. The web app is a testbed — the goal is to validate UX, sound design, and sequencer behavior before committing to hardware. Prioritize iteration speed over production polish, but keep the architecture clean enough to inform firmware decisions.

## Architecture

**CONGKAK::PROTO** is a browser-based drum machine / synthesizer built with React 19, Vite 5, and Tailwind CSS 3. It uses the Web Audio API for sound synthesis and Web MIDI API for hardware controller integration.

### Core modules

- **`src/store.js`** — All app state lives in a single `useReducer` hook exposed via `useStore()`. Returns `{ state, actions, stateRef }`. The `stateRef` and action refs pattern avoids re-attaching event listeners on every state change. MIDI mappings persist to localStorage. **Known limitation**: all 8 tracks share one set of sound parameters (pitch, decay, filter, glitch, volume). See `REFACTOR.md` for per-track param plan.
- **`src/audio.js`** — Singleton AudioContext with 8 synthesized drum sounds (kick, snare, hihat, clap, bass, lead, stab, noise). Signal chain: oscillator/noise → filter → envelope → compressor → analyser → output. Glitch effect adds a delay feedback line. `initAudio()` must be called from a user gesture. **No sample playback yet** — synthesis only.
- **`src/constants.js`** — All configuration: track definitions (8 tracks with colors), knob definitions (9 params with ranges), 16 sound presets, 16 rhythm patterns per track, keyboard map (`1234 QWER ASDF ZXCV` → 16 pads). Track count (8) and step count (16) are hardcoded throughout the codebase.
- **`src/workers/sequencer.worker.js`** — Web Worker for sequencer timing. Receives `start`/`stop`/`setBpm` commands, posts `tick` messages at 16th-note intervals. Uses `setInterval` (has drift — see REFACTOR.md).

### LCD Display

- **`src/lcd-font.js`** — 5×7 bitmap font (same encoding as FONT glyphs) plus 7×11 wayang shadow puppet sprites. Sprites use 7-bit encoding (bit6=left, bit0=right). Three dance poses cycle for idle animation, plus raised and ecstatic poses for active/current steps.
- **`src/components/LcdDisplay.jsx`** — 128×64 pixel canvas at 3× scale. Teenage Engineering-inspired layout with wayang figures reacting to the sequencer. Has a full-screen intro animation triggered on stop→play transition. Uses `drawSprite(ctx, data, x, y, color, width)` for variable-width bitmap rendering.

### Layout

Two-column layout with collapsible sidebar (320px). Main content area:
1. Mode bar / Track bar / Transport (full width)
2. Euclidean Ring + LCD/Waveform (side by side, each 396px wide)
3. Knobs bar (full width)
4. Pads grid (hidden by default, toggle with button)

### Modes

The app has 4 modes that change what the 4×4 pad grid does:
- **DRAW (0):** Toggle steps in the sequencer for the selected track
- **PLAY (1):** Trigger instruments live
- **SOUND (2):** Load sound presets
- **BEATS (3):** Load rhythm patterns for the selected track

### Color palette

Warm earth-tone theme defined in `tailwind.config.js` with tokens `bg`, `surface-1`, `surface-2`, `text`, `dim`, `c1`–`c8`. Track and knob colors are defined separately in `constants.js` and must stay in sync with the Tailwind palette. Inline hex colors in components reference these same values.

LCD colors: `BG=#0a1a0a`, `PRIMARY=#00FF88`, `DIM=#006633`, `VERY_DIM=#003318`.

### MIDI integration

Web MIDI (Chrome/Edge). Learn mode: user clicks LEARN → clicks a UI control → moves a hardware knob/pad → mapping is stored. Maps are `{ knobs: [cc|null × 9], pads: [note|null × 16] }`. MIDI messages are processed in `store.js` dispatch handler. **No MIDI clock sync or MIDI output yet.**

## Conventions

- No TypeScript — plain JSX throughout
- State management is custom `useReducer`, not Redux/Zustand
- Components are function components, one per file, default exports
- Inline styles used for dynamic colors (track/knob colors from constants); Tailwind for layout and static styling
- Audio initialization requires user gesture — handled by a one-time click listener in App.jsx
- LCD pixel art uses bitmap arrays with bit-per-pixel encoding — same pattern for fonts and sprites, just different widths (5-bit for font, 7-bit for wayang)

## Known Issues & Gotchas

- **BPM has two sync paths**: knob index 3 and `setBpm` action both update BPM and sync to worker. Be careful not to create loops.
- **Knob indices 0-3 are "meta knobs"** that trigger side effects in the reducer (euclidean hits, rotation, track select, tempo). They don't just set a value — they modify other state.
- **`playSound()` is monolithic**: 8 sound types in one switch statement with hardcoded scaling factors (e.g., `pitch * 0.35` for kick). Not parameterized per-track.
- **Sequencer step data is boolean only**: `seq[track][step]` is true/false. No velocity, note, or probability per step.
- **No state persistence** beyond MIDI maps. Patterns and params are lost on refresh.
- **Waveform runs continuously** via `requestAnimationFrame` even when idle — wastes CPU.
- **`SequencerGrid.jsx` is dead code** — never imported. Legacy component.
- **Package name** is still `glitch-duo` in `package.json`, localStorage key is `gd_maps`. Vestigial from previous project name.

## Agentic Workflow

**IMPORTANT: Do NOT use the built-in Agent tool to spawn subprocess agents.** Instead, spawn visible Claude Code sessions in cmux workspaces using the `claude` CLI with `--resume <session-id> --fork-session`. This gives the user full visibility — they can watch, interact with, and interrupt any agent.

When the user requests 2+ independent features or tasks, **proactively offer to spawn parallel Claude Code sessions in cmux**. Always explain what will be spawned and ask before launching.

Before spawning agents, **read `AGENTIC-WORKFLOW.md`** for the full cmux spawn commands, monitoring, worktree management, and task decomposition rules. If working in a worktree, also read it to understand the conventions.

## Refactoring

See `REFACTOR.md` for the full prioritized roadmap (P0 through P3) covering architectural changes, bugs, performance issues, and missing hardware features.
