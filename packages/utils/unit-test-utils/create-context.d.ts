type CreateContextInput = {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
};

/**
 * Builds a minimal Koa-like context for controller and strategy unit tests.
 * Typed `any` on purpose: tests pass it wherever a Koa `Context` is expected.
 */
declare function createContext(input: CreateContextInput, overrides?: Record<string, unknown>): any;

export = createContext;
