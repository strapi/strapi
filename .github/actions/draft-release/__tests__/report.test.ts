import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BLOCK_END,
  BLOCK_START,
  buildPayload,
  experimentalVersion,
  extractJsonBlock,
  renderAttentionTable,
  renderAuthor,
  renderBody,
  renderJournalTable,
  renderPullRequestTable,
  renderRunComment,
  renderStepSummary,
  withoutTrailingReference,
} from '../lib/report.ts';

import { releasePlan } from '../lib/__fixtures__/fixtures.ts';

import type {
  AttributedPull,
  JournalEntry,
  ReleaseOutcome,
  ReleasePayload,
  ReleasePlan,
} from '../lib/types.ts';

function releaseOutcome(overrides: Partial<ReleaseOutcome> = {}): ReleaseOutcome {
  return {
    pullNumber: 27700,
    pullUrl: 'https://github.com/strapi/strapi/pull/27700',
    ...overrides,
  };
}

/** The payload of a fresh draft, built the way the pipeline builds it. */
function payload(
  overrides: {
    plan?: Partial<ReleasePlan>;
    outcome?: Partial<ReleaseOutcome>;
    dryRun?: boolean;
  } = {}
): ReleasePayload {
  return buildPayload({
    plan: releasePlan(overrides.plan),
    outcome: releaseOutcome(overrides.outcome),
    generatedAt: '2026-09-06T17:57:00Z',
    coords: { owner: 'strapi', repo: 'strapi' },
    dryRun: overrides.dryRun ?? false,
  });
}

function journalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    op: 'branch.push',
    target: 'refs/heads/releases/5.53.0',
    before: null,
    after: 'b'.repeat(40),
    detail: null,
    at: '2026-09-06T17:57:00Z',
    state: 'applied',
    error: null,
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

describe('renderAuthor', () => {
  it('puts the display name in front of the login that identifies it', () => {
    assert.equal(renderAuthor({ login: 'nclsndr', name: 'Nico André' }), 'Nico André (@nclsndr)');
  });

  it('falls back to the login alone when no commit vouched for a name', () => {
    assert.equal(renderAuthor({ login: 'nclsndr', name: null }), '@nclsndr');
  });

  it('says so rather than rendering an empty mention', () => {
    assert.equal(renderAuthor({ login: '', name: null }), '_unknown_');
  });

  it('escapes a pipe so a name cannot break the table', () => {
    assert.equal(renderAuthor({ login: 'x', name: 'A | B' }), 'A \\| B (@x)');
  });
});

