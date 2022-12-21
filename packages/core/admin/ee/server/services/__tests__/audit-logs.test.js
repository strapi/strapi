'use strict';

const createEventHub = require('../../../../../strapi/lib/services/event-hub');
const createAuditLogsService = require('../audit-logs');

jest.mock('../../../../server/register');

describe('Audit logs service', () => {
  afterEach(() => {
    jest.resetModules();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.resetAllMocks();
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
    const mockGet = jest.fn((name) => {
      if (name === 'content-types') {
        return {
          add: mockAddContentType,
        };
      }
    });

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
        create: jest.fn(),
      },
      eventHub: createEventHub(),
      requestContext: {
        get() {
          return {
            state: {
              user: {
                id: 1,
              },
            },
          };
        },
      },
    };

    const mockSaveEvent = jest.fn();

    beforeAll(() => {
      jest.mock('@strapi/strapi/lib/utils/ee', () => ({
        features: {
          // We only enabled audit logs
          isEnabled: (feature) => feature === 'audit-logs',
        },
      }));

      jest.mock('@strapi/provider-audit-logs-local', () => ({
        register: jest.fn(),
        saveEvent: mockSaveEvent,
      }));
    });

    afterEach(() => {
      mockSaveEvent.mockClear();
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
    });

    it('ignores events that are not in the event map', async () => {
      const logSpy = jest.spyOn(console, 'log');

      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.register();

      const eventName = 'unknown';
      const eventPayload = { meta: 'test' };
      await strapi.eventHub.emit(eventName, eventPayload);

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
