import type {
  Integration,
  MergedPull,
  MilestoneItem,
  PullCommit,
  PullPayload,
  ReleasePlan,
} from '../types.ts';

/**
 * Fixtures modelled on the real `v5.52.3..develop` range, including the cases that proved the
 * resolver rules: a squash commit with a subject reference, a merge commit with no reference, a
 * release back-merge, and an indirect association from another base.
 */

export const SHA = {
  /** Where a release branch already points, one integration behind `develop`. */
  CANDIDATE_HEAD: 'face0000face0000face0000face0000face0000',
  BACK_MERGE: 'ca560c0d681a696a497cb1a68245b002fd9810bf',
  DIRECT: 'aaaa0000aaaa0000aaaa0000aaaa0000aaaa0000',
  MERGE: 'b912880160c178af6171de530e830b3174a2b1d4',
  RELEASE: 'cccc0000cccc0000cccc0000cccc0000cccc0000',
  SQUASH: 'e4d1416374000000000000000000000000000000',
  SQUASH_FEAT: 'ad3782818e000000000000000000000000000000',
  UNPARSED: 'dddd0000dddd0000dddd0000dddd0000dddd0000',
} as const;

export function integration(overrides: Partial<Integration> = {}): Integration {
  return {
    sha: SHA.SQUASH,
    parents: ['1111111111111111111111111111111111111111'],
    author: 'Someone Real',
    email: '4242+someone@users.noreply.github.com',
    authoredAt: '2026-09-05T10:00:00Z',
    subject: 'fix(content-type-builder): default new private fields to not searchable (#27482)',
    body: '',
    ...overrides,
  };
}

/** A merged pull request, because everything attribution accepts has already merged. */
export function pull(overrides: Partial<MergedPull> = {}): MergedPull {
  return {
    number: 27482,
    title: 'fix(content-type-builder): default new private fields to not searchable',
    html_url: 'https://github.com/strapi/strapi/pull/27482',
    merged_at: '2026-09-05T09:59:00Z',
    merge_commit_sha: SHA.SQUASH,
    base: { ref: 'develop' },
    head: { ref: 'fix/ctb-private-searchable', sha: '2222222222222222222222222222222222222222' },
    user: { login: 'someone' },
    milestone: { title: '5.52.4' },
    ...overrides,
  };
}

/** A pull request merged into `main`, only indirectly associated with a develop integration. */
export function indirectPull(): MergedPull {
  return pull({
    number: 27470,
    title: 'Releases/5.52.2',
    merge_commit_sha: '9999999999999999999999999999999999999999',
    base: { ref: 'main' },
    head: { ref: 'releases/5.52.2', sha: '8888888888888888888888888888888888888888' },
  });
}

/** The release back-merge: head is `main`, so its commits already shipped. */
export function backMergePull(): MergedPull {
  return pull({
    number: 27527,
    title: 'chore: release v5.52.3 update develop',
    merge_commit_sha: SHA.BACK_MERGE,
    base: { ref: 'develop' },
    head: { ref: 'main', sha: '7777777777777777777777777777777777777777' },
  });
}

export function pullCommits(messages: readonly string[]): PullCommit[] {
  return messages.map((message) => ({ commit: { message } }));
}

export function milestoneItem(overrides: Partial<MilestoneItem> = {}): MilestoneItem {
  return { number: 100, title: 'Some work', state: 'open', ...overrides };
}

export function pullRequestItem(
  number: number,
  state: string,
  mergedAt: string | null
): MilestoneItem {
  return milestoneItem({ number, state, pull_request: { merged_at: mergedAt } });
}

/** The repository the pipeline fixtures run against, as `head.repo.full_name` spells it. */
export const OWN_REPOSITORY = 'strapi/strapi';

/** The head of a release pull request cut by this repository's own automation. */
export function candidateHead(
  version: string,
  sha: string = SHA.CANDIDATE_HEAD
): NonNullable<PullPayload['head']> {
  return { ref: `releases/${version}`, sha, repo: { full_name: OWN_REPOSITORY } };
}

/** The open pull request that identifies a release candidate in flight. */
export function candidatePull(overrides: Partial<PullPayload> = {}): PullPayload {
  const version = '5.53.0';

  return {
    number: 27600,
    title: `Release ${version}`,
    html_url: 'https://github.com/strapi/strapi/pull/27600',
    body: `Release \`${version}\`.`,
    merged_at: null,
    base: { ref: 'main' },
    head: candidateHead(version),
    user: { login: 'strapi-release-bot' },
    milestone: null,
    ...overrides,
  };
}

/** A fresh draft, decided: `5.52.3` → `5.53.0` off one `feat`, the open `5.52.4` milestone renamed. */
export function releasePlan(overrides: Partial<ReleasePlan> = {}): ReleasePlan {
  return {
    mode: 'draft',
    candidate: null,
    previousVersion: '5.52.3',
    version: '5.53.0',
    bumpKind: 'minor',
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
    versionSource: 'computed',
    range: {
      fromRef: 'v5.52.3',
      fromSha: 'a'.repeat(40),
      toRef: 'origin/develop',
      toSha: 'b'.repeat(40),
    },
    integrationCount: 12,
    pullRequests: [
      {
        number: 27436,
        title: 'feat(content-releases): audit logs',
        author: { login: 'someone', name: 'Someone Real' },
        url: 'https://github.com/strapi/strapi/pull/27436',
        baseRef: 'develop',
        headRef: 'feat/audit-logs',
        milestone: '5.52.4',
        mergedAt: '2026-09-05T09:59:00Z',
        status: 'resolved',
        basis: 'exact-merge-sha',
        integrationShas: ['c'.repeat(40)],
      },
    ],
    attention: [],
    warnings: [],
    milestones: {
      shipping: {
        action: 'rename',
        number: 430,
        currentTitle: '5.52.4',
        title: '5.53.0',
        close: true,
      },
      next: { action: 'create', number: null, currentTitle: null, title: '5.53.1' },
    },
    branch: 'releases/5.53.0',
    branchAdvances: true,
    candidateHeadSha: null,
    realignment: [],
    ...overrides,
  };
}
