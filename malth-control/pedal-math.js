(function (root) {
  'use strict';
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function calibrated(raw, rest, pressed) {
    if (rest === pressed) return 0;
    return clamp(Math.trunc((raw - rest) * 1023 / (pressed - rest)), 0, 1023);
  }
  function brake(input, points) {
    input = clamp(Math.trunc(input), 0, 1023);
    if (input === 1023) return points[9];
    const scaled = input * 10, segment = Math.floor(scaled / 1023);
    const low = segment ? points[segment - 1] : 0;
    return low + Math.trunc((points[segment] - low) * (scaled % 1023) / 1023);
  }
  const api = { calibrated, brake };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MalthPedalMath = api;
})(typeof window === 'undefined' ? globalThis : window);
