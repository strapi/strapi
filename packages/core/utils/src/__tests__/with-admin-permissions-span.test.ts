import {
  type AdminPermissionsObservabilityStrapi,
  withAdminPermissionsSpan,
} from '../observability/with-admin-permissions-span';

function mockStrapi(tracingEnabled: boolean): AdminPermissionsObservabilityStrapi {
  return {
    config: {
      get(key: string) {
        if (key === 'server.observability.tracing.enabled') {
          return tracingEnabled;
        }
        return undefined;
      },
    },
  };
}

describe('withAdminPermissionsSpan', () => {
  it('runs fn directly when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(
      withAdminPermissionsSpan(
        strapi,
        'strapi.admin.permissions.sanitize.query',
        { 'strapi.content_type.uid': 'api::article.article' },
        fn
      )
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when strapi is undefined', async () => {
    const fn = jest.fn().mockResolvedValue(1);
    await expect(
      withAdminPermissionsSpan(undefined, 'strapi.admin.permissions.validate.input', {}, fn)
    ).resolves.toBe(1);
    expect(fn).toHaveBeenCalled();
  });

  it('propagates errors when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(
      withAdminPermissionsSpan(strapi, 'strapi.admin.permissions.sanitize.output', {}, fn)
    ).rejects.toThrow('boom');
  });
});
