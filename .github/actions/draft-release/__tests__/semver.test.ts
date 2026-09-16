import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareStable,
  formatStable,
  highestStable,
  increment,
  nextPatchOf,
  parseStable,
} from '../lib/semver.ts';

describe('parseStable', () => {
  it('parses a stable version', () => {
    assert.deepEqual(parseStable('5.52.3'), { major: 5, minor: 52, patch: 3 });
  });

  const rejected = ['5.52', '5.52.3-beta.1', '0.0.0-experimental.abc', 'v5.52.3', '', null, 42];

  for (const value of rejected) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      assert.equal(parseStable(value), null);
    });
  }
});

describe('formatStable', () => {
  it('round-trips a parsed version', () => {
    assert.equal(formatStable({ major: 5, minor: 52, patch: 3 }), '5.52.3');
  });
});

describe('compareStable', () => {
  it('orders field by field, not lexically', () => {
    assert.equal(
      compareStable({ major: 5, minor: 9, patch: 0 }, { major: 5, minor: 10, patch: 0 }),
      -1
    );
    assert.equal(
      compareStable({ major: 5, minor: 52, patch: 3 }, { major: 5, minor: 52, patch: 3 }),
      0
    );
    assert.equal(
      compareStable({ major: 6, minor: 0, patch: 0 }, { major: 5, minor: 99, patch: 99 }),
      1
    );
  });
});

describe('highestStable', () => {
  it('ignores prereleases', () => {
    assert.equal(
      highestStable(['5.52.1', '5.53.0-beta.1', '5.52.3', '0.0.0-experimental.x']),
      '5.52.3'
    );
  });

  it('returns null when nothing published is stable', () => {
    assert.equal(highestStable(['0.0.0-experimental.x']), null);
  });

  it('returns null for an empty list', () => {
    assert.equal(highestStable([]), null);
  });
});

describe('increment', () => {
  it('resets the patch on a minor', () => {
    assert.equal(increment('5.52.3', 'minor'), '5.53.0');
  });

  it('keeps the minor on a patch', () => {
    assert.equal(increment('5.52.3', 'patch'), '5.52.4');
  });

  it('refuses a non-stable version', () => {
    assert.throws(() => increment('5.53.0-beta.1', 'patch'), /non-stable/u);
  });
});

describe('nextPatchOf', () => {
  it('names the milestone that collects the following release', () => {
    assert.equal(nextPatchOf('5.53.0'), '5.53.1');
    assert.equal(nextPatchOf('5.43.2'), '5.43.3');
  });
});
