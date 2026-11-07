import { isObject, pick } from 'lodash';
import { errors, readActionFor } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { getOutputScope, recordWriteScope } from './permissions';
import type { WriteScope } from './permissions';

type Status = 'draft' | 'published';

/** Where a component row sits in its root entry: the attribute that holds it, and its zone component */
interface Step {
  attribute: string;
  /** `__component` of the row, for a row of a dynamic zone */
  component?: string;
}

/**
 * What decides what a caller may read of an entry the resolvers output: the root entry's type and
 * the scope it was read in (the rules are those of the root, per entry), and where this
 * entry sits in it. A root entry has no steps, a component row has the path to it.
 */
export interface EntryScope {
  contentType: Struct.Schema;
  action: string;
  status?: Status;
  locale?: string;
  /**
   * Nothing is known to have matched the caller's read filter, because no resolver of ours read
   * the entry (a custom resolver returned it): every conditional field group is checked against
   * it, and one that has no `documentId` to be checked by gets the always-readable fields only
   *
   */
  unfiltered?: boolean;
  /** What places the root entry for the conditional field groups */
  identity: Record<string, unknown>;
  steps: Step[];
  /** The attributes the caller may read of this entry's own type, once known */
  readable?: Promise<Set<string>>;
  /**
   * How many levels below the root of the request this entry is: 0 for the entries a query or a
   * mutation returns, one more per relation, media, component and dynamic zone
   */
  depth: number;
  /** The type and action of the request's root, whose rows give the populate depth limit */
  depthRoot: { uid: string; action: string };
}

interface NestedContext {
  state: { auth?: unknown };
  entryScopes?: WeakMap<object, EntryScope>;
  writeScopeByPath?: Map<string | number, WriteScope>;
}

/** The attributes a nested resolver resolves from its parent entry */
const NESTED_TYPES = new Set(['relation', 'component', 'dynamiczone', 'media']);

const IDENTITY_KEYS = ['id', 'documentId', 'publishedAt', 'locale'];

/** What `sanitize.output` is given besides the auth: the action, the scope the root was read in, and whether it was filtered */
const optionsOf = (scope: EntryScope) => pick(scope, ['action', 'status', 'locale', 'unfiltered']);

const nestedAttributesOf = (model: Struct.Schema) =>
  Object.entries(model.attributes ?? {})
    .filter(([, attribute]) => NESTED_TYPES.has((attribute as { type: string }).type))
    .map(([name]) => name);

const remember = (context: NestedContext, entry: unknown, scope: EntryScope) => {
  if (isObject(entry)) {
    context.entryScopes ??= new WeakMap();
    context.entryScopes.set(entry, scope);
  }
};

/** The keys a row says its component by: a row of a dynamic zone names it, any other has none */
const componentOf = (step: Step | undefined) =>
  step?.component ? { __component: step.component } : {};

/** The root entry around one row of the scope's path: what `sanitize.output` is given to judge it */
const wrapRow = (scope: EntryScope, row: Record<string, unknown>) => {
  // The row is the root entry's own
  if (scope.steps.length === 0) {
    return { ...scope.identity, ...row };
  }

  let node: Record<string, unknown> = {
    ...componentOf(scope.steps[scope.steps.length - 1]),
    ...row,
  };

  for (let index = scope.steps.length - 1; index >= 0; index -= 1) {
    const holder = index === 0 ? { ...scope.identity } : componentOf(scope.steps[index - 1]);

    node = { ...holder, [scope.steps[index].attribute]: [node] };
  }

  return node;
};

/** The row of the scope's path in what `sanitize.output` answered, if it is still there */
const unwrapRow = (scope: EntryScope, output: unknown): Record<string, unknown> | undefined => {
  let node: unknown = output;

  for (const { attribute } of scope.steps) {
    const value = isObject(node) ? (node as Record<string, unknown>)[attribute] : undefined;

    node = Array.isArray(value) ? value[0] : value;
  }

  return isObject(node) ? (node as Record<string, unknown>) : undefined;
};

/**
 * Sanitizes the entries of a response for a caller with subject-aware permissions: by the output
 * rules of their type, in the status and locale they were read in, and remembers for each entry
 * which of its relations, components, dynamic zones and media the caller may read, so the resolvers
 * of those fields can answer null for the others. The nested attributes are not in
 * the entry (the resolvers load them later), so each goes through the rules as a `null` marker and
 * is taken out again.
 */
