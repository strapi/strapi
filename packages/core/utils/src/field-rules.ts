import { hasDraftAndPublish } from './content-types';
import { readActionFor, restrictsEntries } from './content-api-permissions';
import type { FieldRules, PermissionChecker } from './content-api-permissions';
import { traverseQueryFilters, traverseQuerySort } from './traverse';
import traverseEntity from './traverse-entity';
import type { Visitor } from './traverse/factory';
import type { AnyAttribute, Data, Model } from './types';

/**
 * Field rules: which fields of a content type a caller may read, write or query, from the
 * checker's `fieldsFor`. The sanitizers drop what a rule hides and the validators refuse it; both
 * share what is here.
 *
 * A path is relative to the nearest content type: a top-level attribute, or a component's
 * attribute (`seo.metaTitle`). A relation's target is a content type of its own and has its own
 * paths and its own `find` fields.
 */

/**
 * Attributes every caller reads on every content type, whatever the rules list. (`id`,
 * `documentId`, `__component` and `__type` are not attributes of a schema and never reach a rule.)
 */
export const ALWAYS_READABLE: ReadonlySet<string> = new Set([
  'id',
  'documentId',
  '__component',
  '__type',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'locale',
]);

/** A field list ready to answer "is this path allowed" */
export interface CompiledFields {
  /** Every field is allowed */
  readonly all: boolean;
  /** The listed fields */
  readonly exact: ReadonlySet<string>;
  /** The paths that contain a listed field: `seo` for `seo.metaTitle` */
  readonly containers: ReadonlySet<string>;
}

const EVERY_FIELD: CompiledFields = { all: true, exact: new Set(), containers: new Set() };

/** Compiles a field list. null is every field, [] none */
export const compileFields = (fields: string[] | null): CompiledFields => {
  if (fields === null) {
    return EVERY_FIELD;
  }

  const containers = new Set<string>();

  for (const field of fields) {
    const parts = field.split('.');

    for (let end = 1; end < parts.length; end += 1) {
      containers.add(parts.slice(0, end).join('.'));
    }
  }

  return { all: false, exact: new Set(fields), containers };
};

/**
 * Whether `path` is allowed: itself or one of its ancestors is listed (`seo` covers
 * `seo.metaTitle`), or, with `contains` (the default), a listed field is inside it (`seo` is kept
 * when `seo.metaTitle` is listed, and its other keys are checked one by one).
 */
export const allows = (fields: CompiledFields, path: string, contains = true): boolean => {
  if (fields.all) {
    return true;
  }

  if (contains && fields.containers.has(path)) {
    return true;
  }

  let end = path.indexOf('.');

  while (end !== -1) {
    if (fields.exact.has(path.slice(0, end))) {
      return true;
    }

    end = path.indexOf('.', end + 1);
  }

  return fields.exact.has(path);
};

type Fields = string[] | null;

const covers = (fields: string[], field: string) =>
  fields.some((covering) => field === covering || field.startsWith(`${covering}.`));

const unionFields = (lists: Fields[]): Fields =>
  lists.some((list) => list === null) ? null : [...new Set((lists as string[][]).flat())];

/** The fields both lists allow, a sub-path where one list names the whole. null is every field */
const intersectFields = (a: Fields, b: Fields): Fields => {
  if (a === null) {
    return b;
  }

  if (b === null) {
    return a;
  }

  return [...new Set([...a.filter((x) => covers(b, x)), ...b.filter((y) => covers(a, y))])];
};

/**
 * The fields a caller may name in a filter, sort or populate, and write when the entry is not known
 *: the fields every entry they reach has in common. With an unconditioned row, that is
 * `always`. Otherwise it is the fields every conditional group has: the entry matched one of them,
 * and which one is not known. `{ always: [], conditional: [] }` is no field: an intersection over no
 * groups is not "every field" here.
 */
export const queryableFields = (rules: FieldRules): Fields => {
  if (rules.always === null) {
    return null;
  }

  if (rules.always.length > 0) {
    return rules.always;
  }

  if (rules.conditional.length === 0) {
    return [];
  }

  return rules.conditional
    .map((group) => group.fields)
    .reduce<Fields>((a, b) => intersectFields(a, b), null);
};