describe('renderPullRequestTable', () => {
  it('names the author with their display name and their login', () => {
    const table = renderPullRequestTable(releasePlan().pullRequests);

    assert.match(table, /Someone Real \(@someone\)/u);
  });

  it('escapes the backslash before the pipe, so a subject cannot break the table', () => {
    // Escaping the pipe first would leave `a\\|b`: a literal backslash, then a bare pipe, and the
    // row ends one cell early.
    const pull = {
      number: 1,
      title: 'fix(admin): handle a \\| b',
      author: { login: 'x', name: null },
      url: 'u',
      baseRef: 'develop',
      headRef: 'fix/x',
      mergedAt: '2026-09-05T09:59:00Z',
      status: 'resolved',
      basis: 'none',
      integrationShas: ['a'],
    } satisfies AttributedPull;

    const table = renderPullRequestTable([pull]);

    assert.match(table, /handle a \\\\\\\| b/u);
    assert.equal(table.split('\n').length, 3);
    assert.equal(table.split('\n')[2]?.split(/(?<!\\)\|/u).length, 7);
  });

  it('escapes a pipe so a title cannot break the table', () => {
    const pull = {
      number: 1,
      title: 'fix: a | b',
      author: { login: 'x', name: null },
      url: 'u',
      baseRef: 'develop',
      headRef: 'fix/x',
      mergedAt: '2026-09-05T09:59:00Z',
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

describe('buildPayload', () => {
  it('carries the schema version later automation reads', () => {
    assert.equal(payload().schemaVersion, 6);
  });

  it('identifies the candidate by its branch, its pinned head and its pull request', () => {
    assert.deepEqual(payload().candidate, {
      branch: 'releases/5.53.0',
      headSha: 'b'.repeat(40),
      expectedExperimentalVersion: `0.0.0-experimental.${'b'.repeat(40)}`,
      branchAdvanced: true,
      pullRequestNumber: 27700,
      pullRequestUrl: 'https://github.com/strapi/strapi/pull/27700',
    });
  });

  it('pins the head to the SHA the range ended at', () => {
    const built = payload();

    assert.equal(built.candidate.headSha, built.range.toSha);
  });

  it('reports no pull request on a dry run, and still identifies the candidate', () => {
    const built = payload({ dryRun: true, outcome: { pullNumber: null, pullUrl: null } });

    assert.equal(built.candidate.pullRequestNumber, null);
    assert.equal(built.candidate.pullRequestUrl, null);
    assert.equal(built.candidate.branch, 'releases/5.53.0');
    assert.equal(built.candidate.headSha, 'b'.repeat(40));
    assert.equal(
      built.candidate.expectedExperimentalVersion,
      `0.0.0-experimental.${'b'.repeat(40)}`
    );
  });

  it('carries no milestone data, because commits alone decide a release', () => {
    const built = payload();

    assert.equal('milestones' in built, false);
    assert.equal('reconciliation' in built, false);
    assert.equal('milestone' in (built.pullRequests[0] ?? {}), false);
  });
});

describe('experimentalVersion', () => {
  it('mirrors the workflow, which versions on the full head SHA', () => {
    assert.equal(experimentalVersion('b'.repeat(40)), `0.0.0-experimental.${'b'.repeat(40)}`);
  });
});

describe('renderBody', () => {
  const built = payload();

  it('carries a JSON block that round-trips through the markers', () => {
    const body = renderBody({ payload: built, pullRequests: built.pullRequests, attention: [] });

    assert.match(body, /<details>\n<summary>Machine-readable release candidate data<\/summary>/u);
    assert.equal(body.includes(BLOCK_START), true);
    assert.equal(body.includes(BLOCK_END), true);
    assert.equal(body.indexOf(BLOCK_END) < body.indexOf('</details>'), true);
    assert.deepEqual(extractJsonBlock(body), JSON.parse(JSON.stringify(built)));
  });

  it('explains a minor with the commits that caused it', () => {
    const body = renderBody({ payload: built, pullRequests: built.pullRequests, attention: [] });

    assert.match(body, /## Why this is a minor/u);
    assert.match(body, /feat\(content-releases\): audit logs \(#27436\)/u);
  });

  it('names the version input when a human decided', () => {
    const overridden = payload({ plan: { versionSource: 'version-input' } });
    const body = renderBody({ payload: overridden, pullRequests: [], attention: [] });

    assert.match(body, /decided from the `version` input/u);
  });

  it('says nothing about milestones', () => {
    const body = renderBody({ payload: built, pullRequests: built.pullRequests, attention: [] });

    assert.equal(/milestone/iu.test(body), false);
  });

  it('lists the records a human still has to settle', () => {
    const body = renderBody({
      payload: built,
      pullRequests: built.pullRequests,
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
  it('round-trips a body carrying the candidate block', () => {
    const built = payload();
    const body = renderBody({ payload: built, pullRequests: built.pullRequests, attention: [] });

    assert.deepEqual(extractJsonBlock(body), JSON.parse(JSON.stringify(built)));
    assert.match(body, /"expectedExperimentalVersion": "0\.0\.0-experimental\.b{40}"/u);
  });

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

describe('renderRunComment', () => {
  it('lists the writes of the run, and says when nothing was applied', () => {
    const comment = renderRunComment({
      payload: payload({ dryRun: true }),
      entries: [
        journalEntry({ state: 'planned' }),
        journalEntry({ op: 'pr.label', target: 'pulls/<new>', state: 'planned' }),
        journalEntry({ op: 'pr.comment', target: 'pulls/<new>', state: 'planned' }),
      ],
    });

    assert.match(comment, /^## Dry run for 5\.53\.0/u);
    assert.match(comment, /Dry run\. Nothing below was applied\./u);
    assert.match(comment, /branch\.push/u);
    assert.match(comment, /pr\.label/u);
    assert.equal(comment.includes('pr.comment'), false);
  });

  it('states what the run did to the candidate when it applied', () => {
    const comment = renderRunComment({ payload: payload(), entries: [] });

    assert.match(comment, /^## Run for 5\.53\.0/u);
    assert.match(comment, /Drafted from `develop`\./u);
    assert.match(comment, /12 integrations, 1 pull requests\./u);
  });
});

describe('renderStepSummary', () => {
  it('labels a dry run as planned', () => {
    const summary = renderStepSummary({ payload: payload({ dryRun: true }), entries: [] });

    assert.match(summary, /Dry run\./u);
    assert.match(summary, /## Planned writes/u);
  });

  it('labels a real run as applied', () => {
    const summary = renderStepSummary({ payload: payload(), entries: [journalEntry()] });

    assert.match(summary, /## Applied writes/u);
  });
});
