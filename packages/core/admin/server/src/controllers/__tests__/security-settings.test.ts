/* eslint-env jest */

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import controller from '../security-settings';

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

const buildCtx = (body: Record<string, unknown> = {}) => {
  const notFound = jest.fn();
  const ctx = createContext(
    { body },
    { state: { user: { id: 7 } }, notFound, request: { query: {}, body } }
  ) as any;
  return { ctx, notFound };
};

const settings = { mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] } };

describe('security-settings controller', () => {
  test('both handlers 404 while the feature is off', async () => {
    const getSettings = jest.fn();
    setStrapi({
      admin: {
        services: { mfa: { isEnabled: () => false }, 'security-settings': { getSettings } },
      },
    });
    const { ctx, notFound } = buildCtx();

    await controller.get(ctx);
    await controller.update(ctx);

    expect(notFound).toHaveBeenCalledTimes(2);
    expect(getSettings).not.toHaveBeenCalled();
  });

  test('get returns the settings', async () => {
    setStrapi({
      admin: {
        services: {
          mfa: { isEnabled: () => true },
          'security-settings': { getSettings: jest.fn(() => Promise.resolve(settings)) },
        },
      },
    });
    const { ctx } = buildCtx();

    await controller.get(ctx);

    expect(ctx.body).toEqual({ data: settings });
  });

  test('update validates the body and forwards it with the acting user', async () => {
    const updateSettings = jest.fn(() => Promise.resolve(settings));
    setStrapi({
      admin: {
        services: { mfa: { isEnabled: () => true }, 'security-settings': { updateSettings } },
      },
    });
    const body = {
      mfa: { mode: 'required', graceDays: 3, requiredRoles: ['2'] },
      password: 'pw',
      code: ' 123456 ',
    };
    const { ctx } = buildCtx(body);

    await controller.update(ctx);

    expect(updateSettings).toHaveBeenCalledWith({ ...body, code: '123456' }, { id: 7 });
    expect(ctx.body).toEqual({ data: settings });
  });

  test.each([
    [{ mfa: { mode: 'sometimes', graceDays: 7, requiredRoles: [] } }],
    [{ mfa: { mode: 'optional', graceDays: 0, requiredRoles: [] } }],
    [{ mfa: { mode: 'optional', graceDays: 31, requiredRoles: [] } }],
    [{ mfa: { mode: 'optional', graceDays: 7.5, requiredRoles: [] } }],
    [{ mfa: { mode: 'optional', graceDays: 7 } }],
    [{ mfa: { mode: 'optional', graceDays: 7, requiredRoles: [], extra: true } }],
  ])('update rejects an invalid body %j', async (body) => {
    const updateSettings = jest.fn();
    setStrapi({
      admin: {
        services: { mfa: { isEnabled: () => true }, 'security-settings': { updateSettings } },
      },
    });
    const { ctx } = buildCtx(body);

    await expect(controller.update(ctx)).rejects.toThrow();
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
