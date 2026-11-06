import { isEmpty, isEqual, isPlainObject } from 'lodash';

/**
 * Values the Content API permission checks share between `@strapi/core`, `@strapi/utils` and
 * plugins. They live here because this package depends on no other `@strapi/*` package, so the
 * sanitizers in it can use them, and core and plugins import them from one place.
 */

/**
 * The key under which an ability built by the Content API's `generateAbility` carries its data
 * rules. A registered symbol, so the same key is found whichever copy of a package built or reads
 * the ability. `@strapi/types` declares its type only.
 */
export const DATA_ABILITY: unique symbol = Symbol.for('strapi.content-api.data-ability');

/**
 * A filter no entry matches: every entry has an id. What a caller gets for an action and content
 * type it holds a row for when none of that row's conditions holds.
 *
 * Frozen: it is shared, and a caller that merged its own filters into it would change what every
 * later denial matches. {@link withDeny} hands out copies.
 */
export const DENY_ALL_FILTER: { readonly id: { readonly $null: true } } = Object.freeze({
  id: Object.freeze({ $null: true as const }),
});

/**
 * The filters to apply for a `toFilters` result: the filters themselves, or a fresh copy of
 * {@link DENY_ALL_FILTER} when there is no rule (`null`). Anything that is not a plain object
 * denies too: a list, a class instance, a string.
 */
export const withDeny = (filters: Record<string, unknown> | null): Record<string, unknown> => {
  if (isPlainObject(filters)) {
    return filters as Record<string, unknown>;
  }

  return { id: { $null: true } };
};

/**
 * Whether the filters of a `toFilters` / `filtersFor` result match no entry: no rule at all (`null`),
 * or the deny filter, whether it is {@link DENY_ALL_FILTER}, a copy from {@link withDeny} or one
 * written out. Anything that is not a plain object counts too, as {@link withDeny} turns it into the
 * deny filter: `deniesAll(filters)` is whether `withDeny(filters)` is the deny filter.
 *
 * `false` means the filter may match entries, not that it does: a filter that is narrower than the
 * deny filter and not equal to it is `false`.
 */
export const deniesAll = (filters: Record<string, unknown> | null): boolean =>
  !isPlainObject(filters) || isEqual(filters, DENY_ALL_FILTER);

/**
 * Whether a `filtersFor` answer restricts entries: anything but `{}` (a plain empty object).
 * `null`, the deny filter and every condition restrict.
 */
export const restrictsEntries = (filters: unknown): boolean =>
  !(isPlainObject(filters) && isEmpty(filters));

/**
 * What a permission check did to a request, for explain mode: a field or relation it removed, a
 * condition it applied, a part of the query it narrowed, a draft status it removed or a write it
 * turned into a draft, or a route that ran with route-level permission only.
 *
 * `roles` and `conditions` name the caller's own roles and the conditions of their rows, never
 * their parameters. The sanitizers only see the filter, so they record both empty and the checker
 * fills them in.
 */
export type ExplainEntry =
  | { kind: 'field-removed'; uid: string; action: string; path: string; roles: string[] }
  | { kind: 'relation-removed'; uid: string; path: string; target: string }
  | {
      kind: 'query-narrowed';
      uid: string;
      at: 'sort' | 'filter' | 'populate';
      path?: string;
      /** The type whose restriction narrowed it, when the query names one */
      target?: string;
      /**
       * `sort-dropped`: a sort through a relation to a type the caller can't read in full;
       * `not-replaced`: a `$not` over such a relation, which now matches nothing;
       * `morph-left-out`: a type left out of a morph relation's populate count;
       * `populate-removed`: a populate the query layer would have loaded unfiltered
       */
      reason: 'sort-dropped' | 'not-replaced' | 'morph-left-out' | 'populate-removed';
    }
  | {
      kind: 'condition-applied';
      uid: string;
      action: string;
      at: 'root' | 'populate' | 'filter';
      path?: string;
      conditions: string[];
      roles: string[];
    }
  | { kind: 'draft-status-removed' | 'write-as-draft'; uid: string }
  | { kind: 'route-only'; route: string };

/**
 * The fields some entries get on top of {@link FieldRules.always}: those of the caller's
 * conditioned rows whose `filter` they match.
 */
export interface ConditionalFields {
  /** The resolved condition filter (Strapi query syntax) an entry must match. Never sanitize it */
  filter: Record<string, unknown>;
  /** The fields added beyond `always`; null for every field */
  fields: string[] | null;
}

