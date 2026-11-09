/**
 * What the role editor shows and saves: the plugin's permission layout and a role's stored rows
 * mapped to the layout and rows of `@strapi/admin`'s `Permissions` editor, back again, and the
 * differences between two states of a role. Pure functions: no React, no requests.
 *
 * The editor is the admin's RBAC editor with opt-in props, so it speaks the admin's language:
 * a column is a data action (`find`), a row is `{ action, subject, properties }` and conditions
 * are its own. The plugin keeps its conditions and populate depth in a Settings modal, because a
 * Content API condition carries params, so the layout the editor gets lists none (`conditions: []`)
 * and the rows it reports carry none. They travel in `SubjectSettings` beside the rows.
 *
 * A stored row is never rewritten by loading and saving a role: a row the admin did not change is
 * handed back exactly as it was stored, and a row the editor cannot show (a refused
 * row, one the layout lacks, one that lists no field) is kept as stored until it is removed. A row
 * stored with `fields: null` (or no `fields`), which grants every field, including fields added
 * later, is shown with every field ticked, and becomes an explicit list once a cell changes.
 */
import { DATA_ACTIONS, FIELD_ACTIONS } from '../../../../../shared/contracts/permissions';

import type {
  ConditionRef,
  DataAction,
  LayoutCondition,
  LayoutContentType,
  LayoutField,
  LayoutRoute,
  PermissionLayout,
  PermissionRow,
  RolePermission,
} from '../../../../../shared/contracts/permissions';
import type { PermissionDiff, PermissionProblem } from '../../../../../shared/contracts/roles';
import type { PermissionsLayout, PermissionsRow } from '@strapi/admin/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

/** What the Settings modal of a content type holds, and the editor does not */
interface SubjectSettings {
  /** Written to every row of the type; `'mixed'` when its rows differ, which leaves them as stored */
  populateDepth: number | null | 'mixed';
  /** The conditions of each action, ORed: an entry matches when it meets any of them */
  conditions: Partial<Record<DataAction, ConditionRef[]>>;
}

interface EditorModel {
  /** What `Permissions` is drawn from */
  layout: PermissionsLayout;
  /** What `Permissions` is loaded with (its `permissions` prop) */
  rows: PermissionsRow[];
  /** By content type uid, for every content type of the layout */
  settings: Record<string, SubjectSettings>;
  /**
   * The stored rows the editor does not show: those a `problems` entry names, and those whose
   * action and subject the layout lacks. Saving never touches them unless asked to remove them.
   */
  stale: RolePermission[];
}

interface RoleSnapshot {
  name: string;
  description: string | null;
  requireTwoFactor: boolean;
  rows: PermissionRow[];
}

interface ChangeGroup {
  group: string;
  changes: Array<{
    label: string;
    from?: string;
    to?: string;
    added?: string[];
    removed?: string[];
  }>;
}

type ContentSection = PermissionsLayout['sections']['collectionTypes'];
type EditorSubject = ContentSection['subjects'][number];
type EditorProperty = EditorSubject['properties'][number];

/* -------------------------------------------------------------------------------------------------
 * Copy and constants
 * -----------------------------------------------------------------------------------------------*/

const ACTION_LABELS: Record<DataAction, string> = {
  find: 'Find',
  findOne: 'Find one',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  'read-drafts': 'Read drafts',
  publish: 'Publish',
};

const LOCKED_NOTE = 'Hidden from responses. This editor never makes it writable.';

/** The actions that write fields: the ones an engine-owned field is off under */
const WRITE_ACTIONS: DataAction[] = ['create', 'update'];

const ALL_FIELDS_TEXT = 'every field, including future ones';

const EMPTY_SETTINGS: SubjectSettings = { populateDepth: null, conditions: {} };

const isFieldAction = (action: DataAction) => FIELD_ACTIONS.includes(action);

/* -------------------------------------------------------------------------------------------------
 * Plain helpers
 * -----------------------------------------------------------------------------------------------*/

