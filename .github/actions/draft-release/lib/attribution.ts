import type {
  AttributedPull,
  AttributionLookup,
  AttributionRecord,
  Integration,
  MergedPull,
  PullPayload,
  PullSummary,
  RepositoryMergeSettings,
} from './types.ts';

/**
 * Resolves each first-parent integration to the pull request that produced it.
 *
 * GitHub already stores the authoritative relation, so nothing here guesses. A pull request is
 * accepted only when it is merged, targets the release base branch, and its `merge_commit_sha` is
 * the integration commit itself. Similar titles, authors or dates are never enough.
 */

const TRAILING_REFERENCE = /\(#(\d+)\)\s*$/u;
const MERGE_REFERENCE = /^Merge pull request #(\d+)\b/u;

const SECOND_PARENT_MISMATCH = 'second-parent-mismatch';
const NOREPLY_ADDRESS = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/iu;

/**
 * Reads an anchored pull request number out of a commit subject.
 *
 * Anchored on purpose: a `#123` mentioned mid-sentence is a cross-reference, not the integration
 * that produced the commit.
 */
export function parseSubjectReference(subject: string): number | null {
  const trailing = TRAILING_REFERENCE.exec(subject ?? '');

  if (trailing !== null) {
    return Number(trailing[1]);
  }

  const merge = MERGE_REFERENCE.exec(subject ?? '');

  if (merge !== null) {
    return Number(merge[1]);
  }

  return null;
}

/**
 * The only place a {@link MergedPull} comes from.
 *
 * A guard rather than a boolean check, so the merge timestamp is carried in the type from here on
 * and no projection downstream has to invent a value for a payload that never merged.
 */
function isMerged(pull: PullPayload): pull is MergedPull {
  return typeof pull.merged_at === 'string';
}

/**
 * Selects the pull requests that satisfy the exact rule. Every clause is required.
 *
 * `base.ref` alone rejects a pull request merged into `main` and later carried into the release
 * base by a direct branch merge. `merge_commit_sha` alone rejects a pull request that is merely
 * associated with the commit.
 */
export function selectExactCandidates(
  integration: Pick<Integration, 'sha'>,
  pulls: readonly PullPayload[],
  targetBase: string
): MergedPull[] {
  return pulls.filter(
    (pull): pull is MergedPull =>
      isMerged(pull) === true &&
      pull.base?.ref === targetBase &&
      pull.merge_commit_sha === integration.sha
  );
}

/**
 * Checks that a two-parent merge has the pull request head as its second parent.
 *
 * This is corroborating evidence, not the decision. A merged pull request keeps its last known head
 * SHA, so a force-push to the branch after the merge can move it. Reporting a warning is therefore
 * the correct response, not failing the release.
 *
 * @returns A warning code, or `null` when nothing is wrong.
 */
export function checkSecondParent(
  integration: Pick<Integration, 'parents'>,
  pull: PullPayload
): string | null {
  const headSha = pull.head?.sha;

  if (integration.parents.length !== 2 || typeof headSha !== 'string') {
    return null;
  }

  return integration.parents[1] === headSha ? null : SECOND_PARENT_MISMATCH;
}

/**
 * Reads the login out of a GitHub noreply address.
 *
 * Both forms are in the history: `login@users.noreply.github.com` and the numbered
 * `1234567+login@users.noreply.github.com` GitHub hands out today.
 *
 * @returns `null` for any address that is not a noreply one, which says nothing either way.
 */
export function parseNoreplyLogin(email: string): string | null {
  const match = NOREPLY_ADDRESS.exec(email ?? '');

  return match?.[1] ?? null;
}

/**
 * The display name for a pull request, when the history can vouch for it.
 *
 * A squash commit is authored by the contributor, so its `%an` is the name GitHub itself renders.
 * Two other cases are refused rather than guessed, because a plausible wrong name is worse than a
 * missing one:
 *
 * - a merge commit is authored by whoever pressed merge, and says nothing about who wrote the work;
 * - a noreply email naming a different login means the squash took someone else's authorship,
 *   which happens on a pull request written by several people.
 *
 * An address that carries no login, a work address for instance, is not evidence against the name.
 *
 * @returns `null` when nothing vouches for a name.
 */
export function deriveAuthorName(integration: Integration, login: string): string | null {
  if (integration.parents.length !== 1 || integration.author === '') {
    return null;
  }

  const committed = parseNoreplyLogin(integration.email);

  if (committed !== null && login !== '' && committed.toLowerCase() !== login.toLowerCase()) {
    return null;
  }

  return integration.author;
}

/**
 * Projects the fields the report needs out of a raw pull request payload.
 *
 * The integration is passed in because the payload alone cannot answer who wrote the pull request
 * by name. See {@link deriveAuthorName}.
 */
export function summarisePull(pull: MergedPull, integration: Integration): PullSummary {
  const login = pull.user?.login ?? '';

  return {
    number: pull.number,
    title: pull.title ?? '',
    author: { login, name: deriveAuthorName(integration, login) },
    url: pull.html_url ?? '',
    baseRef: pull.base?.ref ?? '',
    headRef: pull.head?.ref ?? '',
    milestone: pull.milestone?.title ?? null,
    mergedAt: pull.merged_at,
  };
}

/** The part of a record the deterministic fallback can decide on its own. */
type FallbackVerdict = Pick<AttributionRecord, 'status' | 'basis' | 'pull' | 'reason'>;

/**
 * The one deterministic fallback.
 *
 * A subject reference alone proves nothing, so the referenced pull request still has to carry hard
 * evidence: the same merge SHA, or a head equal to the second parent of a merge commit.
 */
async function resolveBySubject(
  integration: Integration,
  lookup: AttributionLookup,
  targetBase: string
): Promise<FallbackVerdict | null> {
  const referenced = parseSubjectReference(integration.subject);

  if (referenced === null) {
    return null;
  }

  const pull = await lookup.getPull(referenced).catch(() => null);

  if (pull === null || isMerged(pull) === false) {
    return null;
  }

  if (pull.base?.ref !== targetBase) {
    return null;
  }

  if (pull.merge_commit_sha === integration.sha) {
    return {
      status: 'resolved',
      basis: 'verified-subject',
      pull: summarisePull(pull, integration),
      reason: `The subject references #${referenced}, whose merge SHA is this integration.`,
    };
  }

  if (integration.parents.length === 2 && integration.parents[1] === pull.head?.sha) {
    return {
      status: 'resolved',
      basis: 'second-parent-head',
      pull: summarisePull(pull, integration),
      reason: `The subject references #${referenced}, whose head is the second parent of this merge.`,
    };
  }

  return null;
}

/**
 * Resolves one integration.
 *
 * Never throws for a lookup problem: a failed API call is reported as `lookup-failed` so it can
 * never be mistaken for a commit pushed straight to the base branch.
 */
export async function resolveIntegration(
  integration: Integration,
  lookup: AttributionLookup,
  targetBase: string
): Promise<AttributionRecord> {
  const base = {
    sha: integration.sha,
    subject: integration.subject,
    author: integration.author,
    authoredAt: integration.authoredAt,
    parents: integration.parents,
    pull: null,
    warnings: [],
  } satisfies Omit<AttributionRecord, 'status' | 'basis' | 'reason'>;

  const pulls = await lookup
    .listPullsForCommit(integration.sha)
    .then((found) => ({ ok: true as const, found }))
    .catch((error: Error) => ({ ok: false as const, error }));

  if (pulls.ok === false) {
    return {
      ...base,
      status: 'lookup-failed',
      basis: 'none',
      reason: `The commit-to-pulls lookup failed: ${pulls.error.message}`,
    };
  }

  const exact = selectExactCandidates(integration, pulls.found, targetBase);
  const [first] = exact;

  if (exact.length === 1 && first !== undefined) {
    const warning = checkSecondParent(integration, first);

    return {
      ...base,
      status: 'resolved',
      basis: 'exact-merge-sha',
      pull: summarisePull(first, integration),
      warnings: warning === null ? [] : [warning],
      reason: 'Merged into the target base with a merge SHA equal to this integration.',
    };
  }

  if (exact.length > 1) {
    return {
      ...base,
      status: 'ambiguous',
      basis: 'none',
      reason: `${exact.length} merged pull requests claim this integration: ${formatNumbers(exact)}.`,
    };
  }

  const fallback = await resolveBySubject(integration, lookup, targetBase);

  if (fallback !== null) {
    return { ...base, ...fallback };
  }

  if (pulls.found.length === 0) {
    return {
      ...base,
      status: 'direct-integration',
      basis: 'none',
      reason: 'The lookup succeeded and returned no associated pull request.',
    };
  }

  return {
    ...base,
    status: 'unresolved',
    basis: 'none',
    reason:
      `Associated pull requests exist (${formatNumbers(pulls.found)}) but none is merged into ` +
      `${targetBase} with this merge SHA.`,
  };
}

function formatNumbers(pulls: readonly PullPayload[]): string {
  return pulls.map((pull) => `#${pull.number}`).join(', ');
}

/**
 * Resolves every integration, sequentially.
 *
 * A release range is tens of commits, so one request per integration is cheap and keeps the
 * secondary rate limit comfortable.
 */
export async function resolveIntegrations(
  integrations: readonly Integration[],
  lookup: AttributionLookup,
  targetBase: string
): Promise<AttributionRecord[]> {
  const records: AttributionRecord[] = [];

  // Sequential on purpose: parallel commit lookups trip GitHub's secondary rate limit.
  for (const integration of integrations) {
    records.push(await resolveIntegration(integration, lookup, targetBase));
  }

  return records;
}

/**
 * Collapses records to one entry per pull request while keeping every integration SHA attributed
 * to it.
 *
 * Rebase merges are disabled today, but keeping the provenance list means enabling them later does
 * not change the data model.
 */
export function dedupePullRequests(records: readonly AttributionRecord[]): AttributedPull[] {
  const byNumber = records.reduce<Map<number, AttributedPull>>((accumulator, record) => {
    if (record.pull === null) {
      return accumulator;
    }

    const existing = accumulator.get(record.pull.number);

    if (existing === undefined) {
      return accumulator.set(record.pull.number, {
        ...record.pull,
        status: record.status,
        basis: record.basis,
        integrationShas: [record.sha],
      });
    }

    return accumulator.set(record.pull.number, {
      ...existing,
      // The first integration that could vouch for a name keeps it. A later one that could not is
      // silent about the author, not a retraction of what an earlier one established.
      author: existing.author.name === null ? record.pull.author : existing.author,
      integrationShas: [...existing.integrationShas, record.sha],
    });
  }, new Map());

  return [...byNumber.values()];
}

/**
 * Version 1 only understands the merge methods Strapi has enabled today.
 *
 * Rebase merges would turn one pull request into several first-parent commits with no merge SHA to
 * match, which this resolver cannot yet group.
 */
export function assertSupportedMergeMethods(repository: RepositoryMergeSettings): void {
  if (repository.allow_rebase_merge === true) {
    throw new Error(
      'Rebase merges are enabled on this repository. The attribution resolver cannot group ' +
        'rebased commits into one pull request. Disable rebase merges or extend the resolver first.'
    );
  }
}
