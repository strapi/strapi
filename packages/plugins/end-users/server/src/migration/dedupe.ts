import type { DuplicateGroup } from './snapshot';

export type RewriteRule = 'email' | 'username' | 'role';

const REWRITTEN_DOMAIN = 'users.invalid';

const rewrite = (rule: RewriteRule, id: number, value: string, position: number): string => {
  if (rule === 'email') {
    const at = value.lastIndexOf('@');
    const local = (at === -1 ? value : value.slice(0, at)).toLowerCase();

    return `${local}+dup${id}@${REWRITTEN_DOMAIN}`;
  }

  if (rule === 'username') {
    return `${value.toLowerCase()}_${id}`;
  }

  // The first name keeps its spelling; the next ones count up from 2
  return `${value} (${position + 2})`;
};

/**
 * What each row a group rewrites becomes. The oldest row of a group is kept as it is; the others
 * get a value of their own, built from the value they hold (`values`, by id):
 * - `email`: `<local>+dup<id>@users.invalid`, in lower case;
 * - `username`: `<name>_<id>`, in lower case;
 * - `role`: `<name> (2)`, `<name> (3)`, in the order of the group.
 */
export const planRewrites = (
  groups: DuplicateGroup[],
  rule: RewriteRule,
  values: Map<number, string>
): Array<{ id: number; value: string }> =>
  groups.flatMap((group) =>
    group.rewrite.map((id, position) => ({
      id,
      value: rewrite(rule, id, values.get(id) ?? '', position),
    }))
  );

/** Rows grouped by the lower-cased value they repeat: the oldest id is kept, the rest rewritten */
export const groupDuplicates = (rows: Array<{ id: number; k: string }>): DuplicateGroup[] => {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    groups.set(row.k, [...(groups.get(row.k) ?? []), row.id]);
  }

  return [...groups.values()]
    .map((ids) => [...ids].sort((a, b) => a - b))
    .map(([keep, ...rest]) => ({ keep, rewrite: rest }))
    .sort((a, b) => a.keep - b.keep);
};
