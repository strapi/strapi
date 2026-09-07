import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planCleanup, planMilestones, planRealignment, reconcile } from '../lib/milestones.ts';
import { milestoneItem, pullRequestItem } from '../lib/__fixtures__/fixtures.ts';

describe('planMilestones, fresh draft', () => {
  const open = [{ number: 430, title: '5.52.4', state: 'open' }];

  it('renames the open milestone to the version that actually ships', () => {
    const plan = planMilestones({ allMilestones: open, version: '5.53.0', candidateVersion: null });

    assert.deepEqual(plan.shipping, {
      action: 'rename',
      number: 430,
      currentTitle: '5.52.4',
      title: '5.53.0',
      close: true,
    });
    assert.deepEqual(plan.next, {
      action: 'create',
      number: null,
      currentTitle: null,
      title: '5.53.1',
    });
  });

  it('leaves the title alone when it already matches', () => {
    const plan = planMilestones({ allMilestones: open, version: '5.52.4', candidateVersion: null });

    assert.equal(plan.shipping.action, 'keep');
    assert.equal(plan.shipping.close, true);
    assert.equal(plan.next.title, '5.52.5');
  });

  it('creates the shipping milestone when none is open', () => {
    const plan = planMilestones({ allMilestones: [], version: '5.53.0', candidateVersion: null });

    assert.deepEqual(plan.shipping, {
      action: 'create',
      number: null,
      currentTitle: null,
      title: '5.53.0',
      close: true,
    });
  });

  it('stops when several milestones are open', () => {
    const many = [
      { number: 430, title: '5.52.4' },
      { number: 431, title: '5.53.0' },
    ];

    assert.throws(
      () => planMilestones({ allMilestones: many, version: '5.53.0', candidateVersion: null }),
      /Expected at most one open milestone, found 2 \(5\.52\.4, 5\.53\.0\)/u
    );
  });

  it('stops rather than rename onto a title another milestone already holds', () => {
    const all = [...open, { number: 431, title: '5.53.0', state: 'closed' }];

    assert.throws(
      () => planMilestones({ allMilestones: all, version: '5.53.0', candidateVersion: null }),
      /A milestone titled 5\.53\.0 already exists \(#431, closed\)/u
    );
  });

  it('refuses a closed milestone as the next one, because nobody can select it', () => {
    const all = [...open, { number: 431, title: '5.53.1', state: 'closed' }];

    assert.throws(
      () => planMilestones({ allMilestones: all, version: '5.53.0', candidateVersion: null }),
      /the one titled 5\.53\.1 is closed \(#431\)/u
    );
  });
});

describe('planMilestones, candidate in flight', () => {
  // What the repository looks like while 5.53.0 is drafted: shipping closed, next open.
  const inFlight = [
    { number: 430, title: '5.53.0', state: 'closed' },
    { number: 431, title: '5.53.1', state: 'open' },
  ];

  it('keeps the closed shipping milestone and does not reopen it', () => {
    const plan = planMilestones({
      allMilestones: inFlight,
      version: '5.53.0',
      candidateVersion: '5.53.0',
    });

    assert.deepEqual(plan.shipping, {
      action: 'keep',
      number: 430,
      currentTitle: '5.53.0',
      title: '5.53.0',
      close: false,
    });
    assert.deepEqual(plan.next, {
      action: 'keep',
      number: 431,
      currentTitle: '5.53.1',
      title: '5.53.1',
    });
  });

  it('renames both milestones when the version drifted', () => {
    const drifted = [
      { number: 430, title: '5.52.4', state: 'closed' },
      { number: 431, title: '5.52.5', state: 'open' },
    ];

    const plan = planMilestones({
      allMilestones: drifted,
      version: '5.53.0',
      candidateVersion: '5.52.4',
    });

    assert.deepEqual(plan.shipping, {
      action: 'rename',
      number: 430,
      currentTitle: '5.52.4',
      title: '5.53.0',
      close: false,
    });
    assert.deepEqual(plan.next, {
      action: 'rename',
      number: 431,
      currentTitle: '5.52.5',
      title: '5.53.1',
    });
  });

  it('closes a shipping milestone an earlier run left open', () => {
    const halfDone = [
      { number: 430, title: '5.53.0', state: 'open' },
      { number: 431, title: '5.53.1', state: 'open' },
    ];

    const plan = planMilestones({
      allMilestones: halfDone,
      version: '5.53.0',
      candidateVersion: '5.53.0',
    });

    assert.equal(plan.shipping.close, true);
    assert.equal(plan.next.number, 431);
  });

  it('stops when the shipping milestone was renamed away under it', () => {
    assert.throws(
      () =>
        planMilestones({
          allMilestones: [{ number: 431, title: '5.53.1', state: 'open' }],
          version: '5.53.0',
          candidateVersion: '5.53.0',
        }),
      /No milestone is titled 5\.53\.0, the version the open candidate was cut under/u
    );
  });

  it('stops when the open milestone is not the candidate’s next one', () => {
    const wrong = [
      { number: 430, title: '5.53.0', state: 'closed' },
      { number: 432, title: '6.0.0', state: 'open' },
    ];

    assert.throws(
      () => planMilestones({ allMilestones: wrong, version: '5.53.0', candidateVersion: '5.53.0' }),
      /The open milestone is 6\.0\.0, but this release expects 5\.53\.1/u
    );
  });

  it('creates the next milestone when none is open', () => {
    const plan = planMilestones({
      allMilestones: [{ number: 430, title: '5.53.0', state: 'closed' }],
      version: '5.53.0',
      candidateVersion: '5.53.0',
    });

    assert.deepEqual(plan.next, {
      action: 'create',
      number: null,
      currentTitle: null,
      title: '5.53.1',
    });
  });

  it('never picks the shipping milestone as the next one', () => {
    const single = [{ number: 430, title: '5.53.0', state: 'open' }];
    const plan = planMilestones({
      allMilestones: single,
      version: '5.53.0',
      candidateVersion: '5.53.0',
    });

    assert.equal(plan.shipping.number, 430);
    assert.equal(plan.next.number, null);
    assert.equal(plan.next.action, 'create');
  });
});

describe('planRealignment', () => {
  const shipping = { number: 430, title: '5.53.0' };

  it('moves everything that does not already carry the shipping milestone', () => {
    const planned = planRealignment(
      [
        { number: 1, milestone: '5.53.0' },
        { number: 2, milestone: '5.53.1' },
        { number: 3, milestone: null },
      ],
      shipping
    );

    assert.deepEqual(planned, [
      { number: 2, from: '5.53.1', toTitle: '5.53.0' },
      { number: 3, from: null, toTitle: '5.53.0' },
    ]);
  });

  it('plans nothing when every pull request already agrees with history', () => {
    assert.deepEqual(planRealignment([{ number: 1, milestone: '5.53.0' }], shipping), []);
  });
});

describe('planCleanup', () => {
  const items = [
    pullRequestItem(1, 'closed', '2026-09-05T10:00:00Z'),
    pullRequestItem(2, 'closed', null),
    pullRequestItem(3, 'open', null),
    milestoneItem({ number: 4, state: 'open' }),
    milestoneItem({ number: 5, state: 'closed' }),
  ];

  it('keeps merged pull requests, moves open ones, clears the rest', () => {
    const planned = planCleanup(items, 431).map(({ number, kind, action, to }) => ({
      number,
      kind,
      action,
      to,
    }));

    assert.deepEqual(planned, [
      { number: 1, kind: 'pull', action: 'keep', to: null },
      { number: 2, kind: 'pull', action: 'clear', to: null },
      { number: 3, kind: 'pull', action: 'move', to: 431 },
      { number: 4, kind: 'issue', action: 'clear', to: null },
      { number: 5, kind: 'issue', action: 'clear', to: null },
    ]);
  });

  it('explains every decision', () => {
    assert.equal(
      planCleanup(items, 431).every((item) => item.reason.length > 0),
      true
    );
  });
});

describe('reconcile', () => {
  it('reports both directions', () => {
    const attributed = [{ number: 1 }, { number: 2 }];
    const items = [
      pullRequestItem(2, 'closed', '2026-09-05T10:00:00Z'),
      pullRequestItem(9, 'closed', '2026-09-04T10:00:00Z'),
      pullRequestItem(7, 'open', null),
    ];

    assert.deepEqual(reconcile(attributed, items), {
      inHistoryNotInMilestone: [1],
      inMilestoneNotInHistory: [9],
    });
  });

  it('is empty when history and the milestone agree', () => {
    const items = [pullRequestItem(5, 'closed', '2026-09-05T10:00:00Z')];

    assert.deepEqual(reconcile([{ number: 5 }], items), {
      inHistoryNotInMilestone: [],
      inMilestoneNotInHistory: [],
    });
  });

  it('sorts numerically, not lexically', () => {
    const attributed = [{ number: 100 }, { number: 9 }];

    assert.deepEqual(reconcile(attributed, []).inHistoryNotInMilestone, [9, 100]);
  });
});
