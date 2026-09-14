import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyIntegrations,
  decideBump,
  hasBreakingFooter,
  ignoreReason,
  parseConventionalSubject,
  readPullCommitHeaders,
} from '../lib/bump.ts';
import { SHA, integration, pullCommits } from '../lib/__fixtures__/fixtures.ts';

import type {
  AttributionRecord,
  BumpClassification,
  Integration,
  PullCommit,
} from '../lib/types.ts';

type StubbedRecord = Pick<AttributionRecord, 'sha' | 'pull'>;

function records(pairs: readonly [Integration, StubbedRecord['pull']][]): StubbedRecord[] {
  return pairs.map(([entry, pull]) => ({ sha: entry.sha, pull }));
}

function summary(number: number, headRef: string): StubbedRecord['pull'] {
  return {
    number,
    title: '',
    author: { login: '', name: null },
    url: '',
    baseRef: 'develop',
    headRef,
    milestone: null,
    mergedAt: '2026-09-05T09:59:00Z',
  };
}

const noCommits = async (): Promise<PullCommit[]> => [];

describe('parseConventionalSubject', () => {
  const parsed: [string, string, string | null, boolean][] = [
    ['feat(content-releases): record release actions', 'feat', 'content-releases', false],
    ['feat(*): introduce MCP server (#26371)', 'feat', '*', false],
    ['feat!: drop node 20', 'feat', null, true],
    ['chore: release v5.52.3 update develop', 'chore', null, false],
    ['FIX(upload): casing is normalised', 'fix', 'upload', false],
    ['i18n: add translations', 'i18n', null, false],
  ];

  for (const [subject, type, scope, breaking] of parsed) {
    it(`parses "${subject}"`, () => {
      assert.deepEqual(parseConventionalSubject(subject), { type, scope, breaking });
    });
  }

  const unparsed = [
    'Feat/e2e critical ctb add fields (#26559)',
    "Merge branch 'main' into develop",
    'Chore/cm combined performance fixes',
    '',
  ];

  for (const subject of unparsed) {
    it(`does not parse "${subject}"`, () => {
      assert.equal(parseConventionalSubject(subject), null);
    });
  }
});

describe('hasBreakingFooter', () => {
  for (const body of [
    'BREAKING CHANGE: gone',
    'BREAKING-CHANGE: gone',
    'body\n\nBREAKING CHANGE: gone',
  ]) {
    it(`detects "${body}"`, () => {
      assert.equal(hasBreakingFooter(body), true);
    });
  }

  it('ignores a mention inside prose', () => {
    assert.equal(hasBreakingFooter('this is not a BREAKING CHANGE really'), false);
  });
});

describe('ignoreReason', () => {
  it('names a release commit', () => {
    assert.equal(ignoreReason({ subject: 'release: 5.52.3' }, { pull: null }), 'release-commit');
  });

  it('names a back-merge from a release branch', () => {
    assert.equal(
      ignoreReason({ subject: 'anything' }, { pull: summary(1, 'releases/5.52.2') }),
      'back-merge'
    );
  });

  it('leaves a normal integration alone', () => {
    assert.equal(
      ignoreReason({ subject: 'fix(upload): a thing' }, { pull: summary(1, 'fix/x') }),
      null
    );
  });
});

describe('readPullCommitHeaders', () => {
  it('reads the commitlint-gated commits inside a pull request', () => {
    const { headers, breaking } = readPullCommitHeaders(
      pullCommits(['feat(e2e): add ctb fields\n\nbody', 'test(e2e): stabilise'])
    );

    assert.deepEqual(
      headers.map((header) => header.type),
      ['feat', 'test']
    );
    assert.equal(breaking, false);
  });

  it('surfaces a breaking footer from a commit body', () => {
    const { breaking } = readPullCommitHeaders(
      pullCommits(['fix(api): tighten validation\n\nBREAKING CHANGE: rejects empty ids'])
    );

    assert.equal(breaking, true);
  });

  it('surfaces a bang marker on a commit inside the pull request', () => {
    assert.equal(readPullCommitHeaders(pullCommits(['feat!: drop node 20'])).breaking, true);
  });
});

