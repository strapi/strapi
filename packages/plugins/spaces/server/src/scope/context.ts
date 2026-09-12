import { AsyncLocalStorage } from 'node:async_hooks';

import type { Core } from '@strapi/types';

import {
  SPACE_ATTRIBUTE,
  SPACE_STATE_KEY,
  SPACE_UID,
  type SpaceScope,
} from '../../../shared/constants';

/**
 * Scope declared explicitly by code that is not serving a request, or that must
 * act for a space other than the caller's.
 *
 * It takes precedence over the request's own scope, and is kept in
 * AsyncLocalStorage so it survives `await` without leaking into work started
 * elsewhere. Everything inside the callback — the entity validator's uniqueness
 * probe, relation resolution, a nested document-service call — sees it.
 */
const explicitScope = new AsyncLocalStorage<SpaceScope>();

/** Runs `fn` as if the caller were working in `space`. */
export const runInSpace = <T>(space: { id: number; slug: string }, fn: () => T): T =>
  explicitScope.run({ mode: 'space', id: space.id, slug: space.slug }, fn);

/** Runs `fn` with every space visible at once. */
export const runGlobal = <T>(fn: () => T): T => explicitScope.run({ mode: 'global' }, fn);

/**
 * Runs `fn` with no tenant filtering at all.
 *
 * Reserved for code that is responsible for the whole dataset and knows it:
 * the install migration, permission synchronisation, the space registry itself.
 * Unlike `runGlobal` it is not reachable from a request.
 */
export const runUnscoped = <T>(fn: () => T): T => explicitScope.run({ mode: 'unscoped' }, fn);

/**
 * The scope the current unit of work runs in.
 *
 * Resolution order:
 *  1. an explicit scope from one of the `run*` helpers;
 *  2. the scope the request settled on, read from Koa's request-local state;
 *  3. `unscoped` — no request at all, so this is bootstrap, a migration or the
 *     CLI.
 *
 * Case 2 can also yield `unresolved`: inside a request whose scope has not been
 * settled yet. That is not treated as "no filter" — see
 * {@link assertScopeIsUsable}.
 */
export const getScope = (strapi: Core.Strapi): SpaceScope => {
  const explicit = explicitScope.getStore();

  if (explicit) {
    return explicit;
  }

  const requestState = strapi.requestContext?.get?.()?.state as Record<string, unknown> | undefined;

  if (!requestState) {
    return { mode: 'unscoped' };
  }

  const fromRequest = requestState[SPACE_STATE_KEY] as SpaceScope | undefined;

  // A request is being served, so somebody is asking on someone's behalf. If
  // the scope has not been settled we must not fall back to "see everything".
  return fromRequest ?? { mode: 'unresolved' };
};

/** Sets the scope a request runs in. Called once the caller's access is known. */
export const setRequestScope = (ctx: { state: Record<string, unknown> }, scope: SpaceScope) => {
  ctx.state[SPACE_STATE_KEY] = scope;
};

export const getRequestScope = (ctx: { state: Record<string, unknown> }): SpaceScope | undefined =>
  ctx.state[SPACE_STATE_KEY] as SpaceScope | undefined;

/**
 * The `space_id` column of a model, read from the database metadata.
 *
 * Filtering by the `space` *attribute* would make the query builder join
 * `strapi_spaces`, which is wasted work on a read and outright broken on a
 * write: a conditional update with a join is rewritten as a subquery, and that
 * rewrite drops the update's own payload. Naming the column keeps both simple.
 */
export const getSpaceColumn = (strapi: Core.Strapi, uid: string): string | null => {
  const meta = strapi.db.metadata.has?.(uid) ? strapi.db.metadata.get(uid) : undefined;
  const attribute = meta?.attributes?.[SPACE_ATTRIBUTE] as
    | { type?: string; target?: string; joinColumn?: { name?: string } }
    | undefined;

  if (attribute?.type !== 'relation' || attribute.target !== SPACE_UID) {
    return null;
  }

  return attribute.joinColumn?.name ?? null;
};
