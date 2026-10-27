import { describe, expect, test } from 'vitest';

import { extractShardArgs, planShard } from '../runners/shard-plan';

const units = [
  { domain: 'content-manager', file: 'a.spec.ts' },
  { domain: 'content-manager', file: 'b.spec.ts' },
  { domain: 'content-type-builder', file: 'heavy.spec.ts' },
  { domain: 'admin', file: 'login.spec.ts' },
  { domain: 'admin', file: 'home.spec.ts' },
  { domain: 'settings', file: 'new.spec.ts' },
];

const weights = {
  'content-manager/a.spec.ts': 300,
  'content-manager/b.spec.ts': 100,
  'content-type-builder/heavy.spec.ts': 500,
  'admin/login.spec.ts': 60,
  'admin/home.spec.ts': 40,
};

const allShards = (total: number, lanes: number) =>
  Array.from({ length: total }, (_, i) =>
    planShard({ weights, units, shard: { index: i + 1, total }, lanes })
  );

const filesOf = (plans: ReturnType<typeof allShards>) =>
  plans.flat(2).flatMap((run) => run.files.map((file) => `${run.domain}/${file}`));

describe('planShard', () => {
  test('runs every file exactly once across all shards and lanes', () => {
    for (const [total, lanes] of [
      [1, 1],
      [2, 1],
      [4, 2],
      [3, 2],
    ]) {
      const files = filesOf(allShards(total, lanes));
      expect(files.sort()).toEqual(units.map((u) => `${u.domain}/${u.file}`).sort());
    }
  });

  test('is deterministic, whatever order the files are listed in', () => {
    const a = planShard({ weights, units, shard: { index: 1, total: 2 }, lanes: 2 });
    const b = planShard({
      weights,
      units: [...units].reverse(),
      shard: { index: 1, total: 2 },
      lanes: 2,
    });
    expect(a).toEqual(b);
  });

  test('balances by duration, not by file count', () => {
    const [first, second] = allShards(2, 1);
    const load = (plan: (typeof first)[number]) => plan.reduce((sum, run) => sum + run.weight, 0);
    // 500 alone on one side, 300 + 100 + 60 + 40 + median on the other.
    expect(Math.abs(load(first[0]) - load(second[0]))).toBeLessThanOrEqual(100);
  });

  test('weighs a file with no measurement like a typical file', () => {
    const plan = planShard({ weights, units, shard: { index: 1, total: 1 }, lanes: 1 });
    const settings = plan[0].find((run) => run.domain === 'settings');
    expect(settings?.weight).toBe(100);
  });

  test('returns one plan per lane, heaviest domain first', () => {
    const plan = planShard({ weights, units, shard: { index: 1, total: 1 }, lanes: 2 });
    expect(plan).toHaveLength(2);
    for (const lane of plan) {
      const laneWeights = lane.map((run) => run.weight);
      expect(laneWeights).toEqual([...laneWeights].sort((x, y) => y - x));
    }
  });
});

describe('extractShardArgs', () => {
  test('takes --shard out and keeps --project', () => {
    expect(extractShardArgs(['--project=webkit', '--shard=2/4', '--grep', 'x'])).toEqual({
      shard: { index: 2, total: 4 },
      project: 'webkit',
      rest: ['--project=webkit', '--grep', 'x'],
    });
  });

  test('accepts a separate value', () => {
    expect(extractShardArgs(['--shard', '1/2', '--project', 'chromium'])).toEqual({
      shard: { index: 1, total: 2 },
      project: 'chromium',
      rest: ['--project', 'chromium'],
    });
  });

  test('ignores an invalid shard', () => {
    expect(extractShardArgs(['--shard=5/4']).shard).toBeNull();
  });
});
