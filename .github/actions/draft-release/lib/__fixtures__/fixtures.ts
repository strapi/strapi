import type { Integration, MilestoneItem, PullCommit, PullPayload } from '../types.ts';

/**
 * Fixtures modelled on the real `v5.52.3..develop` range, including the cases that proved the
 * resolver rules: a squash commit with a subject reference, a merge commit with no reference, a
 * release back-merge, and an indirect association from another base.
 */

export const SHA = {
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
    author: 'someone',
    authoredAt: '2026-09-05T10:00:00Z',
    subject: 'fix(content-type-builder): default new private fields to not searchable (#27482)',
    body: '',
    ...overrides,
  };
}

export function pull(overrides: Partial<PullPayload> = {}): PullPayload {
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
export function indirectPull(): PullPayload {
  return pull({
    number: 27470,
    title: 'Releases/5.52.2',
    merge_commit_sha: '9999999999999999999999999999999999999999',
    base: { ref: 'main' },
    head: { ref: 'releases/5.52.2', sha: '8888888888888888888888888888888888888888' },
  });
}

/** The release back-merge: head is `main`, so its commits already shipped. */
export function backMergePull(): PullPayload {
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
