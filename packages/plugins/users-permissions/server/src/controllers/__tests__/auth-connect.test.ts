import _ from 'lodash';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createStrapiMock } from '../../../tests/utils';
import { createMockContext } from './utils';
import authController from '../auth';
import { createOAuthConnectMiddleware } from '../../utils/oauth-connect';

vi.mock('../../utils/oauth-connect', () => ({
  createOAuthConnectMiddleware: vi.fn(),
}));

/**
 * Mirrors the config provider: the startup copy as own keys, plus `get` over the live tree.
 */
const createConfig = <T extends object>(values: T) => ({
  ...values,
  get: vi.fn((path: string, defaultValue?: unknown) => _.get(values, path, defaultValue)),
});

const setup = ({ serverUrl }: { serverUrl: string }) => {
  const oauthConnect = vi.fn();
  vi.mocked(createOAuthConnectMiddleware).mockReturnValue(oauthConnect);

  const strapi = createStrapiMock({
    config: createConfig({ server: { url: serverUrl } }),
    store: vi.fn(() => ({ get: vi.fn(async () => ({ github: { enabled: true } })) })),
    log: { warn: vi.fn() },
  });

  const controller = authController({ strapi });
  const ctx = createMockContext({ request: { url: '/api/connect/github' }, query: {}, state: {} });

  return { strapi, controller, ctx, oauthConnect };
};

describe('Auth controller - connect', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('warns when the server URL is not absolute', async () => {
    const { strapi, controller, ctx, oauthConnect } = setup({ serverUrl: '' });

    await controller.connect(ctx, vi.fn());

    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Make sure to set an absolute url')
    );
    expect(oauthConnect).toHaveBeenCalled();
  });

  test('does not warn when the server URL is absolute', async () => {
    const { strapi, controller, ctx, oauthConnect } = setup({ serverUrl: 'http://localhost:1337' });

    await controller.connect(ctx, vi.fn());

    expect(strapi.log.warn).not.toHaveBeenCalled();
    expect(oauthConnect).toHaveBeenCalled();
  });
});
