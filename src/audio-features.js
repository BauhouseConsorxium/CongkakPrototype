// DSP feature extraction for sample character recognition
// Operates on Float32Array from AudioBuffer — all functions are pure, no Web Audio dependencies

// ── Utilities ──

function fft(re, im) {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // Cooley-Tukey radix-2
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < half; j++) {
        const a = i + j;
        const b = a + half;
        const tRe = curRe * re[b] - curIm * im[b];
        const tIm = curRe * im[b] + curIm * re[b];
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function computeMagnitudes(samples, fftSize) {
  const n = fftSize || nextPow2(samples.length);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const copyLen = Math.min(samples.length, n);

  // Apply Hann window
  for (let i = 0; i < copyLen; i++) {
    re[i] = samples[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (copyLen - 1)));
  }

  fft(re, im);

  const half = n >> 1;
  const mags = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return { mags, fftSize: n };
}

// ── Feature Functions ──

export function spectralCentroid(mags, sampleRate, fftSize) {
  const half = mags.length;
  let weightedSum = 0;
  let totalMag = 0;
  for (let i = 0; i < half; i++) {
    const freq = (i * sampleRate) / fftSize;
    weightedSum += freq * mags[i];
    totalMag += mags[i];
  }
  return totalMag > 0 ? weightedSum / totalMag : 0;
}

export function spectralRolloff(mags, sampleRate, fftSize, threshold = 0.85) {
  const half = mags.length;
  let total = 0;
  for (let i = 0; i < half; i++) total += mags[i];
  const target = total * threshold;
  let cumulative = 0;
  for (let i = 0; i < half; i++) {
    cumulative += mags[i];
    if (cumulative >= target) return (i * sampleRate) / fftSize;
  }
  return sampleRate / 2;
}

export function zeroCrossingRate(samples) {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) crossings++;
  }
  return crossings / (samples.length - 1);
}

export function rmsEnvelope(samples, numSlices = 16) {
  const sliceLen = Math.floor(samples.length / numSlices);
  const env = new Float32Array(numSlices);
  for (let s = 0; s < numSlices; s++) {
    let sum = 0;
    const start = s * sliceLen;
    for (let i = 0; i < sliceLen; i++) {
      const v = samples[start + i];
      sum += v * v;
    }
    env[s] = Math.sqrt(sum / sliceLen);
  }
  return env;
}

function melToHz(mel) { return 700 * (Math.pow(10, mel / 2595) - 1); }
function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }

export function computeMFCC(samples, sampleRate, numCoeffs = 13) {
  const fftSize = 2048;
  const n = Math.min(samples.length, fftSize);
  const padded = new Float32Array(fftSize);
  for (let i = 0; i < n; i++) {
    padded[i] = samples[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  }
  const im = new Float32Array(fftSize);
  fft(padded, im);

  const half = fftSize >> 1;
  const powerSpec = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    powerSpec[i] = (padded[i] * padded[i] + im[i] * im[i]) / fftSize;
  }

  // Mel filterbank (26 filters)
  const numFilters = 26;
  const melLow = hzToMel(20);
  const melHigh = hzToMel(sampleRate / 2);
  const melPoints = [];
  for (let i = 0; i <= numFilters + 1; i++) {
    melPoints.push(melToHz(melLow + (melHigh - melLow) * i / (numFilters + 1)));
  }
  const bins = melPoints.map(f => Math.floor((fftSize + 1) * f / sampleRate));

  const filterEnergies = new Float32Array(numFilters);
  for (let m = 0; m < numFilters; m++) {
    const start = bins[m], mid = bins[m + 1], end = bins[m + 2];
    for (let k = start; k < mid; k++) {
      if (k < half) filterEnergies[m] += powerSpec[k] * (k - start) / (mid - start || 1);
    }
    for (let k = mid; k <= end; k++) {
      if (k < half) filterEnergies[m] += powerSpec[k] * (end - k) / (end - mid || 1);
    }
    filterEnergies[m] = Math.log(filterEnergies[m] + 1e-10);
  }

  // DCT-II
  const mfcc = new Float32Array(numCoeffs);
  for (let i = 0; i < numCoeffs; i++) {
    let sum = 0;
    for (let j = 0; j < numFilters; j++) {
      sum += filterEnergies[j] * Math.cos(Math.PI * i * (j + 0.5) / numFilters);
    }
    mfcc[i] = sum;
  }
  return mfcc;
}

export function estimatePitch(samples, sampleRate) {
  // Autocorrelation method
  const minFreq = 30;
  const maxFreq = 4000;
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);
  const n = Math.min(samples.length, maxLag * 2);

  let bestCorr = -1;
  let bestLag = 0;

  // Compute energy for normalization
  let energy = 0;
  for (let i = 0; i < n; i++) energy += samples[i] * samples[i];
  if (energy < 1e-10) return { freq: 0, confidence: 0 };

  for (let lag = minLag; lag < Math.min(maxLag, n >> 1); lag++) {
    let corr = 0;
    let e1 = 0, e2 = 0;
    const limit = n - lag;
    for (let i = 0; i < limit; i++) {
      corr += samples[i] * samples[i + lag];
      e1 += samples[i] * samples[i];
      e2 += samples[i + lag] * samples[i + lag];
    }
    const norm = Math.sqrt(e1 * e2);
    const normCorr = norm > 0 ? corr / norm : 0;
    if (normCorr > bestCorr) {
      bestCorr = normCorr;
      bestLag = lag;
    }
  }

  const freq = bestLag > 0 ? sampleRate / bestLag : 0;
  return { freq, confidence: Math.max(0, bestCorr) };
}

export function crestFactor(samples) {
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);
  return rms > 0 ? peak / rms : 0;
}

export function onsetStrength(samples, sampleRate) {
  // Spectral flux in the first ~20ms vs next ~20ms
  const windowSamples = Math.min(Math.floor(sampleRate * 0.02), samples.length >> 1);
  if (windowSamples < 32) return 0;

  const fftSize = nextPow2(windowSamples);
  const w1 = samples.slice(0, windowSamples);
  const w2 = samples.slice(windowSamples, windowSamples * 2);

  const { mags: mags1 } = computeMagnitudes(w1, fftSize);
  const { mags: mags2 } = computeMagnitudes(w2, fftSize);

  let flux = 0;
  for (let i = 0; i < mags1.length; i++) {
    const diff = mags2[i] - mags1[i];
    if (diff > 0) flux += diff;
  }
  return flux;
}

// ── Main Extraction ──

export function extractFeatures(audioBuffer) {
  const samples = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  // Use first 2 seconds max for analysis
  const analysisLen = Math.min(samples.length, sr * 2);
  const slice = samples.slice(0, analysisLen);

  const { mags, fftSize } = computeMagnitudes(slice);
  const centroid = spectralCentroid(mags, sr, fftSize);
  const rolloff = spectralRolloff(mags, sr, fftSize);
  const zcr = zeroCrossingRate(slice);
  const envelope = rmsEnvelope(slice, 16);
  const mfcc = computeMFCC(slice, sr);
  const pitch = estimatePitch(slice, sr);
  const crest = crestFactor(slice);
  const onset = onsetStrength(slice, sr);

  return {
    centroid,
    rolloff,
    zcr,
    envelope: Array.from(envelope),
    mfcc: Array.from(mfcc),
    pitch: pitch.freq,
    pitchConf: pitch.confidence,
    crest,
    onset,
    duration,
  };
}
