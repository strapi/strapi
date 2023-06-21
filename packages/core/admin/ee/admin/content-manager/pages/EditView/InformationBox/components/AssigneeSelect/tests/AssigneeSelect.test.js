import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
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
              lastname: 'Lastname 2',
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
        const store = createStore((state = {}) => state, {});
        const queryClient = new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        });

        return (
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <IntlProvider locale="en" defaultLocale="en">
                <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
              </IntlProvider>
            </QueryClientProvider>
          </Provider>
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
    const { queryByRole, getByText, queryByText, user } = setup();
    const select = queryByRole('combobox');

    expect(queryByText('Firstname 1 Lastname 1')).not.toBeInTheDocument();

    await user.click(select);

    expect(getByText('Firstname 1 Lastname 1')).toBeInTheDocument();
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

    const { getByText } = setup();

    expect(getByText('Firstname 1 Lastname 1')).toBeInTheDocument();
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

    const { getByText, queryByTestId } = setup();

    await waitFor(() => expect(queryByTestId('loader')).not.toBeInTheDocument());

    expect(getByText('An error occurred while fetching users')).toBeInTheDocument();

    console.error = origConsoleError;
  });

  it('renders a loading state when running the mutation', async () => {
    const { getByTestId, queryByTestId } = setup();

    expect(getByTestId('loader')).toBeInTheDocument();

    await waitFor(() => expect(queryByTestId('loader')).not.toBeInTheDocument());
  });

  it('renders an error message, when the mutation fails', async () => {
    const origConsoleError = console.error;

    console.error = jest.fn();

    const { queryByTestId } = setup();

    await waitFor(() => expect(queryByTestId('loader')).not.toBeInTheDocument());

    // TODO

    console.error = origConsoleError;
  });
});
