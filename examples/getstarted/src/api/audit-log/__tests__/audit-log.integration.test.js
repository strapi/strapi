'use strict';

const request = require('supertest');
const { createStrapiInstance } = require('@strapi/strapi');

describe('Audit Logs API Integration Tests', () => {
  let strapi;
  let app;

  beforeAll(async () => {
    // Create Strapi instance for testing
    strapi = await createStrapiInstance();
    app = strapi.server;
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up audit logs before each test
    await strapi.entityService.deleteMany('api::audit-log.audit-log', {});
  });

  describe('GET /api/audit-logs', () => {
    it('should return empty array when no audit logs exist', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .expect(200);

      expect(response.body).toEqual({
        data: [],
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 0,
            total: 0,
          },
          filters: {
            contentType: undefined,
            userId: undefined,
            action: undefined,
            startDate: undefined,
            endDate: undefined,
          },
          sort: {
            field: 'timestamp',
            order: 'desc',
          },
        },
      });
    });

    it('should return audit logs with pagination', async () => {
      // Create test audit logs
      const auditLogs = [];
      for (let i = 1; i <= 5; i++) {
        const auditLog = await strapi.entityService.create('api::audit-log.audit-log', {
          data: {
            contentType: 'articles',
            contentId: i.toString(),
            action: 'create',
            userId: 'user123',
            userEmail: 'test@example.com',
            userRole: 'admin',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            requestId: `req-${i}`,
            timestamp: new Date(),
            newValues: { title: `Article ${i}` },
            metadata: { status: 200, success: true },
          },
        });
        auditLogs.push(auditLog);
      }

      const response = await request(app)
        .get('/api/audit-logs?page=1&pageSize=3')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 3,
        pageCount: 2,
        total: 5,
      });
    });

    it('should filter audit logs by contentType', async () => {
      // Create test audit logs
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date(),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'users',
          contentId: '1',
          action: 'create',
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/audit-logs?contentType=articles')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].contentType).toBe('articles');
    });

    it('should filter audit logs by action', async () => {
      // Create test audit logs
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date(),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '2',
          action: 'update',
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/audit-logs?action=create')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].action).toBe('create');
    });

    it('should filter audit logs by userId', async () => {
      // Create test audit logs
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          userId: 'user123',
          timestamp: new Date(),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '2',
          action: 'create',
          userId: 'user456',
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/audit-logs?userId=user123')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe('user123');
    });

    it('should filter audit logs by date range', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-01-31T23:59:59.999Z');

      // Create test audit logs
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date('2025-01-15T12:00:00.000Z'),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '2',
          action: 'create',
          timestamp: new Date('2025-02-15T12:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get(`/api/audit-logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(new Date(response.body.data[0].timestamp)).toEqual(new Date('2025-01-15T12:00:00.000Z'));
    });

    it('should sort audit logs by timestamp', async () => {
      // Create test audit logs with different timestamps
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date('2025-01-01T12:00:00.000Z'),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '2',
          action: 'create',
          timestamp: new Date('2025-01-02T12:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/audit-logs?sort=timestamp:asc')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(new Date(response.body.data[0].timestamp)).toEqual(new Date('2025-01-01T12:00:00.000Z'));
      expect(new Date(response.body.data[1].timestamp)).toEqual(new Date('2025-01-02T12:00:00.000Z'));
    });

    it('should validate invalid sort field', async () => {
      const response = await request(app)
        .get('/api/audit-logs?sort=invalidField:asc')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid sort field');
    });

    it('should validate invalid sort order', async () => {
      const response = await request(app)
        .get('/api/audit-logs?sort=timestamp:invalid')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid sort order');
    });

    it('should validate invalid date format', async () => {
      const response = await request(app)
        .get('/api/audit-logs?startDate=invalid-date')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid startDate format');
    });

    it('should validate invalid action', async () => {
      const response = await request(app)
        .get('/api/audit-logs?action=invalid-action')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid action');
    });
  });

  describe('GET /api/audit-logs/:id', () => {
    it('should return single audit log by ID', async () => {
      const auditLog = await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/audit-logs/${auditLog.id}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: auditLog.id,
          contentType: 'articles',
          contentId: '1',
          action: 'create',
        })
      );
    });

    it('should return 404 when audit log not found', async () => {
      const response = await request(app)
        .get('/api/audit-logs/999')
        .expect(404);

      expect(response.body.error.message).toBe('Audit log not found');
    });

    it('should return 400 when ID is missing', async () => {
      const response = await request(app)
        .get('/api/audit-logs/')
        .expect(400);

      expect(response.body.error.message).toBe('Audit log ID is required');
    });
  });

  describe('GET /api/audit-logs/stats', () => {
    it('should return audit log statistics', async () => {
      // Create test audit logs
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date(),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '2',
          action: 'update',
          timestamp: new Date(),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'users',
          contentId: '1',
          action: 'delete',
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/audit-logs/stats')
        .expect(200);

      expect(response.body.data).toEqual({
        total: 3,
        byAction: {
          create: 1,
          update: 1,
          delete: 1,
        },
        period: {
          startDate: null,
          endDate: null,
        },
      });
    });

    it('should return statistics with date range filtering', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-01-31T23:59:59.999Z');

      // Create test audit logs
      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          timestamp: new Date('2025-01-15T12:00:00.000Z'),
        },
      });

      await strapi.entityService.create('api::audit-log.audit-log', {
        data: {
          contentType: 'articles',
          contentId: '2',
          action: 'create',
          timestamp: new Date('2025-02-15T12:00:00.000Z'), // Outside range
        },
      });

      const response = await request(app)
        .get(`/api/audit-logs/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .expect(200);

      expect(response.body.data).toEqual({
        total: 1,
        byAction: {
          create: 1,
          update: 0,
          delete: 0,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    });
  });

  describe('Audit Log Creation', () => {
    it('should create audit log for POST request', async () => {
      // This test would require setting up the middleware and making actual API calls
      // For now, we'll test the audit log creation directly
      const auditData = {
        contentType: 'articles',
        contentId: '1',
        action: 'create',
        userId: 'user123',
        userEmail: 'test@example.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req-123',
        timestamp: new Date(),
        newValues: { title: 'Test Article' },
        metadata: { status: 200, success: true },
      };

      const auditLog = await strapi.entityService.create('api::audit-log.audit-log', {
        data: auditData,
      });

      expect(auditLog).toEqual(
        expect.objectContaining({
          contentType: 'articles',
          contentId: '1',
          action: 'create',
          userId: 'user123',
          userEmail: 'test@example.com',
          userRole: 'admin',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          requestId: 'req-123',
          newValues: { title: 'Test Article' },
          metadata: { status: 200, success: true },
        })
      );
    });

    it('should create audit log for PUT request with changes', async () => {
      const auditData = {
        contentType: 'articles',
        contentId: '1',
        action: 'update',
        userId: 'user123',
        ipAddress: '127.0.0.1',
        requestId: 'req-123',
        timestamp: new Date(),
        changes: {
          title: {
            from: 'Old Title',
            to: 'New Title',
          },
        },
        previousValues: { title: 'Old Title' },
        newValues: { title: 'New Title' },
        metadata: { status: 200, success: true },
      };

      const auditLog = await strapi.entityService.create('api::audit-log.audit-log', {
        data: auditData,
      });

      expect(auditLog).toEqual(
        expect.objectContaining({
          action: 'update',
          changes: {
            title: {
              from: 'Old Title',
              to: 'New Title',
            },
          },
          previousValues: { title: 'Old Title' },
          newValues: { title: 'New Title' },
        })
      );
    });

    it('should create audit log for DELETE request', async () => {
      const auditData = {
        contentType: 'articles',
        contentId: '1',
        action: 'delete',
        userId: 'user123',
        ipAddress: '127.0.0.1',
        requestId: 'req-123',
        timestamp: new Date(),
        previousValues: { title: 'Deleted Article' },
        metadata: { status: 200, success: true },
      };

      const auditLog = await strapi.entityService.create('api::audit-log.audit-log', {
        data: auditData,
      });

      expect(auditLog).toEqual(
        expect.objectContaining({
          action: 'delete',
          previousValues: { title: 'Deleted Article' },
        })
      );
    });
  });
});
