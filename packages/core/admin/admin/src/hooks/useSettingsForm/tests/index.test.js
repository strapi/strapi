import * as React from 'react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';
import useSettingsForm from '../index';

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockImplementation(() => toggleNotification),
  useOverlayBlocker: () => ({ lockApp: jest.fn(), unlockApp: jest.fn() }),
}));

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  checkFormValidity: () => (null),
}));

// jest.mock('lodash/omit');

const handlers = [
  rest.put('*/providers/options', (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        data: {
          autoRegister: false,
          defaultRole: "1",
          ssoLockedRoles: ["1","2","3"]
        }
      })
    )
  ),
  rest.get('*/providers/options', (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        data: {
          autoRegister: false,
          defaultRole: "1",
          ssoLockedRoles: ["1","2"]
        }
      })
    )
  )
];

const server = setupServer(...handlers);

const setup = (...args) =>
  renderHook(() => useSettingsForm(...args), {
    wrapper({ children }) {
      return (
        <IntlProvider locale="en" messages={{}}>
          {children}
        </IntlProvider>
      );
    }
  })

describe('useSettingsForm', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });
  test('fetches all the providers options', async () => {
    const { result, waitFor } = setup('/admin/providers/options', {
      validate: jest.fn()
    }, jest.fn(), ['autoRegister', 'defaultRole', 'ssoLockedRoles'] );

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
        defaultRole: "1",
        ssoLockedRoles: ["1","2"]
      })
    );

    expect(result.current[0].modifiedData).toStrictEqual(
      expect.objectContaining({
        autoRegister: false,
        defaultRole: "1",
        ssoLockedRoles: ["1","2"]
      })
    );

    expect(result.current[0].showHeaderButtonLoader).toBeFalsy();
    expect(result.current[0].showHeaderLoader).toBeFalsy();
  });

  test('submit new providers options with duplications', async () => {
    const ssoLockedRolesWithDuplications = [ '1', '2', '2', '3' ];
    server.use(
      rest.get('*/providers/options', (req, res, ctx) =>
        res.once(
          ctx.status(200),
          ctx.json({
            data: {
              autoRegister: false,
              defaultRole: "1",
              ssoLockedRoles: ssoLockedRolesWithDuplications
            }
          })
        )
      )
    )

    const cbSucc = jest.fn();

    const { result, waitFor } = setup('/admin/providers/options', {}, cbSucc, ['autoRegister', 'defaultRole', 'ssoLockedRoles'] );
    await waitFor(() => expect(result.current[0].isLoading).toBe(false));
    const e = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current[2].handleSubmit(e);
    });

    expect(result.current[0].modifiedData.ssoLockedRoles.length).not.toBe(ssoLockedRolesWithDuplications.length);
  });
});