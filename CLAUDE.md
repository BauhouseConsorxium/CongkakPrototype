# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint (flat config)
```

No test framework is configured.

## Architecture

**CONGKAK::PROTO** is a browser-based drum machine / synthesizer built with React 19, Vite 5, and Tailwind CSS 3. It uses the Web Audio API for sound synthesis and Web MIDI API for hardware controller integration.

### Core modules

- **`src/store.js`** — All app state lives in a single `useReducer` hook exposed via `useStore()`. Returns `{ state, actions, stateRef }`. The `stateRef` and action refs pattern avoids re-attaching event listeners on every state change. MIDI mappings persist to localStorage.
- **`src/audio.js`** — Singleton AudioContext with 8 synthesized drum sounds (kick, snare, hihat, clap, bass, lead, stab, noise). Signal chain: oscillator/noise → filter → envelope → compressor → analyser → output. Glitch effect adds a delay feedback line. `initAudio()` must be called from a user gesture.
- **`src/constants.js`** — All configuration: track definitions (8 tracks with colors), knob definitions (8 params with ranges), 16 sound presets, 16 rhythm patterns per track, keyboard map (`1234 QWER ASDF ZXCV` → 16 pads).
- **`src/workers/sequencer.worker.js`** — Web Worker for precise sequencer timing. Receives `start`/`stop`/`setBpm` commands, posts `tick` messages at 16th-note intervals. Keeps timing off the main thread.

### Modes

The app has 4 modes that change what the 4×4 pad grid does:
- **DRAW (0):** Toggle steps in the sequencer for the selected track
- **PLAY (1):** Trigger instruments live
- **SOUND (2):** Load sound presets
- **BEATS (3):** Load rhythm patterns for the selected track

### Color palette

Warm earth-tone theme defined in `tailwind.config.js` with tokens `bg`, `surface-1`, `surface-2`, `text`, `dim`, `c1`–`c8`. Track and knob colors are defined separately in `constants.js` and must stay in sync with the Tailwind palette. Inline hex colors in components reference these same values.

### MIDI integration

Web MIDI (Chrome/Edge). Learn mode: user clicks LEARN → clicks a UI control → moves a hardware knob/pad → mapping is stored. Maps are `{ knobs: [cc|null × 8], pads: [note|null × 16] }`. MIDI messages are processed in `store.js` dispatch handler.

## Conventions

- No TypeScript — plain JSX throughout
- State management is custom `useReducer`, not Redux/Zustand
- Components are function components, one per file, default exports
- Inline styles used for dynamic colors (track/knob colors from constants); Tailwind for layout and static styling
- Audio initialization requires user gesture — handled by a one-time click listener in App.jsx
