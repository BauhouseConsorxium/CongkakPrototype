# CONGKAK::PROTO — Refactoring Roadmap

Audit date: 2026-03-01

## P0 — Architectural Blockers

### Shared sound parameters across all tracks
- **Where**: `audio.js:38-175`, `store.js:190`
- **Problem**: All 8 tracks share one set of knob values (pitch, decay, filter, glitch, volume). Can't tune kick separate from snare.
- **Fix**: Add `trackParams[8]` array in state, each with independent pitch/decay/filter/glitch/volume. Refactor `playSound()` to accept a track-specific param object instead of global `knobValues`.

### Binary step data (on/off only)
- **Where**: `store.js:15` — `Array(16).fill(false)`
- **Problem**: No per-step velocity, probability, or note value. Impossible to do expressive patterns or melodies on bass/lead.
- **Fix**: Change `seq` from `bool[][]` to `{ on, velocity, note, probability }[][]`. Default velocity=100, note=null (use track pitch), probability=1.0.

### No pattern persistence
- **Where**: Entire codebase (only MIDI maps saved to localStorage)
- **Problem**: User work vanishes on page refresh.
- **Fix**: Serialize full machine state (patterns, track params, kit presets) to IndexedDB or localStorage. Add save/load slots.

---

## P1 — Critical Gaps

### Sequencer timing drift
- **Where**: `sequencer.worker.js:10-12`
- **Problem**: `setInterval` accumulates error. Audible at high tempos over long sessions.
- **Fix**: Replace with drift-compensated `setTimeout` loop tracking cumulative elapsed time.

### No audio lookahead scheduling
- **Where**: `audio.js:40`, `store.js:192`
- **Problem**: Sounds fire at `ac.currentTime` — 5-20ms jitter from JS event loop.
- **Fix**: Worker posts upcoming tick times; `playSound` schedules at a precise `AudioContext.currentTime` offset.

### No mute/solo per track
- **Where**: Missing entirely
- **Fix**: Add `mute[8]` and `solo[8]` boolean arrays to state. Check at tick time before calling `playSound`.

### No swing/shuffle
- **Where**: `sequencer.worker.js`
- **Fix**: Add swing parameter (0-100%). Even-numbered steps get delayed by `swing * halfStepDuration`.

### No MIDI clock sync
- **Where**: `store.js:382` — clock bytes (0xF8) are filtered out
- **Fix**: Parse MIDI clock for external sync. Optionally output MIDI clock from the worker.

### No sample playback
- **Where**: `audio.js` — synthesis only
- **Fix**: Add `sampleBuffers` map in audio.js. `loadSampleForTrack(trackId, arrayBuffer)` decodes WAV. `playSound()` checks buffer map first, falls back to synth.

### No undo/redo
- **Where**: No state history
- **Fix**: Ring buffer of last N state snapshots. Undo pops, redo pushes.

### Knobs have no touch support
- **Where**: `Knob.jsx:29-52` — mouse drag only
- **Fix**: Add `onTouchStart`/`onTouchMove`/`onTouchEnd` mirroring mouse handlers.

---

## P2 — Bugs & Performance

### Sound preset v[4] unused
- **Where**: `store.js:121-127`, `constants.js:14-31`
- **Problem**: Each preset has 6 values but only 5 are mapped. `v[4]` is dead data.
- **Fix**: Either map v[4] to a parameter or remove the extra value from all 16 presets.

### Waveform canvas resizes every frame
- **Where**: `Waveform.jsx:19-21`
- **Problem**: Sets `canvas.width`/`canvas.height` 60x/sec, forcing backing store reallocation.
- **Fix**: Use `ResizeObserver` to resize only when container dimensions change.

### Waveform allocates Uint8Array every frame
- **Where**: `Waveform.jsx:32`
- **Fix**: Allocate once outside the draw loop, reuse.

### LcdDisplay receives entire state
- **Where**: `App.jsx:95`
- **Problem**: Re-renders on every tick (~32/sec at 120 BPM) even if LCD-relevant data hasn't changed.
- **Fix**: Destructure only needed state fields. Wrap in `React.memo` with custom comparator.

### EuclideanRing SVG reconciliation
- **Where**: `EuclideanRing.jsx`
- **Problem**: 128+ SVG circle elements re-rendered every tick.
- **Fix**: Separate static ring layer from animated playhead layer. Use `React.memo` on the ring.

### PadsGrid flash timeout leak
- **Where**: `PadsGrid.jsx:15-16`
- **Problem**: `setTimeout` not cleared on unmount or rapid re-trigger.
- **Fix**: Store timeout ID in `useRef`, clear on new trigger and on cleanup.

### Audio node management
- **Where**: `audio.js:27-36, 62-74`
- **Problem**: Noise buffer allocated per hit (not pooled). Delay feedback nodes never explicitly disconnected.
- **Fix**: Pre-allocate noise buffers. Add scheduled disconnect/cleanup for delay feedback chains.

### Dual BPM sync paths
- **Where**: `store.js:49, 102`
- **Problem**: BPM can be set via `SET_BPM` action or `SET_KNOB_VALUE` index 3. Both sync bidirectionally — fragile.
- **Fix**: Single source of truth. BPM lives in one place, knob index 3 is derived.

---

## P3 — Code Quality

### Dead code
- `src/components/SequencerGrid.jsx` — never imported. Remove or integrate as alt view.
- `drawSpriteScaled` in LcdDisplay — only used in intro animation.
- `small` prop in Sidebar `Btn` component — accepted but never applied.

### Vestigial naming
- `package.json` name is `glitch-duo`
- localStorage key is `gd_maps`
- Should be `congkak-proto` / `ck_maps`

### File organization
- `Sidebar.jsx` has 6 sub-components in 211 lines (`DevPanel`, `MapPanel`, `LogPanel`, `Btn`, `InfoBox`, etc.)
- Extract `Btn` as shared primitive. Extract panels into separate files.

### Color duplication
- Hardcoded hex colors in components duplicate Tailwind tokens: `#333333` = `surface-2`, `#00FF88` = `c3`, `#4A4A4A` = `dim`
- `Knob.jsx`, `Waveform.jsx`, `index.css` all have raw hex values
- Should reference Tailwind theme or a shared JS color constants file.

### Constants structure
- `TRACKS[i].s` — single-letter prop name, not self-documenting. Rename to `abbr`.
- `SOUND_PRESETS[i].v` — positional array with no docs. Use named object `{ pitch, glitch, decay, filter, volume }`.
- `LED` abbreviation for LEAD is confusing. Change to `LDD` or `LEA`.
- Track count (8) and step count (16) hardcoded everywhere. Extract as constants.

---

## Missing Features for Hardware Prototype

### Essential
- Per-track parameters (independent pitch/decay/filter/glitch/vol)
- Per-step velocity and note data
- Pattern save/load with multiple banks
- Mute/solo per track
- Swing/shuffle
- MIDI clock sync (in/out)
- Sample playback per track
- Undo/redo
- Copy/paste patterns between tracks

### Important
- Song mode / pattern chaining
- Variable pattern length (not locked to 16)
- Full ADSR envelopes (not just decay)
- FX chain (reverb, distortion, EQ, chorus)
- LFO / modulation routing
- Tempo tap
- Metronome / count-in
- Full machine state preset save/recall

### Differentiating
- Polymetric patterns (different lengths per track)
- Conditional trigs (Elektron-style: 1st, last, probability)
- Parameter locks (per-step param overrides)
- Scale quantization for melodic tracks
- Sidechain compression
- Audio input / live sampling