/** A copy made of new objects: rows are JSON, and `structuredClone` is not everywhere tests run */
const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const sortedUnique = (list: readonly string[]) =>
  [...new Set(list)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const sameSets = (a: readonly string[], b: readonly string[]) => {
  const left = sortedUnique(a);
  const right = sortedUnique(b);

  return left.length === right.length && left.every((item, position) => item === right[position]);
};

/** `null` (all of them) is only the same as `null`; lists are sets */
const sameLists = (a: readonly string[] | null, b: readonly string[] | null) =>
  a === null || b === null ? a === b : sameSets(a, b);

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)])
    );
  }

  return value;
};

const stable = (value: unknown) => JSON.stringify(sortKeys(value));

const toKey = (action: string, subject: string | null) => JSON.stringify([action, subject]);

/* -------------------------------------------------------------------------------------------------
 * The layout, indexed
 * -----------------------------------------------------------------------------------------------*/

interface Leaf {
  /** The path stored in a field list: 'seo.metaTitle' */
  path: string;
  /** A write action can't set it: the plugin owns it, or the schema marks it not writable */
  readOnly: boolean;
}

interface LayoutIndex {
  types: Map<string, LayoutContentType>;
  /** Stored action id to the content type and data action it is a column of */
  columns: Map<string, { uid: string; action: DataAction }>;
  /** Stored action id of a plugin's or an API's own route to the route */
  routes: Map<string, LayoutRoute>;
  /** The `(action, subject ?? owner)` of every row the editor can show */
  keys: Set<string>;
  /** The fields a role can be given, by content type: the cells of the editor's matrix */
  leaves: Map<string, Leaf[]>;
}

/** Whether no write action can set the field: the plugin's own, or one the schema doesn't let a request write */
const isReadOnly = (field: LayoutField) => field.engineOwned || field.writable === false;

/** The cells of the matrix, as the editor builds them: the fields without children */
const collectLeaves = (fields: LayoutField[], inheritedReadOnly = false): Leaf[] =>
  fields.flatMap((field) => {
    const readOnly = inheritedReadOnly || isReadOnly(field);

    return field.children
      ? collectLeaves(field.children, readOnly)
      : [{ path: field.name, readOnly }];
  });

const indexes = new WeakMap<PermissionLayout, LayoutIndex>();

/** Memoized on the layout object, which the page keeps for as long as the server runs */
const indexLayout = (layout: PermissionLayout): LayoutIndex => {
  const known = indexes.get(layout);

  if (known) {
    return known;
  }

  const index: LayoutIndex = {
    types: new Map(),
    columns: new Map(),
    routes: new Map(),
    keys: new Set(),
    leaves: new Map(),
  };

  layout.contentTypes.forEach((type) => {
    index.types.set(type.uid, type);
    index.leaves.set(type.uid, collectLeaves(type.fields));

    type.actions.forEach(({ action, actionId }) => {
      index.columns.set(actionId, { uid: type.uid, action });
      index.keys.add(toKey(actionId, type.uid));
    });
  });

  layout.groups.forEach((group) =>
    group.categories.forEach(({ routes }) =>
      routes.forEach((route) => {
        index.routes.set(route.actionId, route);
        index.keys.add(toKey(route.actionId, null));
      })
    )
  );

  indexes.set(layout, index);

  return index;
};

/** The content type whose action it is, or null for a route of a plugin or an API */
const ownerOf = (index: LayoutIndex, action: string) => index.columns.get(action)?.uid ?? null;

type Keyed = Pick<PermissionRow, 'action' | 'subject'>;

/** What a row is on, as the engine reads it: its subject, or the content type of its action */
const subjectOf = (index: LayoutIndex, { action, subject }: Keyed) =>
  subject ?? ownerOf(index, action);

const keyOf = (index: LayoutIndex, row: Keyed) => toKey(row.action, subjectOf(index, row));

/** The fields a role can set under an action: a read-only field is off for Create and Update */
const visibleLeaves = (index: LayoutIndex, uid: string, action: DataAction): string[] =>
  (index.leaves.get(uid) ?? [])
    .filter(({ readOnly }) => !(readOnly && WRITE_ACTIONS.includes(action)))
    .map(({ path }) => path);

/**
 * The cells a stored list of fields ticks: a path in it, or under one that is (listing `seo` names
 * every field of the component), in the layout's order. What the layout leaves out is not a cell.
 */
