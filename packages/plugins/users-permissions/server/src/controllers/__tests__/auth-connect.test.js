'use strict';

/* eslint-env jest */

const _ = require('lodash');

jest.mock('../../utils/oauth-connect', () => ({
  createOAuthConnectMiddleware: jest.fn(),
}));

const { createOAuthConnectMiddleware } = require('../../utils/oauth-connect');

/**
 * Mirrors the config provider: the startup copy as own keys, plus `get` over the live tree.
 */
const createConfig = (values) => ({
  ...values,
  get: jest.fn((path, defaultValue) => _.get(values, path, defaultValue)),
});

const setup = ({ serverUrl }) => {
  const oauthConnect = jest.fn();
  createOAuthConnectMiddleware.mockReturnValue(oauthConnect);

  global.strapi = {
    config: createConfig({ server: { url: serverUrl } }),
    store: jest.fn(() => ({ get: jest.fn(async () => ({ github: { enabled: true } })) })),
    log: { warn: jest.fn() },
  };

  const controller = require('../auth')({ strapi: global.strapi });
  const ctx = { request: { url: '/api/connect/github' }, query: {}, state: {} };

  return { controller, ctx, oauthConnect };
};

describe('Auth controller - connect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('warns when the server URL is not absolute', async () => {
    const { controller, ctx, oauthConnect } = setup({ serverUrl: '' });

    await controller.connect(ctx, jest.fn());

    expect(global.strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Make sure to set an absolute url')
    );
    expect(oauthConnect).toHaveBeenCalled();
  });

  test('does not warn when the server URL is absolute', async () => {
    const { controller, ctx, oauthConnect } = setup({ serverUrl: 'http://localhost:1337' });

    await controller.connect(ctx, jest.fn());

    expect(global.strapi.log.warn).not.toHaveBeenCalled();
    expect(oauthConnect).toHaveBeenCalled();
  });
});
