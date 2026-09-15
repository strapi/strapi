import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyFailure, createJournal } from '../lib/journal.ts';

const clock = (): string => '2026-09-06T17:57:00Z';

describe('createJournal', () => {
  it('records the intent and performs nothing on a dry run', async () => {
    const journal = createJournal({ apply: false, clock });
    const performed: string[] = [];

    const result = await journal.write(
      { op: 'milestone.rename', target: 'milestone/430', before: '5.52.4', after: '5.53.0' },
      async () => {
        performed.push('rename');

        return { number: 430 };
      }
    );

    assert.deepEqual(performed, []);
    assert.equal(result, null);
    assert.deepEqual(journal.toJSON(), {
      mode: 'planned',
      entries: [
        {
          op: 'milestone.rename',
          target: 'milestone/430',
          before: '5.52.4',
          after: '5.53.0',
          detail: null,
          at: '2026-09-06T17:57:00Z',
          state: 'planned',
          error: null,
        },
      ],
    });
  });

  it('records before it performs, and returns the result', async () => {
    const journal = createJournal({ apply: true, clock });
    let recordedWhilePerforming = 0;

    const result = await journal.write({ op: 'pr.create', target: 'pulls/<new>' }, async () => {
      recordedWhilePerforming = journal.entries().length;

      return { number: 27600 };
    });

    assert.equal(recordedWhilePerforming, 1);
    assert.deepEqual(result, { number: 27600 });
    assert.equal(journal.toJSON().mode, 'applied');
  });

  it('keeps the intent on record when the write throws', async () => {
    const journal = createJournal({ apply: true, clock });

    await assert.rejects(
      () =>
        journal.write({ op: 'branch.push', target: 'refs/heads/releases/5.53.0' }, async () => {
          throw new Error('protected branch');
        }),
      /protected branch/u
    );

    assert.equal(journal.entries().length, 1);
    assert.equal(journal.entries()[0]?.op, 'branch.push');
  });

  it('marks a write applied only once it has returned', async () => {
    const journal = createJournal({ apply: true, clock });
    const states: string[] = [];

    await journal.write({ op: 'pr.create', target: 'pulls/<new>' }, async () => {
      states.push(journal.entries()[0]?.state ?? '');

      return { number: 1 };
    });

    assert.deepEqual(states, ['attempted']);
    assert.equal(journal.entries()[0]?.state, 'applied');
    assert.equal(journal.entries()[0]?.error, null);
  });

  it('records a refused write as failed, with what the server said', async () => {
    const journal = createJournal({ apply: true, clock });

    await assert.rejects(() =>
      journal.write({ op: 'milestone.rename', target: 'milestone/430' }, async () => {
        throw Object.assign(new Error('GitHub PATCH failed: 422 already_exists'), { status: 422 });
      })
    );

    assert.equal(journal.entries()[0]?.state, 'failed');
    assert.match(journal.entries()[0]?.error ?? '', /422 already_exists/u);
  });

  it('records a write of unknown outcome as indeterminate', async () => {
    const journal = createJournal({ apply: true, clock });

    await assert.rejects(() =>
      journal.write({ op: 'pr.create', target: 'pulls/<new>' }, async () => {
        throw new TypeError('fetch failed');
      })
    );

    assert.equal(journal.entries()[0]?.state, 'indeterminate');
    assert.match(journal.entries()[0]?.error ?? '', /fetch failed/u);
  });

  it('keeps a non-Error rejection readable', async () => {
    const journal = createJournal({ apply: true, clock });

    // A rejection that is not an `Error` is the point of the test: the journal has to keep it
    // readable rather than record `[object Object]`.
    const rejectWith = (reason: unknown): Promise<never> =>
      new Promise((_resolve, reject) => {
        reject(reason);
      });

    await assert.rejects(() =>
      journal.write({ op: 'pr.label', target: 'pulls/1' }, async () => rejectWith('plain string'))
    );

    assert.equal(journal.entries()[0]?.error, 'plain string');
  });

  it('hands back a copy of the entries', async () => {
    const journal = createJournal({ apply: false, clock });

    await journal.write({ op: 'pr.comment', target: 'pulls/1' }, async () => null);
    journal.entries().pop();

    assert.equal(journal.entries().length, 1);
  });

  it('stamps a real clock when none is injected', async () => {
    const journal = createJournal({ apply: false });

    await journal.write({ op: 'pr.comment', target: 'pulls/1' }, async () => null);

    assert.match(journal.entries()[0]?.at ?? '', /^\d{4}-\d{2}-\d{2}T/u);
  });
});

describe('classifyFailure', () => {
  it('treats a status as proof the operation reached a verdict', () => {
    assert.equal(classifyFailure(Object.assign(new Error('nope'), { status: 422 })), 'failed');
    assert.equal(classifyFailure(Object.assign(new Error('nope'), { status: 1 })), 'failed');
  });

  it('refuses to guess when nothing proves the write did not land', () => {
    assert.equal(classifyFailure(new Error('socket hang up')), 'indeterminate');
    assert.equal(
      classifyFailure(Object.assign(new Error('x'), { status: '422' })),
      'indeterminate'
    );
    assert.equal(classifyFailure(null), 'indeterminate');
    assert.equal(classifyFailure(undefined), 'indeterminate');
  });
});