const coveredLeaves = (list: readonly string[], visible: string[]) => {
  const listed = new Set(list);

  return visible.filter((path) =>
    path
      .split('.')
      .some((_segment, position, segments) => listed.has(segments.slice(0, position + 1).join('.')))
  );
};

/**
 * The cells a stored row of an action with fields ticks: the fields it lists, and every field for
 * `null` or an absent list (what the engine grants).
 */
const tickedLeaves = (
  index: LayoutIndex,
  uid: string,
  action: DataAction,
  fields: readonly string[] | null | undefined
) => {
  const visible = visibleLeaves(index, uid, action);

  return fields == null ? visible : coveredLeaves(fields, visible);
};

/**
 * A stored row the editor shows unticked: an action with fields that has no cell the editor can
 * tick (`fields: []`, or only names it cannot show). It is left as stored unless the admin grants
 * the action.
 */
const isHidden = (index: LayoutIndex, row: PermissionRow) => {
  const column = index.columns.get(row.action);

  return (
    column !== undefined &&
    isFieldAction(column.action) &&
    tickedLeaves(index, column.uid, column.action, row.properties?.fields).length === 0
  );
};

/* -------------------------------------------------------------------------------------------------
 * The canonical comparison
 * -----------------------------------------------------------------------------------------------*/

/** The params of a condition ref with the defaults its declaration gives to the ones left out */
const filledParams = (declaration: LayoutCondition | undefined, ref: ConditionRef) => {
  const params: Record<string, unknown> = { ...ref.params };

  declaration?.params.forEach(({ name, default: value }) => {
    if (value !== undefined && params[name] === undefined) {
      params[name] = value;
    }
  });

  return params;
};

const declarationOf = (index: LayoutIndex, uid: string | null, name: string) =>
  uid === null
    ? undefined
    : index.types.get(uid)?.conditions.find((condition) => condition.name === name);

const canonicalConditions = (
  index: LayoutIndex,
  uid: string | null,
  refs: readonly ConditionRef[] | undefined
) =>
  sortedUnique(
    (refs ?? []).map((ref) =>
      stable([ref.name, filledParams(declarationOf(index, uid, ref.name), ref)])
    )
  );

const listOrNull = (list: readonly string[] | null | undefined) => (list == null ? null : list);

const samePropertiesIn = (a: PermissionRow['properties'], b: PermissionRow['properties']) =>
  sameLists(listOrNull(a?.fields), listOrNull(b?.fields)) &&
  sameLists(listOrNull(a?.locales), listOrNull(b?.locales)) &&
  (a?.populateDepth ?? null) === (b?.populateDepth ?? null);

const sameConditionsIn = (
  index: LayoutIndex,
  uid: string | null,
  a: PermissionRow,
  b: PermissionRow
) =>
  sameSets(
    canonicalConditions(index, uid, a.conditions),
    canonicalConditions(index, uid, b.conditions)
  );

const sameRowIn = (index: LayoutIndex, a: PermissionRow, b: PermissionRow) =>
  a.action === b.action &&
  subjectOf(index, a) === subjectOf(index, b) &&
  samePropertiesIn(a.properties, b.properties) &&
  sameConditionsIn(index, subjectOf(index, a), a, b);

/**
 * Whether two rows are the same permission. A missing `fields`, `locales` or `populateDepth` is the
 * same as `null`; lists are compared as sets; conditions as a set of refs whose params have their
 * declared defaults filled in; a row with no subject is on the content type of its action.
 */
const sameRow = (a: PermissionRow, b: PermissionRow, layout: PermissionLayout): boolean =>
  sameRowIn(indexLayout(layout), a, b);

/* -------------------------------------------------------------------------------------------------
 * toEditorModel
 * -----------------------------------------------------------------------------------------------*/

const toProperty = (field: LayoutField): EditorProperty => ({
  label: field.label,
  // The editor builds a field's path from its parents' values: a field is its last segment
  value: field.name.split('.').pop() ?? field.name,
  required: field.required,
  ...(isReadOnly(field) && { disabledActions: [...WRITE_ACTIONS] }),
  ...(field.children && { children: field.children.map(toProperty) }),
});