export const sanitizeEntries = async (
  strapi: Core.Strapi,
  context: NestedContext,
  contentType: Struct.Schema,
  data: unknown,
  {
    depth = 0,
    depthRoot,
    ...options
  }: {
    action: string;
    status?: Status;
    locale?: string;
    /** For the entries of a relation: one below the parent entry, under the same request root */
    depth?: number;
    depthRoot?: EntryScope['depthRoot'];
  }
) => {
  const names = nestedAttributesOf(contentType);

  const probe = (entry: unknown) =>
    isObject(entry)
      ? {
          ...entry,
          ...Object.fromEntries(
            names.filter((name) => !(name in entry)).map((name) => [name, null])
          ),
        }
      : entry;

  const probed = Array.isArray(data) ? data.map(probe) : probe(data);

  const output = await strapi.contentAPI.sanitize.output(probed, contentType, {
    auth: context.state.auth,
    ...options,
  });

  const finish = (original: unknown, sanitized: unknown) => {
    if (!isObject(original) || !isObject(sanitized)) {
      return sanitized;
    }

    const entry = sanitized as Record<string, unknown>;
    const readable = new Set(names.filter((name) => name in entry));

    for (const name of names) {
      if (!(name in original)) {
        delete entry[name];
      }
    }

    const scope: EntryScope = {
      contentType,
      ...options,
      identity: pick(entry, IDENTITY_KEYS),
      steps: [],
      readable: Promise.resolve(readable),
      depth,
      depthRoot: depthRoot ?? { uid: contentType.uid, action: options.action },
    };

    remember(context, entry, scope);
    remember(context, original, scope);

    return entry;
  };

  return Array.isArray(output)
    ? output.map((sanitized, index) => finish((data as unknown[])[index], sanitized))
    : finish(data, output);
};

/**
 * The scope of a parent entry a nested resolver is given. One a resolver of ours output has its
 * own. An entry no resolver output (a custom resolver's) is a root entry read by `find`, and
 * `unfiltered`: nothing says it matched the caller's read filter. A
 * component row nobody output has no root to judge it by, and is `null`: it is not readable.
 */
export const nestedScopeOf = async (
  strapi: Core.Strapi,
  context: NestedContext,
  parent: unknown,
  parentType: Struct.Schema
): Promise<EntryScope | null> => {
  const known = isObject(parent) ? context.entryScopes?.get(parent) : undefined;

  if (known) {
    return known;
  }

  if (!isObject(parent) || parentType.modelType === 'component') {
    return null;
  }

  const scope: EntryScope = {
    contentType: parentType,
    action: 'find',
    // Not read by a resolver of ours: the one-group shortcut ("it matched the read filter") does
    // not hold, so the entry is checked against every conditional group
    unfiltered: true,
    ...(await getOutputScope(strapi, parentType, {})),
    identity: pick(parent, IDENTITY_KEYS) as Record<string, unknown>,
    steps: [],
    // The root of the request, as far as anything of ours can tell
    depth: 0,
    depthRoot: { uid: parentType.uid, action: 'find' },
  };

  remember(context, parent, scope);

  return scope;
};

/**
 * Whether the caller may read the attribute of the parent entry: its rules are those
 * of the root entry (`fields` of the root's read action, per entry), and a relation whose route the
 * caller may not read is not readable either. Asked once per entry for all its nested attributes.
 */
export const readsAttribute = async (
  strapi: Core.Strapi,
  context: NestedContext,
  scope: EntryScope,
  parentType: Struct.Schema,
  attributeName: string
) => {
  scope.readable ??= (async () => {
    const names = nestedAttributesOf(parentType);
    const output = await strapi.contentAPI.sanitize.output(
      wrapRow(scope, Object.fromEntries(names.map((name) => [name, null]))),
      scope.contentType,
      { auth: context.state.auth, ...optionsOf(scope) }
    );
    const row = unwrapRow(scope, output);

    return new Set(names.filter((name) => row !== undefined && name in row));
  })();

  return (await scope.readable).has(attributeName);
};

