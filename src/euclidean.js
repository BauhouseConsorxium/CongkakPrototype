/**
 * Bjorklund/Euclidean rhythm algorithm.
 * Distributes `hits` pulses as evenly as possible across `steps` slots.
 */
export function bjorklund(steps, hits) {
  if (hits >= steps) return Array(steps).fill(true);
  if (hits <= 0) return Array(steps).fill(false);

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - hits;
  remainders.push(hits);
  let level = 0;

  while (true) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level++;
    if (remainders[level] <= 1) break;
  }
  counts.push(divisor);

  function build(lvl) {
    if (lvl === -1) pattern.push(false);
    else if (lvl === -2) pattern.push(true);
    else {
      for (let i = 0; i < counts[lvl]; i++) build(lvl - 1);
      if (remainders[lvl] !== 0) build(lvl - 2);
    }
  }
  build(level);

  // Rotate so first hit is at index 0
  const firstOne = pattern.indexOf(true);
  if (firstOne > 0) {
    pattern = [...pattern.slice(firstOne), ...pattern.slice(0, firstOne)];
  }

  return pattern;
}

/**
 * Shift pattern right by `rotation` steps.
 */
export function rotatePattern(pattern, rotation) {
  if (rotation === 0) return [...pattern];
  const n = pattern.length;
  const r = ((rotation % n) + n) % n;
  return [...pattern.slice(n - r), ...pattern.slice(0, n - r)];
}

/**
 * Generate a Euclidean rhythm: `hits` pulses across `steps`, shifted by `rotation`.
 */
export function euclidean(hits, rotation, steps = 16) {
  return rotatePattern(bjorklund(steps, hits), rotation);
}
