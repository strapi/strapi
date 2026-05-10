import { mergeQueryTelemetryIntoStats } from '../perf-query-stats';

describe('mergeQueryTelemetryIntoStats', () => {
  it('accumulates counts and duration', () => {
    const map = new Map();

    mergeQueryTelemetryIntoStats(map, 'r1', 10, false);
    mergeQueryTelemetryIntoStats(map, 'r1', 20, false);

    expect(map.get('r1')).toEqual({
      count: 2,
      totalMs: 30,
      slowOrErrorEvents: 0,
    });
  });

  it('increments slowOrErrorEvents when flagged', () => {
    const map = new Map();

    mergeQueryTelemetryIntoStats(map, 'r1', 5, true);
    mergeQueryTelemetryIntoStats(map, 'r1', 5, false);

    expect(map.get('r1')).toEqual({
      count: 2,
      totalMs: 10,
      slowOrErrorEvents: 1,
    });
  });

  it('isolates buckets per request id', () => {
    const map = new Map();

    mergeQueryTelemetryIntoStats(map, 'a', 1, false);
    mergeQueryTelemetryIntoStats(map, 'b', 2, true);

    expect(map.get('a')?.count).toBe(1);
    expect(map.get('b')?.slowOrErrorEvents).toBe(1);
  });
});
