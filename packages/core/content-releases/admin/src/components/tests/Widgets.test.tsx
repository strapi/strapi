import { render, screen } from '@tests/utils';

import { useGetUpcomingReleasesQuery } from '../../services/homepage';
import { UpcomingReleasesWidget } from '../Widgets';

jest.mock('../../services/homepage', () => ({
  useGetUpcomingReleasesQuery: jest.fn(),
}));

const scheduledAt = new Date();
scheduledAt.setDate(scheduledAt.getDate() + 1);
scheduledAt.setHours(scheduledAt.getHours() + 1);

const mockReleases = [
  {
    id: 1,
    documentId: '123456',
    name: 'Test Scheduled Release',
    status: 'ready',
    updatedAt: '2025-07-31T00:00:00Z',
    publishedAt: '2025-07-31T00:00:00Z',
    scheduledAt,
    timezone: 'Europe/Paris',
    locale: null,
  },
  {
    id: 2,
    documentId: '234567',
    name: 'Test No Date Release',
    status: 'blocked',
    updatedAt: '2025-07-31T00:00:00Z',
    publishedAt: '2025-07-31T00:00:00Z',
    scheduledAt: null,
    timezone: 'Europe/Paris',
    locale: null,
  },
];

describe('ChartEntriesWidget', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a table with upcoming releases', () => {
    jest.mocked(useGetUpcomingReleasesQuery).mockReturnValue({
      data: mockReleases,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<UpcomingReleasesWidget />);
    expect(screen.getByText('Test Scheduled Release')).toBeInTheDocument();
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
    expect(screen.getByText(/tomorrow/i)).toBeInTheDocument();
    expect(screen.getByText('Test No Date Release')).toBeInTheDocument();
    expect(screen.getByText(/blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/not scheduled/i)).toBeInTheDocument();

    const editLink = screen.getAllByRole('link', { name: /Edit/i })[0];
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute('href');
    expect(editLink).toHaveAttribute(
      'href',
      expect.stringContaining(mockReleases[0].id.toString())
    );
  });

  it('renders loading state', () => {
    jest.mocked(useGetUpcomingReleasesQuery).mockReturnValue({
      isLoading: true,
      error: false,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<UpcomingReleasesWidget />);
    expect(screen.getByText(/loading widget content/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    jest.mocked(useGetUpcomingReleasesQuery).mockReturnValue({
      isLoading: false,
      error: true,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<UpcomingReleasesWidget />);
    expect(screen.getByText(/couldn't load widget content/i)).toBeInTheDocument();
  });

  it('renders no data state', () => {
    jest.mocked(useGetUpcomingReleasesQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: [],
      refetch: jest.fn(),
    });
    render(<UpcomingReleasesWidget />);
    expect(screen.getByText(/no releases/i)).toBeInTheDocument();
  });
});
