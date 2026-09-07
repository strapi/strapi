import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertSupportedMergeMethods,
  checkSecondParent,
  dedupePullRequests,
  deriveAuthorName,
  parseNoreplyLogin,
  parseSubjectReference,
  resolveIntegration,
  resolveIntegrations,
  selectExactCandidates,
  summarisePull,
} from '../lib/attribution.ts';
import { SHA, indirectPull, integration, pull } from '../lib/__fixtures__/fixtures.ts';

import type { AttributionLookup, AttributionRecord, PullPayload } from '../lib/types.ts';

function lookup(
  options: {
    pulls?: readonly PullPayload[];
    byNumber?: Record<number, PullPayload>;
    fail?: boolean;
  } = {}
): AttributionLookup {
  return {
    async listPullsForCommit() {
      if (options.fail === true) {
        throw new Error('502 Bad Gateway');
      }

      return [...(options.pulls ?? [])];
    },
    async getPull(number) {
      const found = options.byNumber?.[number];

      if (found === undefined) {
        throw new Error('404');
      }

      return found;
    },
  };
}

function record(overrides: Partial<AttributionRecord>): AttributionRecord {
  return {
    sha: 'a',
    subject: '',
    author: '',
    authoredAt: '',
    parents: [],
    status: 'resolved',
    basis: 'exact-merge-sha',
    pull: null,
    warnings: [],
    reason: '',
    ...overrides,
  };
}

describe('parseSubjectReference', () => {
  it('reads an anchored trailing reference', () => {
    assert.equal(parseSubjectReference('fix(upload): a thing (#27482)'), 27482);
  });

  it('reads a merge subject reference', () => {
    assert.equal(parseSubjectReference('Merge pull request #27448 from strapi/fix/x'), 27448);
  });

  it('ignores a reference in the middle of a subject', () => {
    assert.equal(parseSubjectReference('fix: revert #27482 for now'), null);
  });

  it('returns null when there is no reference', () => {
    assert.equal(parseSubjectReference('future(upload): drawer interaction'), null);
  });
});

describe('selectExactCandidates', () => {
  it('requires merged, target base, and a matching merge SHA', () => {
    assert.equal(selectExactCandidates(integration(), [pull()], 'develop').length, 1);
  });

  it('rejects a pull request merged into another base', () => {
    assert.deepEqual(selectExactCandidates(integration(), [indirectPull()], 'develop'), []);
  });

  it('rejects a pull request whose merge SHA is a different commit', () => {
    const other = pull({ merge_commit_sha: 'ffff' });

    assert.deepEqual(selectExactCandidates(integration(), [other], 'develop'), []);
  });

  it('rejects an unmerged pull request', () => {
    const open: PullPayload = { ...pull(), merged_at: null };

    assert.deepEqual(selectExactCandidates(integration(), [open], 'develop'), []);
  });
});

describe('checkSecondParent', () => {
  it('says nothing about a single-parent commit', () => {
    assert.equal(checkSecondParent({ parents: ['one'] }, pull()), null);
  });

  it('accepts a merge whose second parent is the pull request head', () => {
    const parents = ['one', '2222222222222222222222222222222222222222'];

    assert.equal(checkSecondParent({ parents }, pull()), null);
  });

  it('flags a merge whose second parent moved', () => {
    assert.equal(
      checkSecondParent({ parents: ['one', 'moved'] }, pull()),
      'second-parent-mismatch'
    );
  });
});

describe('parseNoreplyLogin', () => {
  it('reads the login out of both noreply forms', () => {
    assert.equal(parseNoreplyLogin('3693028+Adzouz@users.noreply.github.com'), 'Adzouz');
    assert.equal(parseNoreplyLogin('Adzouz@users.noreply.github.com'), 'Adzouz');
  });

  it('says nothing about an address that is not a noreply one', () => {
    assert.equal(parseNoreplyLogin('ben.irvin@strapi.io'), null);
    assert.equal(parseNoreplyLogin(''), null);
  });
});