/**
 * Refuses (400, as REST does) a relation, media, component or dynamic zone of an entry that goes
 * deeper below the request's root than the caller's rows allow: the limit is
 * `checker.populateDepth` for the root's read action and type, null for none. The
 * attribute is one level below the parent entry.
 */
export const assertNestedDepth = (
  strapi: Core.Strapi,
  context: NestedContext,
  scope: EntryScope
) => {
  const { uid, action } = scope.depthRoot;
  const max = strapi.contentAPI.permissions.checker.populateDepth(
    context.state.auth,
    readActionFor(action),
    uid
  );
  const depth = scope.depth + 1;

  if (max !== null && depth > max) {
    throw new errors.ValidationError(
      `Populate depth ${depth} exceeds the limit of ${max} for ${uid}`,
      {
        source: 'query',
        param: 'populate',
      }
    );
  }
};

/**
 * A populate node at the path of the scope's row, from the root entry: what REST would write as
 * `populate[seo][populate][items]=…` for the component `items` of the row `seo`, so a component's
 * arguments are judged by the root entry's rules where it sits. A row of a dynamic
 * zone is reached through its component's `on` fragment.
 */
export const populateNodeAt = (scope: EntryScope, attributeName: string, node: unknown) => {
  let tree: Record<string, unknown> = { [attributeName]: node };

  for (let index = scope.steps.length - 1; index >= 0; index -= 1) {
    const { attribute, component } = scope.steps[index];

    tree = component
      ? { [attribute]: { on: { [component]: { populate: tree } } } }
      : { [attribute]: { populate: tree } };
  }

  return tree;
};

/** The node {@link populateNodeAt} put at the scope's path, read back from a sanitized populate */
export const populateNodeFrom = (
  scope: EntryScope,
  attributeName: string,
  populate: unknown
): Record<string, unknown> | undefined => {
  let tree: unknown = populate;

  for (const { attribute, component } of scope.steps) {
    const node = isObject(tree) ? (tree as Record<string, any>)[attribute] : undefined;

    tree = component ? node?.on?.[component]?.populate : node?.populate;
  }

  const node = isObject(tree) ? (tree as Record<string, unknown>)[attributeName] : undefined;

  return isObject(node) ? (node as Record<string, unknown>) : undefined;
};

/**
 * The rows of a component or a dynamic zone, sanitized by the rules of the root entry they belong
 * to: the parent's, in the scope REST would read the root in. Each row gets its own scope, so
 * what is nested in it is judged the same way.
 */
export const sanitizeNested = async (
  strapi: Core.Strapi,
  context: NestedContext,
  scope: EntryScope,
  attributeName: string,
  data: unknown
) => {
  if (data === null || data === undefined) {
    return data;
  }

  const output = await strapi.contentAPI.sanitize.output(
    wrapRow(scope, { [attributeName]: data }),
    scope.contentType,
    { auth: context.state.auth, ...optionsOf(scope) }
  );
  const rows = unwrapRow(scope, output)?.[attributeName];

  const finish = (row: unknown) => {
    const component = isObject(row) ? (row as { __component?: unknown }).__component : undefined;

    remember(context, row, {
      ...scope,
      steps: [
        ...scope.steps,
        { attribute: attributeName, ...(typeof component === 'string' ? { component } : {}) },
      ],
      readable: undefined,
      depth: scope.depth + 1,
    });
  };

  if (Array.isArray(rows)) {
    rows.forEach(finish);
  } else {
    finish(rows);
  }

  return rows ?? null;
};

/**
 * The response of a mutation for a caller with subject-aware permissions: a write response reads by
 * the `findOne` fields and takes no one-group shortcut (`create` and `update` are not reads of the
 * caller's own filter), and the version it is remembered by for the relations the client selects.
 */
export const respondToWrite = async (
  strapi: Core.Strapi,
  contentType: Struct.ContentTypeSchema,
  action: 'create' | 'update',
  entity: unknown,
  {
    status,
    locale,
    context,
    info,
  }: {
    status: unknown;
    locale: string | undefined;
    context: NestedContext;
    info: { path?: { key?: string | number } } | undefined;
  }
) => {
  recordWriteScope(context, info, contentType, entity);

  if (entity === null || entity === undefined) {
    return entity;
  }

  return sanitizeEntries(strapi, context, contentType, entity, {
    action,
    ...(await getOutputScope(strapi, contentType, { status, locale })),
  });
};
