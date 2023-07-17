import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table } from '@strapi/helper-plugin';
import { render as renderRTL, screen, waitFor, within } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom/cjs/react-router-dom.min';
import { combineReducers, createStore } from 'redux';

import { ConfirmBulkActionDialog, ConfirmDialogPublishAll } from '..';
import reducers from '../../../../../../../reducers';

jest.mock('../../../../../../../shared/hooks', () => ({
  ...jest.requireActual('../../../../../../../shared/hooks'),
  useInjectionZone: () => [],
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
}));

const handlers = [
  rest.get('*/countManyEntriesDraftRelations', (req, res, ctx) => {
    return res.once(
      ctx.status(200),
      ctx.json({
        data: 0,
      })
    );
  }),
];

const server = setupServer(...handlers);

const rootReducer = combineReducers(reducers);
const store = createStore(rootReducer, {
  'content-manager_listView': {
    data: [
      { id: 1, publishedAt: null },
      { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
    ],
    contentType: {
      settings: {
        mainField: 'name',
      },
    },
  },
});

describe('ConfirmBulkActionDialog', () => {
  const Component = (props) => (
    <ConfirmBulkActionDialog
      isOpen={false}
      onToggleDialog={jest.fn()}
      dialogBody={<div data-testid="dialog-body" />}
      endAction={<div data-testid="end-action" />}
      {...props}
    />
  );

  const render = (props) => ({
    ...renderRTL(<Component {...props} />, {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            {children}
          </IntlProvider>
        </ThemeProvider>
      ),
    }),
  });

  it('should toggle the dialog', () => {
    const { rerender } = render();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<Component isOpen />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-body')).toBeInTheDocument();
    expect(screen.getByTestId('end-action')).toBeInTheDocument();
  });
});

describe('ConfirmDialogPublishAll', () => {
  const Component = () => (
    <ConfirmDialogPublishAll
      isOpen
      onConfirm={jest.fn()}
      onToggleDialog={jest.fn()}
      isConfirmButtonLoading
    />
  );

  const render = (props) => ({
    ...renderRTL(<Component {...props} />, {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <QueryClientProvider client={client}>
            <IntlProvider locale="en" messages={{}} defaultLocale="en">
              <Provider store={store}>
                <MemoryRouter>
                  <Table.Root defaultSelectedEntries={[1, 2]}>{children}</Table.Root>
                </MemoryRouter>
              </Provider>
            </IntlProvider>
          </QueryClientProvider>
        </ThemeProvider>
      ),
    }),
  });

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it('should show a default message if there are not draft relations', async () => {
    render();

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    expect(
      screen.queryByText('not published yet and might lead to unexpected behavior')
    ).not.toBeInTheDocument();

    expect(
      await screen.findByText('Are you sure you want to publish these entries?')
    ).toBeInTheDocument();
  });

  it('should show the warning message with just 1 draft relation and 2 entries', async () => {
    server.use(
      rest.get('*/countManyEntriesDraftRelations', (req, res, ctx) => {
        return res.once(
          ctx.status(200),
          ctx.json({
            data: 1,
          })
        );
      })
    );

    render();

    await waitFor(() => {
      const publishDialog = screen.getByRole('dialog');
      expect(publishDialog).toBeInTheDocument();
      within(publishDialog).getByText(/1 relation out of 2 entries is/i);
    });
  });

  it('should show the warning message with 2 draft relations and 2 entries', async () => {
    server.use(
      rest.get('*/countManyEntriesDraftRelations', (req, res, ctx) => {
        return res.once(
          ctx.status(200),
          ctx.json({
            data: 2,
          })
        );
      })
    );

    render();

    await waitFor(() => {
      const publishDialog = screen.getByRole('dialog');
      expect(publishDialog).toBeInTheDocument();
      within(publishDialog).getByText(/2 relations out of 2 entries are/i);
    });
  });

  it('should not show the Confirmation component if there is an error coming from the API', async () => {
    server.use(
      rest.get('*/countManyEntriesDraftRelations', (req, res, ctx) => {
        return res.once(
          ctx.status(500),
          ctx.json({
            errorMessage: 'Error',
          })
        );
      })
    );

    render();

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Request failed with status code 500',
      })
    );
    expect(await screen.getByRole('alert')).toBeInTheDocument();
  });
});