describe('classifyIntegrations', () => {
  it('lets a feat vote for a minor', async () => {
    const entry = integration({
      sha: SHA.SQUASH_FEAT,
      subject: 'feat(content-releases): record release actions in audit logs (#27436)',
    });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.deepEqual(classification.features, [
      {
        sha: SHA.SQUASH_FEAT,
        pr: null,
        subject: 'feat(content-releases): record release actions in audit logs (#27436)',
        via: 'subject',
      },
    ]);
    assert.equal(decideBump(classification), 'minor');
  });

  it('counts feat(i18n) like any other feature', async () => {
    const entry = integration({ subject: 'feat(i18n): complete Korean (ko) translation (#26941)' });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.equal(decideBump(classification), 'minor');
  });

  it('keeps enhancement, future and security a patch', async () => {
    const entries = [
      integration({ sha: 'a', subject: 'enhancement(utils): memoize scope decisions (#27145)' }),
      integration({ sha: 'b', subject: 'future(upload): right-click actions (#27451)' }),
      integration({ sha: 'c', subject: 'security(deps): bump the sdk (#27301)' }),
      integration({ sha: 'd', subject: 'fix(upload): bound the focal point (#27496)' }),
    ];

    const classification = await classifyIntegrations(
      entries,
      records(entries.map((entry) => [entry, null])),
      noCommits
    );

    assert.deepEqual(classification.features, []);
    assert.equal(decideBump(classification), 'patch');
  });

  it('ignores the release commit', async () => {
    const entry = integration({ sha: SHA.RELEASE, subject: 'release: 5.52.3' });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.deepEqual(classification.ignored, [
      { sha: SHA.RELEASE, reason: 'release-commit', subject: 'release: 5.52.3' },
    ]);
  });

  it('ignores a release back-merge, so an already shipped feat cannot vote twice', async () => {
    const entry = integration({
      sha: SHA.BACK_MERGE,
      subject: 'chore: release v5.52.3 update develop',
    });

    const classification = await classifyIntegrations(
      [entry],
      records([[entry, summary(27527, 'main')]]),
      async () => pullCommits(['feat(admin): something that already shipped'])
    );

    assert.equal(classification.ignored[0]?.reason, 'back-merge');
    assert.deepEqual(classification.features, []);
  });

  it('ignores a plain branch sync with no pull request', async () => {
    const entry = integration({ subject: "Merge branch 'main' into develop" });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.equal(classification.ignored[0]?.reason, 'branch-merge');
  });

  it('falls back to the pull request commits when the squash subject does not parse', async () => {
    const entry = integration({
      sha: SHA.UNPARSED,
      subject: 'Feat/e2e critical ctb add fields (#26559)',
    });

    const classification = await classifyIntegrations(
      [entry],
      records([[entry, summary(26559, 'feat/e2e-ctb')]]),
      async () => pullCommits(['feat(e2e): add ctb fields'])
    );

    assert.deepEqual(classification.features, [
      {
        sha: SHA.UNPARSED,
        pr: 26559,
        subject: 'Feat/e2e critical ctb add fields (#26559)',
        via: 'pr-commits',
      },
    ]);
  });

  it('reports an unparsed subject when the pull request commits say nothing either', async () => {
    const entry = integration({
      sha: SHA.UNPARSED,
      subject: 'Chore/cm combined performance fixes',
    });

    const classification = await classifyIntegrations(
      [entry],
      records([[entry, summary(25678, 'chore/cm')]]),
      async () => pullCommits(['wip', 'more wip'])
    );

    assert.deepEqual(classification.unparsed, [
      { sha: SHA.UNPARSED, pr: 25678, subject: 'Chore/cm combined performance fixes' },
    ]);
    assert.equal(decideBump(classification), 'patch');
  });

  it('reports an unparsed subject with no pull request at all', async () => {
    const entry = integration({
      sha: SHA.UNPARSED,
      subject: 'Chore/cm combined performance fixes',
    });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.deepEqual(classification.unparsed, [
      { sha: SHA.UNPARSED, pr: null, subject: 'Chore/cm combined performance fixes' },
    ]);
  });

  it('treats an integration with no attribution record as unattributed', async () => {
    const entry = integration({ sha: 'orphan', subject: 'Chore/no record' });

    const classification = await classifyIntegrations([entry], [], noCommits);

    assert.deepEqual(classification.unparsed, [
      { sha: 'orphan', pr: null, subject: 'Chore/no record' },
    ]);
  });

  it('collects a breaking marker from the subject', async () => {
    const entry = integration({ sha: 'x', subject: 'feat!: drop node 20' });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.equal(classification.breaking.length, 1);
    assert.equal(classification.features.length, 1);
  });

  it('collects a breaking footer from the integration body', async () => {
    const entry = integration({
      sha: 'x',
      subject: 'fix(api): tighten validation',
      body: 'BREAKING CHANGE: rejects empty ids',
    });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.equal(classification.breaking.length, 1);
  });

  it('collects a breaking marker found only in the pull request commits', async () => {
    const entry = integration({ sha: 'x', subject: 'Chore/big change' });

    const classification = await classifyIntegrations(
      [entry],
      records([[entry, summary(1, 'chore/big')]]),
      async () => pullCommits(['fix(api)!: drop the legacy route'])
    );

    assert.equal(classification.breaking[0]?.via, 'pr-commits');
  });
});

