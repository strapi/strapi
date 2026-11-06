import { isEqual } from 'lodash';
import { deniesAll } from '@strapi/utils';
import type { ConditionalFields, ExplainEntry, FieldRules, PermissionChecker } from '@strapi/utils';

import { applyCondition } from './conditions';
import type { AppliedCondition, BoundCondition, ConditionRef } from './conditions';
import * as explain from './explain';
import { compiledPermissionsOf } from './generate-ability';
import { fromCaslQuery, toFilters } from './to-filters';
import type { CompiledPermissions, MaterializedPermission } from './types';

interface KeyedProvider {
  has(key: string): boolean;
}

export interface CheckerParams {
  providers: {
    action: KeyedProvider;
    syntheticAction: KeyedProvider;
    condition: { get(ref: ConditionRef): BoundCondition | undefined };
  };
}

type Fields = string[] | null;

/** What CASL gives for a rule of the data ability */
interface DataRule {
  fields?: string[];
  conditions?: object;
  inverted?: boolean;
}

/** A held row that gives the caller a data rule, with what each of its conditions gives */
interface Grant {
  row: MaterializedPermission;
  /** One entry per condition that holds for the caller; empty for an unconditioned row */
  applied: AppliedCondition[];
}

/** Data actions no caller has without a row of its own, even on a route it may call */
const OWN_ROW_ACTIONS = new Set(['read-drafts', 'publish']);

/** What every answer is for a caller whose ability carries no data rules: what it gets today */
const unrestricted = (): FieldRules => ({ always: null, conditional: [] });

/** Nothing readable or writable */
const denied = (): FieldRules => ({ always: [], conditional: [] });

/** The union of field lists. null, every field, wins */
const unionFields = (lists: Fields[]): Fields => {
  if (lists.some((fields) => fields === null)) {
    return null;
  }

  return [...new Set((lists as string[][]).flat())];
};

/** Whether `fields` covers `field`, itself or through what it belongs to: `seo` covers `seo.metaTitle` */
const covers = (fields: string[], field: string) =>
  fields.some((covering) => field === covering || field.startsWith(`${covering}.`));

/** The fields of `fields` that `always` doesn't cover. null for every field */
const beyond = (fields: Fields, always: Fields): Fields => {
  if (always === null) {
    return [];
  }

  if (fields === null) {
    return null;
  }

  return fields.filter((field) => !covers(always, field));
};

const heldRows = (compiled: CompiledPermissions, action: string, uid: string) =>
  compiled.rules.filter((row) => row.dataAction === action && row.subject === uid);

/**
 * The action whose rows say what `action` may read: a `findOne` reads the `find` rows when the
 * caller holds no `findOne` row, so a write response never shows a field `find` hides.
 */
const rowsActionFor = (compiled: CompiledPermissions, action: string, uid: string) =>
  action === 'findOne' && heldRows(compiled, 'findOne', uid).length === 0 ? 'find' : action;

/**
 * Answers the Content API sanitizers' and validators' questions from `auth.ability[DATA_ABILITY]`.
 *
 * Rows the caller holds for (data action, uid):
 * - none: route-level only. No filter, every field, no populate limit. `read-drafts` and `publish`
 *   are the exception: without a row of their own they are not allowed.
 * - some, none of which gives a data rule (every condition fails, the action is not registered, or
 *   the row is stored under another content type): denied. The deny filter, no field, no populate.
 * - some that give data rules: those rules decide.
 *
 * Fields are per entry: the rows that restrict no entry give every entry their fields, and each
 * conditioned row adds its fields only to the entries its condition matches (`fieldsFor`).
 *
 * A caller whose ability carries no data rules (API tokens, Users & Permissions) is inactive: it gets
 * what it gets today from every answer, and the sanitizers ask it nothing else.
 */
