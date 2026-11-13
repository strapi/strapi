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

describe('planRewrites against values that exist', () => {
  it('adds a further suffix to a username another user already holds, in any case', () => {
    const taken = new Set(['erin_7']);

    expect(
      planRewrites([{ keep: 2, rewrite: [7] }], 'username', new Map([[7, 'ERIN']]), taken)
    ).toEqual([{ id: 7, value: 'erin_7_2' }]);
    expect(taken).toEqual(new Set(['erin_7']));
  });

  it('suffixes an address, a role name and values that two rewrites would share', () => {
    expect(
      planRewrites(
        [{ keep: 1, rewrite: [4] }],
        'email',
        new Map([[4, 'a@b.c']]),
        new Set(['a+dup4@users.invalid'])
      )
    ).toEqual([{ id: 4, value: 'a+dup4-2@users.invalid' }]);
    expect(
      planRewrites([{ keep: 1, rewrite: [4] }], 'role', new Map([[4, 'Ed']]), new Set(['ed (2)']))
    ).toEqual([{ id: 4, value: 'Ed (3)' }]);
    expect(
      planRewrites(
        [
          { keep: 1, rewrite: [3] },
          { keep: 2, rewrite: [3] },
        ],
        'username',
        new Map([[3, 'x']])
      ).map(({ value }) => value)
    ).toEqual(['x_3', 'x_3_2']);
  });
});

describe('groupDuplicates', () => {
  it('lets a newer confirmed account keep the value over an older unconfirmed one', () => {
    expect(
      groupDuplicates([
        { id: 1, g: 1, confirmed: false, blocked: false },
        { id: 2, g: 1, confirmed: true, blocked: true },
        { id: 3, g: 1, confirmed: true, blocked: false },
        { id: 4, g: 1, confirmed: true, blocked: false },
      ])
    ).toEqual([{ keep: 3, rewrite: [4, 2, 1] }]);
  });

  it('keeps the lowest id of each value and rewrites the rest, oldest first', () => {
    expect(
      groupDuplicates([
        { id: 9, g: 1 },
        { id: 3, g: 1 },
        { id: 5, g: 2 },
        { id: 2, g: 2 },
        { id: 4, g: 1 },
      ])
    ).toEqual([
      { keep: 2, rewrite: [5] },
      { keep: 3, rewrite: [4, 9] },
    ]);
  });

  it('takes the database group as it comes: values that differ in spelling but share a group are one', () => {
    // MySQL's accent-insensitive collation puts josé and jose in one group; no value is looked at here
    expect(
      groupDuplicates([
        { id: 4, g: 2 },
        { id: 2, g: 2 },
        { id: 7, g: 7 },
        { id: 9, g: 7 },
      ])
    ).toEqual([
      { keep: 2, rewrite: [4] },
      { keep: 7, rewrite: [9] },
    ]);
  });
});
