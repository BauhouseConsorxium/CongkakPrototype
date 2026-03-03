// AI scene generation via OpenAI-compatible proxy
// Builds compact prompts, calls chat completions, parses structured JSON response

import { TRACKS } from './constants';

const API_URL = '/v1/chat/completions';
const API_KEY = 'dev_live_89e8817f0fe790efa84acc90bf19bde8';

export function getApiKey() {
  return API_KEY;
}

export function setApiKey() {
  // Key is hardcoded — no-op
}

const SYSTEM_PROMPT = `You are a drum machine scene generator for CONGKAK::PROTO, an 8-track step sequencer.

Tracks: 0=kick, 1=snare, 2=hihat, 3=clap, 4=bass, 5=lead, 6=stab, 7=noise
Each track has a 16-step pattern (array of 0/1) and sound params.
Knob ranges: pitch 20-2000, decay 0.01-2.0, filter 100-12000, glitch 0-100, vol 0-100.

Create musically cohesive scenes. Patterns should groove together with good syncopation.
Kick anchors the rhythm. Snare/clap provide backbeat. Hihat drives momentum.
Bass follows kick but adds variation. Lead/stab add melodic interest sparsely.
Noise adds texture. Not every track needs to be active — space is musical.

Respond ONLY with a JSON object, no markdown fences, no explanation:
{"name":"SCENE_NAME","bpm":120,"tracks":[{"pattern":[1,0,0,0,...],"pitch":200,"decay":0.3,"filter":5000,"glitch":10,"vol":70},...8 tracks]}`;

export function buildScenePrompt(state, vibe) {
  const tracks = TRACKS.map((t, i) => {
    const s = state.samples[i];
    const entry = { idx: i, type: t.id };
    if (s?.label) {
      entry.sample = {
        detected: s.label.type,
        tags: s.label.tags,
      };
      if (s.features) {
        entry.sample.pitch = Math.round(s.features.pitch);
        entry.sample.bright = +(s.features.centroid / 10000).toFixed(2);
      }
    }
    return entry;
  });

  return JSON.stringify({ vibe: vibe.desc, bpm: state.bpm, tracks });
}

export function parseSceneResponse(text) {
  // Strip markdown fences if present
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const scene = JSON.parse(clean);

  // Validate structure
  if (!scene.tracks || scene.tracks.length !== 8) {
    throw new Error('Scene must have exactly 8 tracks');
  }

  for (let i = 0; i < 8; i++) {
    const t = scene.tracks[i];
    if (!t.pattern || t.pattern.length !== 16) {
      throw new Error(`Track ${i} must have 16-step pattern`);
    }
    // Normalize pattern to booleans
    t.pattern = t.pattern.map(v => v === 1 || v === true);
    // Clamp params
    t.pitch = clamp(t.pitch ?? 440, 20, 2000);
    t.decay = clamp(t.decay ?? 0.3, 0.01, 2);
    t.filter = clamp(t.filter ?? 5000, 100, 12000);
    t.glitch = clamp(t.glitch ?? 10, 0, 100);
    t.vol = clamp(t.vol ?? 70, 0, 100);
  }

  scene.bpm = clamp(scene.bpm ?? 120, 40, 300);
  scene.name = (scene.name || 'SCENE').toUpperCase().slice(0, 12);

  return scene;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export async function generateScene(_apiKey, state, vibe) {
  const userPrompt = buildScenePrompt(state, vibe);

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    if (resp.status === 401) throw new Error('Invalid API key');
    if (resp.status === 429) throw new Error('Rate limited — try again');
    throw new Error(`API error ${resp.status}: ${body.slice(0, 100)}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from API');

  return parseSceneResponse(text);
}

export function applyScene(dispatch, scene, setBpm) {
  // Apply all 8 track patterns
  for (let i = 0; i < 8; i++) {
    const t = scene.tracks[i];
    dispatch({
      type: 'SET_PATTERN',
      trackIdx: i,
      patIdx: -1,
      pattern: t.pattern,
      name: scene.name,
    });
  }

  // Apply BPM
  setBpm(scene.bpm);

  // Apply sound params from the most active track (most hits)
  // Since all tracks share one set of params currently, pick the track with most steps
  let bestTrack = 0;
  let bestHits = 0;
  for (let i = 0; i < 8; i++) {
    const hits = scene.tracks[i].pattern.filter(Boolean).length;
    if (hits > bestHits) { bestHits = hits; bestTrack = i; }
  }
  const t = scene.tracks[bestTrack];
  dispatch({ type: 'APPLY_SCENE_PARAMS', pitch: t.pitch, decay: t.decay, filter: t.filter, glitch: t.glitch, vol: t.vol });

  dispatch({ type: 'LOG', msg: 'Scene: ' + scene.name + ' @ ' + scene.bpm + ' BPM' });
}