/** The fields of one entry: `always` and the fields of the groups it matches (their indexes) */
export const fieldsOfEntry = (rules: FieldRules, matched: readonly number[]): Fields =>
  unionFields([rules.always, ...matched.map((index) => rules.conditional[index].fields)]);

/**
 * Which of the documents of a content type match a filter. `@strapi/core` answers it from the
 * Document Service: this package reads no database. `status` and `locale`, when given, are those of
 * the entries asked about.
 */
export interface EntryMatcher {
  (query: {
    uid: string;
    documentIds: string[];
    filter: Record<string, unknown>;
    status?: 'draft' | 'published';
    locale?: string;
  }): Promise<Iterable<string>>;
}

/**
 * Where a visited key sits. The entity traversal and the query traversals give this shape; only
 * the entity one has `rawWithIndices`.
 */
export interface VisitedKey {
  key: string;
  schema: Model;
  attribute?: AnyAttribute;
  data: unknown;
  value: unknown;
  getModel(uid: string): Model;
  path: { raw: string | null; attribute: string | null; rawWithIndices?: string | null };
}

/** A key a field rule denies */
export interface Denial {
  key: string;
  /** The key's path from the root of the traversal */
  path: string | null;
  /** The content type the key belongs to */
  uid: string;
  /** The rule action that decided */
  action: string;
  /** The key's path relative to that content type */
  field: string;
}

/** The fields of the entries of a response, entry by entry: what the output is stripped to */
export interface EntryFields {
  /** The readable fields of the entry in `data`, a node of `uid` read by `action` rules */
  compiledFor(action: string, uid: string, data: unknown): CompiledFields;
}

const statusOf = (data: Record<string, unknown>): 'draft' | 'published' | undefined => {
  const { publishedAt } = data;

  if (publishedAt === null) {
    return 'draft';
  }

  return publishedAt === undefined ? undefined : 'published';
};

/** Whether the type is localized (i18n), so its entries are read in one locale */
const isLocalized = (model: Model): boolean =>
  (model as { pluginOptions?: { i18n?: { localized?: boolean } } }).pluginOptions?.i18n
    ?.localized === true;

const asRecord = (data: unknown): Record<string, unknown> =>
  data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : {};

const entryKey = (data: Record<string, unknown>) =>
  `${String(data.documentId)}|${statusOf(data) ?? ''}|${
    typeof data.locale === 'string' ? data.locale : ''
  }`;

/**
 * Works out the fields of each entry of a response. An entry gets `always` and the
 * fields of the conditional groups it matches. Which groups it matches is one `matcher` query per
 * group per type and status and locale, with the ids of the entries of the response.
 *
 * No query when the rules are the same for every entry: no conditional group, or a read whose
 * entries all matched the caller's one conditioned row already (`filtersFor` narrowed the query
 * and the populates) and with no unconditioned row beside it. A write response always asks: it can
 * show an entry the caller can't read.
 *
 * Without a `matcher` an entry matches no group: it gets `always` only.
 *
 * Each entry is asked about in the status and the locale it was read in, and nowhere else (a group
 * whose condition holds in another locale or on the other version grants nothing here). They come
 * from the entry (`publishedAt`, `locale`), which the caller can drop with `fields` but not forge,
 * and for the root, from the request's own (`status`, `locale`). An entry of a draft & publish or
 * localized type with neither is unplaced: it gets `always` only.
 *
 * @param action the request's action (`find`, `findOne`, `create`, `update`, custom); the root of
 * `data` reads by `readActionFor(action)` and every relation target by `find`
 * @param status the status the request reads or writes, resolved: a read that names none reads
 * published, which the caller says by passing it
 * @param locale the locale the request reads or writes, resolved: the default locale when it names
 * none (the caller passes that); `'*'` for several, which tells nothing about one entry
 * @param unfiltered nothing in `data` is known to have matched the caller's read filter, so every
 * conditional group is asked of the matcher. A route that finds its entry in its own code (the `me`
 * routes) is one
 */
