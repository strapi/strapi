import { vi } from 'vitest';
import type { Core } from '@strapi/types';

/** Give partial Strapi test doubles the framework type at the test boundary. */
export const createStrapiMock = <T extends object>(mock: T): T & Core.Strapi =>
  mock as T & Core.Strapi;

/** Create the callable origin-scoped session manager used by authentication tests. */
export const createMockSessionManager = (originApiOverrides = {}, rootOverrides = {}) => {
  const originApi = {
    generateRefreshToken: vi.fn(),
    generateAccessToken: vi.fn(),
    validateAccessToken: vi.fn(),
    validateRefreshToken: vi.fn(),
    rotateRefreshToken: vi.fn(),
    invalidateRefreshToken: vi.fn(),
    isSessionActive: vi.fn(),
    ...originApiOverrides,
  };
  const sessionManager = Object.assign(
    vi.fn(() => originApi),
    {
      defineOrigin: vi.fn(),
      hasOrigin: vi.fn(),
      generateSessionId: vi.fn(),
      ...rootOverrides,
    }
  );
  return { sessionManager, originApi };
};
