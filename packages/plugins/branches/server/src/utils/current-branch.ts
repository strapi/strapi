import { AsyncLocalStorage } from 'async_hooks';

/**
 * The resolved active branch, as stored on `ctx.state.branch` by the
 * resolve-branch middleware and read everywhere through `getCurrentBranch()`.
 *
 * `chain` lists the branch ids from the branch itself up to (excluding) main:
 * `[self, parent, grandparent, …]`. Rows created on any branch of the chain and
 * deltas recorded on any branch of the chain make up the branch's view.
 */
export interface BranchRef {
  id: number;
  slug: string;
  parentId: number | null;
  chain: number[];
}

interface BranchScope {
  /** `null` = main. */
  branch: BranchRef | null;
  /** Relation-hydration re-entrancy depth (see MAX_OVERLAY_DEPTH). */
  depth: number;
  /** Bypass the DB visibility net entirely (cross-branch listings). */
  unfiltered: boolean;
}

/**
 * Explicit scope override. Code that must act on behalf of another branch (the
 * merge writes into the parent, branch deletion reads the branch being deleted,
 * "in branches" listings read across every branch) wraps its work in
 * `runOnBranch` / `runOnMain` / `runUnfiltered`. AsyncLocalStorage so the
 * override survives awaits without leaking across concurrent requests — same
 * pattern as `runUnscoped` in the spaces plugin.
 */
const scopeStorage = new AsyncLocalStorage<BranchScope>();

const currentScope = (): BranchScope | undefined => scopeStorage.getStore();

export const runOnBranch = <T>(branch: BranchRef | null, fn: () => T | Promise<T>) => {
  const parent = currentScope();
  return scopeStorage.run({ branch, depth: parent?.depth ?? 0, unfiltered: false }, fn);
};

export const runOnMain = <T>(fn: () => T | Promise<T>) => runOnBranch(null, fn);

export const runUnfiltered = <T>(fn: () => T | Promise<T>) => {
  const parent = currentScope();
  return scopeStorage.run(
    { branch: parent?.branch ?? null, depth: parent?.depth ?? 0, unfiltered: true },
    fn
  );
};

/** Runs `fn` one hydration level deeper on the same branch. */
export const runDeeper = <T>(fn: () => T | Promise<T>) => {
  const parent = currentScope();
  return scopeStorage.run(
    {
      branch: parent?.branch ?? getRequestBranch(),
      depth: (parent?.depth ?? 0) + 1,
      unfiltered: parent?.unfiltered ?? false,
    },
    fn
  );
};

const getRequestBranch = (): BranchRef | null => {
  const state = strapi.requestContext.get()?.state as { branch?: BranchRef } | undefined;
  return state?.branch ?? null;
};

/**
 * The branch the current work targets: an explicit override first, then the
 * request's resolved header. `null` = main (also the answer outside any request:
 * cron jobs, bootstrap, CLI).
 */
export const getCurrentBranch = (): BranchRef | null => {
  const scope = currentScope();
  if (scope) {
    return scope.branch;
  }
  return getRequestBranch();
};

export const getOverlayDepth = (): number => currentScope()?.depth ?? 0;

export const isUnfilteredContext = (): boolean => currentScope()?.unfiltered === true;

/**
 * Per-request memo so the read net fetches tombstones once per (branch, uid)
 * instead of once per query. Lives on the request state; absent outside requests.
 */
export const getRequestMemo = (): Map<string, unknown> | null => {
  const state = strapi.requestContext.get()?.state as
    | { __branchesMemo?: Map<string, unknown> }
    | undefined;
  if (!state) {
    return null;
  }
  if (!state.__branchesMemo) {
    state.__branchesMemo = new Map();
  }
  return state.__branchesMemo;
};

export const clearRequestMemo = () => {
  getRequestMemo()?.clear();
};
