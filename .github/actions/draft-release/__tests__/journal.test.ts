import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createJournal } from '../lib/journal.ts';

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
          applied: false,
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