const toSubject = (type: LayoutContentType): EditorSubject => ({
  uid: type.uid,
  label: type.label,
  properties: [{ label: 'Fields', value: 'fields', children: type.fields.map(toProperty) }],
  locked: type.locked.map((label) => ({ label, note: LOCKED_NOTE })),
});

const toContentSection = (types: LayoutContentType[]): ContentSection => ({
  actions: DATA_ACTIONS.map((action) => ({
    actionId: action,
    label: ACTION_LABELS[action],
    applyToProperties: isFieldAction(action) ? ['fields'] : [],
    subjects: types
      .filter(({ actions }) => actions.some((offered) => offered.action === action))
      .map(({ uid }) => uid),
  })),
  subjects: types.map(toSubject),
});

const toEditorLayout = (layout: PermissionLayout): PermissionsLayout => ({
  conditions: [],
  sections: {
    collectionTypes: toContentSection(
      layout.contentTypes.filter(({ kind }) => kind === 'collectionType')
    ),
    singleTypes: toContentSection(layout.contentTypes.filter(({ kind }) => kind === 'singleType')),
    plugins: layout.groups
      .filter(({ kind }) => kind === 'plugin')
      .flatMap((group) =>
        group.categories.flatMap(({ label, routes }) =>
          routes.map((route) => ({
            action: route.actionId,
            displayName: route.label,
            plugin: group.id,
            subCategory: label,
          }))
        )
      ),
    settings: layout.groups
      .filter(({ kind }) => kind === 'custom')
      .flatMap((group) =>
        group.categories.flatMap(({ label, routes }) =>
          routes.map((route) => ({
            action: route.actionId,
            displayName: route.label,
            category: group.id,
            subCategory: label,
          }))
        )
      ),
  },
});

/** The row the editor is loaded with for a stored row, or nothing for one it shows unticked */
const toEditorRow = (index: LayoutIndex, row: RolePermission): PermissionsRow | undefined => {
  const column = index.columns.get(row.action);

  // A route of a plugin or an API: ticked when the role has it
  if (!column) {
    return { action: row.action, subject: null, conditions: [], properties: {} };
  }

  const { uid, action } = column;
  const base = { action, subject: uid, conditions: [] };

  if (!isFieldAction(action)) {
    return { ...base, properties: {} };
  }

  const ticked = tickedLeaves(index, uid, action, row.properties?.fields);

  return ticked.length === 0 ? undefined : { ...base, properties: { fields: ticked } };
};

const toPopulateDepth = (depths: Array<number | null>): SubjectSettings['populateDepth'] =>
  depths.every((depth) => depth === depths[0]) ? (depths[0] ?? null) : 'mixed';

/**
 * The editor's layout and rows for a role, the settings of each content type, and the rows it
 * sets aside. Every layout it builds has `conditions: []`: the editor throws without the list, and
 * the plugin keeps conditions in its own Settings modal.
 */
const toEditorModel = (
  layout: PermissionLayout,
  stored: RolePermission[],
  problems: PermissionProblem[]
): EditorModel => {
  const index = indexLayout(layout);
  const refused = new Set(
    problems.flatMap(({ documentId }) => (documentId === null ? [] : [documentId]))
  );
  const settings: Record<string, SubjectSettings> = Object.fromEntries(
    layout.contentTypes.map(({ uid }) => [uid, { populateDepth: null, conditions: {} }])
  );
  const depths = new Map<string, Array<number | null>>();
  const rows: PermissionsRow[] = [];
  const stale: RolePermission[] = [];

  stored.forEach((row) => {
    if (refused.has(row.documentId) || !index.keys.has(keyOf(index, row))) {
      stale.push(row);

      return;
    }

    const editorRow = toEditorRow(index, row);

    if (editorRow) {
      rows.push(editorRow);
    }

    const column = index.columns.get(row.action);

    if (column) {
      depths.set(column.uid, [
        ...(depths.get(column.uid) ?? []),
        row.properties?.populateDepth ?? null,
      ]);

      if ((row.conditions ?? []).length > 0) {
        settings[column.uid].conditions[column.action] = cloneJson(row.conditions);
      }
    }
  });

  depths.forEach((list, uid) => {
    settings[uid].populateDepth = toPopulateDepth(list);
  });

  return { layout: toEditorLayout(layout), rows, settings, stale };
};

