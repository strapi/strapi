import { act, renderHook, waitFor, server } from '@tests/utils';
import { rest } from 'msw';

import { useSettingsForm } from '../useSettingsForm';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useOverlayBlocker: () => ({ lockApp: jest.fn(), unlockApp: jest.fn() }),
}));

const mockSchema = {
  validate: () => true,
};

// @ts-expect-error this is fine
const setup = (...args) => renderHook(() => useSettingsForm(...args));

describe('useSettingsForm', () => {
  test('fetches all the providers options', async () => {
    const { result } = setup(mockSchema, jest.fn(), [
      'autoRegister',
      'defaultRole',
      'ssoLockedRoles',
    ]);

    expect(result.current[0].isLoading).toBe(true);
    expect(result.current[0].formErrors).toStrictEqual({});
    expect(result.current[0].initialData).toStrictEqual({});
    expect(result.current[0].modifiedData).toStrictEqual({});
    expect(result.current[0].showHeaderButtonLoader).toBeFalsy();
    expect(result.current[0].showHeaderLoader).toBeTruthy();

    await waitFor(() => expect(result.current[0].isLoading).toBe(false));

    expect(result.current[0].formErrors).toStrictEqual({});
    expect(result.current[0].initialData).toStrictEqual(
      expect.objectContaining({
        autoRegister: false,
        defaultRole: '1',
        ssoLockedRoles: ['1', '2'],
      })
    );

    expect(result.current[0].modifiedData).toStrictEqual(
      expect.objectContaining({
        autoRegister: false,
        defaultRole: '1',
        ssoLockedRoles: ['1', '2'],
      })
    );

    expect(result.current[0].showHeaderButtonLoader).toBeFalsy();
    expect(result.current[0].showHeaderLoader).toBeFalsy();
  });

  test('submit new providers options with duplications', async () => {
    const ssoLockedRolesWithDuplications = ['1', '2', '2', '3'];
    server.use(
      rest.get('*/providers/options', (req, res, ctx) =>
        res.once(
          ctx.status(200),
          ctx.json({
            data: {
              autoRegister: false,
              defaultRole: '1',
              ssoLockedRoles: ssoLockedRolesWithDuplications,
            },
          })
        )
      )
    );

    const cbSucc = jest.fn();

    const { result } = setup(mockSchema, cbSucc, ['autoRegister', 'defaultRole', 'ssoLockedRoles']);
    await waitFor(() => expect(result.current[0].isLoading).toBe(false));
    // call the handleSubmit handler to see if the data provided in modified data are cleaned without duplicates in the ssoLockedRoles list
    const e = { preventDefault: jest.fn() };
    await act(async () => {
      // @ts-expect-error – this is fine
      await result.current[2].handleSubmit(e);
    });

    // @ts-expect-error – the return type of the hook could be better.
    expect(result.current[0].modifiedData.ssoLockedRoles.length).not.toBe(
      ssoLockedRolesWithDuplications.length
    );
  });
});
