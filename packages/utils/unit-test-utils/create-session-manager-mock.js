'use strict';

/* eslint-env jest */

// Creates a mock for the callable SessionManager service.
// Returns { sessionManager, originApi } where:
// - sessionManager: jest.fn that returns originApi when called with an origin, and has root utilities attached
// - originApi: object with origin-scoped methods as jest.fn()

const createMockSessionManager = (originApiOverrides = {}, rootOverrides = {}) => {
  const originApi = {
    generateRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
    validateAccessToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    invalidateRefreshToken: jest.fn(),
    isSessionActive: jest.fn(),
    ...originApiOverrides,
  };

  const sessionManager = Object.assign(jest.fn().mockReturnValue(originApi), {
    defineOrigin: jest.fn(),
    hasOrigin: jest.fn(),
    generateSessionId: jest.fn(),
    ...rootOverrides,
  });

  return { sessionManager, originApi };
};

module.exports = { createMockSessionManager };
