import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyFailure, createJournal, mutationFailure } from '../lib/journal.ts';

import type { JournalSnapshot } from '../lib/types.ts';

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
        throw mutationFailure('GitHub PATCH failed: 422 already_exists', 'refused');
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

  it('persists attempted intent before the mutation and its result before returning', async () => {
    const snapshots: JournalSnapshot[] = [];
    const journal = createJournal({
      apply: true,
      clock,
      persist(snapshot) {
        snapshots.push(JSON.parse(JSON.stringify(snapshot)) as JournalSnapshot);
      },
    });

    await journal.write(
      { op: 'pr.create', target: 'pulls/<new>' },
      async () => {
        assert.equal(snapshots.at(-1)?.entries[0]?.state, 'attempted');

        return { number: 27600 };
      },
      (pull) => ({ target: `pulls/${pull.number}` })
    );

    assert.equal(snapshots.at(-1)?.entries[0]?.state, 'applied');
    assert.equal(snapshots.at(-1)?.entries[0]?.target, 'pulls/27600');
  });

  it('persists a failed transition after a refused mutation', async () => {
    const snapshots: JournalSnapshot[] = [];
    const journal = createJournal({
      apply: true,
      clock,
      persist(snapshot) {
        snapshots.push(JSON.parse(JSON.stringify(snapshot)) as JournalSnapshot);
      },
    });

    await assert.rejects(() =>
      journal.write({ op: 'pr.close', target: 'pulls/27600' }, async () => {
        throw mutationFailure('GitHub refused the write', 'refused');
      })
    );

    assert.equal(snapshots.at(-1)?.entries[0]?.state, 'failed');
    assert.equal(snapshots.at(-1)?.entries[0]?.error, 'GitHub refused the write');
  });

  it('stamps a real clock when none is injected', async () => {
    const journal = createJournal({ apply: false });

    await journal.write({ op: 'pr.comment', target: 'pulls/1' }, async () => null);

    assert.match(journal.entries()[0]?.at ?? '', /^\d{4}-\d{2}-\d{2}T/u);
  });
});

describe('classifyFailure', () => {
  it('marks a typed refusal as failed', () => {
    assert.equal(classifyFailure(mutationFailure('nope', 'refused')), 'failed');
  });

  it('refuses to guess when nothing proves the write did not land', () => {
    assert.equal(classifyFailure(mutationFailure('server error', 'unknown')), 'indeterminate');
    assert.equal(classifyFailure(new Error('socket hang up')), 'indeterminate');
    assert.equal(classifyFailure(Object.assign(new Error('x'), { status: 422 })), 'indeterminate');
    assert.equal(classifyFailure(null), 'indeterminate');
    assert.equal(classifyFailure(undefined), 'indeterminate');
  });
});
