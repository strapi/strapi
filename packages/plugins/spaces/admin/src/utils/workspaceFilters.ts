/**
 * The Content Manager keeps its list-view query in the URL **and** mirrors the
 * `sort` / `filters` / `pageSize` parts into `localStorage` under
 * `STRAPI_LIST_VIEW_SETTINGS:<uid>`, rehydrating them on every visit to that
 * list (`usePersistentPartialQueryParams` in `ListViewPage`).
 *
 * The "Workspace" filter is offered in the default workspace only — it narrows
 * the superset view, and means nothing anywhere else. Left alone, one set in
 * default follows the admin into every other workspace: the list comes back
 * empty (or hides the shared entries), and the chip that would remove it is not
 * rendered outside default, so the only way out is editing the address bar.
 * Clearing the URL alone is not enough either; the persisted copy puts it
 * straight back.
 *
 * So a workspace switch drops the workspace filter from both places.
 */

/**
 * The admin serialises filters as `filters[$and][<n>][space][slug][$eq]=acme`
 * (`qs` bracket notation), so a clause is recognised by its key.
 */
const WORKSPACE_FILTER_KEY = /^filters(\[[^\]]*\])*\[space\](\[|$)/;

export const isWorkspaceFilterKey = (key: string): boolean => WORKSPACE_FILTER_KEY.test(key);

/**
 * Returns `search` without its workspace filter clauses, or `null` when there
 * was nothing to remove (so callers can skip a pointless navigation).
 *
 * Emptied `$and` slots are left as they are: `qs` re-indexes them on parse and
 * the Content Manager tolerates the gaps, whereas renumbering would risk
 * colliding with the filters the user set on other fields.
 */
export const stripWorkspaceFilters = (search: string): string | null => {
  const params = new URLSearchParams(search);
  const doomed = [...params.keys()].filter(isWorkspaceFilterKey);

  if (doomed.length === 0) {
    return null;
  }

  doomed.forEach((key) => params.delete(key));

  const next = params.toString();
  return next.length > 0 ? `?${next}` : '';
};

const LIST_VIEW_SETTINGS_KEY = 'STRAPI_LIST_VIEW_SETTINGS';

interface PersistedListSettings {
  filters?: { $and?: unknown[] };
  [key: string]: unknown;
}

const isWorkspaceClause = (clause: unknown): boolean =>
  typeof clause === 'object' && clause !== null && 'space' in (clause as Record<string, unknown>);

/**
 * Drops the workspace filter from every persisted list-view query, so the next
 * visit to a list does not rehydrate it. Returns the uids it changed (for
 * tests); a malformed or unreadable entry is skipped rather than thrown on.
 */
export const purgePersistedWorkspaceFilters = (
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { length?: number } = getStorage()
): string[] => {
  const touched: string[] = [];
  let keys: string[];

  try {
    keys = Object.keys(storage as unknown as Record<string, unknown>);
  } catch {
    return touched;
  }

  for (const key of keys) {
    if (!key.startsWith(LIST_VIEW_SETTINGS_KEY)) {
      continue;
    }

    let settings: PersistedListSettings;
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        continue;
      }
      settings = JSON.parse(raw) as PersistedListSettings;
    } catch {
      continue;
    }

    const clauses = settings?.filters?.$and;
    if (!Array.isArray(clauses)) {
      continue;
    }

    const kept = clauses.filter((clause) => !isWorkspaceClause(clause));
    if (kept.length === clauses.length) {
      continue;
    }

    if (kept.length === 0) {
      delete settings.filters;
    } else {
      settings.filters = { ...settings.filters, $and: kept };
    }

    try {
      if (Object.keys(settings).length === 0) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, JSON.stringify(settings));
      }
      touched.push(key);
    } catch {
      // Storage unavailable (private browsing): the URL strip still applies.
    }
  }

  return touched;
};

function getStorage(): Storage {
  return window.localStorage;
}
