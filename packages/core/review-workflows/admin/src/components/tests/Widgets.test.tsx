import { render, screen } from '@tests/utils';

import * as contentManager from '../../services/content-manager';
import { AssignedWidget } from '../Widgets';

// Mock the useGetRecentlyAssignedDocumentsQuery hook
jest.mock('../../services/content-manager', () => ({
  useGetRecentlyAssignedDocumentsQuery: jest.fn(),
}));

const mockDocuments = [
  {
    documentId: '1',
    title: 'Test Document',
    kind: 'collectionType',
    contentTypeUid: 'api::test.test',
    contentTypeDisplayName: 'Test',
    status: 'published',
    updatedAt: '2024-05-01T12:00:00Z',
    strapi_stage: { name: 'In review', color: 'blue' },
    locale: 'en',
  },
];

describe('AssignedWidget', () => {
  it('renders a table with assigned documents', () => {
    (contentManager.useGetRecentlyAssignedDocumentsQuery as jest.Mock).mockReturnValue({
      data: mockDocuments,
      isLoading: false,
      error: null,
    });

    render(<AssignedWidget />);
    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('In review')).toBeInTheDocument();

    const editLink = screen.getByRole('link', { name: /Edit/i });
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute('href');
    expect(editLink).toHaveAttribute('href', expect.stringContaining(mockDocuments[0].documentId));
  });

  it('shows loading state', () => {
    (contentManager.useGetRecentlyAssignedDocumentsQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<AssignedWidget />);
    expect(screen.getByText('Loading widget content')).toBeInTheDocument();
  });

  it('shows error state', () => {
    (contentManager.useGetRecentlyAssignedDocumentsQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    });

    render(<AssignedWidget />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load widget content.")).toBeInTheDocument();
  });

  it('shows no data state', () => {
    (contentManager.useGetRecentlyAssignedDocumentsQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AssignedWidget />);
    expect(screen.getByText(/No entries/i)).toBeInTheDocument();
  });
});
