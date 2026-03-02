// IndexedDB persistence for audio samples (survives page reload)

const DB_NAME = 'congkak_samples';
const DB_VERSION = 1;
const STORE_NAME = 'samples';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, mode);
    const store = t.objectStore(STORE_NAME);
    const result = fn(store);
    t.oncomplete = () => { db.close(); resolve(result._result); };
    t.onerror = () => { db.close(); reject(t.error); };
  }));
}

// Save an AudioBuffer as interleaved Float32 + metadata
export async function saveSample(trackIndex, audioBuffer, region) {
  const numCh = audioBuffer.numberOfChannels;
  const sr = audioBuffer.sampleRate;
  const len = audioBuffer.length;
  // Interleave channels into a single Float32Array
  const interleaved = new Float32Array(len * numCh);
  for (let ch = 0; ch < numCh; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < len; i++) interleaved[i * numCh + ch] = data[i];
  }
  const record = { sr, numCh, len, data: interleaved.buffer, region };
  await tx('readwrite', s => { s.put(record, trackIndex); return { _result: undefined }; });
}

export async function deleteSample(trackIndex) {
  await tx('readwrite', s => { s.delete(trackIndex); return { _result: undefined }; });
}

export async function saveRegion(trackIndex, region) {
  const existing = await loadSample(trackIndex);
  if (!existing) return;
  existing.region = region;
  await tx('readwrite', s => { s.put(existing, trackIndex); return { _result: undefined }; });
}

// Load raw record from DB (returns null or { sr, numCh, len, data, region })
export function loadSample(trackIndex) {
  return tx('readonly', s => {
    const req = s.get(trackIndex);
    const wrapper = { _result: null };
    req.onsuccess = () => { wrapper._result = req.result || null; };
    return wrapper;
  });
}

// Load all 8 tracks, returns array of { trackIndex, audioBuffer, region } for non-null slots
export async function loadAllSamples(audioContext) {
  const results = [];
  for (let i = 0; i < 8; i++) {
    const rec = await loadSample(i);
    if (!rec) continue;
    const { sr, numCh, len, data, region } = rec;
    const buf = audioContext.createBuffer(numCh, len, sr);
    const interleaved = new Float32Array(data);
    for (let ch = 0; ch < numCh; ch++) {
      const chData = new Float32Array(len);
      for (let j = 0; j < len; j++) chData[j] = interleaved[j * numCh + ch];
      buf.copyToChannel(chData, ch);
    }
    results.push({ trackIndex: i, audioBuffer: buf, region: region || { start: 0, end: 1 } });
  }
  return results;
}
