/**
 * Unit tests for the read-tool utilities added for populate/depth support:
 * the response-size guard (enforceResponseBudget / getMaxResponseBytes) and the
 * RBAC-safe relation-inlining resolver (createInlineRelationResolver / buildInlineOptions).
 */
import type { Ability } from '@casl/ability';
import type { Core, Modules } from '@strapi/types';

import {
  enforceResponseBudget,
  getMaxResponseBytes,
  createInlineRelationResolver,
  buildInlineOptions,
  MCP_DEFAULT_MAX_RESPONSE_BYTES,
} from '../utils';

// permission-checker is resolved through getService('../../utils'). jest.mock is hoisted
// above the imports above by babel-jest, so the mock is in place before '../utils' loads.
const mockPermissionCheckerCreate = jest.fn();
jest.mock('../../utils', () => ({
  getService: jest.fn((name: string) => {
    if (name === 'permission-checker') {
      return { create: mockPermissionCheckerCreate };
    }
    throw new Error(`Unexpected service: ${name}`);
  }),
}));

// Avoid pulling heavy controller/traverse deps at import time — not exercised here.
jest.mock('../sanitizers/shape-relations', () => ({
  shapeRelationsForMcp: jest.fn((_uid: unknown, data: unknown) => Promise.resolve(data)),
}));
jest.mock('../../controllers/utils/metadata', () => ({
  formatDocumentWithMetadata: jest.fn((_c: unknown, _u: unknown, doc: unknown) =>
    Promise.resolve({ data: doc, meta: {} })
  ),
}));

const makeContext = (): Modules.MCP.McpHandlerContext =>
  ({ userAbility: {} as Ability, user: { id: 1 } }) as Modules.MCP.McpHandlerContext;

describe('getMaxResponseBytes', () => {
  it('reads server.mcp.maxResponseBytes with the 1 MB default', () => {
    const get = jest.fn((_key: string, def?: unknown) => def);
    const strapi = { config: { get } } as unknown as Core.Strapi;
    expect(getMaxResponseBytes(strapi)).toBe(MCP_DEFAULT_MAX_RESPONSE_BYTES);
    expect(get).toHaveBeenCalledWith('server.mcp.maxResponseBytes', MCP_DEFAULT_MAX_RESPONSE_BYTES);
  });

  it('returns a configured override', () => {
    const strapi = { config: { get: jest.fn(() => 42) } } as unknown as Core.Strapi;
    expect(getMaxResponseBytes(strapi)).toBe(42);
  });
});

describe('enforceResponseBudget', () => {
  const buildTruncated = (notice: string) => ({ results: [], truncated: true, notice });

  it('returns the payload unchanged when within budget', () => {
    const payload = { results: [{ a: 1 }] };
    expect(enforceResponseBudget(payload, 1_000_000, buildTruncated)).toBe(payload);
  });

  it('returns a truncated payload with a clear notice when over budget', () => {
    const payload = { results: [{ big: 'x'.repeat(500) }] };
    const result = enforceResponseBudget(payload, 100, buildTruncated);
    expect(result.truncated).toBe(true);
    expect(String(result.notice)).toMatch(/exceeded the 100-byte MCP limit/);
    expect(String(result.notice)).toMatch(/populate/);
  });

  it('disables the guard when maxBytes <= 0', () => {
    const payload = { results: [{ big: 'x'.repeat(5000) }] };
    expect(enforceResponseBudget(payload, 0, buildTruncated)).toBe(payload);
  });
});

describe('createInlineRelationResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null for admin::user targets (out of scope) without creating a checker', async () => {
    const resolver = createInlineRelationResolver(makeContext());
    const result = await resolver('admin::user', { documentId: 'u1', email: 'x' });
    expect(result).toBeNull();
    expect(mockPermissionCheckerCreate).not.toHaveBeenCalled();
  });

  it('returns null when the caller cannot read the target type', async () => {
    mockPermissionCheckerCreate.mockReturnValue({
      cannot: { read: jest.fn(() => true) },
      sanitizeOutput: jest.fn(),
    });
    const resolver = createInlineRelationResolver(makeContext());
    expect(await resolver('api::author.author', { documentId: 'a1' })).toBeNull();
  });

  it('sanitizes and returns the entry when readable', async () => {
    const sanitizeOutput = jest.fn(async (doc: Record<string, unknown>) => {
      const { secret, ...rest } = doc;
      return rest;
    });
    mockPermissionCheckerCreate.mockReturnValue({
      cannot: { read: jest.fn(() => false) },
      sanitizeOutput,
    });
    const resolver = createInlineRelationResolver(makeContext());
    const result = await resolver('api::author.author', {
      documentId: 'a1',
      name: 'Ada',
      secret: 'LEAK',
    });
    expect(result).toEqual({ documentId: 'a1', name: 'Ada' });
  });

  it('memoizes the permission checker per target uid', async () => {
    mockPermissionCheckerCreate.mockReturnValue({
      cannot: { read: jest.fn(() => false) },
      sanitizeOutput: jest.fn(async (d: unknown) => d),
    });
    const resolver = createInlineRelationResolver(makeContext());
    await resolver('api::author.author', { documentId: 'a1' });
    await resolver('api::author.author', { documentId: 'a2' });
    expect(mockPermissionCheckerCreate).toHaveBeenCalledTimes(1);
  });
});

describe('buildInlineOptions', () => {
  it('returns undefined when no relations are opted in (preserves default stubbing)', () => {
    expect(buildInlineOptions(new Set(), makeContext())).toBeUndefined();
  });

  it('returns options carrying the keys and a resolver when relations are opted in', () => {
    const options = buildInlineOptions(new Set(['header']), makeContext());
    expect(options?.inlineRelationKeys.has('header')).toBe(true);
    expect(typeof options?.inlineRelation).toBe('function');
  });
});
