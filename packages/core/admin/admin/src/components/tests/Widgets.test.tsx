import { render, screen } from '@tests/utils';

import { useGetKeyStatisticsQuery, useGetCountDocumentsQuery } from '../../services/homepage';
import { KeyStatisticsWidget, ProfileWidget } from '../Widgets';

jest.mock('../../services/homepage', () => ({
  useGetCountDocumentsQuery: jest.fn(),
  useGetKeyStatisticsQuery: jest.fn(),
}));

// Mock the useAuth hook
jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAuth: (_consumerName: string, selector: (state: any) => any) =>
    selector({
      user: {
        firstname: 'Ted',
        lastname: 'Lasso',
        email: 'ted.lasso@afcrichmond.co.uk',
        roles: [
          { id: 1, name: 'Super Admin' },
          { id: 2, name: 'Editor' },
        ],
      },
    }),
}));

describe('Homepage Widget Profile component', () => {
  it('should render the widget with correct user info', async () => {
    render(<ProfileWidget />);

    expect(await screen.findByText('Ted Lasso')).toBeInTheDocument();
    expect(await screen.findByText('ted.lasso@afcrichmond.co.uk')).toBeInTheDocument();
    expect(await screen.findByText('Super Admin')).toBeInTheDocument();
    expect(await screen.findByText('Editor')).toBeInTheDocument();
  });
});

describe('Homepage Widget Key Statistics component', () => {
  it('should render the widget with correct key statistics', async () => {
    jest.mocked(useGetKeyStatisticsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: {
        assets: 1,
        contentTypes: 2,
        components: 3,
        locales: 9999,
        admins: 99999,
        webhooks: 999999,
        apiTokens: 9999999,
      },
      refetch: jest.fn(),
    });
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: { draft: 2, published: 3, modified: 1 },
      refetch: jest.fn(),
    });
    render(<KeyStatisticsWidget />);

    // Check entries count
    const entriesContainer = screen
      .getByText('6', { exact: true })
      .closest('[data-testid*="stat"]');
    expect(entriesContainer).toHaveTextContent(/entries/i);

    // Check assets count
    const assetsContainer = screen.getByText('1', { exact: true }).closest('[data-testid*="stat"]');
    expect(assetsContainer).toHaveTextContent(/assets/i);

    // Check content types count
    const contentTypesContainer = screen
      .getByText('2', { exact: true })
      .closest('[data-testid*="stat"]');
    expect(contentTypesContainer).toHaveTextContent(/content-types/i);

    // Check components count
    const componentsContainer = screen
      .getByText('3', { exact: true })
      .closest('[data-testid*="stat"]');
    expect(componentsContainer).toHaveTextContent(/components/i);

    // Check locales count
    const localesContainer = screen
      .getByText(/10K/i, { exact: true })
      .closest('[data-testid*="stat"]');
    expect(localesContainer).toHaveTextContent(/locales/i);

    // Check admins count
    const adminsContainer = screen
      .getByText(/100K/i, { exact: true })
      .closest('[data-testid*="stat"]');
    expect(adminsContainer).toHaveTextContent(/admins/i);

    // Check webhooks count
    const webhooksContainer = screen
      .getByText(/1M/i, { exact: true })
      .closest('[data-testid*="stat"]');
    expect(webhooksContainer).toHaveTextContent(/webhooks/i);

    // Check api tokens count
    const apiTokensContainer = screen
      .getByText(/10M/i, { exact: true })
      .closest('[data-testid*="stat"]');
    expect(apiTokensContainer).toHaveTextContent(/api tokens/i);
  });

  it("shouldn't render locales count if the plugin is not installed", async () => {
    jest.mocked(useGetKeyStatisticsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: {
        assets: 1,
        contentTypes: 2,
        components: 3,
        locales: null,
        admins: 99999,
        webhooks: 999999,
        apiTokens: 9999999,
      },
      refetch: jest.fn(),
    });
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: { draft: 2, published: 3, modified: 1 },
      refetch: jest.fn(),
    });
    render(<KeyStatisticsWidget />);

    const localesContainer = screen.queryByTestId('stat-locales');
    expect(localesContainer).not.toBeInTheDocument();
  });

  it('renders loading state', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: true,
      error: false,
      data: undefined,
      refetch: jest.fn(),
    });
    jest.mocked(useGetKeyStatisticsQuery).mockReturnValue({
      isLoading: true,
      error: false,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<KeyStatisticsWidget />);
    expect(screen.getByText(/loading widget content/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: true,
      data: undefined,
      refetch: jest.fn(),
    });
    jest.mocked(useGetKeyStatisticsQuery).mockReturnValue({
      isLoading: false,
      error: true,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<KeyStatisticsWidget />);
    expect(screen.getByText(/couldn't load widget content/i)).toBeInTheDocument();
  });
});
