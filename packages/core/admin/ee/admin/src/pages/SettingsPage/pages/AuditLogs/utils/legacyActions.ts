/**
 * Admin-account rows stored before the `admin-user.*` events kept their old action keys
 * and stay until retention removes them. The Action filter offers the new key only and
 * queries both, so one option covers the whole history.
 *
 * Remove together with the deprecated `user.*` event hub events.
 */
export const LEGACY_ACTIONS: Record<string, string> = {
  'admin-user.create': 'user.create',
  'admin-user.update': 'user.update',
  'admin-user.delete': 'user.delete',
};

const LEGACY_KEYS = new Set(Object.values(LEGACY_ACTIONS));

export const isLegacyAction = (action: string) => LEGACY_KEYS.has(action);

type Condition = Record<string, unknown>;

const expandActionCondition = (condition: Condition): Condition => {
  const { $eq, $ne, ...rest } = condition;

  if (typeof $eq === 'string' && LEGACY_ACTIONS[$eq]) {
    return { ...rest, $in: [$eq, LEGACY_ACTIONS[$eq]] };
  }

  if (typeof $ne === 'string' && LEGACY_ACTIONS[$ne]) {
    return { ...rest, $notIn: [$ne, LEGACY_ACTIONS[$ne]] };
  }

  return condition;
};

/**
 * Rewrites `action` equality conditions on a new key into `$in` / `$notIn` over the new
 * and the legacy key. Walks `$and`, `$or` and `$not`. Anything else is returned as is.
 */
export const expandLegacyActionFilters = <T>(filters: T): T => {
  if (Array.isArray(filters)) {
    return filters.map(expandLegacyActionFilters) as T;
  }

  if (!filters || typeof filters !== 'object') {
    return filters;
  }

  const expanded: Condition = {};

  for (const [key, value] of Object.entries(filters as Condition)) {
    if (key === 'action' && value && typeof value === 'object' && !Array.isArray(value)) {
      expanded[key] = expandActionCondition(value as Condition);
    } else if (key === '$and' || key === '$or' || key === '$not') {
      expanded[key] = expandLegacyActionFilters(value);
    } else {
      expanded[key] = value;
    }
  }

  return expanded as T;
};
