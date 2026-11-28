import type { DuplicateGroup } from './snapshot';

export type RewriteRule = 'email' | 'username' | 'role';

const REWRITTEN_DOMAIN = 'users.invalid';

/** `taken` is every value (lower-cased) a candidate must not equal; each one planned is added */
const fresh = (taken: Set<string>, candidate: (n: number) => string): string => {
  let n = 1;
  let value = candidate(n);

  while (taken.has(value.toLowerCase())) {
    n += 1;
    value = candidate(n);
  }

  taken.add(value.toLowerCase());

  return value;
};

const rewrite = (
  rule: RewriteRule,
  id: number,
  value: string,
  position: number,
  taken: Set<string>
): string => {
  if (rule === 'email') {
    const at = value.lastIndexOf('@');
    const local = (at === -1 ? value : value.slice(0, at)).toLowerCase();

    return fresh(taken, (n) => `${local}+dup${id}${n === 1 ? '' : `-${n}`}@${REWRITTEN_DOMAIN}`);
  }

  if (rule === 'username') {
    return fresh(taken, (n) => `${value.toLowerCase()}_${id}${n === 1 ? '' : `_${n}`}`);
  }

  // The first name keeps its spelling; the next ones count up from 2
  return fresh(taken, (n) => `${value} (${position + 1 + n})`);
};

/**
 * What each row a group rewrites becomes. The kept row of a group is left as it is; the others get
 * a value of their own, built from the value they hold (`values`, by id):
 * - `email`: `<local>+dup<id>@users.invalid`, in lower case;
 * - `username`: `<name>_<id>`, in lower case;
 * - `role`: `<name> (2)`, `<name> (3)`, in the order of the group.
 * A value that `taken` holds (compared in lower case), or that an earlier rewrite took, gets one
 * more suffix (`_2`, `+dup<id>-2`, a higher count) until it is free.
 */
export const planRewrites = (
  groups: DuplicateGroup[],
  rule: RewriteRule,
  values: Map<number, string>,
  taken: Set<string> = new Set()
): Array<{ id: number; value: string }> => {
  const claimed = new Set(taken);

  return groups.flatMap((group) =>
    group.rewrite.map((id, position) => ({
      id,
      value: rewrite(rule, id, values.get(id) ?? '', position, claimed),
    }))
  );
};

/** 0: confirmed and not blocked, 1: confirmed, 2: the rest */
export const trustRank = (row: { confirmed?: boolean; blocked?: boolean }): number => {
  if (row.confirmed !== true) {
    return 2;
  }

  return row.blocked === true ? 1 : 0;
};

/**
 * Rows grouped by `g`, the group the database put them in (its lowest id): the database's own
 * comparison decides what repeats, so no value is compared here. The row that keeps the value is the most
 * trusted (confirmed and not blocked, then confirmed, then the rest), the oldest within a rank;
 * the others follow in that order. Rows with no trust columns rank alike, so the oldest keeps.
 */
export const groupDuplicates = (
  rows: Array<{ id: number; g: number; confirmed?: boolean; blocked?: boolean }>
): DuplicateGroup[] => {
  const groups = new Map<number, typeof rows>();

  for (const row of rows) {
    groups.set(row.g, [...(groups.get(row.g) ?? []), row]);
  }

  return [...groups.values()]
    .map((members) =>
      [...members].sort((a, b) => trustRank(a) - trustRank(b) || a.id - b.id).map(({ id }) => id)
    )
    .map(([keep, ...rest]) => ({ keep, rewrite: rest }))
    .sort((a, b) => a.keep - b.keep);
};
