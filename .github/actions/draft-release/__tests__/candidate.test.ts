import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertBranchContained,
  assertCandidateUnpublished,
  crossCheckCandidate,
  decideMode,
  findCandidate,
  parseReleaseBranch,
} from '../lib/candidate.ts';
import { candidatePull, pull } from '../lib/__fixtures__/fixtures.ts';

import type { Candidate } from '../lib/types.ts';

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    version: '5.53.0',
    branch: 'releases/5.53.0',
    pullNumber: 27600,
    pullUrl: 'https://github.com/strapi/strapi/pull/27600',
    pullHeadSha: 'face0000face0000face0000face0000face0000',
    payload: null,
    ...overrides,
  };
}

describe('parseReleaseBranch', () => {
  it('reads the version out of a release branch', () => {
    assert.equal(parseReleaseBranch('releases/5.53.0'), '5.53.0');
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
  it('finds the candidate and reads its payload back', () => {
    const found = findCandidate([pull(), candidatePull()]);

    assert.equal(found?.version, '5.53.0');
    assert.equal(found?.branch, 'releases/5.53.0');
    assert.equal(found?.pullNumber, 27600);
    assert.deepEqual(found?.payload, {
      release: { version: '5.53.0' },
      candidate: { branch: 'releases/5.53.0' },
    });
  });

  it('reports no candidate when none is open', () => {
    assert.equal(findCandidate([pull()]), null);
  });

  it('reports no candidate on an empty list', () => {
    assert.equal(findCandidate([]), null);
  });

  it('keeps a null payload when the body carries no readable block', () => {
    assert.equal(findCandidate([candidatePull({ body: 'no block here' })])?.payload, null);
  });

  it('stops on two open release pull requests rather than pick one', () => {
    assert.throws(
      () =>
        findCandidate([
          candidatePull(),
          candidatePull({ number: 27601, head: { ref: 'releases/5.52.4', sha: 'abc' } }),
        ]),
      /Found 2 open release pull requests: #27600 \(releases\/5\.53\.0\), #27601 \(releases\/5\.52\.4\)/u
    );
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

  it('stops on a version it cannot compare', () => {
    assert.throws(
      () => assertCandidateUnpublished(candidate({ version: '5.53' }), '5.52.3'),
      /Both have to be plain x\.y\.z versions/u
    );
  });
});

describe('assertBranchContained', () => {
  const input = {
    branch: 'releases/5.53.0',
    branchHeadSha: 'aaaa',
    sourceRef: 'origin/develop',
    sourceSha: 'bbbb',
  };

  it('accepts a branch that is only a pointer into the source', () => {
    assert.doesNotThrow(() => assertBranchContained({ ...input, contained: true }));
  });

  it('stops when something was pushed to the release branch directly', () => {
    assert.throws(
      () => assertBranchContained({ ...input, contained: false }),
      /releases\/5\.53\.0 \(aaaa\) is not contained in origin\/develop \(bbbb\)/u
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
    assert.equal(decideMode(candidate({ version: '5.52.4' }), '5.53.0'), 'redraft');
  });

  it('stops on a version below the candidate, which means history was rewritten', () => {
    assert.throws(
      () => decideMode(candidate({ version: '5.53.0' }), '5.52.4'),
      /The range now computes 5\.52\.4, below the candidate 5\.53\.0 on #27600/u
    );
  });

  it('stops on a version it cannot compare', () => {
    assert.throws(
      () => decideMode(candidate(), 'not-a-version'),
      /Both have to be plain x\.y\.z versions/u
    );
  });
});

describe('crossCheckCandidate', () => {
  it('says nothing when the payload agrees with the branch', () => {
    const found = findCandidate([candidatePull()]);

    assert.deepEqual(crossCheckCandidate(found!), []);
  });

  it('warns when the body carries no readable block', () => {
    assert.match(
      crossCheckCandidate(candidate())[0] ?? '',
      /carries no readable release candidate/u
    );
  });

  it('warns on a payload that disagrees, without stopping the run', () => {
    const warnings = crossCheckCandidate(
      candidate({
        payload: { release: { version: '5.52.4' }, candidate: { branch: 'releases/5.52.4' } },
      })
    );

    assert.equal(warnings.length, 2);
    assert.match(warnings[0] ?? '', /lives on `releases\/5\.53\.0` but its payload records/u);
    assert.match(warnings[1] ?? '', /was cut as `5\.53\.0` but its payload records/u);
  });

  it('ignores a payload whose fields are absent or not strings', () => {
    assert.deepEqual(
      crossCheckCandidate(candidate({ payload: { release: { version: 5 }, candidate: {} } })),
      []
    );
  });
});
