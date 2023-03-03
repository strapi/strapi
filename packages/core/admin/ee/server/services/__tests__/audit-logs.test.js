'use strict';

const createEventHub = require('../../../../../strapi/lib/services/event-hub');
const createAuditLogsService = require('../audit-logs');

jest.mock('../../../../server/register');

describe('Audit logs service', () => {
  afterEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('Init with audit logs disabled', () => {
    beforeAll(() => {
      jest.mock('@strapi/strapi/lib/utils/ee', () => ({
        features: {
          isEnabled: () => false,
        },
      }));
    });

    it('should not register the audit logs service when registered', async () => {
      const eeAdminRegister = require('../../register');
      const mockRegister = jest.fn();

      const strapi = {
        container: {
          register: mockRegister,
        },
      };

      await eeAdminRegister({ strapi });

      expect(mockRegister).not.toHaveBeenCalledWith('audit-logs', expect.anything());
    });
  });

  describe('Init with audit logs enabled', () => {
    const mockRegister = jest.fn();
    const mockAddContentType = jest.fn();
    const mockEntityServiceCreate = jest.fn();
    const mockEntityServiceFindPage = jest.fn();
    const mockEntityServiceFindOne = jest.fn();
    const mockEntityServiceDeleteMany = jest.fn();
    const mockGet = jest.fn((name) => {
      if (name === 'content-types') {
        return {
          add: mockAddContentType,
        };
      }
    });
    const mockScheduleJob = jest.fn((rule, callback) => callback());

    const strapi = {
      admin: {
        services: {
          permission: {
            actionProvider: { registerMany: jest.fn() },
          },
        },
      },
      container: {
        register: mockRegister,
        get: mockGet,
      },
      entityService: {
        create: mockEntityServiceCreate,
        findPage: mockEntityServiceFindPage,
        findOne: mockEntityServiceFindOne,
        deleteMany: mockEntityServiceDeleteMany,
      },
      eventHub: createEventHub(),
      hook: () => ({ register: jest.fn() }),
    };

    const mockSaveEvent = jest.fn();
    const mockFindMany = jest.fn();
    const mockDeleteExpiredEvents = jest.fn();

    beforeAll(() => {
      jest.mock('@strapi/strapi/lib/utils/ee', () => ({
        features: {
          // We only enabled audit logs
          isEnabled: (feature) => feature === 'audit-logs',
          get: () => ({ name: 'audit-logs', options: { retentionDays: 90 } }),
        },
      }));

      jest.mock('@strapi/provider-audit-logs-local', () => ({
        register: jest.fn().mockResolvedValue({
          saveEvent: mockSaveEvent,
          findMany: mockFindMany,
          deleteExpiredEvents: mockDeleteExpiredEvents,
        }),
      }));
      jest.mock('node-schedule', () => {
        return {
          scheduleJob: mockScheduleJob,
        };
      });
    });

    afterEach(() => {
      mockSaveEvent.mockClear();
      mockFindMany.mockClear();
      mockEntityServiceCreate.mockClear();
    });

    beforeEach(() => {
      strapi.requestContext = {
        get() {
          return {
            state: {
              user: {
                id: 1,
              },
              auth: {
                strategy: {
                  name: 'admin',
                },
              },
            },
          };
        },
      };
    });

    it('should register and init the audit logs service when registered', async () => {
      const eeAdminRegister = require('../../register');

      await eeAdminRegister({ strapi });

      expect(mockRegister).toHaveBeenCalledWith('audit-logs', expect.anything());
    });

    it('should emit an event and capture it in the audit logs', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();

      jest.useFakeTimers().setSystemTime(new Date('1970-01-01T00:00:00.000Z'));
      await strapi.eventHub.emit('entry.create', { meta: 'test' });

      // Sends the processed event to a provider
      expect(mockSaveEvent).toHaveBeenCalledTimes(1);
      expect(mockSaveEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'entry.create',
          date: '1970-01-01T00:00:00.000Z',
          payload: { meta: 'test' },
          userId: 1,
        })
      );

      // The provider saves the event in the database
      expect(mockEntityServiceCreate).toHaveBeenCalledTimes(1);
      expect(mockEntityServiceCreate).toHaveBeenCalledWith('admin::audit-log', {
        data: expect.objectContaining({
          action: 'entry.create',
          date: '1970-01-01T00:00:00.000Z',
          payload: { meta: 'test' },
          user: 1,
        }),
      });
    });

    it('ignores events that are not in the event map', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.register();

      const eventName = 'unknown';
      const eventPayload = { meta: 'test' };
      await strapi.eventHub.emit(eventName, eventPayload);

      expect(mockSaveEvent).not.toHaveBeenCalled();
    });

    it('ignores entry events from the upload plugin', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.register();

      await strapi.eventHub.emit('entry.create', { uid: 'plugin::upload.file' });
      await strapi.eventHub.emit('entry.update', { uid: 'plugin::upload.folder' });

      expect(mockSaveEvent).not.toHaveBeenCalled();
    });

    it('should find many audit logs with the right params', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();
      mockEntityServiceFindPage.mockResolvedValueOnce({ results: [], pagination: {} });

      await strapi.eventHub.emit('entry.create', { meta: 'test' });

      const params = { page: 1, pageSize: 10, order: 'createdAt:DESC' };
      const result = await auditLogsService.findMany(params);

      expect(mockEntityServiceFindPage).toHaveBeenCalledTimes(1);
      expect(mockEntityServiceFindPage).toHaveBeenCalledWith('admin::audit-log', {
        ...params,
        populate: ['user'],
        fields: ['action', 'date', 'payload'],
      });
      expect(result).toEqual({ results: [], pagination: {} });
    });

    it('should find one audit log with the right params', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();
      mockEntityServiceFindOne.mockResolvedValueOnce({ id: 1 });

      await strapi.eventHub.emit('entry.create', { meta: 'test' });

      const result = await auditLogsService.findOne(1);

      expect(mockEntityServiceFindOne).toHaveBeenCalledTimes(1);
      expect(mockEntityServiceFindOne).toHaveBeenCalledWith('admin::audit-log', 1, {
        populate: ['user'],
        fields: ['action', 'date', 'payload'],
      });
      expect(result).toEqual({ id: 1, user: null });
    });

    it('should create a cron job that executed one time a day', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();

      expect(mockScheduleJob).toHaveBeenCalledTimes(1);
      expect(mockScheduleJob).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
      expect(mockDeleteExpiredEvents).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should not log event if strategy is not admin', async () => {
      strapi.requestContext = {
        get() {
          return {
            state: {
              auth: {
                strategy: {
                  name: 'content-api',
                },
              },
            },
          };
        },
      };

      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();

      await strapi.eventHub.emit('entry.create', { meta: 'test' });

      expect(mockSaveEvent).not.toHaveBeenCalled();
    });

    it('should use username if user has username when returning an event', async () => {
      mockEntityServiceFindOne.mockResolvedValueOnce({
        user: {
          username: 'testUser',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@doe.com',
        },
      });

      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();
      const event = await auditLogsService.findOne(1);
      expect(event.user.displayName).toEqual('testUser');
    });

    it('should use firstname and lastname if user doesnt have username when returning an event', async () => {
      mockEntityServiceFindOne.mockResolvedValueOnce({
        user: {
          username: null,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@doe.com',
        },
      });

      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();
      const event = await auditLogsService.findOne(1);
      expect(event.user.displayName).toEqual('John Doe');
    });

    it('should use email if username and firstname and lastname are not defined when returning an event', async () => {
      mockEntityServiceFindOne.mockResolvedValueOnce({
        user: {
          username: null,
          firstname: null,
          lastname: null,
          email: 'john@doe.com',
        },
      });

      const auditLogsService = createAuditLogsService(strapi);
      await auditLogsService.register();
      const event = await auditLogsService.findOne(1);
      expect(event.user.displayName).toEqual('john@doe.com');
    });
  });
});
