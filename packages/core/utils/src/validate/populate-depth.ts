import { isPlainObject } from 'lodash';

import { readActionFor } from '../content-api-permissions';
import type { PermissionChecker } from '../content-api-permissions';
import { ValidationError } from '../errors';
import type { Model } from '../types';

/** The paths of a comma list (`a.x, b.y`), as the Document Service reads it: trimmed, empties dropped */
const pathsOf = (list: string) =>
  list
    .split(',')
    .map((path) => path.trim())
    .filter((path) => path !== '');

/**
 * A populate with its comma lists (`populate=a.x,b.y`, at any level, and in a list of strings) split
 * into one path each, as the Document Service reads them, so every check sees the paths that are
 * populated and not one key named `a.x,b`. `*` and anything else are left as they are.
 */
export const splitPopulateLists = (populate: unknown): unknown => {
  if (typeof populate === 'string') {
    return populate !== '*' && populate.includes(',') ? pathsOf(populate) : populate;
  }

  if (Array.isArray(populate)) {
    return populate.every((item) => typeof item === 'string')
      ? populate.flatMap((item: string) => pathsOf(item))
      : populate;
  }

  if (isPlainObject(populate)) {
    return Object.fromEntries(
      Object.entries(populate as Record<string, unknown>).map(([key, node]) => [
        key,
        splitNodeLists(node),
      ])
    );
  }

  return populate;
};

/** A populate node with the comma lists of its `populate`, and of its fragments' (`on`), split */
const splitNodeLists = (node: unknown): unknown => {
  if (!isPlainObject(node)) {
    return node;
  }

  const { populate, on } = node as { populate?: unknown; on?: unknown };
  const split: Record<string, unknown> = { ...(node as Record<string, unknown>) };

  if (populate !== undefined && populate !== null) {
    split.populate = splitPopulateLists(populate);
  }

  if (isPlainObject(on)) {
    split.on = Object.fromEntries(
      Object.entries(on as Record<string, unknown>).map(([target, fragment]) => [
        target,
        splitNodeLists(fragment),
      ])
    );
  }

  return split;
};

/** How deep a populate map goes: each nested level of populates counts one */
const mapDepth = (populate: unknown): number => {
  // `*` populates every relation of a level: one level
  if (populate === '*') {
    return 1;
  }

  // `folder.notes` is two levels; a comma list (`folder,tags.image`) is its deepest path
  if (typeof populate === 'string') {
    return pathsOf(populate).reduce<number>(
      (deepest, path) =>
        Math.max(
          deepest,
          path === '*' ? 1 : path.split('.').filter((segment) => segment !== '').length
        ),
      0
    );
  }

  if (Array.isArray(populate)) {
    return populate.reduce<number>((deepest, item) => Math.max(deepest, mapDepth(item)), 0);
  }

  if (isPlainObject(populate)) {
    // Every key of a populate map names an attribute: a relation, a component, a dynamic zone or
    // media, each one level
    return Object.values(populate as Record<string, unknown>).reduce<number>(
      (deepest, node) => Math.max(deepest, 1 + nodeDepth(node)),
      0
    );
  }

  return 0;
};

/**
 * How many levels a populate node goes below its own: what its `populate` populates, and what the
 * fragments of its `on` do (a dynamic zone's components, the types of a morph relation). Its
 * `filters`, `sort`, `fields` and `count` populate nothing.
 */
const nodeDepth = (node: unknown): number => {
  if (!isPlainObject(node)) {
    return 0;
  }

  const { populate, on } = node as { populate?: unknown; on?: unknown };
  let depth = populate === undefined || populate === null ? 0 : mapDepth(populate);

  if (isPlainObject(on)) {
    for (const fragment of Object.values(on as Record<string, unknown>)) {
      depth = Math.max(depth, nodeDepth(fragment));
    }
  }

  return depth;
};

/**
 * Refuses a populate that goes deeper than the caller's rows allow (`populateDepth`): the limit is
 * `checker.populateDepth(auth, readAction, rootUid)`, null for none, and the root is the type the
 * query reads. Each level counts one, whatever it populates: a relation, a component, a dynamic
 * zone, media, or `*`.
 *
 * Throws a 400 `ValidationError` naming the root type, so the caller knows which limit applies.
 */
export const assertPopulateDepth = (
  populate: unknown,
  schema: Model,
  ctx: {
    auth: unknown;
    action?: string;
    checker: PermissionChecker;
    getModel(uid: string): Model;
  }
): void => {
  const { auth, action, checker } = ctx;
  const max = checker.populateDepth(auth, readActionFor(action), schema.uid);

  if (max === null) {
    return;
  }

  const depth = mapDepth(populate);

  if (depth > max) {
    throw new ValidationError(
      `Populate depth ${depth} exceeds the limit of ${max} for ${schema.uid}`,
      { source: 'query', param: 'populate' }
    );
  }
};

/** A populate node with what it populates below its own level cut to `remaining` more levels */
const cutNode = (node: unknown, remaining: number): unknown => {
  if (!isPlainObject(node)) {
    return node;
  }

  const { populate, on } = node as { populate?: unknown; on?: unknown };
  const cut: Record<string, unknown> = { ...(node as Record<string, unknown>) };

  if (populate !== undefined && populate !== null) {
    const kept = remaining > 0 ? cutPopulateDepth(populate, remaining) : undefined;

    if (kept === undefined) {
      delete cut.populate;
    } else {
      cut.populate = kept;
    }
  }

  // The fragments of a dynamic zone or a morph relation are not a level of their own
  if (isPlainObject(on)) {
    cut.on = Object.fromEntries(
      Object.entries(on as Record<string, unknown>).map(([target, fragment]) => [
        target,
        cutNode(fragment, remaining),
      ])
    );
  }

  return cut;
};

/**
 * What a populate keeps when it may go `max` levels deep, counted as {@link assertPopulateDepth}
 * counts them: what is deeper is cut, and what is left is the same shape it came in. `undefined`
 * when nothing is left (a limit of 0, or a populate that was only deeper levels). It is how
 * `sanitize.query` holds a controller that only sanitizes to the limit the validator refuses
 * anything beyond.
 */
export const cutPopulateDepth = (populate: unknown, max: number): unknown => {
  if (max <= 0) {
    return undefined;
  }

  if (populate === '*') {
    return populate;
  }

  if (typeof populate === 'string') {
    const kept = pathsOf(populate)
      .map((path) =>
        path
          .split('.')
          .filter((segment) => segment !== '')
          .slice(0, max)
          .join('.')
      )
      .filter((path) => path !== '');

    return kept.length === 0 ? undefined : kept.join(',');
  }

  if (Array.isArray(populate)) {
    const kept = populate
      .map((item) => cutPopulateDepth(item, max))
      .filter((item) => item !== undefined);

    return kept.length === 0 ? undefined : kept;
  }

  if (isPlainObject(populate)) {
    return Object.fromEntries(
      Object.entries(populate as Record<string, unknown>).map(([key, node]) => [
        key,
        cutNode(node, max - 1),
      ])
    );
  }

  return populate;
};