/* -------------------------------------------------------------------------------------------------
 * toPermissionRows
 * -------------------------------------------------------------------------------------------------
 * Every row the role has once the editor's state is applied: the rows of its cells, the rows it
 * keeps as stored, and nothing for a cell the admin unticked. */

type ColumnWanted = {
  kind: 'column';
  key: string;
  uid: string;
  action: DataAction;
  actionId: string;
  /** The cells ticked, or null for an action with no fields */
  fields: string[] | null;
};

type Wanted = { kind: 'route'; key: string; actionId: string } | ColumnWanted;

/** What a row of the editor asks for, or nothing when the layout does not know it or no cell is ticked */
const toWanted = (index: LayoutIndex, row: PermissionsRow): Wanted | undefined => {
  if (!row.subject) {
    return index.routes.has(row.action)
      ? { kind: 'route', key: toKey(row.action, null), actionId: row.action }
      : undefined;
  }

  const type = index.types.get(row.subject);
  const offered = type?.actions.find(({ action }) => action === row.action);

  if (!type || !offered) {
    return undefined;
  }

  const { action, actionId } = offered;
  const wanted = {
    kind: 'column' as const,
    key: toKey(actionId, type.uid),
    uid: type.uid,
    action,
    actionId,
  };

  if (!isFieldAction(action)) {
    return { ...wanted, fields: null };
  }

  // The editor reports the cells it has ticked, so a `null` list is every cell
  const visible = visibleLeaves(index, type.uid, action);
  const ticked = new Set(row.properties?.fields ?? visible);
  const fields = visible.filter((path) => ticked.has(path));

  // A row with no ticked cell is no permission
  return fields.length === 0 ? undefined : { ...wanted, fields };
};

/** A row as it is stored: its own copy, without the id */
const asStored = (row: PermissionRow): PermissionRow => ({
  action: row.action,
  subject: row.subject ?? null,
  properties: cloneJson(row.properties ?? {}),
  conditions: cloneJson(row.conditions ?? []),
});

/** Whether the cells the editor ticks are the ones it ticked when the stored row was loaded */
const hasLoadedFields = (index: LayoutIndex, wanted: ColumnWanted, stored: RolePermission) =>
  sameLists(
    tickedLeaves(index, wanted.uid, wanted.action, stored.properties?.fields),
    wanted.fields
  );

/** Whether what the editor shows for a stored row is what it showed when it was loaded */
const isLoadedState = (
  index: LayoutIndex,
  wanted: ColumnWanted,
  stored: RolePermission,
  settings: SubjectSettings
) => {
  const { uid, action } = wanted;

  if (isFieldAction(action) && !hasLoadedFields(index, wanted, stored)) {
    return false;
  }

  const depth = stored.properties?.populateDepth ?? null;

  if (settings.populateDepth !== 'mixed' && settings.populateDepth !== depth) {
    return false;
  }

  return sameSets(
    canonicalConditions(index, uid, settings.conditions[action]),
    canonicalConditions(index, uid, stored.conditions)
  );
};

/** The depth of the settings written to a row, unless they are `'mixed'`: the row keeps its own */
const withDepth = (row: PermissionRow, settings: SubjectSettings): PermissionRow => {
  const { populateDepth } = settings;

  if (populateDepth !== 'mixed' && (row.properties.populateDepth ?? null) !== populateDepth) {
    row.properties.populateDepth = populateDepth;
  }

  return row;
};

/**
 * The rows a role has once the editor's state is applied: for each cell the editor ticks, the
 * stored row as it was when the admin did not change it, and a row built from the cell, the
 * subject's conditions and its depth when they did; each stored row the editor does not show,
 * as stored; nothing for a cell that was unticked. A new row has no subject and no locales.
 *
 * `stale` is `EditorModel.stale`, always given: a refused row of a content type the layout has is
 * kept only with it (and is written over when its cell is ticked). A stored row the layout lacks is
 * kept either way. Pass `[]` for rows with nothing set aside.
 */
