'use strict';

const createEventHub = require('../../../../../strapi/lib/services/event-hub');
const createAuditLogsService = require('../audit-logs');

jest.mock('../../../../server/register');

describe('Audit logs service', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
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

      global.strapi = {
        admin: {
          services: {
            permission: {
              actionProvider: { registerMany: jest.fn() },
            },
          },
        },
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

    beforeEach(() => {
      jest.mock('@strapi/strapi/lib/utils/ee', () => ({
        features: {
          // We only enabled audit logs
          isEnabled: (feature) => feature === 'audit-logs',
        },
      }));
      global.strapi = {
        admin: {
          services: {
            permission: {
              actionProvider: { registerMany: jest.fn() },
            },
          },
        },
        container: {
          register: mockRegister,
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
    });

    it('should register and init the audit logs service when registered', async () => {
      const eeAdminRegister = require('../../register');

      await eeAdminRegister({ strapi });

      expect(mockRegister).toHaveBeenCalledWith('audit-logs', expect.anything());
    });

    it('should emit an event and capture it in the audit logs', async () => {
      const logSpy = jest.spyOn(console, 'log');

      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.register();

      jest.useFakeTimers().setSystemTime(new Date('1970-01-01T00:00:00.000Z'));
      await strapi.eventHub.emit('entry.create', { meta: 'test' });

      // TODO: Replace with a test to save to db
      const [message, payload] = logSpy.mock.lastCall;
      expect(message).toBe('Saving event');
      expect(payload).toMatchObject({
        action: 'entry.create',
        date: '1970-01-01T00:00:00.000Z',
        payload: { meta: 'test' },
        userId: 1,
      });
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

    it('should throw and error when name is empty', async () => {
      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.register();

      await expect(() => {
        return strapi.eventHub.emit('', { meta: 'test' });
      }).rejects.toThrowError('Name is required');
    });
  });
});