describe('deriveAuthorName', () => {
  it('takes the name off a squash commit, which the contributor authored', () => {
    assert.equal(
      deriveAuthorName(
        integration({ author: 'Nico André', email: '123+nclsndr@users.noreply.github.com' }),
        'nclsndr'
      ),
      'Nico André'
    );
  });

  it('matches a login case-insensitively, the way GitHub does', () => {
    assert.equal(
      deriveAuthorName(
        integration({ author: 'Adrien L', email: '3693028+Adzouz@users.noreply.github.com' }),
        'adzouz'
      ),
      'Adrien L'
    );
  });

  it('keeps the name when the address carries no login to check it against', () => {
    assert.equal(
      deriveAuthorName(
        integration({ author: 'Ben Irvin', email: 'ben.irvin@strapi.io' }),
        'innerdvations'
      ),
      'Ben Irvin'
    );
  });

  it('refuses a merge commit, whose author is whoever pressed merge', () => {
    assert.equal(
      deriveAuthorName(
        integration({
          author: 'The Merger',
          email: '1+merger@users.noreply.github.com',
          parents: ['a'.repeat(40), 'b'.repeat(40)],
        }),
        'someone'
      ),
      null
    );
  });

  it('refuses a squash that took another contributor authorship', () => {
    assert.equal(
      deriveAuthorName(
        integration({ author: 'Co Author', email: '9+co-author@users.noreply.github.com' }),
        'someone'
      ),
      null
    );
  });

  it('refuses an empty name rather than reporting one', () => {
    assert.equal(deriveAuthorName(integration({ author: '', email: '' }), 'someone'), null);
  });
});

describe('summarisePull', () => {
  it('carries the login from the payload and the name from the commit', () => {
    assert.deepEqual(summarisePull(pull(), integration()).author, {
      login: 'someone',
      name: 'Someone Real',
    });
  });

  it('keeps the author email out of what gets published', () => {
    // The payload is embedded in a public pull request body. The email is evidence for the name,
    // read and dropped, and no summary is allowed to carry it there.
    const summary = summarisePull(pull(), integration({ email: 'private.address@strapi.io' }));

    assert.equal(JSON.stringify(summary).includes('private.address@strapi.io'), false);
  });

  it('fills every absent field rather than leaking undefined', () => {
    const bare = { number: 1, merged_at: '2026-09-05T09:59:00Z' };

    assert.deepEqual(summarisePull(bare, integration({ author: '', email: '' })), {
      number: 1,
      title: '',
      author: { login: '', name: null },
      url: '',
      baseRef: '',
      headRef: '',
      milestone: null,
      mergedAt: '2026-09-05T09:59:00Z',
    });
  });
});

