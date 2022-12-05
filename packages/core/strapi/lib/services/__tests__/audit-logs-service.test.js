'use strict';

// Mock before modules require it
const mockIsEnabled = jest.fn();

const EventEmitter = require('events');
const createAuditLogsService = require('../audit-logs');

jest.mock('../../utils/ee', () => {
  return {
    features: {
      isEnabled: mockIsEnabled,
    },
  };
});

describe('Audit logs service', () => {
  it('emits an event with the proper license', () => {
    const logSpy = jest.spyOn(console, 'log');
    mockIsEnabled.mockReturnValueOnce(true);
    const strapi = {
      EE: true,
      eventHub: new EventEmitter(),
    };

    strapi.auditLogs = createAuditLogsService(strapi);
    strapi.auditLogs.emitEvent('test', { meta: 'payload1' });
    strapi.auditLogs.emitEvent('test', { meta: 'payload2' });

    expect(strapi.eventHub.eventNames().includes('test')).toBe(true);
    expect(strapi.eventHub.eventNames().length).toBe(1);
    // TODO: Replace with a test to save to db
    expect(logSpy.mock.calls[0][0]).toStrictEqual(
      `Listened to event test with payload: ${JSON.stringify({ meta: 'payload1' })}`
    );
    expect(logSpy.mock.calls[1][0]).toStrictEqual(
      `Listened to event test with payload: ${JSON.stringify({ meta: 'payload2' })}`
    );
  });

  it('does not emit event without the proper license', () => {
    mockIsEnabled.mockReturnValueOnce(false);
    const strapi = {
      EE: false,
      eventHub: new EventEmitter(),
    };

    strapi.auditLogs = createAuditLogsService(strapi);
    strapi.auditLogs.emitEvent('test', { meta: 'sphere' });

    expect(strapi.eventHub.eventNames()).toEqual([]);
  });
});