export const createPermissionChecker = ({ providers }: CheckerParams): PermissionChecker => {
  const isDataAction = (action: string) =>
    providers.action.has(action) || providers.syntheticAction.has(action);

  /**
   * The caller's compiled rows, null for an inactive caller. Every answer that reads them goes
   * through here, which is what tells explain mode that a check ran: a custom route that never asks
   * keeps its route-level permission only.
   */
  const compiledFor = (auth: unknown): CompiledPermissions | null => {
    const compiled = compiledPermissionsOf(auth);

    if (compiled !== null) {
      explain.markChecked(compiled);
    }

    return compiled;
  };

  /**
   * Fills in what the sanitizers can't know about an entry: which of the caller's roles hold the
   * rows that decided, and the names of the conditions on those rows. Never a parameter, and never
   * a role the caller doesn't hold: the rows are the caller's own.
   */
  const complete = (compiled: CompiledPermissions, entry: ExplainEntry): ExplainEntry => {
    if (entry.kind !== 'field-removed' && entry.kind !== 'condition-applied') {
      return entry;
    }

    // A `findOne` reads the `find` rows when the caller holds no `findOne` row
    const rows = heldRows(compiled, rowsActionFor(compiled, entry.action, entry.uid), entry.uid);
    const roles = [...new Set(rows.flatMap(({ origin }) => (origin?.role ? [origin.role] : [])))];

    if (entry.kind === 'field-removed') {
      return { ...entry, roles };
    }

    const conditions = [...new Set(rows.flatMap((row) => row.conditions.map(({ name }) => name)))];

    return { ...entry, conditions, roles };
  };

  /**
   * The held rows that give the caller a data rule, with their conditions applied: the same rows the
   * data ability was built from. `applyCondition` runs `stamp` and `lockedFields` only for a
   * condition that holds, so never for Public.
   */
  const grantsFor = (compiled: CompiledPermissions, action: string, uid: string): Grant[] => {
    const grants = new Set(compiled.grants);
    const now = new Date();

    return heldRows(compiled, action, uid).flatMap((row): Grant[] => {
      if (!grants.has(row) || !isDataAction(row.action)) {
        return [];
      }

      if (row.conditions.length === 0) {
        return [{ row, applied: [] }];
      }

      const applied = row.conditions
        .map((ref) =>
          applyCondition(providers.condition.get(ref), { user: compiled.user, uid, now })
        )
        .filter((result): result is AppliedCondition => result !== false);

      return applied.length === 0 ? [] : [{ row, applied }];
    });
  };

  const filtersFor: PermissionChecker['filtersFor'] = (auth, action, uid) => {
    const compiled = compiledFor(auth);

    if (compiled === null) {
      return {};
    }

    if (heldRows(compiled, action, uid).length === 0) {
      return OWN_ROW_ACTIONS.has(action) ? null : {};
    }

    return toFilters(auth, action, uid);
  };

  /**
   * Read from the rules of the data ability, so a conditioned row counts exactly as `filtersFor`
   * counts it. A rule without conditions (an unconditioned row, or one whose condition holds with no
   * filter) gives every entry its fields; a conditioned one gives them to the entries its condition
   * matches. A create has no stored entry to match: every rule of a create counts for it.
   */
  const fieldsFor: PermissionChecker['fieldsFor'] = (auth, action, uid) => {
    const compiled = compiledFor(auth);

    if (compiled === null) {
      return unrestricted();
    }

    const rowsAction = rowsActionFor(compiled, action, uid);

    if (heldRows(compiled, rowsAction, uid).length === 0) {
      return unrestricted();
    }

    // CASL lists the latest rule first: read them in the order of the rows
    const rules = [...(compiled.ability.rulesFor(rowsAction, uid) as DataRule[])].reverse();

    if (rules.length === 0 || rules.some((rule) => rule.inverted)) {
      return denied();
    }

    const fieldsOf = (rule: DataRule): Fields => (rule.fields ? [...rule.fields] : null);

    if (rowsAction === 'create') {
      return { always: unionFields(rules.map(fieldsOf)), conditional: [] };
    }

    const open = rules.filter((rule) => !rule.conditions);
    const always = open.length > 0 ? unionFields(open.map(fieldsOf)) : [];
    const conditional: ConditionalFields[] = [];

    for (const rule of rules) {
      if (!rule.conditions) {
        continue;
      }

      const fields = beyond(fieldsOf(rule), always);

      if (fields !== null && fields.length === 0) {
        continue;
      }

      // With the uid, so a condition on a password, dynamic zone or morph relation is denied here
      // as it is in `filtersFor`
      const filter = fromCaslQuery({ $or: [rule.conditions] }, uid);

      // A condition whose filter can't be written matches no entry: its fields go to none
      if (deniesAll(filter)) {
        continue;
      }

      const group = conditional.find((existing) => isEqual(existing.filter, filter));

      if (group) {
        group.fields = unionFields([group.fields, fields]);
      } else {
        conditional.push({ filter: filter as Record<string, unknown>, fields });
      }
    }

    return { always, conditional };
  };

  return {
    isActive: (auth) => compiledPermissionsOf(auth) !== null,

    filtersFor,

    // A yes/no from the held rows and their filter, never from `!== null` alone: the filter may be
    // the deny filter
    canReadDrafts(auth, uid) {
      const compiled = compiledFor(auth);

      if (compiled === null) {
        return true;
      }

      return (
        heldRows(compiled, 'read-drafts', uid).length > 0 &&
        !deniesAll(toFilters(auth, 'read-drafts', uid))
      );
    },

    fieldsFor,

    readableFields: (auth, action, uid) => fieldsFor(auth, action, uid).always,

    writableFields: (auth, action, uid) => fieldsFor(auth, action, uid).always,

    /**
     * The union of the locked fields of every condition that holds on the update rows; none when an
     * update row has no condition, since that row lets the caller update every entry freely.
     */
    lockedFields(auth, uid) {
      const compiled = compiledFor(auth);

      if (compiled === null) {
        return [];
      }

      const grants = grantsFor(compiled, 'update', uid);

      if (grants.some(({ row }) => row.conditions.length === 0)) {
        return [];
      }

      return [
        ...new Set(grants.flatMap(({ applied }) => applied.flatMap((a) => a.lockedFields ?? []))),
      ];
    },

    /** The stamps of every condition that holds on the create rows, merged in row order */
    stampFor(auth, uid) {
      const compiled = compiledFor(auth);

      if (compiled === null) {
        return {};
      }

      return Object.assign(
        {},
        ...grantsFor(compiled, 'create', uid).flatMap(({ applied }) =>
          applied.map((a) => a.stamp ?? {})
        )
      );
    },

    /** The largest depth of the rows that give a data rule; `findOne` reads `find` as fields do */
    populateDepth(auth, action, uid) {
      const compiled = compiledFor(auth);

      if (compiled === null) {
        return null;
      }

      const rowsAction = rowsActionFor(compiled, action, uid);

      if (heldRows(compiled, rowsAction, uid).length === 0) {
        return null;
      }

      const depths = grantsFor(compiled, rowsAction, uid).map(({ row }) => row.populateDepth);

      if (depths.length === 0) {
        return 0;
      }

      return depths.some((depth) => depth === null) ? null : Math.max(...(depths as number[]));
    },

    /**
     * Routes the note to the request's collector. A caller that is not active has no story to tell,
     * and nothing here may throw: explain mode never changes what a request does.
     */
    record(auth, entry) {
      const compiled = compiledPermissionsOf(auth);

      if (compiled === null) {
        return;
      }

      try {
        explain.record(compiled, entry, (recorded) => complete(compiled, recorded));
      } catch {
        // Explain is a development aid: a failure to describe a check must not fail it
      }
    },
  };
};
