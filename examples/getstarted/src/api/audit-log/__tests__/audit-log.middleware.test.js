'use strict';

// Mock Strapi
const mockStrapi = {
  entityService: {
    create: jest.fn(),
  },
  log: {
    error: jest.fn(),
    info: jest.fn(),
  },
  server: {
    use: jest.fn(),
  },
};

// Mock context
const createMockContext = (overrides = {}) => ({
  path: '/api/articles',
  method: 'POST',
  query: {},
  request: {
    body: { title: 'Test Article' },
  },
  body: { data: { id: 1, title: 'Test Article' } },
  status: 200,
  state: {},
  get: jest.fn(),
  ...overrides,
});

// Mock next function
const mockNext = jest.fn();

describe('Audit Logging Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Middleware Registration', () => {
    it('should register middleware on strapi.server.use', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });

      expect(mockStrapi.server.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should log bootstrap message', async () => {
      const bootstrap = require('../../../index.js').bootstrap;
      await bootstrap({ strapi: mockStrapi });

      expect(mockStrapi.log.info).toHaveBeenCalledWith('Audit logging middleware has been registered');
    });
  });

  describe('Middleware Functionality', () => {
    let middleware;

    beforeEach(() => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      middleware = mockStrapi.server.use.mock.calls[0][0];
    });

    it('should skip audit logs endpoints to avoid infinite recursion', async () => {
      const ctx = createMockContext({ path: '/api/audit-logs' });
      
      await middleware(ctx, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStrapi.entityService.create).not.toHaveBeenCalled();
    });

    it('should generate unique request ID', async () => {
      const ctx = createMockContext();
      
      await middleware(ctx, mockNext);

      expect(ctx.state.auditRequestId).toBeDefined();
      expect(ctx.state.auditRequestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should store request data in context state', async () => {
      const ctx = createMockContext({
        method: 'POST',
        path: '/api/articles',
        query: { page: 1 },
        request: { body: { title: 'Test' } },
      });

      await middleware(ctx, mockNext);

      expect(ctx.state.auditRequestData).toEqual({
        method: 'POST',
        path: '/api/articles',
        query: { page: 1 },
        body: { title: 'Test' },
      });
    });

    it('should capture user information when user is authenticated', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            role: { name: 'admin' },
          },
        },
      });

      await middleware(ctx, mockNext);

      expect(ctx.state.auditUserInfo).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should handle missing user information', async () => {
      const ctx = createMockContext({
        state: {},
      });

      await middleware(ctx, mockNext);

      expect(ctx.state.auditUserInfo).toBeNull();
    });

    it('should capture IP address from various headers', async () => {
      const ctx = createMockContext({
        get: jest.fn()
          .mockReturnValueOnce('192.168.1.1') // x-forwarded-for
          .mockReturnValueOnce(null) // x-real-ip
          .mockReturnValueOnce('Mozilla/5.0'), // user-agent
        ip: '127.0.0.1',
        request: { ip: '10.0.0.1' },
      });

      await middleware(ctx, mockNext);

      expect(ctx.state.auditIpAddress).toBe('192.168.1.1');
    });

    it('should fallback to ctx.ip when headers are not available', async () => {
      const ctx = createMockContext({
        get: jest.fn().mockReturnValue(null),
        ip: '127.0.0.1',
        request: { ip: '10.0.0.1' },
      });

      await middleware(ctx, mockNext);

      expect(ctx.state.auditIpAddress).toBe('127.0.0.1');
    });

    it('should fallback to ctx.request.ip when ctx.ip is not available', async () => {
      const ctx = createMockContext({
        get: jest.fn().mockReturnValue(null),
        ip: null,
        request: { ip: '10.0.0.1' },
      });

      await middleware(ctx, mockNext);

      expect(ctx.state.auditIpAddress).toBe('10.0.0.1');
    });

    it('should call next() and handle successful requests', async () => {
      const ctx = createMockContext();
      mockNext.mockResolvedValue();

      await middleware(ctx, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(ctx.state.auditError).toBeUndefined();
    });

    it('should capture errors and re-throw them', async () => {
      const ctx = createMockContext();
      const error = new Error('Test error');
      mockNext.mockRejectedValue(error);

      await expect(middleware(ctx, mockNext)).rejects.toThrow('Test error');

      expect(ctx.state.auditError).toEqual({
        message: 'Test error',
        stack: error.stack,
      });
    });

    it('should create audit log entry asynchronously after request', async () => {
      const ctx = createMockContext();
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      await middleware(ctx, mockNext);

      expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
        data: expect.objectContaining({
          contentType: 'articles',
          action: 'create',
          requestId: ctx.state.auditRequestId,
          timestamp: expect.any(Date),
        }),
      });

      // Restore original setImmediate
      global.setImmediate = originalSetImmediate;
    });

    it('should handle audit log creation errors gracefully', async () => {
      const ctx = createMockContext();
      mockNext.mockResolvedValue();
      
      const error = new Error('Database error');
      mockStrapi.entityService.create.mockRejectedValue(error);

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      await middleware(ctx, mockNext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Failed to create audit log:', error);

      // Restore original setImmediate
      global.setImmediate = originalSetImmediate;
    });
  });
});

describe('Helper Functions', () => {
  // We need to extract the helper functions from the index.js file
  // Since they're not exported, we'll test them indirectly through the middleware
  // or we can create a separate test file for them

  describe('getContentTypeFromPath', () => {
    it('should extract contentType from API path', () => {
      // Test through middleware behavior
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ path: '/api/articles' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            contentType: 'articles',
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return null for non-API paths', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ path: '/admin' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).not.toHaveBeenCalled();

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });
  });

  describe('getActionType', () => {
    it('should return "create" for POST requests', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'POST', path: '/api/articles' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            action: 'create',
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return "update" for PUT requests', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'PUT', path: '/api/articles/1' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            action: 'update',
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return "update" for PATCH requests', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'PATCH', path: '/api/articles/1' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            action: 'update',
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return "delete" for DELETE requests', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'DELETE', path: '/api/articles/1' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            action: 'delete',
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return null for non-CRUD methods', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'GET', path: '/api/articles' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).not.toHaveBeenCalled();

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });
  });

  describe('getContentIdFromPath', () => {
    it('should extract contentId from path with ID', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'PUT', path: '/api/articles/123' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            contentId: '123',
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return null for paths without ID', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({ method: 'POST', path: '/api/articles' });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            contentId: '1', // Should be extracted from response body for create operations
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });
  });

  describe('calculateChanges', () => {
    it('should calculate changes between old and new values', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({
        method: 'PUT',
        path: '/api/articles/1',
        request: { body: { title: 'Old Title', content: 'Old Content' } },
        body: { data: { title: 'New Title', content: 'Old Content' } },
      });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            changes: {
              title: {
                from: 'Old Title',
                to: 'New Title',
              },
            },
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });

    it('should return empty object when no changes', () => {
      const register = require('../../../index.js').register;
      register({ strapi: mockStrapi });
      const middleware = mockStrapi.server.use.mock.calls[0][0];

      const ctx = createMockContext({
        method: 'PUT',
        path: '/api/articles/1',
        request: { body: { title: 'Same Title' } },
        body: { data: { title: 'Same Title' } },
      });
      mockNext.mockResolvedValue();

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = jest.fn((fn) => fn());

      return middleware(ctx, mockNext).then(() => {
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::audit-log.audit-log', {
          data: expect.objectContaining({
            changes: {},
          }),
        });

        // Restore original setImmediate
        global.setImmediate = originalSetImmediate;
      });
    });
  });
});