export const resolveEntryFields = async ({
  checker,
  auth,
  action,
  data,
  schema,
  getModel,
  matcher,
  status,
  locale,
  unfiltered = false,
}: {
  checker: PermissionChecker;
  auth: unknown;
  action?: string;
  data: unknown;
  schema: Model;
  getModel(uid: string): Model;
  matcher?: EntryMatcher;
  status?: 'draft' | 'published';
  locale?: string;
  unfiltered?: boolean;
}): Promise<EntryFields> => {
  const rootAction = readActionFor(action);
  const rootIsFiltered = action === 'find' || action === 'findOne';

  /**
   * The status and locale an entry was read in, null when they can't be told: the type has draft &
   * publish and the entry doesn't say which version it is (and the request, for the root, doesn't
   * either), or it is localized and the entry doesn't say which locale it is in
   */
  const scopeOf = (
    record: Record<string, unknown>,
    model: Model,
    root: boolean
  ): { status?: 'draft' | 'published'; locale?: string } | null => {
    const scope: { status?: 'draft' | 'published'; locale?: string } = {};

    if (hasDraftAndPublish(model)) {
      const entryStatus = statusOf(record) ?? (root ? status : undefined);

      if (entryStatus === undefined) {
        return null;
      }

      scope.status = entryStatus;
    }

    if (isLocalized(model)) {
      if (typeof record.locale === 'string') {
        scope.locale = record.locale;
      } else if (root && typeof locale === 'string' && locale !== '*') {
        scope.locale = locale;
      } else {
        return null;
      }
    }

    return scope;
  };

  interface Bucket {
    ruleAction: string;
    uid: string;
    root: boolean;
    entries: Map<string, Record<string, unknown>>;
  }

  const buckets = new Map<string, Bucket>();
  const seen = new WeakSet<object>();

  const collect: Visitor = ({ schema: node, data: nodeData, key, path }) => {
    const record = asRecord(nodeData);

    // A node of a content type with a document id; its keys all come with the same `data`
    if (node.modelType !== 'contentType' || typeof record.documentId !== 'string') {
      return;
    }

    if (seen.has(record)) {
      return;
    }

    seen.add(record);

    const root = (path as VisitedKey['path']).rawWithIndices === key;
    const ruleAction = root ? rootAction : 'find';
    const id = `${ruleAction}|${node.uid}|${root}`;
    let bucket = buckets.get(id);

    if (bucket === undefined) {
      bucket = { ruleAction, uid: node.uid, root, entries: new Map() };
      buckets.set(id, bucket);
    }

    bucket.entries.set(entryKey(record), record);
  };

  for (const item of Array.isArray(data) ? data : [data]) {
    // eslint-disable-next-line no-await-in-loop
    await traverseEntity(collect as never, { schema, getModel }, item as Data);
  }

  interface Resolved {
    rules: FieldRules;
    /** The groups each entry matches, by entry key */
    matches: Map<string, number[]>;
    compiled: Map<string, CompiledFields>;
  }

  const resolved = new Map<string, Resolved>();

  const stateOf = (ruleAction: string, uid: string): Resolved => {
    const id = `${ruleAction}|${uid}`;
    let state = resolved.get(id);

    if (state === undefined) {
      state = {
        rules: checker.fieldsFor(auth, ruleAction, uid),
        matches: new Map(),
        compiled: new Map(),
      };
      resolved.set(id, state);
    }

    return state;
  };

  const resolveBucket = async (bucket: Bucket) => {
    const { rules, matches } = stateOf(bucket.ruleAction, bucket.uid);
    const { conditional } = rules;

    if (conditional.length === 0) {
      return;
    }

    // One group and nothing always readable: an entry the read returned matched the group's
    // condition, since the read was filtered by it. Only when it was: a role holding the action
    // with no condition as well reads entries the group's condition doesn't match
    const known =
      rules.always !== null &&
      rules.always.length === 0 &&
      conditional.length === 1 &&
      restrictsEntries(checker.filtersFor(auth, bucket.ruleAction, bucket.uid));

    if (known && !unfiltered && (!bucket.root || rootIsFiltered)) {
      for (const key of bucket.entries.keys()) {
        matches.set(key, [0]);
      }

      return;
    }

    if (matcher === undefined) {
      return;
    }

    // Entries read in the same status and locale are asked about together. One that can't be
    // placed is asked about nowhere, and so matches no group
    const model = getModel(bucket.uid);
    const scopes = new Map<
      string,
      {
        scope: { status?: 'draft' | 'published'; locale?: string };
        entries: Array<[string, Record<string, unknown>]>;
      }
    >();

    for (const entry of bucket.entries) {
      const scope = scopeOf(entry[1], model, bucket.root);

      if (scope !== null) {
        const id = `${scope.status ?? ''}|${scope.locale ?? ''}`;
        const held = scopes.get(id) ?? { scope, entries: [] };

        held.entries.push(entry);
        scopes.set(id, held);
      }
    }

    await Promise.all(
      [...scopes.values()].flatMap(({ scope, entries }) =>
        conditional.map(async (group, index) => {
          const documentIds = [...new Set(entries.map(([, entry]) => String(entry.documentId)))];

          const ids = new Set(
            await matcher({
              uid: bucket.uid,
              documentIds,
              filter: group.filter,
              ...scope,
            })
          );

          for (const [key, entry] of entries) {
            if (ids.has(String(entry.documentId))) {
              matches.set(key, [...(matches.get(key) ?? []), index]);
            }
          }
        })
      )
    );
  };

  await Promise.all([...buckets.values()].map(resolveBucket));

  return {
    compiledFor(ruleAction, uid, node) {
      const state = stateOf(ruleAction, uid);
      const record = asRecord(node);
      const groups =
        typeof record.documentId === 'string'
          ? [...(state.matches.get(entryKey(record)) ?? [])].sort((a, b) => a - b)
          : [];
      const id = groups.join(',');
      let compiled = state.compiled.get(id);

      if (compiled === undefined) {
        compiled = compileFields(fieldsOfEntry(state.rules, groups));
        state.compiled.set(id, compiled);
      }

      return compiled;
    },
  };
};

