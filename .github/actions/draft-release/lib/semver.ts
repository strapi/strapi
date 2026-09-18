import type { BumpKind, StableVersion } from './types.ts';

/**
 * Minimal stable-only semver helpers.
 *
 * The release line this action serves only ever produces `x.y.z` versions. Anything carrying a
 * prerelease or build suffix is rejected on purpose rather than partially supported, so a bad npm
 * dist-tag can never be mistaken for a release baseline.
 */

const STABLE_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/u;

const ORDERED_FIELDS = [
  'major',
  'minor',
  'patch',
] as const satisfies readonly (keyof StableVersion)[];

/**
 * Parses a strictly stable version.
 *
 * @returns `null` for anything that is not a plain release version, including prereleases.
 */
export function parseStable(value: unknown): StableVersion | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = STABLE_PATTERN.exec(value.trim());

  if (match === null) {
    return null;
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** Renders a parsed version back to its `x.y.z` form. */
export function formatStable(version: StableVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Orders two stable versions.
 *
 * @returns `-1` when `left` is older, `0` when equal, `1` when `left` is newer.
 */
export function compareStable(left: StableVersion, right: StableVersion): number {
  return (
    ORDERED_FIELDS.reduce<number | null>((decided, field) => {
      if (decided !== null) {
        return decided;
      }

      if (left[field] === right[field]) {
        return null;
      }

      return left[field] < right[field] ? -1 : 1;
    }, null) ?? 0
  );
}

/**
 * The highest stable version in a list.
 *
 * Prereleases are skipped rather than ordered, because this action never treats one as a baseline.
 *
 * @returns `null` when the list carries no stable version at all.
 */
export function highestStable(versions: readonly string[]): string | null {
  return versions.reduce<string | null>((best, candidate) => {
    const parsed = parseStable(candidate);

    if (parsed === null) {
      return best;
    }

    const incumbent = best === null ? null : parseStable(best);

    if (incumbent === null || compareStable(parsed, incumbent) === 1) {
      return candidate.trim();
    }

    return best;
  }, null);
}

/** Applies a release increment to a stable version. */
export function increment(version: string, bump: BumpKind): string {
  const parsed = parseStable(version);

  if (parsed === null) {
    throw new Error(`Cannot increment a non-stable version: "${version}"`);
  }

  if (bump === 'minor') {
    return formatStable({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
  }

  return formatStable({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
}

/** The milestone that collects work for the release after this one. */
export function nextPatchOf(version: string): string {
  return increment(version, 'patch');
}
