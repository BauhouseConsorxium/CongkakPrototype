import { useReducer, useCallback, useRef, useEffect, useMemo } from 'react';
import { TRACKS, TRACK_KEYS, KNOB_DEFS, SOUND_PRESETS, TRACK_PATTERNS } from './constants';
import {
  playSound, initAudio, setMasterVolume, getAudioContext,
  startRecording, stopRecording, isRecording,
  setSampleForTrack, clearSampleForTrack, setSampleRegion as audioSetSampleRegion,
  getSampleBuffer,
} from './audio';
import { euclidean as computeEuclidean } from './euclidean';

const initialKnobValues = KNOB_DEFS.map(k => k.val);

function createInitialState() {
  return {
    mode: 0,
    selTrack: 0,
    playing: false,
    bpm: 120,
    curStep: -1,
    seq: TRACKS.map(() => Array(16).fill(false)),
    knobValues: [...initialKnobValues],
    activePatPerTrack: Array(8).fill(-1),
    curPatName: Array(8).fill('\u2014'),
    logs: ['GLITCH::DUO ready', 'Space=play Tab=mode \u2191\u2193=track', '1234 QWER ASDF ZXCV = pads'],
    midiAccess: null,
    totalMidiMsgs: 0,
    maps: { knobs: Array(9).fill(null), pads: Array(16).fill(null) },
    learn: false,
    learnTarget: null,
    sidebarTab: 'dev',
    euclidean: TRACKS.map(() => ({ hits: 0, rotation: 0, manual: false })),
    recording: false,
    samples: Array(8).fill(null),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_TRACK': {
      const t = action.track;
      const eucl = state.euclidean[t];
      return {
        ...state,
        selTrack: t,
        knobValues: state.knobValues.map((v, i) => {
          if (i === 0) return eucl.hits;
          if (i === 1) return eucl.rotation;
          if (i === 2) return t;
          return v;
        }),
      };
    }
    case 'SET_BPM':
      return { ...state, bpm: action.bpm, knobValues: state.knobValues.map((v, i) => i === 3 ? action.bpm : v) };
    case 'SET_PLAYING':
      return { ...state, playing: action.playing, curStep: action.playing ? state.curStep : -1 };
    case 'TICK':
      return { ...state, curStep: (state.curStep + 1) % 16 };
    case 'TOGGLE_STEP': {
      const newSeq = state.seq.map((row, ri) =>
        ri === state.selTrack ? row.map((v, ci) => ci === action.step ? !v : v) : row
      );
      const newEucl = [...state.euclidean];
      newEucl[state.selTrack] = { ...newEucl[state.selTrack], manual: true };
      return { ...state, seq: newSeq, euclidean: newEucl };
    }
    case 'SET_PATTERN': {
      const { trackIdx, patIdx, pattern, name } = action;
      const newSeq = state.seq.map((row, ri) => ri === trackIdx ? [...pattern] : row);
      const newActivePat = [...state.activePatPerTrack];
      newActivePat[trackIdx] = patIdx;
      const newPatName = [...state.curPatName];
      newPatName[trackIdx] = name;
      const newEuclP = [...state.euclidean];
      newEuclP[trackIdx] = { hits: pattern.filter(Boolean).length, rotation: 0, manual: true };
      return { ...state, seq: newSeq, activePatPerTrack: newActivePat, curPatName: newPatName, euclidean: newEuclP };
    }
    case 'SET_KNOB_VALUE': {
      const newKV = [...state.knobValues];
      newKV[action.index] = action.value;
      const extra = {};
      if (action.index === 0) {
        const hits = Math.round(Math.max(0, Math.min(16, action.value)));
        const ti = state.selTrack;
        const newEuclK = [...state.euclidean];
        const rot = newEuclK[ti].rotation;
        newEuclK[ti] = { hits, rotation: rot, manual: false };
        extra.euclidean = newEuclK;
        extra.seq = state.seq.map((row, ri) => ri === ti ? computeEuclidean(hits, rot) : row);
      }
      if (action.index === 1) {
        const rotation = Math.round(Math.max(0, Math.min(15, action.value)));
        const ti = state.selTrack;
        const newEuclK = [...state.euclidean];
        const h = newEuclK[ti].hits;
        newEuclK[ti] = { hits: h, rotation, manual: false };
        extra.euclidean = newEuclK;
        extra.seq = state.seq.map((row, ri) => ri === ti ? computeEuclidean(h, rotation) : row);
      }
      if (action.index === 2) {
        const t = Math.round(Math.max(0, Math.min(7, action.value)));
        extra.selTrack = t;
        const eucl = state.euclidean[t];
        newKV[0] = eucl.hits;
        newKV[1] = eucl.rotation;
      }
      if (action.index === 3) extra.bpm = Math.round(Math.max(40, Math.min(300, action.value)));
      return { ...state, knobValues: newKV, ...extra };
    }
    case 'SET_EUCLIDEAN': {
      const { trackIdx, hits, rotation } = action;
      const newEuclE = [...state.euclidean];
      newEuclE[trackIdx] = {
        hits: hits !== undefined ? hits : newEuclE[trackIdx].hits,
        rotation: rotation !== undefined ? rotation : newEuclE[trackIdx].rotation,
        manual: false,
      };
      const newSeqE = state.seq.map((row, ri) =>
        ri === trackIdx ? computeEuclidean(newEuclE[trackIdx].hits, newEuclE[trackIdx].rotation) : row
      );
      return { ...state, euclidean: newEuclE, seq: newSeqE };
    }
    case 'APPLY_SOUND_PRESET': {
      const s = SOUND_PRESETS[action.index];
      if (!s) return state;
      const newKV = [...state.knobValues];
      newKV[4] = s.v[0];
      newKV[7] = s.v[1];
      newKV[5] = s.v[2];
      newKV[6] = s.v[3];
      newKV[8] = s.v[5];
      return { ...state, knobValues: newKV };
    }
    case 'LOG':
      return { ...state, logs: [...state.logs.slice(-399), action.msg] };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'SET_SIDEBAR_TAB':
      return { ...state, sidebarTab: action.tab };
    case 'SET_LEARN':
      return { ...state, learn: action.learn, learnTarget: action.learn ? state.learnTarget : null };
    case 'SET_LEARN_TARGET':
      return { ...state, learnTarget: action.target };
    case 'SET_MAPS':
      return { ...state, maps: action.maps };
    case 'MAP_KNOB': {
      const newMaps = { ...state.maps, knobs: [...state.maps.knobs] };
      newMaps.knobs[action.index] = action.cc;
      return { ...state, maps: newMaps, learnTarget: null };
    }
    case 'MAP_PAD': {
      const newMaps = { ...state.maps, pads: [...state.maps.pads] };
      newMaps.pads[action.index] = action.note;
      return { ...state, maps: newMaps, learnTarget: null };
    }
    case 'CLEAR_MAP_KNOB': {
      const newMaps = { ...state.maps, knobs: [...state.maps.knobs] };
      newMaps.knobs[action.index] = null;
      return { ...state, maps: newMaps };
    }
    case 'CLEAR_MAP_PAD': {
      const newMaps = { ...state.maps, pads: [...state.maps.pads] };
      newMaps.pads[action.index] = null;
      return { ...state, maps: newMaps };
    }
    case 'CLEAR_ALL_MAPS':
      return { ...state, maps: { knobs: Array(9).fill(null), pads: Array(16).fill(null) } };
    case 'SET_MIDI_ACCESS':
      return { ...state, midiAccess: action.access };
    case 'INC_MIDI_MSGS':
      return { ...state, totalMidiMsgs: state.totalMidiMsgs + 1 };
    case 'SET_RECORDING':
      return { ...state, recording: action.recording };
    case 'SET_SAMPLE': {
      const newSamples = [...state.samples];
      newSamples[action.trackIndex] = { duration: action.duration, waveform: action.waveform, region: { start: 0, end: 1 } };
      return { ...state, samples: newSamples, recording: false };
    }
    case 'CLEAR_SAMPLE': {
      const newSamples = [...state.samples];
      newSamples[action.trackIndex] = null;
      return { ...state, samples: newSamples };
    }
    case 'SET_SAMPLE_REGION': {
      const newSamples = [...state.samples];
      if (newSamples[action.trackIndex]) {
        newSamples[action.trackIndex] = { ...newSamples[action.trackIndex], region: { start: action.start, end: action.end } };
      }
      return { ...state, samples: newSamples };
    }
    default:
      return state;
  }
}

