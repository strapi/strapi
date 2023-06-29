import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createStore } from 'redux';

import useAuditLogsData from '../hooks/useAuditLogsData';
import ListView from '../index';

import { getBigTestPageData, TEST_PAGE_DATA, TEST_SINGLE_DATA } from './utils/data';

jest.mock('../hooks/useAuditLogsData', () => jest.fn());

const mockUseQuery = jest.fn();

// TODO: Refactor to use msw instead
jest.mock('react-query', () => {
  const actual = jest.requireActual('react-query');

  return {
    ...actual,
    useQuery: () => mockUseQuery(),
  };
});

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(() => ({
    allowedActions: { canRead: true },
  })),
}));

const history = createMemoryHistory();

const setup = (props) => ({
  ...render(<ListView {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: {
              permissions: {
                ...fixtures.permissions.app,
                settings: {
                  ...fixtures.permissions.app.settings,
                  auditLogs: {
                    main: [{ action: 'admin::audit-logs.read', subject: null }],
                    read: [{ action: 'admin::audit-logs.read', subject: null }],
                  },
                },
              },
            },
          })}
        >
          <QueryClientProvider client={client}>
            <ThemeProvider theme={lightTheme}>
              <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
                <Router history={history}>{children}</Router>
              </IntlProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  }),
  user: userEvent.setup(),
});

const waitForReload = async () => {
  await screen.findByText('Audit Logs', { selector: 'h1' });
};

describe('ADMIN | Pages | AUDIT LOGS | ListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up history after each test
    history.location.search = '';
  });

  it('should render page with right header details', () => {
    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: [],
      },
      isLoading: false,
    });

    const { getByText } = setup();
    const title = getByText(/audit logs/i);
    expect(title).toBeInTheDocument();
    const subTitle = getByText(/logs of all the activities that happened in your environment/i);
    expect(subTitle).toBeInTheDocument();
    expect(getByText(/filters/i)).toBeInTheDocument();
  });

  it('should show a list of audit logs with all actions', async () => {
    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: TEST_PAGE_DATA,
      },
      isLoading: false,
    });

    const { getByText } = setup();

    await waitFor(() => expect(getByText('Create role')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Delete role')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Create entry (article)')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Admin logout')).toBeInTheDocument());
  });

  it('should open a modal when clicked on a table row and close modal when clicked', async () => {
    mockUseQuery.mockReturnValue({
      auditLogs: {
        results: TEST_PAGE_DATA,
      },
      isLoading: false,
    });
    const { getByText, queryByRole, user } = setup();

    expect(queryByRole('dialog')).not.toBeInTheDocument();

    mockUseQuery.mockReturnValue({
      data: TEST_SINGLE_DATA,
      status: 'success',
    });

    const auditLogRow = getByText('Create role').closest('tr');
    await user.click(auditLogRow);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    const modalContainer = within(modal);
    expect(modalContainer.getByText('Create role')).toBeInTheDocument();
    expect(modalContainer.getByText('test user')).toBeInTheDocument();
    expect(modalContainer.getAllByText('December 22, 2022, 16:11:03')).toHaveLength(2);

    const closeButton = modalContainer.getByText(/close the modal/i).closest('button');
    await user.click(closeButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show pagination and be on page 1 on first render', async () => {
    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: getBigTestPageData(15),
        pagination: {
          page: 1,
          pageSize: 10,
          pageCount: 2,
          total: 15,
        },
      },
      isLoading: false,
    });

    const { getByText } = setup();

    await waitFor(() => expect(getByText(/go to page 1/i).closest('a')).toHaveClass('active'));
  });

  it('should paginate the results', async () => {
    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: getBigTestPageData(35),
        pagination: {
          page: 1,
          pageSize: 10,
          pageCount: 4,
          total: 35,
        },
      },
      isLoading: false,
    });

    const { getAllByText, getByText, getByLabelText, user } = setup();
    await waitForReload();

    // Should have pagination section with 4 pages
    const pagination = getByLabelText(/pagination/i);
    expect(pagination).toBeVisible();
    const pageButtons = getAllByText(/go to page \d+/i).map((el) => el.closest('a'));
    expect(pageButtons.length).toBe(4);

    // Can't go to previous page since there isn't one
    expect(getByText(/go to previous page/i).closest('a')).toHaveAttribute('aria-disabled', 'true');

    // Can go to next page
    await user.click(getByText(/go to next page/i).closest('a'));
    expect(history.location.search).toBe('?page=2');

    // Can go to previous page
    await user.click(getByText(/go to previous page/i).closest('a'));
    expect(history.location.search).toBe('?page=1');

    // Can go to specific page
    await user.click(getByText(/go to page 3/i).closest('a'));
    expect(history.location.search).toBe('?page=3');
  });

  it('should show 20 elements if pageSize is 20', async () => {
    history.location.search = '?pageSize=20';

    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: getBigTestPageData(20),
        pagination: {
          page: 1,
          pageSize: 20,
          pageCount: 1,
          total: 20,
        },
      },
      isLoading: false,
    });

    const { container } = setup();

    const rows = await waitFor(() => container.querySelector('tbody').querySelectorAll('tr'));
    expect(rows.length).toEqual(20);
  });

  it('should show the correct inputs for filtering', async () => {
    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: TEST_PAGE_DATA,
      },
      isLoading: false,
    });

    const { getByRole, getByLabelText, getByPlaceholderText, user } = setup();
    const filtersButton = getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    const filterButton = getByLabelText(/select field/i, { name: 'action' });
    const operatorButton = getByLabelText(/select filter/i, { name: 'is' });
    const comboBoxInput = getByPlaceholderText(/select or enter a value/i);
    const addFilterButton = getByRole('button', { name: /add filter/i });

    expect(filterButton).toBeVisible();
    expect(operatorButton).toBeVisible();
    expect(comboBoxInput).toBeVisible();
    expect(addFilterButton).toBeVisible();
  });

  it('should add filters to the query params', async () => {
    useAuditLogsData.mockReturnValue({
      auditLogs: {
        results: TEST_PAGE_DATA,
      },
      isLoading: false,
    });

    const { getByRole, getByPlaceholderText, user } = setup();
    // Open the filters popover
    const filtersButton = getByRole('button', { name: /filters/i });
    await user.click(filtersButton);
    // Click the combobox
    await user.click(getByPlaceholderText(/select or enter a value/i));
    // Select an option
    await user.click(getByRole('option', { name: /create entry/i }));
    // Apply the filter
    const addFilterButton = getByRole('button', { name: /add filter/i });
    fireEvent.click(addFilterButton);

    expect(history.location.search).toBe('?filters[$and][0][action][$eq]=entry.create&page=1');
  });
});