/**
 * Which conditional groups of the caller's `update` fields the entry with this document id
 * matches, so an update body is held to that entry's fields. undefined, which holds the body to the
 * fields every group has, when it can't or needn't be asked: no id, no matcher, no group, one group
 * and nothing unconditioned (the stored-entry check matched the update filter, which is that
 * group's), a write that creates (a new locale: the entry isn't there to ask about), or a `locale`
 * of `'*'` (no one entry).
 *
 * It asks in the locale the request writes, the default one when it names none (the matcher is not
 * given a locale then), and in the draft of a draft & publish type, which is what an update writes.
 */
export const resolveMatchedGroups = async ({
  checker,
  auth,
  schema,
  documentId,
  matcher,
  locale,
  creates = false,
}: {
  checker: PermissionChecker;
  auth: unknown;
  schema: Model;
  documentId?: string;
  matcher?: EntryMatcher;
  locale?: string;
  creates?: boolean;
}): Promise<number[] | undefined> => {
  if (
    typeof documentId !== 'string' ||
    documentId === '' ||
    matcher === undefined ||
    creates ||
    locale === '*'
  ) {
    return undefined;
  }

  const { always, conditional } = checker.fieldsFor(auth, 'update', schema.uid);

  if (
    conditional.length === 0 ||
    (always !== null && always.length === 0 && conditional.length === 1)
  ) {
    return undefined;
  }

  const status = hasDraftAndPublish(schema) ? 'draft' : undefined;
  const scopedLocale = isLocalized(schema) && typeof locale === 'string' ? locale : undefined;
  const matched: number[] = [];

  await Promise.all(
    conditional.map(async (group, index) => {
      const ids = new Set(
        await matcher({
          uid: schema.uid,
          documentIds: [documentId],
          filter: group.filter,
          ...(scopedLocale === undefined ? {} : { locale: scopedLocale }),
          ...(status === undefined ? {} : { status }),
        })
      );

      if (ids.has(documentId)) {
        matched.push(index);
      }
    })
  );

  return matched.sort((a, b) => a - b);
};

/**
 * Whether the caller may use `_q` on a type: only when every field of it (private ones aside,
 * nobody reads them) is one they may query. A text search matches on fields the filters can't name.
 */
export const canSearchText = (
  checker: PermissionChecker,
  auth: unknown,
  action: string | undefined,
  schema: Model
): boolean => {
  const fields = compileFields(
    queryableFields(checker.fieldsFor(auth, readActionFor(action), schema.uid))
  );

  if (fields.all) {
    return true;
  }

  return Object.entries(schema.attributes ?? {}).every(
    ([name, attribute]) =>
      (attribute as { private?: boolean }).private === true ||
      attribute.type === 'password' ||
      ALWAYS_READABLE.has(name) ||
      allows(fields, name, false)
  );
};

