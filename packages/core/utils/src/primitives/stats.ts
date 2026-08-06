/**
 * Nearest-rank percentile on a **pre-sorted ascending** numeric array.
 * @returns `null` when `sorted` is empty.
 */
export function percentileNearestSorted(sorted: number[], percentile: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

/** Arithmetic mean; `null` when `values` is empty. */
export function arithmeticMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}
