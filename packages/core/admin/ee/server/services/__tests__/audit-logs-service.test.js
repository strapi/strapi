'use strict';

// Mock before modules require it
const mockIsEnabled = jest.fn();

const EventEmitter = require('events');
const createAuditLogsService = require('../audit-logs');
const createEventHub = require('../../../../../strapi/lib/services/event-hub');
const { createContainer } = require('../../../../../strapi/lib/container');
const eeAdminBootstrap = require('../../bootstrap');
const eeAdminDestroy = require('../../destroy');

jest.mock('@strapi/strapi/lib/utils/ee', () => {
  return {
    features: {
      isEnabled: mockIsEnabled,
    },
  };
});

describe('Audit logs service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('emits an event when the proper license is provided', () => {
    const logSpy = jest.spyOn(console, 'log');
    mockIsEnabled.mockReturnValueOnce(true);

    const strapi = {
      EE: true,
      eventHub: createEventHub(),
      container: createContainer({}),
      service: () => ({
        actionProvider: {
          registerMany: jest.fn(),
        },
      }),
    };
    global.strapi = strapi;

    eeAdminBootstrap({ strapi });

    strapi.eventHub.emit('test', { meta: 'payload1' });
    strapi.eventHub.emit('test', { meta: 'payload2' });

    // TODO: Replace with a test to save to db
    expect(logSpy).toHaveBeenCalledTimes(2);

    // Cleanup
    eeAdminDestroy({ strapi });
  });

  it('does not emit event when the proper license is not provided', () => {
    mockIsEnabled.mockReturnValueOnce(false);
    const strapi = {
      EE: false,
      eventHub: createEventHub(),
    };
    global.strapi = strapi;

    strapi.auditLogs = createAuditLogsService(strapi);
    strapi.auditLogs.addEvent('test', { meta: 'sphere' });

    expect(strapi.eventHub.eventNames()).toEqual([]);
  });

  it('throws when event is missing name or payload', () => {
    mockIsEnabled.mockReturnValueOnce(true);
    const strapi = {
      EE: true,
      eventHub: new EventEmitter(),
    };

    strapi.auditLogs = createAuditLogsService(strapi);

    expect(() => {
      strapi.auditLogs.addEvent('', { meta: 'payload1' });
    }).toThrow('Name and payload are required');
    expect(() => {
      strapi.auditLogs.addEvent('test', {});
    }).toThrow('Name and payload are required');
  });
});
