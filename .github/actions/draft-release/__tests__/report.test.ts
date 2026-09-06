import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BLOCK_END,
  BLOCK_START,
  buildPayload,
  extractJsonBlock,
  renderAttentionTable,
  renderBody,
  renderJournalTable,
  renderMilestoneComment,
  renderPullRequestTable,
  renderStepSummary,
  withoutTrailingReference,
} from '../lib/report.ts';

import type { AttributedPull, JournalEntry } from '../lib/types.ts';
import type { PayloadInput } from '../lib/report.ts';

function payloadInput(overrides: Partial<PayloadInput> = {}): PayloadInput {
  return {
    generatedAt: '2026-09-06T17:57:00Z',
    coords: { owner: 'strapi', repo: 'strapi' },
    dryRun: false,
    version: '5.53.0',
    bump: 'minor',
    previousVersion: '5.52.3',
    versionSource: 'computed',
    range: {
      fromRef: 'v5.52.3',
      fromSha: 'a'.repeat(40),
      toRef: 'origin/develop',
      toSha: 'b'.repeat(40),
    },
    integrationCount: 12,
    classification: {
      features: [
        {
          sha: 'c'.repeat(40),
          pr: 27436,
          subject: 'feat(content-releases): audit logs',
          via: 'subject',
        },
      ],
      breaking: [],
      ignored: [],
      unparsed: [],
    },
    pullRequests: [
      {
        number: 27436,
        title: 'feat(content-releases): audit logs',
        author: 'someone',
        url: 'https://github.com/strapi/strapi/pull/27436',
        baseRef: 'develop',
        headRef: 'feat/audit-logs',
        milestone: '5.52.4',
        status: 'resolved',
        basis: 'exact-merge-sha',
        integrationShas: ['c'.repeat(40)],
      },
    ],
    attention: [],
    milestones: {
      shipping: { number: 430, title: '5.53.0', renamedFrom: '5.52.4', state: 'closed' },
      next: { number: 431, title: '5.53.1', created: true },
    },
    reconciliation: { inHistoryNotInMilestone: [], inMilestoneNotInHistory: [] },
    ...overrides,
  };
}

function journalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    op: 'milestone.rename',
    target: 'milestone/430',
    before: '5.52.4',
    after: '5.53.0',
    detail: null,
    at: '2026-09-06T17:57:00Z',
    applied: true,
    ...overrides,
  };
}

describe('withoutTrailingReference', () => {
  it('strips a repeated reference left by a squash on a squash', () => {
    assert.equal(
      withoutTrailingReference('feat(content-releases): audit logs (#27436) (#27436)'),
      'feat(content-releases): audit logs'
    );
  });

  it('leaves a subject with no trailing reference alone', () => {
    assert.equal(
      withoutTrailingReference('future(upload): drawer interaction'),
      'future(upload): drawer interaction'
    );
  });

  it('keeps a reference that is not at the end', () => {
    assert.equal(
      withoutTrailingReference('fix: revert (#1) then move on'),
      'fix: revert (#1) then move on'
    );
  });
});

describe('renderPullRequestTable', () => {
  it('escapes a pipe so a title cannot break the table', () => {
    const pull = {
      number: 1,
      title: 'fix: a | b',
      author: 'x',
      url: 'u',
      baseRef: 'develop',
      headRef: 'fix/x',
      milestone: null,
      status: 'resolved',
      basis: 'none',
      integrationShas: ['a'],
    } satisfies AttributedPull;

    const table = renderPullRequestTable([pull]);

    assert.match(table, /fix: a \\\| b/u);
    assert.equal(table.split('\n').length, 3);
  });

  it('says so when nothing resolved', () => {
    assert.equal(renderPullRequestTable([]), '_No pull request resolved in this range._');
  });
});

describe('renderAttentionTable', () => {
  it('is empty when everything resolved', () => {
    assert.equal(renderAttentionTable([]), '');
  });
});

describe('renderJournalTable', () => {
  it('says so when nothing was recorded', () => {
    assert.equal(renderJournalTable([]), '_No write recorded._');
  });

  it('renders an absent value as a dash', () => {
    assert.match(renderJournalTable([journalEntry({ before: null })]), /\| — \|/u);
  });
});

