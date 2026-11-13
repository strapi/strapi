import type { Modules } from '@strapi/types';

import { compiledPermissionsOf } from './generate-ability';

/** Plain code-unit order, the same order `Array.prototype.sort` gives strings by default. */
const byCodeUnit = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

type PermissionsDescription = Modules.ContentAPI.PermissionsDescription;
type Described = PermissionsDescription['subjects'][string][string];

/** The actions the route ability allows, once each and sorted */
const routesOf = (auth: unknown): string[] => {
  const ability = (auth as { ability?: { rules?: unknown } } | null | undefined)?.ability;
  const rules = Array.isArray(ability?.rules) ? (ability.rules as unknown[]) : [];
  const routes = new Set<string>();

  for (const rule of rules) {
    const { action, inverted } = (rule ?? {}) as { action?: unknown; inverted?: boolean };

    if (inverted) {
      continue;
    }

    for (const name of Array.isArray(action) ? action : [action]) {
      if (typeof name === 'string') {
        routes.add(name);
      }
    }
  }

  return [...routes].sort(byCodeUnit);
};

const unique = (values: string[]) => [...new Set(values)];

/**
 * The route scopes and data rows the caller holds, combined across its roles, for a front end:
 * per content type and data action, the union of the fields (null when a row covers every field),
 * every condition named and the largest populate depth (null when a row has no limit).
 *
 * It lists what is held, conditions included, not what a condition lets through for this caller:
 * that is decided per request. A caller whose ability carries no data rules (an API token) has no
 * subjects.
 */
export const describePermissions = (auth: unknown): PermissionsDescription => {
  // Maps, so a uid or action named like an `Object.prototype` key is an ordinary key
  const subjects = new Map<string, Map<string, Described>>();

  for (const row of compiledPermissionsOf(auth)?.rules ?? []) {
    const actions = subjects.get(row.subject) ?? new Map<string, Described>();
    const held = actions.get(row.dataAction);
    const conditions = row.conditions.map(({ name }) => name);

    subjects.set(row.subject, actions);

    if (held === undefined) {
      actions.set(row.dataAction, {
        fields: row.fields === null ? null : unique(row.fields),
        conditions: unique(conditions),
        populateDepth: row.populateDepth,
      });

      continue;
    }

    held.fields =
      held.fields === null || row.fields === null ? null : unique([...held.fields, ...row.fields]);
    held.conditions = unique([...held.conditions, ...conditions]);
    held.populateDepth =
      held.populateDepth === null || row.populateDepth === null
        ? null
        : Math.max(held.populateDepth, row.populateDepth);
  }

  return {
    routes: routesOf(auth),
    subjects: Object.fromEntries(
      [...subjects].map(([uid, actions]) => [uid, Object.fromEntries(actions)])
    ),
  };
};
