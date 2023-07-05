import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table, useTableContext } from '@strapi/helper-plugin';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, createStore } from 'redux';

import reducers from '../../../../../../reducers';
import BulkActionButtons, { ConfirmDialogPublishAll } from '../index';

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

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTableContext: jest.fn(() => ({
    selectedEntries: [1, 2],
    setSelectedEntries: jest.fn(),
  })),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
}));

jest.mock('../../../../../../shared/hooks', () => ({
  ...jest.requireActual('../../../../../../shared/hooks'),
  useInjectionZone: () => [],
}));

jest.mock('../SelectedEntriesModal', () => () => <div>SelectedEntriesModal</div>);

const user = userEvent.setup();

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

const setup = (props) => ({
  ...render(<BulkActionButtons {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={client}>
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}} defaultLocale="en">
              <Provider store={store}>
                <MemoryRouter>
                  <Table.Root>{children}</Table.Root>
                </MemoryRouter>
              </Provider>
            </IntlProvider>
          </ThemeProvider>
        </QueryClientProvider>
      );
    },
  }),
});

describe('BulkActionsBar', () => {
  it('should render publish buttons if showPublish is true', () => {
    setup({ showPublish: true });

    expect(screen.getByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
  });

  it('should not render publish buttons if showPublish is false', () => {
    setup({ showPublish: false });

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
  });

  it('should render delete button if showDelete is true', () => {
    setup({ showDelete: true });

    expect(screen.getByRole('button', { name: /\bDelete\b/ })).toBeInTheDocument();
  });

  it('should not render delete button if showDelete is false', () => {
    setup({ showDelete: false });

    expect(screen.queryByRole('button', { name: /\bDelete\b/ })).not.toBeInTheDocument();
  });

  it('should show delete modal if delete button is clicked', async () => {
    setup({ showDelete: true });

    await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    expect(screen.getByText('Confirmation')).toBeInTheDocument();
  });

  it('should call confirm delete all if confirmation button is clicked', async () => {
    const mockConfirmDeleteAll = jest.fn();

    setup({
      showDelete: true,
      onConfirmDeleteAll: mockConfirmDeleteAll,
    });

    await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockConfirmDeleteAll).toHaveBeenCalledWith([1, 2]);
  });

  it('should not show publish button if selected entries are all published', () => {
    useTableContext.mockReturnValueOnce({ selectedEntries: [2] });
    setup({ showPublish: true });

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
  });

  it('should not show unpublish button if selected entries are all unpublished', () => {
    useTableContext.mockReturnValueOnce({ selectedEntries: [1] });
    setup({ showPublish: true });

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
  });

  it('should show publish modal if publish button is clicked', async () => {
    const onConfirmPublishAll = jest.fn();
    setup({ showPublish: true, onConfirmPublishAll });

    await user.click(screen.getByRole('button', { name: /\bpublish\b/i }));

    // Only test that a mock component is rendered. The modal is tested in its own file.
    expect(screen.getByText('SelectedEntriesModal')).toBeInTheDocument();
  });

  it('should show unpublish modal if unpublish button is clicked', async () => {
    const onConfirmUnpublishAll = jest.fn();
    setup({ showPublish: true, onConfirmUnpublishAll });

    await user.click(screen.getByRole('button', { name: /\bunpublish\b/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /\bunpublish\b/i })
    );

    expect(onConfirmUnpublishAll).toHaveBeenCalledWith([1, 2]);
  });
});

const setupConfirmPublish = () => ({
  ...render(
    <ConfirmDialogPublishAll
      isOpen
      onConfirm={jest.fn()}
      onToggleDialog={jest.fn()}
      isConfirmButtonLoading
    />,
    {
      wrapper({ children }) {
        const client = new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        });

        return (
          <QueryClientProvider client={client}>
            <ThemeProvider theme={lightTheme}>
              <IntlProvider locale="en" messages={{}} defaultLocale="en">
                <Provider store={store}>
                  <MemoryRouter>
                    <Table.Root>{children}</Table.Root>
                  </MemoryRouter>
                </Provider>
              </IntlProvider>
            </ThemeProvider>
          </QueryClientProvider>
        );
      },
    }
  ),
});

describe('ConfirmDialogPublishAll', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it('should show a default message if there are not draft relations', async () => {
    setupConfirmPublish();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(
      screen.queryByText('not published yet and might lead to unexpected behavior')
    ).not.toBeInTheDocument();

    expect(
      await screen.findByText('Are you sure you want to publish these entries?')
    ).toBeInTheDocument();
  });

  it('should show the warning message with just 1 draft relation and two entries', async () => {
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

    setupConfirmPublish();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const draftWarning = await screen.getByText(/relation out of/i);
    expect(draftWarning.textContent).toBe('1  relation  out of 2  entries   is ');
  });

  it('should show the warning message with 2 draft relations and two entries', async () => {
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

    setupConfirmPublish();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const draftWarning = await screen.getByText(/relations out of/i);
    expect(draftWarning.textContent).toBe('2  relations  out of 2  entries   are ');
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

    setupConfirmPublish();
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