describe('renderBody', () => {
  const payload = buildPayload(payloadInput());

  it('carries a JSON block that round-trips through the markers', () => {
    const body = renderBody({ payload, pullRequests: payload.pullRequests, attention: [] });

    assert.equal(body.includes(BLOCK_START), true);
    assert.equal(body.includes(BLOCK_END), true);
    assert.deepEqual(extractJsonBlock(body), JSON.parse(JSON.stringify(payload)));
  });

  it('explains a minor with the commits that caused it', () => {
    const body = renderBody({ payload, pullRequests: payload.pullRequests, attention: [] });

    assert.match(body, /## Why this is a minor/u);
    assert.match(body, /feat\(content-releases\): audit logs \(#27436\)/u);
  });

  it('names the version input when a human decided', () => {
    const overridden = buildPayload(payloadInput({ versionSource: 'version-input' }));
    const body = renderBody({ payload: overridden, pullRequests: [], attention: [] });

    assert.match(body, /decided from the `version` input/u);
  });

  it('surfaces reconciliation differences only when there are any', () => {
    const clean = renderBody({ payload, pullRequests: payload.pullRequests, attention: [] });

    assert.equal(clean.includes('## Milestone reconciliation'), false);

    const drifted = buildPayload(
      payloadInput({
        reconciliation: { inHistoryNotInMilestone: [27509], inMilestoneNotInHistory: [27123] },
      })
    );

    const body = renderBody({
      payload: drifted,
      pullRequests: drifted.pullRequests,
      attention: [],
    });

    assert.match(body, /In history, not in the milestone: #27509/u);
    assert.match(body, /not in this range: #27123/u);
  });

  it('lists the records a human still has to settle', () => {
    const body = renderBody({
      payload,
      pullRequests: payload.pullRequests,
      attention: [
        {
          sha: 'd'.repeat(40),
          subject: 'chore: direct push',
          status: 'direct-integration',
          reason: 'no associated pull request',
        },
      ],
      warnings: ['`abcd1234` head is not the second parent.'],
    });

    assert.match(body, /### Needs a human/u);
    assert.match(body, /direct-integration/u);
    assert.match(body, /### Warnings/u);
  });
});

describe('extractJsonBlock', () => {
  it('returns null when the markers are missing', () => {
    assert.equal(extractJsonBlock('just prose'), null);
  });

  it('returns null when the markers are inverted', () => {
    assert.equal(extractJsonBlock(`${BLOCK_END}\n${BLOCK_START}`), null);
  });

  it('returns null when the block carries no fence', () => {
    assert.equal(extractJsonBlock(`${BLOCK_START}\nnothing\n${BLOCK_END}`), null);
  });

  it('returns null when the block is not valid JSON', () => {
    const body = [BLOCK_START, '```json', '{ nope', '```', BLOCK_END].join('\n');

    assert.equal(extractJsonBlock(body), null);
  });
});

describe('renderMilestoneComment', () => {
  it('reports only the milestone writes, and says when nothing was applied', () => {
    const comment = renderMilestoneComment({
      version: '5.53.0',
      nextTitle: '5.53.1',
      dryRun: true,
      entries: [
        journalEntry(),
        journalEntry({ op: 'branch.push', target: 'refs/heads/releases/5.53.0' }),
        journalEntry({ op: 'issue.milestone.set', target: 'issues/27600' }),
      ],
    });

    assert.match(comment, /Dry run\. Nothing below was applied\./u);
    assert.match(comment, /milestone\.rename/u);
    assert.match(comment, /issue\.milestone\.set/u);
    assert.equal(comment.includes('branch.push'), false);
  });

  it('states the closed milestone when the run applied', () => {
    const comment = renderMilestoneComment({
      version: '5.53.0',
      nextTitle: '5.53.1',
      dryRun: false,
      entries: [],
    });

    assert.match(comment, /`5\.53\.0` is closed/u);
  });
});

describe('renderStepSummary', () => {
  it('labels a dry run as planned', () => {
    const payload = buildPayload(payloadInput({ dryRun: true }));
    const summary = renderStepSummary({ payload, entries: [] });

    assert.match(summary, /Dry run\./u);
    assert.match(summary, /## Planned writes/u);
  });

  it('labels a real run as applied', () => {
    const payload = buildPayload(payloadInput());
    const summary = renderStepSummary({ payload, entries: [journalEntry()] });

    assert.match(summary, /## Applied writes/u);
  });
});
