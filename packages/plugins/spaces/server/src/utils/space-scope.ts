import { AsyncLocalStorage } from 'async_hooks';
import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from '../services/spaces';

/**
 * The workspace a piece of work is executed for.
 *
 * Normally it comes from the request (`X-Strapi-Space-Id` resolved by the
 * resolve-space middleware into `ctx.state.spaceId/spaceSlug`). Code that must
 * act for another workspace than the caller's — a write from the default
 * workspace targeting workspace X, the backfill, cross-workspace listings —
 * wraps its work in one of the `run*` helpers below. AsyncLocalStorage keeps
 * the override alive across awaits without leaking between concurrent requests.
 */
interface ScopedOptions {
  /**
   * Rows created inside this scope are workspace-local copies of an inherited
   * document (see services/inheritance.ts), so they carry the override mark.
   * Set for the copy itself and for everything the copy triggers — the publish
   * that rebuilds the published row, a new locale added later.
   */
  asOverride?: boolean;
  /**
   * Hides one document from reads that do not name it, for the duration of an
   * override copy. A copy keeps the original's documentId and therefore its
   * unique field values, so the entity validator would refuse it while the
   * original is still visible; the copy's own source read names the document
   * explicitly and still sees it.
   */
  shadowDocumentId?: string;
}

type SpaceScope =
  | ({ kind: 'scoped'; target: number | null } & ScopedOptions)
  | { kind: 'unscoped' };

const scopeStorage = new AsyncLocalStorage<SpaceScope>();

/**
 * Runs `fn` as if the active workspace were `target` (`null` = the global,
 * unfiltered scope used when editing a shared entry). Every raw read inside
 * — the entity validator's uniqueness query, relation resolution, the document
 * service's own lookups — sees that workspace's rows (its own and the shared ones).
 */
export const runScoped = <T>(
  target: number | null,
  fn: () => T | Promise<T>,
  options: ScopedOptions = {}
): T | Promise<T> => scopeStorage.run({ kind: 'scoped', target, ...options }, fn);

/**
 * Bypasses every workspace filter for the duration of `fn` (internal
 * enumerations: permission sync, listDefaults, the move service, the backfill).
 */
export const runUnscoped = <T>(fn: () => T | Promise<T>): T | Promise<T> =>
  scopeStorage.run({ kind: 'unscoped' }, fn);

export const isUnscopedContext = (): boolean => scopeStorage.getStore()?.kind === 'unscoped';

export const getScopeOverride = (): { target: number | null } | undefined => {
  const scope = scopeStorage.getStore();
  return scope?.kind === 'scoped' ? { target: scope.target } : undefined;
};

/** Whether rows created right now are workspace-local copies of an inherited document. */
export const isOverrideScope = (): boolean => {
  const scope = scopeStorage.getStore();
  return scope?.kind === 'scoped' && scope.asOverride === true;
};

/** The document being copied, hidden from reads that do not name it. */
export const getShadowedDocumentId = (): string | undefined => {
  const scope = scopeStorage.getStore();
  return scope?.kind === 'scoped' ? scope.shadowDocumentId : undefined;
};

export interface RequestSpace {
  id: number;
  slug: string;
  isDefault: boolean;
}

/** The workspace resolved from the request header, if any. */
export const getRequestSpace = (strapi: Core.Strapi): RequestSpace | undefined => {
  const state = strapi.requestContext?.get?.()?.state as
    | { spaceId?: number; spaceSlug?: string }
    | undefined;
  if (state?.spaceId === undefined || state.spaceSlug === undefined) {
    return undefined;
  }
  return {
    id: state.spaceId,
    slug: state.spaceSlug,
    isDefault: state.spaceSlug === DEFAULT_SPACE_SLUG,
  };
};

/**
 * Which rows a read should see.
 *
 *   `unscoped` — internal enumerations: no filter whatsoever, override copies
 *                included. The only scope that sees the whole table.
 *   `global`   — the default workspace, the global write scope (`runScoped(null)`),
 *                or no request at all: every workspace's entries, but not the
 *                workspace-local copies of inherited ones. Those are shadows of
 *                a document that is already in the list; showing them would put
 *                the same document on screen once per workspace that overrode
 *                it, and would make an inherited entry's unique fields collide
 *                with its own copies.
 *   `space`    — one workspace: its own rows, plus the inherited ones it has
 *                not overridden.
 */
export type ReadScope = { kind: 'unscoped' } | { kind: 'global' } | { kind: 'space'; id: number };

export const resolveReadScope = (strapi: Core.Strapi): ReadScope => {
  if (isUnscopedContext()) {
    return { kind: 'unscoped' };
  }
  const override = getScopeOverride();
  if (override) {
    return override.target === null ? { kind: 'global' } : { kind: 'space', id: override.target };
  }
  const request = getRequestSpace(strapi);
  if (!request || request.isDefault) {
    return { kind: 'global' };
  }
  return { kind: 'space', id: request.id };
};

/** @deprecated superseded by `resolveReadScope`; kept for callers that only need the target. */
export const resolveReadTarget = (strapi: Core.Strapi): number | 'all' => {
  const scope = resolveReadScope(strapi);
  return scope.kind === 'space' ? scope.id : 'all';
};
