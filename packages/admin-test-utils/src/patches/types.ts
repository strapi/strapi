/**
 * A `Global` is the jsdom-constructed global object that `jest-environment-jsdom`
 * exposes as `env.global`. We only ever read/write string-keyed properties on it,
 * so a loose `Record<string, unknown>` keeps the patches honest — they should never
 * assume the shape of the broader DOM surface.
 */
export type Global = Record<string, unknown>;

/**
 * Every patch returns a teardown function. The orchestrator pushes them onto a
 * stack and pops in reverse order, mirroring how the patches were applied. That
 * way setup order is automatically the inverse of teardown order, and a patch
 * only needs to close over its own captured originals — no cross-patch state.
 */
export type Teardown = () => void;