describe('classifyIntegrations — a breaking footer on the landing commit', () => {
  const BODY = 'Rework the upload flow.\n\nBREAKING CHANGE: the provider config shape moved.';

  it('stops an unparsed squash subject whose body breaks, even with inner feats', async () => {
    // The path this action exists to correct: commitlint never sees the squash subject, so
    // `Feat/...` lands unparsed while the footer sits in the body GitHub pre-filled.
    const entry = integration({ subject: 'Feat/new upload flow (#123)', body: BODY });

    const classification = await classifyIntegrations(
      [entry],
      records([[entry, summary(123, 'feat/new-upload-flow')]]),
      async () => pullCommits(['feat(upload): rework the flow'])
    );

    assert.deepEqual(classification.breaking, [
      { sha: entry.sha, pr: 123, subject: entry.subject, via: 'landing-body' },
    ]);
    assert.deepEqual(classification.unparsed, []);
    assert.throws(() => decideBump(classification), /carries a breaking change/u);
  });

  it('stops an unparsed direct commit whose body breaks', async () => {
    const entry = integration({ subject: 'Rework the upload flow', body: BODY });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.deepEqual(classification.breaking, [
      { sha: entry.sha, pr: null, subject: entry.subject, via: 'landing-body' },
    ]);
    assert.deepEqual(classification.unparsed, []);
    assert.throws(() => decideBump(classification), /carries a breaking change/u);
  });

  it('keeps a breaking marker found in pull request commits that all failed to parse', async () => {
    // `readPullCommitHeaders` reads the footer off every commit body, parsed header or not. Only
    // the type classification depends on a header, so an empty header list must not discard it.
    const entry = integration({ subject: 'Rework the upload flow (#124)', body: '' });

    const classification = await classifyIntegrations(
      [entry],
      records([[entry, summary(124, 'rework/upload')]]),
      async () => pullCommits(['wip\n\nBREAKING CHANGE: the provider config shape moved.'])
    );

    assert.deepEqual(classification.breaking, [
      { sha: entry.sha, pr: 124, subject: entry.subject, via: 'pr-commits' },
    ]);
    assert.deepEqual(classification.unparsed, []);
    assert.throws(() => decideBump(classification), /carries a breaking change/u);
  });

  it('names the subject as the source when the header carries the bang', async () => {
    const entry = integration({ subject: 'feat(upload)!: rework the flow', body: BODY });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.equal(classification.breaking[0]?.via, 'subject');
  });

  it('still reports an unparsed integration whose body does not break', async () => {
    const entry = integration({ subject: 'Rework the upload flow', body: 'No footer here.' });

    const classification = await classifyIntegrations([entry], records([[entry, null]]), noCommits);

    assert.deepEqual(classification.breaking, []);
    assert.deepEqual(classification.unparsed, [
      { sha: entry.sha, pr: null, subject: entry.subject },
    ]);
    assert.equal(decideBump(classification), 'patch');
  });
});

describe('decideBump', () => {
  const empty: BumpClassification = { features: [], breaking: [], ignored: [], unparsed: [] };

  it('stops on a breaking change instead of proposing a major', () => {
    const classification: BumpClassification = {
      ...empty,
      breaking: [{ sha: 'abcdef1234', pr: 1, subject: 'feat!: drop node 20', via: 'subject' }],
    };

    assert.throws(() => decideBump(classification), /breaking change \(abcdef12\)/u);
  });

  it('falls back to a patch when nothing voted', () => {
    assert.equal(decideBump(empty), 'patch');
  });
});
