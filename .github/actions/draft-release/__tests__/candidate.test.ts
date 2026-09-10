import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertCandidateUnpublished,
  decideMode,
  findCandidate,
  parseReleaseBranch,
  planBranch,
} from '../lib/candidate.ts';
import {
  OWN_REPOSITORY,
  SHA,
  candidateHead,
  candidatePull,
  pull,
} from '../lib/__fixtures__/fixtures.ts';

import type { Candidate, GitAdapter, PinnedRange, RepositoryCoords } from '../lib/types.ts';

const COORDS: RepositoryCoords = { owner: 'strapi', repo: 'strapi' };

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    version: '5.53.0',
    parsedVersion: { major: 5, minor: 53, patch: 0 },
    branch: 'releases/5.53.0',
    pullNumber: 27600,
    pullUrl: 'https://github.com/strapi/strapi/pull/27600',
    ...overrides,
  };
}

describe('parseReleaseBranch', () => {
  it('reads the version out of a release branch', () => {
    assert.deepEqual(parseReleaseBranch('releases/5.53.0'), { major: 5, minor: 53, patch: 0 });
  });

  it('refuses anything that is not exactly releases/x.y.z', () => {
    assert.equal(parseReleaseBranch('releases/5.53.0-hotfix'), null);
    assert.equal(parseReleaseBranch('releases/next'), null);
    assert.equal(parseReleaseBranch('release/5.53.0'), null);
    assert.equal(parseReleaseBranch('develop'), null);
    assert.equal(parseReleaseBranch(''), null);
  });
});

describe('findCandidate', () => {
  it('finds the candidate by its head ref', () => {
    assert.deepEqual(findCandidate([pull(), candidatePull()], COORDS), {
      version: '5.53.0',
      parsedVersion: { major: 5, minor: 53, patch: 0 },
      branch: 'releases/5.53.0',
      pullNumber: 27600,
      pullUrl: 'https://github.com/strapi/strapi/pull/27600',
    });
  });

  it('reports no candidate when none is open', () => {
    assert.equal(findCandidate([pull()], COORDS), null);
  });

  it('reports no candidate on an empty list', () => {
    assert.equal(findCandidate([], COORDS), null);
  });

  it('ignores a release-named pull request whose head lives in a fork', () => {
    const fork = candidatePull({
      head: { ...candidateHead('5.53.0'), repo: { full_name: 'someone/strapi' } },
    });

    assert.equal(findCandidate([fork], COORDS), null);
  });

  it('ignores a pull request whose head repository is gone', () => {
    const orphan = candidatePull({ head: { ...candidateHead('5.53.0'), repo: null } });

    assert.equal(findCandidate([orphan], COORDS), null);
    assert.equal(
      findCandidate([candidatePull({ head: { ref: 'releases/5.53.0' } })], COORDS),
      null
    );
  });

  it('matches the repository exactly, not by suffix', () => {
    assert.equal(OWN_REPOSITORY, `${COORDS.owner}/${COORDS.repo}`);
    assert.equal(findCandidate([candidatePull()], { owner: 'strapi', repo: 'strapi-fork' }), null);
  });

  it('stops on two open release pull requests rather than pick one', () => {
    assert.throws(
      () =>
        findCandidate(
          [candidatePull(), candidatePull({ number: 27601, head: candidateHead('5.52.4') })],
          COORDS
        ),
      /Found 2 open release pull requests: #27600 \(releases\/5\.53\.0\), #27601 \(releases\/5\.52\.4\)/u
    );
  });

  it('does not count a fork toward the two-candidates stop', () => {
    const fork = candidatePull({
      number: 27601,
      head: { ...candidateHead('5.52.4'), repo: { full_name: 'someone/strapi' } },
    });

    assert.equal(findCandidate([candidatePull(), fork], COORDS)?.pullNumber, 27600);
  });
});

describe('assertCandidateUnpublished', () => {
  it('accepts a candidate above the published baseline', () => {
    assert.doesNotThrow(() => assertCandidateUnpublished(candidate(), '5.52.3'));
  });

  it('stops when the candidate already shipped', () => {
    assert.throws(
      () => assertCandidateUnpublished(candidate(), '5.53.0'),
      /is not above the published baseline 5\.53\.0, so that release already shipped/u
    );
  });

  it('stops when npm moved past the candidate', () => {
    assert.throws(() => assertCandidateUnpublished(candidate(), '5.54.0'), /already shipped/u);
  });

  it('stops on a baseline it cannot compare', () => {
    assert.throws(
      () => assertCandidateUnpublished(candidate(), '5.52'),
      /baseline 5\.52, which is not a plain x\.y\.z version/u
    );
  });
});

