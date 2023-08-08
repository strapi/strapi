import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table } from '@strapi/helper-plugin';
import {
  render as renderRTL,
  screen,
  waitForElementToBeRemoved,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, createStore } from 'redux';

import SelectedEntriesModal from '..';
import reducers from '../../../../../../../reducers';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => {
    return jest.fn();
  }),
  useQueryParams: jest.fn(() => [
    {
      query: {
        sort: 'name:DESC',
      },
    },
  ]),
}));

jest.mock('../../../../../../../shared/hooks', () => ({
  ...jest.requireActual('../../../../../../../shared/hooks'),
  useInjectionZone: () => [],
}));

const handlers = [
  rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [
          {
            id: 1,
            name: 'Entry 1',
            publishedAt: null,
          },
          {
            id: 2,
            name: 'Entry 2',
            publishedAt: null,
          },
          {
            id: 3,
            name: 'Entry 3',
            publishedAt: null,
          },
        ],
      })
    );
  }),
  rest.post('*/content-manager/collection-types/:apiId/actions/bulkPublish', (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          count: 3,
        },
      })
    );
  }),
  rest.get(
    '*/content-manager/collection-types/:apiId/actions/countManyEntriesDraftRelations',
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          data: 0,
        })
      );
    }
  ),
];

const server = setupServer(...handlers);

const rootReducer = combineReducers(reducers);
const store = createStore(rootReducer, {
  'content-manager_listView': {
    contentType: {
      uid: 'api::test.test',
      settings: {
        mainField: 'name',
      },
      attributes: {
        id: { type: 'integer' },
        name: { type: 'string', required: true },
      },
    },
    components: [],
  },
});

const user = userEvent.setup();

const render = (ui) => ({
  ...renderRTL(ui, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            <Provider store={store}>
              <QueryClientProvider client={client}>
                <MemoryRouter>{children}</MemoryRouter>
              </QueryClientProvider>
            </Provider>
          </IntlProvider>
        </ThemeProvider>
      );
    },
  }),
});