describe('resolveIntegration', () => {
  it('resolves a squash commit on an exact merge SHA', async () => {
    const resolved = await resolveIntegration(
      integration(),
      lookup({ pulls: [pull()] }),
      'develop'
    );

    assert.equal(resolved.status, 'resolved');
    assert.equal(resolved.basis, 'exact-merge-sha');
    assert.equal(resolved.pull?.number, 27482);
    assert.equal(resolved.pull?.milestone, '5.52.4');
    assert.deepEqual(resolved.warnings, []);
  });

  it('resolves a merge commit with no reference in its subject', async () => {
    const merge = integration({
      sha: SHA.MERGE,
      parents: [
        '1111111111111111111111111111111111111111',
        '2222222222222222222222222222222222222222',
      ],
      subject: 'future(upload): enhance drawer interaction with outside click handling',
    });
    const matching = pull({ number: 27448, merge_commit_sha: SHA.MERGE });

    const resolved = await resolveIntegration(merge, lookup({ pulls: [matching] }), 'develop');

    assert.equal(resolved.status, 'resolved');
    assert.equal(resolved.basis, 'exact-merge-sha');
    assert.deepEqual(resolved.warnings, []);
  });

  it('warns, but still resolves, when the head is not the second parent', async () => {
    const merge = integration({
      sha: SHA.MERGE,
      parents: ['1111111111111111111111111111111111111111', 'moved'],
    });

    const resolved = await resolveIntegration(
      merge,
      lookup({ pulls: [pull({ merge_commit_sha: SHA.MERGE })] }),
      'develop'
    );

    assert.equal(resolved.status, 'resolved');
    assert.deepEqual(resolved.warnings, ['second-parent-mismatch']);
  });

  it('rejects an indirect association from another base', async () => {
    const backMerge = integration({
      sha: SHA.BACK_MERGE,
      subject: "Merge branch 'main' into develop",
    });

    const resolved = await resolveIntegration(
      backMerge,
      lookup({ pulls: [indirectPull()] }),
      'develop'
    );

    assert.equal(resolved.status, 'unresolved');
    assert.match(resolved.reason, /#27470/u);
  });

  it('separates an empty result from a failed lookup', async () => {
    const direct = integration({ sha: SHA.DIRECT, subject: 'chore: touch up a comment' });

    const empty = await resolveIntegration(direct, lookup({ pulls: [] }), 'develop');
    const failed = await resolveIntegration(direct, lookup({ fail: true }), 'develop');

    assert.equal(empty.status, 'direct-integration');
    assert.equal(failed.status, 'lookup-failed');
    assert.match(failed.reason, /502 Bad Gateway/u);
  });

  it('blocks when several merged pull requests claim the same integration', async () => {
    const duplicate = [pull(), pull({ number: 27483 })];

    const resolved = await resolveIntegration(
      integration(),
      lookup({ pulls: duplicate }),
      'develop'
    );

    assert.equal(resolved.status, 'ambiguous');
    assert.equal(resolved.pull, null);
    assert.match(resolved.reason, /#27482, #27483/u);
  });

  it('falls back to a subject reference only with hard evidence', async () => {
    const subject = 'fix(content-type-builder): default new private fields (#27482)';
    const target = integration({ sha: SHA.SQUASH, subject });

    const withEvidence = await resolveIntegration(
      target,
      lookup({ pulls: [], byNumber: { 27482: pull() } }),
      'develop'
    );

    assert.equal(withEvidence.status, 'resolved');
    assert.equal(withEvidence.basis, 'verified-subject');

    const withoutEvidence = await resolveIntegration(
      target,
      lookup({ pulls: [], byNumber: { 27482: pull({ merge_commit_sha: 'elsewhere' }) } }),
      'develop'
    );

    assert.equal(withoutEvidence.status, 'direct-integration');
  });

  it('accepts a subject reference whose head is the second parent', async () => {
    const target = integration({
      sha: SHA.MERGE,
      parents: ['one', '2222222222222222222222222222222222222222'],
      subject: 'Merge pull request #27482 from strapi/fix/ctb-private-searchable',
    });

    const resolved = await resolveIntegration(
      target,
      lookup({ pulls: [], byNumber: { 27482: pull({ merge_commit_sha: 'elsewhere' }) } }),
      'develop'
    );

    assert.equal(resolved.basis, 'second-parent-head');
  });

  it('ignores a subject reference to a pull request that cannot be fetched', async () => {
    const target = integration({ subject: 'fix(upload): a thing (#99999)' });

    const resolved = await resolveIntegration(target, lookup({ pulls: [] }), 'develop');

    assert.equal(resolved.status, 'direct-integration');
  });
});

describe('resolveIntegrations', () => {
  it('keeps input order', async () => {
    const integrations = [integration({ sha: 'a' }), integration({ sha: 'b' })];

    const records = await resolveIntegrations(integrations, lookup({ pulls: [] }), 'develop');

    assert.deepEqual(
      records.map((entry) => entry.sha),
      ['a', 'b']
    );
  });
});

describe('dedupePullRequests', () => {
  it('keeps the name the first integration that could vouch for one established', () => {
    const merge = summarisePull(
      pull({ number: 1 }),
      integration({ parents: ['a'.repeat(40), 'b'.repeat(40)] })
    );
    const squash = summarisePull(pull({ number: 1 }), integration());

    assert.equal(merge.author.name, null);

    const [deduped] = dedupePullRequests([
      record({ sha: 'a', pull: merge }),
      record({ sha: 'b', pull: squash }),
    ]);

    assert.deepEqual(deduped?.author, { login: 'someone', name: 'Someone Real' });
  });

  it('collapses duplicates while keeping every integration SHA', () => {
    const summary = summarisePull(pull({ number: 1 }), integration());
    const records = [
      record({ sha: 'a', pull: summary }),
      record({ sha: 'b', pull: summary }),
      record({ sha: 'c', status: 'direct-integration', basis: 'none', pull: null }),
    ];

    const deduped = dedupePullRequests(records);

    assert.equal(deduped.length, 1);
    assert.deepEqual(deduped[0]?.integrationShas, ['a', 'b']);
    assert.equal(deduped[0]?.number, 1);
  });
});

describe('assertSupportedMergeMethods', () => {
  it('accepts the current Strapi configuration', () => {
    assert.doesNotThrow(() =>
      assertSupportedMergeMethods({
        allow_merge_commit: true,
        allow_squash_merge: true,
        allow_rebase_merge: false,
      })
    );
  });

  it('blocks explicitly when rebase merges are enabled', () => {
    assert.throws(
      () =>
        assertSupportedMergeMethods({
          allow_merge_commit: true,
          allow_squash_merge: true,
          allow_rebase_merge: true,
        }),
      /Rebase merges are enabled/u
    );
  });
});