const toPermissionRows = (
  rows: PermissionsRow[],
  settings: Record<string, SubjectSettings>,
  layout: PermissionLayout,
  stored: RolePermission[],
  stale: RolePermission[]
): PermissionRow[] => {
  const index = indexLayout(layout);
  const refused = new Set(stale.map(({ documentId }) => documentId));
  const wanted = new Map<string, Wanted>();

  rows.forEach((row) => {
    const next = toWanted(index, row);

    if (next && !wanted.has(next.key)) {
      wanted.set(next.key, next);
    }
  });

  // A type with no settings entry keeps what its stored row has (fail closed): reading it as
  // "Unlimited, no conditions" would widen the row. Only a row with nothing stored is unlimited.
  const settingsOf = (uid: string, action: DataAction | null, base?: RolePermission) => {
    if (settings[uid]) {
      return settings[uid];
    }

    if (!base) {
      return EMPTY_SETTINGS;
    }

    return {
      populateDepth: base.properties?.populateDepth ?? null,
      conditions: action ? { [action]: cloneJson(base.conditions ?? []) } : {},
    } as SubjectSettings;
  };

  const rebuild = (next: Wanted, base: RolePermission | undefined): PermissionRow => {
    if (next.kind === 'route') {
      return base
        ? asStored(base)
        : { action: next.actionId, subject: null, properties: {}, conditions: [] };
    }

    const own = settingsOf(next.uid, next.action, base);

    if (base && isLoadedState(index, next, base, own)) {
      return asStored(base);
    }

    const row: PermissionRow = {
      action: next.actionId,
      subject: base ? (base.subject ?? null) : null,
      properties: base ? cloneJson(base.properties ?? {}) : {},
      conditions: cloneJson(own.conditions[next.action] ?? []),
    };

    // The fields are stored as they are until a cell changes: `null` stays every field
    if (isFieldAction(next.action) && !(base && hasLoadedFields(index, next, base))) {
      row.properties.fields = next.fields;
    }

    return withDepth(row, own);
  };

  const used = new Set<string>();
  const result: PermissionRow[] = [];

  stored.forEach((row) => {
    const key = keyOf(index, row);
    const shown = index.keys.has(key);
    const aside = !shown || refused.has(row.documentId);
    const next = shown && !used.has(key) ? wanted.get(key) : undefined;

    if (next) {
      used.add(key);
      // A refused row the admin ticked is written over: what is ticked is what the role gets
      result.push(rebuild(next, aside ? undefined : row));
    } else if (aside) {
      result.push(asStored(row));
    } else if (isHidden(index, row)) {
      result.push(
        withDepth(asStored(row), settingsOf(ownerOf(index, row.action) ?? '', null, row))
      );
    }
  });

  wanted.forEach((next, key) => {
    if (!used.has(key)) {
      result.push(rebuild(next, undefined));
    }
  });

  return result;
};

/* -------------------------------------------------------------------------------------------------
 * toPermissionDiff
 * -----------------------------------------------------------------------------------------------*/

/** The parts of a row that are not what the stored row has */
const changesOf = (
  index: LayoutIndex,
  before: RolePermission,
  after: PermissionRow
): { documentId: string } & Partial<PermissionRow> => {
  const changes: { documentId: string } & Partial<PermissionRow> = {
    documentId: before.documentId,
  };

  if (before.action !== after.action) {
    changes.action = after.action;
  }

  if (subjectOf(index, before) !== subjectOf(index, after)) {
    changes.subject = after.subject;
  }

  if (!samePropertiesIn(before.properties, after.properties)) {
    changes.properties = cloneJson(after.properties);
  }

  if (!sameConditionsIn(index, subjectOf(index, before), before, after)) {
    changes.conditions = cloneJson(after.conditions);
  }

  return changes;
};

/**
 * The diff that takes a role from `stored` to `next` (what `toPermissionRows` gives). Rows are
 * matched by action and subject, a missing subject being the one of the action's content type.
 *
 * A stored row missing from `next` is deleted, except one the editor does not show (one the layout
 * lacks, or one that lists no field): `remove` is how those go. `remove` lists ids to delete; it
 * wins over an update, and a row of `next` that took the place of a removed one is created.
 */
