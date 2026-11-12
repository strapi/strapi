import { describe, expect, test } from 'vitest';

import { piwiRunLabel } from '../runners/browser-runner';

describe('piwiRunLabel', () => {
  test('returns undefined when no CI label is set', () => {
    expect(piwiRunLabel({ baseLabel: undefined, shard: null, domain: 'admin', lane: 0 })).toBe(
      undefined
    );
    expect(piwiRunLabel({ baseLabel: '', shard: null, domain: 'admin', lane: 0 })).toBe(undefined);
  });

  test('adds the shard, the domain and the lane to the CI label', () => {
    expect(
      piwiRunLabel({
        baseLabel: '123-1-ce-chromium',
        shard: { index: 2, total: 5 },
        domain: 'content-manager',
        lane: 1,
      })
    ).toBe('123-1-ce-chromium-shard2of5-content-manager-lane1');
  });

  test('leaves out the shard when the job is not sharded', () => {
    expect(
      piwiRunLabel({
        baseLabel: '123-1-ce-media-library',
        shard: null,
        domain: 'media-library',
        lane: 0,
      })
    ).toBe('123-1-ce-media-library-media-library-lane0');
  });

  test('gives a different label to every process of a sharded CI matrix', () => {
    const labels = new Set<string | undefined>();
    for (let index = 1; index <= 3; index += 1) {
      for (const domain of ['admin', 'content-manager', 'i18n']) {
        for (let lane = 0; lane < 2; lane += 1) {
          labels.add(
            piwiRunLabel({ baseLabel: 'run-ce-chromium', shard: { index, total: 3 }, domain, lane })
          );
        }
      }
    }
    expect(labels.size).toBe(3 * 3 * 2);
  });
});