/** One node's place in a traversal: the content type it belongs to, and how its paths read */
interface Frame {
  uid: string;
  /** The path of the node within its content type: '' for the content type itself */
  base: string;
  /** Part of the root content type of the traversal, not of a relation's target */
  root: boolean;
  fields: CompiledFields;
}

export interface FieldCheckOptions {
  checker: PermissionChecker;
  auth: unknown;
  /**
   * The rule action of the root of the traversal: `create` or `update` for the input of a write, a
   * read action (`find`, `findOne`) for output and queries. Relation targets read by `find`
   */
  action: string;
  /** The fields of each entry of a response. Without it a read is checked as a query */
  entries?: EntryFields;
  /** An input that creates through an `update`: the keys the create stamp sets are never refused */
  creates?: boolean;
  /** An update's body: the conditional groups of the entry it writes (`resolveMatchedGroups`) */
  matched?: number[];
  /**
   * The keys of the create stamp, when the caller already has them. Without it a create asks the
   * checker for `stampFor`.
   */
  stampKeys?: readonly string[];
}

export interface FieldCheck {
  /** The denial of a visited key, or null when the key is allowed (or no field of any rule) */
  check(visited: VisitedKey): Denial | null;
  /** The check for the `filters` and `sort` of the populate node a keyword key belongs to */
  forNode(visited: VisitedKey): FieldCheck;
}

/**
 * Decides, for each key a traversal visits, whether the caller's field rules allow it.
 *
 * Input checks only the keys of the root entry and its components: what a body names inside a
 * relation is an operation on that relation, not a field. Output and queries check every content
 * type reached, each against its own rules: the root by `action`, a relation's target by `find`.
 * The always-readable attributes and the keys that are not attributes (`id`, operators,
 * keywords) are never decided here.
 *
 * Call it from one traversal: it remembers the components it entered to know what owns them.
 */