const toPermissionDiff = (
  stored: RolePermission[],
  next: PermissionRow[],
  remove: string[],
  layout: PermissionLayout
): PermissionDiff => {
  const index = indexLayout(layout);
  const removed = new Set(remove);
  const wanted = new Map<string, PermissionRow>();

  next.forEach((row) => {
    const key = keyOf(index, row);

    if (!wanted.has(key)) {
      wanted.set(key, row);
    }
  });

  const storedKeys = new Set(stored.map((row) => keyOf(index, row)));
  const replaced = new Set<string>();
  const update: PermissionDiff['update'] = [];
  const toDelete = new Set<string>();

  stored.forEach((row) => {
    const key = keyOf(index, row);
    const target = wanted.get(key);

    if (removed.has(row.documentId)) {
      toDelete.add(row.documentId);

      if (target && !sameRowIn(index, row, target)) {
        replaced.add(key);
      }
    } else if (!target) {
      if (index.keys.has(key) && !isHidden(index, row)) {
        toDelete.add(row.documentId);
      }
    } else if (!sameRowIn(index, row, target)) {
      update.push(changesOf(index, row, target));
    }
  });

  const create = [...wanted]
    .filter(([key]) => !storedKeys.has(key) || replaced.has(key))
    .map(([, row]) => cloneJson(row));

  remove.forEach((id) => toDelete.add(id));

  return { create, update, delete: [...toDelete] };
};

/* -------------------------------------------------------------------------------------------------
 * describeChanges
 * -----------------------------------------------------------------------------------------------*/

const GRANTED = 'Granted';
const NOT_GRANTED = 'Not granted';
const NONE = 'None';
const EMPTY_VALUE = '—';

const depthLabel = (depth: number | null | 'mixed') => {
  if (depth === 'mixed') {
    return 'Mixed';
  }

  if (depth === null) {
    return 'Unlimited';
  }

  return depth === 1 ? '1 level' : `${depth} levels`;
};

const rowsByKey = (index: LayoutIndex, rows: PermissionRow[]) => {
  const byKey = new Map<string, PermissionRow>();

  rows.forEach((row) => {
    const key = keyOf(index, row);

    if (!byKey.has(key)) {
      byKey.set(key, row);
    }
  });

  return byKey;
};

