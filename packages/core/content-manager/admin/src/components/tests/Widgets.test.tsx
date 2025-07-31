import { useGetCountDocumentsQuery } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';

import { ChartEntriesWidget } from '../Widgets';

jest.mock('@strapi/admin/strapi-admin', () => ({
  useGetCountDocumentsQuery: jest.fn(),
  adminApi: {
    enhanceEndpoints: jest.fn(() => ({
      injectEndpoints: jest.fn(() => ({
        useGetRecentDocumentsQuery: jest.fn(),
      })),
    })),
  },
  Widget: {
    Loading: () => <div>Loading widget content...</div>,
    Error: () => <div>Couldn&apos;t load widget content</div>,
    NoData: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

jest.mock('../../services/api', () => ({
  contentManagerApi: {
    enhanceEndpoints: jest.fn(() => ({
      injectEndpoints: jest.fn(() => ({
        useGetRecentDocumentsQuery: jest.fn(),
      })),
    })),
  },
}));

describe('ChartEntriesWidget', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: true,
      error: false,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<ChartEntriesWidget />);
    expect(screen.getByText(/loading widget content/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: true,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<ChartEntriesWidget />);
    expect(screen.getByText(/couldn't load widget content/i)).toBeInTheDocument();
  });

  it('renders no data state', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: { draft: 0, published: 0, modified: 0 },
      refetch: jest.fn(),
    });
    render(<ChartEntriesWidget />);
    expect(screen.getByText(/no published entries/i)).toBeInTheDocument();
  });

  it('renders chart with data', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: { draft: 2, published: 3, modified: 1 },
      refetch: jest.fn(),
    });
    render(<ChartEntriesWidget />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('formats large numbers', () => {
    jest.mocked(useGetCountDocumentsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: { draft: 950, published: 600, modified: 5000 },
      refetch: jest.fn(),
    });
    render(<ChartEntriesWidget />);
    expect(screen.getByText(/6.6k/i)).toBeInTheDocument();
  });
});