function getKnobObj(kv) {
  return { pitch: kv[4], decay: kv[5], filter: kv[6], glitch: kv[7], volume: kv[8] };
}

function downsampleWaveform(audioBuffer, points = 256) {
  const data = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(data.length / points);
  const peaks = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    let max = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(data[start + j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }
  return peaks;
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const workerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize worker
  useEffect(() => {
    const w = new Worker(new URL('./workers/sequencer.worker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      if (e.data.type === 'tick') {
        const s = stateRef.current;
        dispatch({ type: 'TICK' });
        const nextStep = (s.curStep + 1) % 16;
        const knobs = getKnobObj(s.knobValues);
        for (let r = 0; r < 8; r++) {
          if (s.seq[r][nextStep]) {
            playSound(TRACKS[r].id, knobs, 0.65, r);
          }
        }
      }
    };
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  // Load saved maps
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gd_maps');
      if (saved) {
        const m = JSON.parse(saved);
        if (m.knobs && m.pads) dispatch({ type: 'SET_MAPS', maps: m });
      }
    } catch {}
  }, []);

  // All actions use stateRef so they're stable with [] deps
  const togglePlay = useCallback(() => {
    initAudio();
    const s = stateRef.current;
    if (s.playing) {
      dispatch({ type: 'SET_PLAYING', playing: false });
      workerRef.current?.postMessage({ type: 'stop' });
    } else {
      dispatch({ type: 'SET_PLAYING', playing: true });
      workerRef.current?.postMessage({ type: 'start', bpm: s.bpm });
    }
  }, []);

  const stop = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', playing: false });
    workerRef.current?.postMessage({ type: 'stop' });
  }, []);

  const setBpm = useCallback((v) => {
    const bpm = Math.round(Math.max(40, Math.min(300, v)));
    dispatch({ type: 'SET_BPM', bpm });
    workerRef.current?.postMessage({ type: 'setBpm', bpm });
  }, []);

  const setMode = useCallback((m) => dispatch({ type: 'SET_MODE', mode: m }), []);
  const setTrack = useCallback((t) => dispatch({ type: 'SET_TRACK', track: t }), []);
  const setEuclidean = useCallback((trackIdx, hits, rotation) => {
    dispatch({ type: 'SET_EUCLIDEAN', trackIdx, hits, rotation });
  }, []);

  const triggerPad = useCallback((i, vel = 1) => {
    initAudio();
    const s = stateRef.current;
    const knobs = getKnobObj(s.knobValues);

    if (s.mode === 0) {
      dispatch({ type: 'TOGGLE_STEP', step: i });
    } else if (s.mode === 1) {
      playSound(TRACKS[i % 8].id, knobs, vel, i % 8);
    } else if (s.mode === 2) {
      dispatch({ type: 'APPLY_SOUND_PRESET', index: i });
      dispatch({ type: 'LOG', msg: 'Sound: ' + (SOUND_PRESETS[i]?.n || '?') });
    } else if (s.mode === 3) {
      const key = TRACK_KEYS[s.selTrack];
      const pats = TRACK_PATTERNS[key];
      if (pats?.[i]) {
        dispatch({
          type: 'SET_PATTERN',
          trackIdx: s.selTrack,
          patIdx: i,
          pattern: pats[i].p.map(Boolean),
          name: pats[i].n,
        });
        dispatch({ type: 'LOG', msg: TRACKS[s.selTrack].s + ' \u2192 ' + pats[i].n });
        if (pats[i].p.some(v => v)) playSound(TRACKS[s.selTrack].id, knobs, 0.4, s.selTrack);
      }
    }
  }, []);

  const setKnobValue = useCallback((index, value) => {
    dispatch({ type: 'SET_KNOB_VALUE', index, value });
    if (index === 3) {
      const nb = Math.round(Math.max(40, Math.min(300, value)));
      workerRef.current?.postMessage({ type: 'setBpm', bpm: nb });
    }
    if (index === 8) setMasterVolume(value / 100);
  }, []);

  const log = useCallback((msg) => dispatch({ type: 'LOG', msg }), []);
  const clearLogs = useCallback(() => dispatch({ type: 'CLEAR_LOGS' }), []);
  const setSidebarTab = useCallback((tab) => dispatch({ type: 'SET_SIDEBAR_TAB', tab }), []);
  const startRec = useCallback(async () => {
    const s = stateRef.current;
    if (s.recording) return;
    try {
      initAudio();
      await startRecording();
      dispatch({ type: 'SET_RECORDING', recording: true });
      dispatch({ type: 'LOG', msg: 'Recording...' });
      // Auto-stop after 5s
      setTimeout(() => {
        if (isRecording()) {
          stopRec(stateRef.current.selTrack);
        }
      }, 5000);
    } catch (e) {
      dispatch({ type: 'LOG', msg: 'Mic error: ' + e.message });
    }
  }, []);

  const stopRec = useCallback(async (trackIdx) => {
    try {
      const audioBuf = await stopRecording();
      setSampleForTrack(trackIdx, audioBuf);
      const waveform = downsampleWaveform(audioBuf, 256);
      dispatch({ type: 'SET_SAMPLE', trackIndex: trackIdx, duration: audioBuf.duration, waveform });
      dispatch({ type: 'LOG', msg: TRACKS[trackIdx].s + ' sample: ' + audioBuf.duration.toFixed(1) + 's' });
    } catch (e) {
      dispatch({ type: 'SET_RECORDING', recording: false });
      dispatch({ type: 'LOG', msg: 'Rec error: ' + e.message });
    }
  }, []);

  const clearSample = useCallback((trackIdx) => {
    clearSampleForTrack(trackIdx);
    dispatch({ type: 'CLEAR_SAMPLE', trackIndex: trackIdx });
    dispatch({ type: 'LOG', msg: TRACKS[trackIdx].s + ' sample cleared' });
  }, []);

  const loadSampleFile = useCallback(async (trackIdx, file) => {
    try {
      initAudio();
      const ac = getAudioContext();
      const arrayBuf = await file.arrayBuffer();
      const audioBuf = await ac.decodeAudioData(arrayBuf);
      // Enforce 5s max
      const maxSamples = ac.sampleRate * 5;
      let buf = audioBuf;
      if (audioBuf.length > maxSamples) {
        buf = ac.createBuffer(audioBuf.numberOfChannels, maxSamples, ac.sampleRate);
        for (let ch = 0; ch < audioBuf.numberOfChannels; ch++) {
          buf.copyToChannel(audioBuf.getChannelData(ch).slice(0, maxSamples), ch);
        }
      }
      setSampleForTrack(trackIdx, buf);
      const waveform = downsampleWaveform(buf, 256);
      dispatch({ type: 'SET_SAMPLE', trackIndex: trackIdx, duration: buf.duration, waveform });
      dispatch({ type: 'LOG', msg: TRACKS[trackIdx].s + ' loaded: ' + file.name });
    } catch (e) {
      dispatch({ type: 'LOG', msg: 'Load error: ' + e.message });
    }
  }, []);

  const setSampleRegion = useCallback((trackIdx, start, end) => {
    audioSetSampleRegion(trackIdx, start, end);
    dispatch({ type: 'SET_SAMPLE_REGION', trackIndex: trackIdx, start, end });
  }, []);

  const toggleLearn = useCallback(() => {
    dispatch({ type: 'SET_LEARN', learn: !stateRef.current.learn });
  }, []);
  const setLearnTarget = useCallback((target) => dispatch({ type: 'SET_LEARN_TARGET', target }), []);
  const mapKnob = useCallback((index, cc) => dispatch({ type: 'MAP_KNOB', index, cc }), []);
  const mapPad = useCallback((index, note) => dispatch({ type: 'MAP_PAD', index, note }), []);
  const clearMapKnob = useCallback((index) => dispatch({ type: 'CLEAR_MAP_KNOB', index }), []);
  const clearMapPad = useCallback((index) => dispatch({ type: 'CLEAR_MAP_PAD', index }), []);
  const clearAllMaps = useCallback(() => dispatch({ type: 'CLEAR_ALL_MAPS' }), []);

  const saveMaps = useCallback(() => {
    try {
      localStorage.setItem('gd_maps', JSON.stringify(stateRef.current.maps));
      dispatch({ type: 'LOG', msg: 'Saved' });
    } catch (e) {
      dispatch({ type: 'LOG', msg: 'Error: ' + e.message });
    }
  }, []);

  const loadMaps = useCallback(() => {
    try {
      const saved = localStorage.getItem('gd_maps');
      if (saved) {
        const m = JSON.parse(saved);
        if (m.knobs && m.pads) {
          dispatch({ type: 'SET_MAPS', maps: m });
          dispatch({ type: 'LOG', msg: 'Loaded' });
        }
      } else {
        dispatch({ type: 'LOG', msg: 'No saved maps' });
      }
    } catch (e) {
      dispatch({ type: 'LOG', msg: 'Error: ' + e.message });
    }
  }, []);

  const processMidi = useCallback((data) => {
    const s = stateRef.current;
    const status = data[0] & 0xf0;
    const d1 = data[1] || 0;
    const d2 = data.length > 2 ? data[2] : 0;

    if (status === 0x90 && d2 > 0) {
      // Note On
      if (s.learn && s.learnTarget?.t === 'pad') {
        dispatch({ type: 'MAP_PAD', index: s.learnTarget.i, note: d1 });
        dispatch({ type: 'LOG', msg: 'Pad' + (s.learnTarget.i + 1) + '\u2192N' + d1 });
      } else {
        const pi = s.maps.pads.indexOf(d1);
        if (pi >= 0) {
          initAudio();
          const knobs = getKnobObj(s.knobValues);
          if (s.mode === 0) {
            dispatch({ type: 'TOGGLE_STEP', step: pi });
          } else if (s.mode === 1) {
            playSound(TRACKS[pi % 8].id, knobs, d2 / 127, pi % 8);
          } else if (s.mode === 2) {
            dispatch({ type: 'APPLY_SOUND_PRESET', index: pi });
          } else if (s.mode === 3) {
            const key = TRACK_KEYS[s.selTrack];
            const pats = TRACK_PATTERNS[key];
            if (pats?.[pi]) {
              dispatch({ type: 'SET_PATTERN', trackIdx: s.selTrack, patIdx: pi, pattern: pats[pi].p.map(Boolean), name: pats[pi].n });
            }
          }
        }
      }
    } else if (status === 0xb0) {
      // CC
      if (s.learn && s.learnTarget?.t === 'knob') {
        dispatch({ type: 'MAP_KNOB', index: s.learnTarget.i, cc: d1 });
        dispatch({ type: 'LOG', msg: KNOB_DEFS[s.learnTarget.i].lbl + '\u2192CC' + d1 });
      } else {
        const ki = s.maps.knobs.indexOf(d1);
        if (ki >= 0) {
          const kdef = KNOB_DEFS[ki];
          const val = kdef.min + (d2 / 127) * (kdef.max - kdef.min);
          dispatch({ type: 'SET_KNOB_VALUE', index: ki, value: val });
          if (ki === 3) {
            const nb = Math.round(Math.max(40, Math.min(300, val)));
            workerRef.current?.postMessage({ type: 'setBpm', bpm: nb });
          }
          if (ki === 8) setMasterVolume(val / 100);
        }
      }
    }
    dispatch({ type: 'INC_MIDI_MSGS' });
  }, []);

  const scanMidi = useCallback(async (sysex = false) => {
    try {
      dispatch({ type: 'LOG', msg: 'Scanning...' });
      const access = await navigator.requestMIDIAccess({ sysex });
      dispatch({ type: 'SET_MIDI_ACCESS', access });

      const listen = (inp) => {
        inp.onmidimessage = (e) => {
          const data = Array.from(e.data);
          if (data[0] === 0xf8 || data[0] === 0xfe) return; // clock/active sensing
          processMidi(data);
        };
      };

      for (const [, inp] of access.inputs) {
        dispatch({ type: 'LOG', msg: 'IN: ' + inp.name });
        listen(inp);
      }
      for (const [, out] of access.outputs) {
        dispatch({ type: 'LOG', msg: 'OUT: ' + out.name });
      }
      if (!access.inputs.size) dispatch({ type: 'LOG', msg: 'No inputs' });

      access.onstatechange = (e) => {
        dispatch({ type: 'LOG', msg: e.port.name + ' ' + e.port.state });
        if (e.port.type === 'input' && e.port.state === 'connected') listen(e.port);
      };
    } catch (e) {
      dispatch({ type: 'LOG', msg: 'Error: ' + e.message });
    }
  }, [processMidi]);

  // Stable actions object - never changes identity
  const actions = useMemo(() => ({
    togglePlay, stop, setBpm, setMode, setTrack, setEuclidean, triggerPad, setKnobValue,
    log, clearLogs, setSidebarTab,
    startRec, stopRec, clearSample, loadSampleFile, setSampleRegion,
    toggleLearn, setLearnTarget,
    mapKnob, mapPad, clearMapKnob, clearMapPad, clearAllMaps,
    saveMaps, loadMaps, scanMidi, processMidi, dispatch,
  }), [
    togglePlay, stop, setBpm, setMode, setTrack, setEuclidean, triggerPad, setKnobValue,
    log, clearLogs, setSidebarTab,
    startRec, stopRec, clearSample, loadSampleFile, setSampleRegion,
    toggleLearn, setLearnTarget,
    mapKnob, mapPad, clearMapKnob, clearMapPad, clearAllMaps,
    saveMaps, loadMaps, scanMidi, processMidi,
  ]);

  return { state, actions, stateRef };
}
