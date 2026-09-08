import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planCleanup, planMilestones, reconcile } from '../lib/milestones.ts';
import { milestoneItem, pullRequestItem } from '../lib/__fixtures__/fixtures.ts';

describe('planMilestones', () => {
  const open = [{ number: 430, title: '5.52.4', state: 'open' }];

  it('renames the open milestone to the version that actually ships', () => {
    const plan = planMilestones(open, '5.53.0', open);

    assert.deepEqual(plan.shipping, {
      action: 'rename',
      number: 430,
      currentTitle: '5.52.4',
      title: '5.53.0',
    });
    assert.deepEqual(plan.next, { action: 'create', number: null, title: '5.53.1' });
  });

  it('leaves the title alone when it already matches', () => {
    const plan = planMilestones(open, '5.52.4', open);

    assert.equal(plan.shipping.action, 'keep');
    assert.equal(plan.next.title, '5.52.5');
  });

  it('reuses an existing next milestone in any state', () => {
    const all = [...open, { number: 431, title: '5.53.1', state: 'closed' }];

    assert.deepEqual(planMilestones(open, '5.53.0', all).next, {
      action: 'reuse',
      number: 431,
      title: '5.53.1',
    });
  });

  it('creates the shipping milestone when none is open', () => {
    assert.deepEqual(planMilestones([], '5.53.0', []).shipping, {
      action: 'create',
      number: null,
      currentTitle: null,
      title: '5.53.0',
    });
  });

  it('stops when several milestones are open', () => {
    const many = [
      { number: 430, title: '5.52.4' },
      { number: 431, title: '5.53.0' },
    ];

    assert.throws(
      () => planMilestones(many, '5.53.0', many),
      /Expected at most one open milestone, found 2 \(5\.52\.4, 5\.53\.0\)/u
    );
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