describe('decideMode', () => {
  it('drafts when nothing is in flight', () => {
    assert.equal(decideMode(null, '5.53.0'), 'draft');
  });

  it('refreshes when the version still agrees with the candidate', () => {
    assert.equal(decideMode(candidate(), '5.53.0'), 'refresh');
  });

  it('redrafts when the commits that landed changed the version', () => {
    const older = candidate({
      version: '5.52.4',
      parsedVersion: { major: 5, minor: 52, patch: 4 },
    });

    assert.equal(decideMode(older, '5.53.0'), 'redraft');
  });

  it('stops on a version below the candidate, which means history was rewritten', () => {
    assert.throws(
      () => decideMode(candidate(), '5.52.4'),
      /The range now computes 5\.52\.4, below the candidate 5\.53\.0 on #27600/u
    );
  });

  it('stops on a version it cannot compare', () => {
    assert.throws(
      () => decideMode(candidate(), 'not-a-version'),
      /The recomputed version has to be a plain x\.y\.z version/u
    );
  });
});

describe('planBranch', () => {
  const DEVELOP_HEAD = 'f'.repeat(40);

  const range: PinnedRange = {
    fromRef: 'v5.52.3',
    fromSha: '0'.repeat(40),
    toRef: 'origin/develop',
    toSha: DEVELOP_HEAD,
  };

  /** A remote where the candidate's branch exists and sits at `candidateHead`. */
  function gitStub(
    candidateHead: string,
    overrides: Partial<GitAdapter> = {}
  ): { git: GitAdapter; calls: string[] } {
    const calls: string[] = [];
    const git: GitAdapter = {
      refExists: () => true,
      resolveSha: (ref) =>
        ref.startsWith('origin/releases/') === true ? candidateHead : DEVELOP_HEAD,
      isAncestor: () => true,
      listIntegrations: () => [],
      pushBranch() {},
      deleteBranch() {},
      fetchBranch(branch) {
        calls.push(`fetchBranch:${branch}`);
      },
      remoteBranchExists: (branch) => branch === 'releases/5.53.0',
      ...overrides,
    };

    return { git, calls };
  }

  it('cuts a fresh branch when nothing is in flight', () => {
    const { git } = gitStub(SHA.CANDIDATE_HEAD, { remoteBranchExists: () => false });

    assert.deepEqual(
      planBranch({ git, mode: 'draft', branch: 'releases/5.53.0', candidate: null, range }),
      { advances: true, candidateHeadSha: null }
    );
  });

  it('stops when the branch exists with no pull request drafting it', () => {
    const { git } = gitStub(SHA.CANDIDATE_HEAD);

    assert.throws(
      () => planBranch({ git, mode: 'draft', branch: 'releases/5.53.0', candidate: null, range }),
      /releases\/5\.53\.0 already exists but no open pull request is drafting it/u
    );
  });

  it('advances a candidate that fell behind and reports the head it resolved', () => {
    const { git, calls } = gitStub(SHA.CANDIDATE_HEAD);

    assert.deepEqual(
      planBranch({
        git,
        mode: 'refresh',
        branch: 'releases/5.53.0',
        candidate: candidate(),
        range,
      }),
      { advances: true, candidateHeadSha: SHA.CANDIDATE_HEAD }
    );
    assert.deepEqual(calls, ['fetchBranch:releases/5.53.0']);
  });

  it('pushes nothing when the candidate already sits at the pinned head', () => {
    const { git } = gitStub(DEVELOP_HEAD);

    assert.deepEqual(
      planBranch({
        git,
        mode: 'refresh',
        branch: 'releases/5.53.0',
        candidate: candidate(),
        range,
      }),
      { advances: false, candidateHeadSha: DEVELOP_HEAD }
    );
  });

  it('always cuts the replacement on a redraft, even from the same head', () => {
    const { git } = gitStub(DEVELOP_HEAD);

    assert.deepEqual(
      planBranch({
        git,
        mode: 'redraft',
        branch: 'releases/5.54.0',
        candidate: candidate(),
        range,
      }),
      { advances: true, candidateHeadSha: DEVELOP_HEAD }
    );
  });

  it('stops when the candidate pull request outlived its branch', () => {
    const { git } = gitStub(SHA.CANDIDATE_HEAD, { remoteBranchExists: () => false });

    assert.throws(
      () =>
        planBranch({
          git,
          mode: 'refresh',
          branch: 'releases/5.53.0',
          candidate: candidate(),
          range,
        }),
      /#27600 is open against releases\/5\.53\.0, but that branch is gone from the remote/u
    );
  });

  it('stops when something was pushed to the release branch directly', () => {
    const { git } = gitStub(SHA.CANDIDATE_HEAD, {
      isAncestor: (ancestor) => ancestor !== SHA.CANDIDATE_HEAD,
    });

    assert.throws(
      () =>
        planBranch({
          git,
          mode: 'refresh',
          branch: 'releases/5.53.0',
          candidate: candidate(),
          range,
        }),
      /releases\/5\.53\.0 \(face0000.*\) is not contained in origin\/develop \(f{40}\)/u
    );
  });
});
