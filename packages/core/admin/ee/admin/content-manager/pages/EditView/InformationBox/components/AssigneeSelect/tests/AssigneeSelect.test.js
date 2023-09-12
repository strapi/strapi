import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { RBACContext, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { ASSIGNEE_ATTRIBUTE_NAME } from '../../../constants';
import { AssigneeSelect } from '../AssigneeSelect';

const server = setupServer(
  rest.get('*/users', (req, res, ctx) =>
    res(
      ctx.json({
        data: {
          results: [
            {
              id: 1,
              firstname: 'Firstname 1',
              lastname: 'Lastname 1',
            },

            {
              id: 2,
              firstname: 'Firstname 2',
              username: 'jumbojosh',
            },
          ],
        },
      })
    )
  )
);

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
  useNotification: jest.fn(() => ({
    toggleNotification: jest.fn(),
  })),
}));

const setup = (props) => {
  return {
    user: userEvent.setup(),
    ...render(<AssigneeSelect {...props} />, {
      wrapper({ children }) {
        const store = createStore((state = {}) => state, {
          admin_app: {
            permissions: fixtures.permissions.app,
          },
        });
        const queryClient = new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        });

        return (
          <RBACContext.Provider
            value={{
              allPermissions: [
                ...fixtures.permissions.allPermissions,
                {
                  id: 314,
                  action: 'admin::users.read',
                  subject: null,
                  properties: {},
                  conditions: [],
                },
              ],
            }}
          >
            <Provider store={store}>
              <QueryClientProvider client={queryClient}>
                <IntlProvider locale="en" defaultLocale="en">
                  <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
                </IntlProvider>
              </QueryClientProvider>
            </Provider>
          </RBACContext.Provider>
        );
      },
    }),
  };
};

useCMEditViewDataManager.mockReturnValue({
  initialData: {
    [ASSIGNEE_ATTRIBUTE_NAME]: null,
  },
  layout: { uid: 'api::articles:articles' },
});

describe('EE | Content Manager | EditView | InformationBox | AssigneeSelect', () => {
  beforeAll(() => {
    server.listen();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it('renders a select with users, none is selected', async () => {
    const { getByRole, getByText, queryByText, user } = setup();

    await waitFor(() => expect(queryByText('Firstname 1 Lastname 1')).not.toBeInTheDocument());

    await user.click(getByRole('combobox'));

    await waitFor(() => expect(getByText('Firstname 1 Lastname 1')).toBeInTheDocument());
  });

  it('renders a select with users, first user is selected', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [ASSIGNEE_ATTRIBUTE_NAME]: {
          id: 1,
          firstname: 'Firstname 1',
          lastname: 'Lastname 1',
        },
      },
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole } = setup();

    await waitFor(() => expect(queryByRole('combobox')).toHaveValue('Firstname 1 Lastname 1'));
  });

  it('renders a disabled select when there are no users to select', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [ASSIGNEE_ATTRIBUTE_NAME]: {
          id: 1,
          firstname: 'Firstname 1',
          lastname: 'Lastname 1',
        },
      },
      layout: { uid: 'api::articles:articles' },
    });

    server.use(
      rest.get('*/users', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: {
              results: [],
            },
          })
        );
      })
    );

    const { queryByRole } = setup();

    await waitFor(() => expect(queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true'));
  });

  it('renders an error message, when fetching user fails', async () => {
    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      rest.get('*/users', (req, res, ctx) => {
        return res.once(
          ctx.status(500),
          ctx.json({
            data: {
              error: {
                message: 'Error message',
              },
            },
          })
        );
      })
    );

    const { getByText } = setup();

    await waitFor(() =>
      expect(getByText('An error occurred while fetching users')).toBeInTheDocument()
    );

    console.error = origConsoleError;
  });

  it('renders an error message, when the assignee update fails', async () => {
    const origConsoleError = console.error;

    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        id: 1,
        [ASSIGNEE_ATTRIBUTE_NAME]: null,
      },
      layout: { uid: 'api::articles:articles' },
    });

    console.error = jest.fn();

    server.use(
      rest.put('*/content-manager/collection-types/:uid/:entityId/assignee', (req, res, ctx) => {
        return res.once(
          ctx.status(500),
          ctx.json({
            data: {
              error: {
                message: 'Server side error message',
              },
            },
          })
        );
      })
    );

    const { getByRole, getByText, user } = setup();

    await user.click(getByRole('combobox'));
    await user.click(getByText('Firstname 1 Lastname 1'));

    await waitFor(() =>
      expect(getByText('Request failed with status code 500')).toBeInTheDocument()
    );

    console.error = origConsoleError;
  });
});