export const createFieldCheck = (params: FieldCheckOptions, seed?: Frame): FieldCheck => {
  const { checker, auth, action, entries, creates, matched } = params;
  const isInput = action === 'create' || action === 'update';

  const queryable = new Map<string, CompiledFields>();
  const stamped = new Map<string, ReadonlySet<string>>();
  // What a component or dynamic zone entered owns, by where it sits
  const components = new Map<string, Frame>();
  const frames = new WeakMap<object, Frame>();

  const compiledOf = (ruleAction: string, uid: string, data: unknown): CompiledFields => {
    if (entries !== undefined && !isInput) {
      return entries.compiledFor(ruleAction, uid, data);
    }

    const id = `${ruleAction}|${uid}`;
    let compiled = queryable.get(id);

    if (compiled === undefined) {
      const rules = checker.fieldsFor(auth, ruleAction, uid);

      compiled = compileFields(
        isInput && matched !== undefined ? fieldsOfEntry(rules, matched) : queryableFields(rules)
      );

      queryable.set(id, compiled);
    }

    return compiled;
  };

  const stampKeys = (uid: string): ReadonlySet<string> => {
    let keys = stamped.get(uid);

    if (keys === undefined) {
      keys =
        action === 'create' || creates
          ? new Set(params.stampKeys ?? Object.keys(checker.stampFor(auth, uid)))
          : new Set();
      stamped.set(uid, keys);
    }

    return keys;
  };

  const contentFrame = (model: Model, root: boolean, data: unknown): Frame => {
    // Only the root's keys are checked on input
    if (isInput && !root) {
      return { uid: model.uid, base: '', root, fields: EVERY_FIELD };
    }

    const cacheable = data !== null && typeof data === 'object';
    const cached = cacheable ? frames.get(data as object) : undefined;

    if (cached !== undefined) {
      return cached;
    }

    const frame: Frame = {
      uid: model.uid,
      base: '',
      root,
      fields: compiledOf(root ? action : 'find', model.uid, data),
    };

    if (cacheable) {
      frames.set(data as object, frame);
    }

    return frame;
  };

  /**
   * The frame of the node a visited key is in. `attributeKey` is false for a populate keyword
   * (`filters`, `sort`), whose node is the one its path ends at.
   */
  const frameOf = (visited: VisitedKey, attributeKey: boolean): Frame => {
    const { key, schema, path, data } = visited;
    const entity = path.rawWithIndices !== undefined;
    const own = entity ? path.rawWithIndices : path.attribute;
    let container: string | null;

    if (!attributeKey) {
      container = path.attribute ?? null;
    } else if (own == null || own === key) {
      container = null;
    } else {
      container = own.slice(0, own.length - key.length - 1);
    }

    // The root of the traversal
    if (container === null) {
      return seed ?? contentFrame(schema, true, data);
    }

    // A relation's target or a media file
    if (schema.modelType === 'contentType') {
      return contentFrame(schema, false, data);
    }

    // A component or a dynamic zone's component: what owns it was recorded when it was entered
    const entered = components.get(entity ? container : `${container}|${schema.uid}`);

    // Unknown: nothing is allowed
    return entered ?? { uid: schema.uid, base: '', root: true, fields: compileFields([]) };
  };

  /** Records what a component or dynamic zone attribute owns, before the traversal goes in */
  const enter = (visited: VisitedKey, frame: Frame) => {
    const { key, attribute, path, value } = visited;

    if (attribute === undefined || value == null) {
      return;
    }

    let owned: string[];

    if (attribute.type === 'component') {
      owned = [attribute.component];
    } else if (attribute.type === 'dynamiczone') {
      owned = attribute.components ?? [];
    } else {
      return;
    }

    const child: Frame = { ...frame, base: frame.base === '' ? key : `${frame.base}.${key}` };

    if (path.rawWithIndices !== undefined) {
      const at = path.rawWithIndices as string;

      if (Array.isArray(value)) {
        value.forEach((_, index) => components.set(`${at}.${index}`, child));
      } else {
        components.set(at, child);
      }

      return;
    }

    for (const uid of owned) {
      components.set(`${path.attribute}|${uid}`, child);
    }
  };

  const self: FieldCheck = {
    check(visited) {
      const { key, attribute, path } = visited;

      if (attribute === undefined) {
        return null;
      }

      const frame = frameOf(visited, true);

      enter(visited, frame);

      if (isInput && !frame.root) {
        return null;
      }

      if (frame.base === '') {
        // What every caller reads; the stamp is set by the server, whatever the body says
        if (!isInput && ALWAYS_READABLE.has(key)) {
          return null;
        }

        if (isInput && stampKeys(frame.uid).has(key)) {
          return null;
        }
      }

      const field = frame.base === '' ? key : `${frame.base}.${key}`;

      if (allows(frame.fields, field)) {
        return null;
      }

      return {
        key,
        path: path.attribute,
        uid: frame.uid,
        action: frame.root ? action : 'find',
        field,
      };
    },

    forNode(visited) {
      return createFieldCheck(params, frameOf(visited, false));
    },
  };

  return self;
};

/**
 * A visitor for a traversal that applies `check`: `deny` runs on each key a rule denies. With
 * `nodes` the visitor also walks the `filters` and `sort` of every populate node, which a populate
 * traversal leaves to the visitors, with the node's own rules. `mutates` says `deny` removes the
 * key, so the walked value is set back.
 */
export const createFieldVisitor = (
  check: FieldCheck,
  deny: (denial: Denial, key: string, utils: Parameters<Visitor>[1]) => void,
  { nodes = false, mutates }: { nodes?: boolean; mutates: boolean }
): Visitor => {
  const visitor: Visitor = (visited, utils) => {
    if (visited.attribute !== undefined) {
      const denial = check.check(visited as VisitedKey);

      if (denial !== null) {
        deny(denial, visited.key, utils);
      }

      return undefined;
    }

    const { key, value } = visited;

    if (!nodes || (key !== 'filters' && key !== 'sort') || value == null) {
      return undefined;
    }

    const inner = createFieldVisitor(check.forNode(visited as VisitedKey), deny, { mutates });
    const traverse = key === 'filters' ? traverseQueryFilters : traverseQuerySort;

    return traverse(inner, { schema: visited.schema, getModel: visited.getModel }, value).then(
      (walked: unknown) => {
        if (mutates) {
          utils.set(key, walked);
        }
      }
    ) as unknown as void;
  };

  return visitor;
};
