'use strict';

const createEventHub = require('../../../../../strapi/lib/services/event-hub');
const createAuditLogsService = require('../audit-logs');

jest.mock('../../../../server/bootstrap');

describe('Audit logs auth', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  describe('Init with audit logs disabled', () => {
    beforeAll(() => {
      jest.mock('@strapi/strapi/lib/utils/ee', () => ({
        features: {
          isEnabled: () => false,
        },
      }));
    });

    it('should not register the audit logs service when bootstraped', async () => {
      const eeAdminBootstrap = require('../../bootstrap');
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

      await eeAdminBootstrap({ strapi });

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
      };
    });

    it('should register and init the audit logs service when bootstraped', async () => {
      const eeAdminBootstrap = require('../../bootstrap');

      await eeAdminBootstrap({ strapi });

      expect(mockRegister).toHaveBeenCalledWith('audit-logs', expect.anything());
    });

    it('should emit an event and capture it in the audit logs', async () => {
      const logSpy = jest.spyOn(console, 'log');

      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.bootstrap();

      const eventName = 'test';
      const eventPayload = { meta: 'test' };
      strapi.eventHub.emit(eventName, eventPayload);
      // TODO: Replace with a test to save to db
      expect(logSpy).toHaveBeenCalledWith(
        `Listened to event ${eventName} with args: ${JSON.stringify(eventPayload)}`
      );
    });

    it('should throw and error when name is empty', () => {
      const auditLogsService = createAuditLogsService(strapi);
      auditLogsService.bootstrap();

      expect(() => strapi.eventHub.emit('', { meta: 'test' })).toThrowError('Name is required');
    });
  });
});
