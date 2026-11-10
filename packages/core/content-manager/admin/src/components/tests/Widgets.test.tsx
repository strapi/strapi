import { useGetCountDocumentsQuery } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';

import { useGetRecentDocumentsQuery } from '../../services/homepage';
import { ChartEntriesWidget, LastEditedWidget, LastPublishedWidget } from '../Widgets';

import type { RecentDocument } from '../../../../shared/contracts/homepage';

jest.mock('@strapi/admin/strapi-admin', () => ({
  useGetCountDocumentsQuery: jest.fn(),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  adminApi: {
    enhanceEndpoints: jest.fn(() => ({
      injectEndpoints: jest.fn(() => ({
        useGetRecentDocumentsQuery: jest.fn(),
      })),
    })),
    util: {
      resetApiState: { match: jest.fn(() => false) },
    },
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

jest.mock('../../services/homepage', () => ({
  useGetRecentDocumentsQuery: jest.fn(),
}));

const recentDocument: RecentDocument = {
  documentId: 'doc-1',
  locale: null,
  title: 'Article 1',
  kind: 'collectionType',
  contentTypeUid: 'api::article.article',
  contentTypeDisplayName: 'Article',
  updatedAt: '2026-11-10T10:00:00.000Z',
  publishedAt: null,
};

describe.each([
  ['LastEditedWidget', LastEditedWidget],
  ['LastPublishedWidget', LastPublishedWidget],
])('%s', (_name, RecentDocumentsWidget) => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockRecentDocuments = (documents: RecentDocument[]) => {
    jest.mocked(useGetRecentDocumentsQuery).mockReturnValue({
      data: documents,
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGetRecentDocumentsQuery>);
  };

  it('renders the document title', () => {
    mockRecentDocuments([recentDocument]);
    render(<RecentDocumentsWidget />);
    expect(screen.getByText('Article 1')).toBeInTheDocument();
  });

  it('renders "Untitled" for an empty title', () => {
    mockRecentDocuments([{ ...recentDocument, title: '' }]);
    render(<RecentDocumentsWidget />);
    // The server used to send the document id as the title of an empty main field
    expect(screen.getByRole('grid')).not.toHaveTextContent(recentDocument.documentId);
    const titleCell = screen.getByTitle('Untitled');
    expect(titleCell).toHaveTextContent(/^Untitled$/);
  });
});

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