describe('Bulk publish selected entries modal', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders the selected items in the modal', async () => {
    const { queryByText } = render(
      <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
        <SelectedEntriesModal onToggle={jest.fn()} />
      </Table.Root>
    );

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    expect(screen.getByText(/publish entries/i)).toBeInTheDocument();

    // Nested table should render the selected items from the parent table
    expect(screen.queryByText('Entry 1')).toBeInTheDocument();
    expect(screen.queryByText('Entry 4')).not.toBeInTheDocument();
  });

  it('reacts to selection updates', async () => {
    const { queryByText } = render(
      <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
        <SelectedEntriesModal onToggle={jest.fn()} />
      </Table.Root>
    );

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    // User can toggle selected entries in the modal
    const checkboxEntry1 = await screen.findByRole('checkbox', { name: 'Select 1' });
    const checkboxEntry2 = await screen.findByRole('checkbox', { name: 'Select 2' });
    const checkboxEntry3 = await screen.findByRole('checkbox', { name: 'Select 3' });

    // All table items should be selected by default
    expect(checkboxEntry1).toBeChecked();
    expect(checkboxEntry2).toBeChecked();
    expect(checkboxEntry3).toBeChecked();

    // User can unselect items
    fireEvent.click(checkboxEntry1);
    await waitFor(() => {
      expect(checkboxEntry1).not.toBeChecked();
    });

    fireEvent.click(checkboxEntry2);
    await waitFor(() => {
      expect(checkboxEntry2).not.toBeChecked();
    });

    fireEvent.click(checkboxEntry3);
    await waitFor(() => {
      expect(checkboxEntry3).not.toBeChecked();
    });

    // Publish button should be disabled if no items are selected
    const count = screen.getByText('entries ready to publish', { exact: false });
    expect(count).toHaveTextContent('0 entries ready to publish');
    const publishButton = screen.getByRole('button', { name: /publish/i });
    expect(publishButton).toBeDisabled();

    // If at least one item is selected, the publish button should work
    fireEvent.click(checkboxEntry1);
    await waitFor(() => {
      expect(count).toHaveTextContent('1 entry ready to publish');
      expect(publishButton).not.toBeDisabled();
    });
  });

  it('should publish valid entries after confirming and close the modal', async () => {
    const { queryByText } = render(
      <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
        <SelectedEntriesModal onToggle={jest.fn()} />
      </Table.Root>
    );

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    const publishButton = await screen.findByRole('button', { name: /publish/i });
    await user.click(publishButton);
    const publishDialog = await screen.findByRole('dialog', { name: /confirmation?/i });
    const publishDialogButton = await within(publishDialog).findByRole('button', {
      name: /publish/i,
    });

    expect(publishDialog).toBeInTheDocument();
    expect(publishDialogButton).toBeInTheDocument();

    await user.click(publishDialogButton);

    await waitFor(() => {
      expect(publishDialog).not.toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: 'Entry 1' })).not.toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: 'Entry 2' })).not.toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: 'Entry 3' })).not.toBeInTheDocument();
    });
  });

  it('should only keep entries with validation errors in the modal after publish', async () => {
    server.use(
      rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Entry 1',
              },
              {
                id: 2,
                name: 'Entry 2',
              },
              {
                id: 3,
                name: '',
              },
            ],
          })
        );
      })
    );

    const { queryByText } = render(
      <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
        <SelectedEntriesModal onToggle={jest.fn()} />
      </Table.Root>
    );

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    const publishButton = await screen.findByRole('button', { name: /publish/i });
    await user.click(publishButton);
    const publishDialog = await screen.findByRole('dialog', { name: /confirmation?/i });
    const publishDialogButton = await within(publishDialog).findByRole('button', {
      name: /publish/i,
    });

    expect(publishDialog).toBeInTheDocument();
    expect(publishDialogButton).toBeInTheDocument();

    await user.click(publishDialogButton);

    await waitFor(() => {
      expect(publishDialog).not.toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: 'Entry 1' })).not.toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: 'Entry 2' })).not.toBeInTheDocument();
      expect(screen.getByRole('gridcell', { name: '3' })).toBeInTheDocument();
      expect(
        screen.getByRole('gridcell', { name: 'components.Input.error.validation.required' })
      ).toBeInTheDocument();
    });
  });

  it('should show validation errors if there is an error', async () => {
    server.use(
      rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Entry 1',
              },
              {
                id: 2,
                name: 'Entry 2',
              },
              {
                id: 3,
                name: '',
              },
            ],
          })
        );
      })
    );

    const { queryByText } = render(
      <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
        <SelectedEntriesModal onToggle={jest.fn()} />
      </Table.Root>
    );

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    // Is showing the error message
    expect(
      await screen.findByRole('gridcell', { name: 'components.Input.error.validation.required' })
    ).toBeInTheDocument();

    // Publish button is enabled if at least one selected entry is valid
    const publishButton = await screen.findByRole('button', { name: /publish/i });
    expect(publishButton).not.toBeDisabled();
    // Publish button is disabled if all selected entries have errors
    const checkboxEntry1 = await screen.findByRole('checkbox', { name: 'Select 1' });
    fireEvent.click(checkboxEntry1);
    const checkboxEntry2 = await screen.findByRole('checkbox', { name: 'Select 2' });
    fireEvent.click(checkboxEntry2);
    await waitFor(() => {
      expect(publishButton).toBeDisabled();
    });
  });

  it('should show the correct messages above the table in the selected entries modal', async () => {
    server.use(
      rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Entry 1',
                publishedAt: '2023-08-03T08:14:08.324Z',
              },
              {
                id: 2,
                name: 'Entry 2',
              },
              {
                id: 3,
                name: '',
              },
            ],
          })
        );
      })
    );

    const { queryByText } = render(
      <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
        <SelectedEntriesModal onToggle={jest.fn()} />
      </Table.Root>
    );

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    // Should show a message with the entries already published
    const countAlreadyPublished = await screen.findByText('entry already published', {
      exact: false,
    });

    expect(countAlreadyPublished).toHaveTextContent('1 entry already published');
    // Should show a message with the entries ready to be published
    const countReadyToBePublished = await screen.findByText('entry ready to publish', {
      exact: false,
    });

    expect(countReadyToBePublished).toHaveTextContent('1 entry ready to publish');
    // Should show a message with the entries with errors to fix
    const countWithErrors = await screen.findByText('entry waiting for action', {
      exact: false,
    });
    expect(countWithErrors).toHaveTextContent('1 entry waiting for action');
  });
});
