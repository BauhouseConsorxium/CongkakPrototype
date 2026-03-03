// Rule-based sample classification from DSP features
// No AI needed — simple decision tree maps features to drum machine categories

export function classifySample(features) {
  const { centroid, rolloff, zcr, pitchConf, pitch, crest, duration, envelope } = features;

  // Compute decay shape: how quickly amplitude falls
  const peakSlice = envelope.indexOf(Math.max(...envelope));
  const decayRatio = peakSlice < envelope.length - 1
    ? envelope[Math.min(peakSlice + 4, envelope.length - 1)] / (envelope[peakSlice] || 1)
    : 1;
  const isShort = duration < 0.3;
  const isMedium = duration < 1.0;
  const isTonal = pitchConf > 0.5;
  const isNoiseLike = zcr > 0.15;
  const isPunchy = crest > 4;

  let type, suggestedTrack, confidence;

  if (centroid < 1500 && isPunchy && isShort && pitch < 200) {
    type = 'kick';
    suggestedTrack = 0;
    confidence = 0.85;
  } else if (centroid > 1000 && centroid < 5000 && isNoiseLike && isMedium && !isTonal) {
    type = 'snare';
    suggestedTrack = 1;
    confidence = 0.75;
  } else if (centroid > 4000 && isShort && zcr > 0.2) {
    type = 'hihat';
    suggestedTrack = 2;
    confidence = 0.80;
  } else if (centroid > 1000 && centroid < 5000 && isShort && !isTonal && decayRatio < 0.3) {
    type = 'clap';
    suggestedTrack = 3;
    confidence = 0.60;
  } else if (centroid < 2000 && isTonal && !isShort && pitch < 300) {
    type = 'bass';
    suggestedTrack = 4;
    confidence = 0.80;
  } else if (isTonal && pitch > 200) {
    type = 'lead';
    suggestedTrack = 5;
    confidence = 0.65;
  } else if (isTonal && !isShort && centroid > 800 && centroid < 4000) {
    type = 'stab';
    suggestedTrack = 6;
    confidence = 0.55;
  } else if (isNoiseLike && !isTonal) {
    type = 'noise';
    suggestedTrack = 7;
    confidence = 0.60;
  } else {
    // Fallback: use centroid to guess percussion vs tonal
    if (centroid > 3000) {
      type = 'hihat';
      suggestedTrack = 2;
    } else if (isTonal) {
      type = 'lead';
      suggestedTrack = 5;
    } else {
      type = 'noise';
      suggestedTrack = 7;
    }
    confidence = 0.30;
  }

  const tags = buildTags(features);

  return { type, tags, confidence, suggestedTrack };
}

function buildTags(features) {
  const tags = [];
  const { centroid, rolloff, crest, pitchConf, pitch, zcr, duration } = features;

  if (centroid > 3000) tags.push('bright');
  else if (centroid < 1000) tags.push('dark');

  if (crest > 6) tags.push('punchy');
  else if (crest < 2) tags.push('smooth');

  if (rolloff < 2000) tags.push('muffled');
  if (rolloff > 8000) tags.push('airy');

  if (pitchConf > 0.6 && pitch > 0) {
    tags.push(Math.round(pitch) + 'Hz');
  }

  if (zcr > 0.25) tags.push('noisy');
  if (duration < 0.1) tags.push('click');
  else if (duration > 2) tags.push('long');

  return tags.slice(0, 3); // max 3 tags for display
}

export function suggestParams(features) {
  const { centroid, crest, duration, pitchConf, pitch, rolloff } = features;

  // Map features to knob ranges: pitch 20-2000, decay 0.01-2, filter 100-12000, glitch 0-100, vol 0-100
  const suggestedPitch = pitchConf > 0.4 && pitch > 0
    ? Math.max(20, Math.min(2000, pitch))
    : Math.max(20, Math.min(2000, centroid * 0.3));

  const suggestedDecay = Math.max(0.01, Math.min(2, duration * 0.8));

  const suggestedFilter = Math.max(100, Math.min(12000, rolloff * 1.2));

  const suggestedGlitch = crest > 6 ? 5 : crest > 3 ? 15 : 30;

  const suggestedVol = 70;

  return {
    pitch: Math.round(suggestedPitch),
    decay: parseFloat(suggestedDecay.toFixed(2)),
    filter: Math.round(suggestedFilter),
    glitch: suggestedGlitch,
    vol: suggestedVol,
  };
}
