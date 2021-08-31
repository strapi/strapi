'use strict';

const metricsService = require('../metrics');

describe('Metrics', () => {
  test('sendDidInviteUser', async () => {
    const send = jest.fn(() => Promise.resolve());
    const countUsers = jest.fn(() => Promise.resolve(2));
    const countRoles = jest.fn(() => Promise.resolve(3));
    global.strapi = {
      telemetry: { send },
      admin: {
        services: {
          user: { count: countUsers },
          role: { count: countRoles },
        },
      },
    };

    await metricsService.sendDidInviteUser();

    expect(send).toHaveBeenCalledWith('didInviteUser', { numberOfRoles: 3, numberOfUsers: 2 });
    expect(countUsers).toHaveBeenCalledWith();
    expect(countRoles).toHaveBeenCalledWith();
  });

  test('sendDidUpdateRolePermissions', async () => {
    const send = jest.fn(() => Promise.resolve());
    global.strapi = {
      telemetry: { send },
    };

    await metricsService.sendDidUpdateRolePermissions();

    expect(send).toHaveBeenCalledWith('didUpdateRolePermissions');
  });
});
