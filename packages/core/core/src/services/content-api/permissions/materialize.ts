import type { UID } from '@strapi/types';

import type { ContentApiPermission, MaterializedPermission } from './types';

/**
 * A row whose fields list is empty (`fields: []`) grants nothing: neither its route scope nor a
 * data rule. It is still a held row (see `materialize`), so its action on its type is denied rather
 * than left route-level only. `null` or no list at all means every field.
 */
export const grantsNothing = (permission: ContentApiPermission): boolean => {
  const fields = permission.properties?.fields;

  return Array.isArray(fields) && fields.length === 0;
};

/**
 * The text before the last `.` of an action, which names the content type whose controller owns it
 * when one is registered under that uid: `api::note.note` for `api::note.note.find`. Null when the
 * action has no `.` to cut at.
 */
export const contentTypeUidOfAction = (action: string): string | null => {
  const end = action.lastIndexOf('.');

  return end > 0 ? action.slice(0, end) : null;
};

/**
 * The content type whose controller owns `action`: the text before its last `.`, when that is a
 * content type uid. `api::note.note.find` gives `api::note.note`; `plugin::end-users.me.find` and
 * `api::search.search.find` give null when no such content type exists.
 */
export const contentTypeOfAction = (
  contentTypes: object,
  action: string
): UID.ContentType | null => {
  const uid = contentTypeUidOfAction(action);

  if (uid === null) {
    return null;
  }

  return Object.prototype.hasOwnProperty.call(contentTypes, uid) ? (uid as UID.ContentType) : null;
};

/** The action without its content type: `api::note.note.find` on `api::note.note` is `find`. */
export const toDataAction = (action: string, subject: string): string =>
  action.slice(subject.length + 1);

export interface Materialized {
  /** Every row the caller holds that belongs to a content type, under that content type */
  rules: MaterializedPermission[];
  /** The held rows that may give a data rule: those stored under their action's own content type */
  grants: MaterializedPermission[];
}

/**
 * Resolves each row's subject and gives it its data action.
 *
 * A row stored with `subject: null` (as the first version of the end-users plugin stored every row) takes the
 * content type of its action.
 *
 * A row whose action belongs to no content type (a custom route) is route-only: it is left out of
 * both lists and only opens its route.
 *
 * A row stored under another content type than its action's is held under its action's content
 * type with its conditions and field limits, but is not in `grants`: it gives no data rule, so the
 * caller is denied there. Dropping it instead would leave the pair route-level only, and the limits
 * the row carries would vanish.
 *
 * A row with no fields (`grantsNothing`) is held the same way, so the caller is denied there, and for
 * the same reason: dropping it would leave the pair route-level only, every field open.
 *
 * Lists and params are copied, so nothing that reads the result can change the caller's rows.
 */
export const materialize = (
  permissions: ContentApiPermission[],
  subjectOf: (action: string) => string | null
): Materialized => {
  const rules: MaterializedPermission[] = [];
  const grants: MaterializedPermission[] = [];

  for (const permission of permissions) {
    const { action, origin } = permission;
    // Rows read back from JSON carry null for what they leave out
    const properties = permission.properties ?? {};
    const conditions = permission.conditions ?? [];
    const owner = subjectOf(action);

    if (owner === null) {
      continue;
    }

    const rule: MaterializedPermission = {
      action,
      dataAction: toDataAction(action, owner),
      subject: owner,
      fields: properties.fields ? [...properties.fields] : null,
      locales: properties.locales ? [...properties.locales] : null,
      populateDepth: properties.populateDepth ?? null,
      conditions: conditions.map(({ name, params }) => ({ name, params: { ...params } })),
      ...(origin ? { origin: { ...origin } } : {}),
    };

    rules.push(rule);

    if ((permission.subject ?? owner) === owner && !grantsNothing(permission)) {
      grants.push(rule);
    }
  }

  return { rules, grants };
};
