import { describe, expect, it } from 'vitest';

import { groupDuplicates, planRewrites } from '../dedupe';

describe('planRewrites', () => {
  it('keeps the oldest address and rewrites the others to local+dup<id>@users.invalid', () => {
    const values = new Map([
      [4, 'Alice@Example.com'],
      [9, 'ALICE@example.com'],
    ]);

    expect(planRewrites([{ keep: 1, rewrite: [4, 9] }], 'email', values)).toEqual([
      { id: 4, value: 'alice+dup4@users.invalid' },
      { id: 9, value: 'alice+dup9@users.invalid' },
    ]);
  });

  it('keeps the oldest username and suffixes the others with _<id>', () => {
    const values = new Map([[7, 'ERIN']]);

    expect(planRewrites([{ keep: 2, rewrite: [7] }], 'username', values)).toEqual([
      { id: 7, value: 'erin_7' },
    ]);
  });

  it('suffixes duplicate role names case-insensitively as (2) and (3)', () => {
    const values = new Map([
      [5, 'editors'],
      [6, 'EDITORS'],
    ]);

    expect(planRewrites([{ keep: 3, rewrite: [5, 6] }], 'role', values)).toEqual([
      { id: 5, value: 'editors (2)' },
      { id: 6, value: 'EDITORS (3)' },
    ]);
  });

  it('plans nothing for a group of one and splits an address at its last @', () => {
    expect(planRewrites([], 'email', new Map())).toEqual([]);
    expect(
      planRewrites([{ keep: 1, rewrite: [2] }], 'email', new Map([[2, '"a@b"@Host.com']]))
    ).toEqual([{ id: 2, value: '"a@b"+dup2@users.invalid' }]);
  });
});

describe('groupDuplicates', () => {
  it('keeps the lowest id of each value and rewrites the rest, oldest first', () => {
    expect(
      groupDuplicates([
        { id: 9, k: 'a' },
        { id: 3, k: 'a' },
        { id: 5, k: 'b' },
        { id: 2, k: 'b' },
        { id: 4, k: 'a' },
      ])
    ).toEqual([
      { keep: 2, rewrite: [5] },
      { keep: 3, rewrite: [4, 9] },
    ]);
  });
});
