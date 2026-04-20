export type RandomFn = () => number;

function normalizeSeed(seed?: number | string): number {
  if (seed === undefined) {
    return Date.now() >>> 0;
  }

  if (typeof seed === "number") {
    return seed >>> 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRng(seed?: number | string): RandomFn {
  let state = normalizeSeed(seed) || 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.min(0.999999999, Math.max(0, result));
  };
}