/**
 * The fields of a content type the caller may read or write, entry by entry.
 *
 * An entry gets `always`, plus the `fields` of each `conditional` group whose `filter` it matches.
 * When `conditional` is empty, every entry gets `always`.
 *
 * `always` is `[]` exactly when no rule is unconditioned (a row with an empty field list grants
 * nothing, so an unconditioned rule always brings a field or every field; a create has no entry to
 * match, so all of its rules count as unconditioned). `{ always: [], conditional: [] }` therefore
 * means deny: no rule gives any entry any field. It is not "no restriction", which is
 * `{ always: null, conditional: [] }`. A consumer that intersects the groups (the fields every
 * entry has in common, say) must read zero groups with `always: []` as no field too: an
 * intersection over no groups is every field by convention, but here `always` is the union of the
 * unconditioned rules' fields, so `[]` is none.
 */
export interface FieldRules {
  /** The fields of the rows that restrict no entry. null for every field, [] for none */
  always: string[] | null;
  /** One group per condition filter that adds fields beyond `always` */
  conditional: ConditionalFields[];
}

/**
 * The questions the Content API sanitizers and validators ask about a caller's data rules.
 *
 * `action` is the short data action (`find`, `findOne`, `create`, `update`, `delete`,
 * `read-drafts`, `publish`) and `uid` the content type.
 *
 * A checker is active only for an ability built by the Content API's `generateAbility`. For any
 * other caller (API tokens, Users & Permissions, no auth) `isActive` is false and every answer is
 * what those callers get today: no filter, every field, no populate limit, nothing locked or
 * stamped, drafts readable as the route allows. Every subject-aware step asks `isActive` first.
 *
 * A (data action, uid) the caller holds no row for is route-level only: no filter, every field, no
 * populate limit, except `read-drafts` and `publish`, which need their own row. A held row that
 * gives the caller no data rule (its conditions all fail, its action is not registered, or it is
 * stored under another content type) denies.
 */
export interface PermissionChecker {
  /** Whether the caller's ability carries data rules */
  isActive(auth: unknown): boolean;
  /**
   * The filters the caller's rows give: `{}` for no restriction, `null` for none at all (apply
   * `withDeny`). Never pass them through `sanitize.query`: `$and` them after the caller's own
   * filters are sanitized. Not a yes/no answer: a non-null result may still deny every entry
   */
  filtersFor(auth: unknown, action: string, uid: string): Record<string, unknown> | null;
  /** Whether the caller holds a `read-drafts` row on `uid` that allows some entry */
  canReadDrafts(auth: unknown, uid: string): boolean;
  /**
   * The readable (`find`, `findOne`) or writable (`create`, `update`) fields, entry by entry.
   * `findOne` reads the `find` rows when the caller holds no `findOne` row. A create has no stored
   * entry to match, so its fields are all in `always`
   */
  fieldsFor(auth: unknown, action: string, uid: string): FieldRules;
  /** `fieldsFor(...).always`: the fields every entry gets. null for every field */
  readableFields(auth: unknown, action: string, uid: string): string[] | null;
  /** `fieldsFor(...).always` for `create` or `update`. null for every field */
  writableFields(auth: unknown, action: 'create' | 'update', uid: string): string[] | null;
  /** The fields an update may not change */
  lockedFields(auth: unknown, uid: string): string[];
  /** The data a create is forced to carry (set owner) */
  stampFor(auth: unknown, uid: string): Record<string, unknown>;
  /** The deepest populate allowed. null for no limit */
  populateDepth(auth: unknown, action: string, uid: string): number | null;
  /**
   * Notes what a check did, for explain mode. Never throws and changes no answer. For a caller that
   * is not active it does nothing
   */
  record(auth: unknown, entry: ExplainEntry): void;
}

/**
 * The action whose rules decide what a response may show: `findOne` for `findOne`, `create` and
 * `update` responses, `find` for everything else, custom routes included.
 */
export const readActionFor = (action: string | undefined): 'find' | 'findOne' =>
  action === 'findOne' || action === 'create' || action === 'update' ? 'findOne' : 'find';

/**
 * The action whose rules narrow the root of a request's query: `update` and `delete` by their own
 * rules (the query picks the entries the write changes), every other action by
 * {@link readActionFor}.
 */
export const queryActionFor = (
  action: string | undefined
): 'find' | 'findOne' | 'update' | 'delete' =>
  action === 'update' || action === 'delete' ? action : readActionFor(action);

/**
 * Whether reading a type through a relation is restricted for the caller: its `find` filters
 * restrict entries ({@link restrictsEntries}). Each uid is asked once for the life of the returned
 * function, so make one per request.
 */
export const createRelationRestriction = (
  checker: PermissionChecker,
  auth: unknown
): ((uid: string) => boolean) => {
  const answers = new Map<string, boolean>();

  return (uid) => {
    let answer = answers.get(uid);

    if (answer === undefined) {
      answer = restrictsEntries(checker.filtersFor(auth, 'find', uid));
      answers.set(uid, answer);
    }

    return answer;
  };
};
