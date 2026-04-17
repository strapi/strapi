import type { Context } from 'koa';

type CreateContextInput = {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

/**
 * Builds a minimal Koa-like context for controller/strategy tests.
 * Overrides are spread last so request, state, etc. can be passed in.
 * Return type is Context so callers can pass the result to Koa handlers/strategies.
 */
export default function createContext<T extends Record<string, unknown> = Record<string, unknown>>(
  { params = {}, query = {}, body = {} }: CreateContextInput = {},
  overrides: T = {} as T
): Context {
  return {
    params,
    query,
    request: {
      query,
      body,
    },
    ...overrides,
  } as unknown as Context;
}
