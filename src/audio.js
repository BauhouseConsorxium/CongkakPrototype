let ac = null;
let masterGain = null;
let analyser = null;

// Sample storage (module-scoped, not React state)
const sampleBuffers = Array(8).fill(null);
const sampleRegions = Array(8).fill(null);
let mediaStream = null;
let mediaRecorder = null;
let recordingChunks = [];

export function getAudioContext() { return ac; }
export function getAnalyser() { return analyser; }

// ── Recording ──

export function startRecording() {
  return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaStream = stream;
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunks.push(e.data);
    };
    mediaRecorder.start();
  });
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('Not recording'));
      return;
    }
    mediaRecorder.onstop = async () => {
      // Clean up stream
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
      }
      const blob = new Blob(recordingChunks, { type: 'audio/webm' });
      recordingChunks = [];
      mediaRecorder = null;
      try {
        initAudio();
        const arrayBuf = await blob.arrayBuffer();
        const audioBuf = await ac.decodeAudioData(arrayBuf);
        // Enforce 5s max
        const maxSamples = ac.sampleRate * 5;
        if (audioBuf.length > maxSamples) {
          const trimmed = ac.createBuffer(audioBuf.numberOfChannels, maxSamples, ac.sampleRate);
          for (let ch = 0; ch < audioBuf.numberOfChannels; ch++) {
            trimmed.copyToChannel(audioBuf.getChannelData(ch).slice(0, maxSamples), ch);
          }
          resolve(trimmed);
        } else {
          resolve(audioBuf);
        }
      } catch (e) {
        reject(e);
      }
    };
    mediaRecorder.stop();
  });
}

export function isRecording() {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

// ── Sample management ──

export function setSampleForTrack(trackIndex, audioBuffer) {
  sampleBuffers[trackIndex] = audioBuffer;
  sampleRegions[trackIndex] = { start: 0, end: 1 };
}

export function clearSampleForTrack(trackIndex) {
  sampleBuffers[trackIndex] = null;
  sampleRegions[trackIndex] = null;
}

export function setSampleRegion(trackIndex, start, end) {
  if (sampleRegions[trackIndex]) {
    sampleRegions[trackIndex] = { start, end };
  }
}

export function getSampleBuffer(trackIndex) { return sampleBuffers[trackIndex]; }
export function getSampleRegion(trackIndex) { return sampleRegions[trackIndex]; }
export function hasSample(trackIndex) { return sampleBuffers[trackIndex] !== null; }

export function initAudio() {
  if (ac) return;
  ac = new AudioContext();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 8;
  masterGain = ac.createGain();
  masterGain.gain.value = 0.5;
  analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  masterGain.connect(comp);
  comp.connect(analyser);
  analyser.connect(ac.destination);
}

export function setMasterVolume(v) {
  if (masterGain) masterGain.gain.value = v;
}

function makeNoise(duration) {
  const n = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, Math.max(n, 1), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.start(ac.currentTime);
  return src;
}

export function playSound(type, knobValues, vel = 1, trackIndex = -1) {
  initAudio();
  const t = ac.currentTime;
  const decay = knobValues.decay;
  const vol = (knobValues.volume / 100) * vel;
  const pitch = knobValues.pitch;
  const glitch = knobValues.glitch / 100;
  const filterFreq = knobValues.filter;

  // ── Sample playback path ──
  if (trackIndex >= 0 && sampleBuffers[trackIndex]) {
    const buf = sampleBuffers[trackIndex];
    const region = sampleRegions[trackIndex] || { start: 0, end: 1 };
    const startOffset = region.start * buf.duration;
    const duration = (region.end - region.start) * buf.duration;

    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitch / 440;

    const env = ac.createGain();
    env.gain.setValueAtTime(vol, t);
    env.gain.setValueAtTime(vol, t + Math.max(duration - 0.02, 0));
    env.gain.exponentialRampToValueAtTime(0.001, t + duration + 0.01);

    const flt = ac.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = filterFreq;
    flt.Q.value = 1 + glitch * 10;

    const dry = ac.createGain();
    dry.connect(flt);
    flt.connect(env);
    env.connect(masterGain);

    const dlAmt = glitch * 0.5;
    if (dlAmt > 0.02) {
      const dl = ac.createDelay(1);
      dl.delayTime.value = 0.1 + dlAmt * 0.3;
      const fb = ac.createGain();
      fb.gain.value = dlAmt * 0.45;
      const wet = ac.createGain();
      wet.gain.value = dlAmt * 0.35;
      flt.connect(dl);
      dl.connect(fb);
      fb.connect(dl);
      dl.connect(wet);
      wet.connect(env);
    }

    src.connect(dry);
    src.start(t, startOffset, duration);
    return;
  }

  const env = ac.createGain();
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + decay + 0.01);

  const flt = ac.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = filterFreq;
  flt.Q.value = 1 + glitch * 10;

  const dry = ac.createGain();
  dry.connect(flt);
  flt.connect(env);
  env.connect(masterGain);

  const dlAmt = glitch * 0.5;
  if (dlAmt > 0.02) {
    const dl = ac.createDelay(1);
    dl.delayTime.value = 0.1 + dlAmt * 0.3;
    const fb = ac.createGain();
    fb.gain.value = dlAmt * 0.45;
    const wet = ac.createGain();
    wet.gain.value = dlAmt * 0.35;
    flt.connect(dl);
    dl.connect(fb);
    fb.connect(dl);
    dl.connect(wet);
    wet.connect(env);
  }

  switch (type) {
    case 'kick': {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(pitch * 0.35, t);
      o.frequency.exponentialRampToValueAtTime(30, t + decay);
      o.connect(dry);
      o.start(t);
      o.stop(t + decay + 0.05);
      break;
    }
    case 'snare': {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = pitch * 0.5;
      const n = makeNoise(decay);
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.6, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + decay);
      n.connect(ng);
      ng.connect(dry);
      o.connect(dry);
      o.start(t);
      o.stop(t + decay + 0.05);
      break;
    }
    case 'hihat': {
      const n = makeNoise(decay * 0.3);
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6000 + glitch * 4000;
      n.connect(hp);
      hp.connect(dry);
      break;
    }
    case 'clap': {
      for (let i = 0; i < 3; i++) {
        const n = makeNoise(0.02);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.7, t + i * 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.015 + 0.03);
        n.connect(g);
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200;
        g.connect(bp);
        bp.connect(dry);
      }
      break;
    }
    case 'bass': {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = pitch * 0.12;
      o.connect(dry);
      o.start(t);
      o.stop(t + decay + 0.1);
      break;
    }
    case 'lead': {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = pitch;
      const o2 = ac.createOscillator();
      o2.type = 'square';
      o2.frequency.value = pitch * 1.005;
      o2.detune.value = 10 + glitch * 30;
      o.connect(dry);
      o2.connect(dry);
      o.start(t);
      o2.start(t);
      o.stop(t + decay);
      o2.stop(t + decay);
      break;
    }
    case 'stab': {
      [1, 1.5, 2].forEach(m => {
        const o = ac.createOscillator();
        o.type = 'square';
        o.frequency.value = pitch * m * 0.5;
        const g = ac.createGain();
        g.gain.value = 0.25;
        o.connect(g);
        g.connect(dry);
        o.start(t);
        o.stop(t + decay * 0.5);
      });
      break;
    }
    case 'noise': {
      const n = makeNoise(decay);
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = pitch;
      bp.Q.value = 5 + glitch * 20;
      n.connect(bp);
      bp.connect(dry);
      break;
    }
  }
}