/** A condition as the review names it: its display name, and the params it is given */
const describeCondition = (index: LayoutIndex, uid: string, ref: ConditionRef) => {
  const declaration = declarationOf(index, uid, ref.name);
  const params = Object.entries(filledParams(declaration, ref))
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, value]) => `${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
    );
  const name = declaration?.displayName ?? ref.name;

  return params.length > 0 ? `${name} (${params.join(', ')})` : name;
};

/** `fields: null` and an absent list are every field; a role without the row has none */
const fieldsOfRow = (row: PermissionRow | undefined): string[] | null =>
  row === undefined ? [] : (row.properties?.fields ?? null);

const showFields = (fields: string[] | null) => {
  if (fields === null) {
    return ALL_FIELDS_TEXT;
  }

  return fields.length === 0 ? NONE : sortedUnique(fields).join(', ');
};

type Change = ChangeGroup['changes'][number];

const isChange = (change: Change | undefined): change is Change => change !== undefined;

const changeOfLists = (label: string, from: string[], to: string[]): Change | undefined => {
  const added = sortedUnique(to).filter((item) => !from.includes(item));
  const removed = sortedUnique(from).filter((item) => !to.includes(item));

  return added.length > 0 || removed.length > 0
    ? {
        label,
        ...(added.length > 0 && { added }),
        ...(removed.length > 0 && { removed }),
      }
    : undefined;
};

const changeOfValue = (label: string, from: string, to: string): Change | undefined =>
  from === to ? undefined : { label, from, to };

const changeOfFields = (
  label: string,
  from: string[] | null,
  to: string[] | null
): Change | undefined =>
  from !== null && to !== null
    ? changeOfLists(label, from, to)
    : changeOfValue(label, showFields(from), showFields(to));

/** The heading of each content type and route group: its label, and its id when two share one */
const toHeadings = (layout: PermissionLayout) => {
  const entries = [
    ...layout.contentTypes.map(({ uid, label }) => ({ id: uid, label })),
    ...layout.groups.map(({ id, label }) => ({ id, label })),
  ];
  const counts = new Map<string, number>([['Role', 1]]);

  entries.forEach(({ label }) => counts.set(label, (counts.get(label) ?? 0) + 1));

  return new Map(
    entries.map(({ id, label }) => [id, (counts.get(label) ?? 0) > 1 ? `${label} (${id})` : label])
  );
};

/**
 * What changed between two states of a role, as the review before saving lists it: the role's own
 * details, then each content type (what is granted, the fields and conditions of each action, the
 * populate depth), then each plugin's or API's routes. A group with no change is left out.
 */
const describeChanges = (
  before: RoleSnapshot,
  after: RoleSnapshot,
  layout: PermissionLayout
): ChangeGroup[] => {
  const index = indexLayout(layout);
  const headings = toHeadings(layout);
  const was = rowsByKey(index, before.rows);
  const now = rowsByKey(index, after.rows);

  const role = [
    changeOfValue('Name', before.name || EMPTY_VALUE, after.name || EMPTY_VALUE),
    changeOfValue(
      'Description',
      before.description || EMPTY_VALUE,
      after.description || EMPTY_VALUE
    ),
    changeOfValue(
      'Require two-factor authentication',
      before.requireTwoFactor ? 'On' : 'Off',
      after.requireTwoFactor ? 'On' : 'Off'
    ),
  ].filter(isChange);

  const isGranted = (row: PermissionRow | undefined) => row !== undefined && !isHidden(index, row);

  /** A type with no row has no depth to compare */
  const depthOf = (side: Array<PermissionRow | undefined>) => {
    const present = side.filter((row): row is PermissionRow => row !== undefined);

    return present.length === 0
      ? undefined
      : toPopulateDepth(present.map((row) => row.properties?.populateDepth ?? null));
  };

  const types = layout.contentTypes.map((type): ChangeGroup => {
    const actions = type.actions.map(({ action, actionId }) => ({
      action,
      before: was.get(toKey(actionId, type.uid)),
      after: now.get(toKey(actionId, type.uid)),
    }));

    const granted = actions.map((entry) =>
      changeOfValue(
        ACTION_LABELS[entry.action],
        isGranted(entry.before) ? GRANTED : NOT_GRANTED,
        isGranted(entry.after) ? GRANTED : NOT_GRANTED
      )
    );

    const fields = actions
      .filter(({ action }) => isFieldAction(action))
      .map((entry) =>
        changeOfFields(
          `${ACTION_LABELS[entry.action]} fields`,
          fieldsOfRow(entry.before),
          fieldsOfRow(entry.after)
        )
      );

    const conditions = actions.map((entry) =>
      changeOfLists(
        `${ACTION_LABELS[entry.action]} conditions`,
        (entry.before?.conditions ?? []).map((ref) => describeCondition(index, type.uid, ref)),
        (entry.after?.conditions ?? []).map((ref) => describeCondition(index, type.uid, ref))
      )
    );

    const depthFrom = depthOf(actions.map((entry) => entry.before));
    const depthTo = depthOf(actions.map((entry) => entry.after));
    const depth =
      depthFrom === undefined || depthTo === undefined
        ? undefined
        : changeOfValue('Populate depth', depthLabel(depthFrom), depthLabel(depthTo));

    return {
      group: headings.get(type.uid) ?? type.label,
      changes: [...granted, ...fields, ...conditions, depth].filter(isChange),
    };
  });

  const groups = layout.groups.map((group): ChangeGroup => ({
    group: headings.get(group.id) ?? group.label,
    changes: group.categories
      .flatMap(({ routes }) => routes)
      .map(({ actionId, label, route }) =>
        changeOfValue(
          `${label} · ${route}`,
          was.has(toKey(actionId, null)) ? GRANTED : NOT_GRANTED,
          now.has(toKey(actionId, null)) ? GRANTED : NOT_GRANTED
        )
      )
      .filter(isChange),
  }));

  return [{ group: 'Role', changes: role }, ...types, ...groups].filter(
    ({ changes }) => changes.length > 0
  );
};

export { describeChanges, sameRow, toEditorModel, toPermissionDiff, toPermissionRows };
export type { ChangeGroup, EditorModel, RoleSnapshot, SubjectSettings };
