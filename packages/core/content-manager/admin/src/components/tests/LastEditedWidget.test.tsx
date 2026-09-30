import { render, screen } from '@tests/utils';

import { useGetRecentDocumentsQuery } from '../../services/homepage';
import { LastEditedWidget } from '../Widgets';

import type { RecentDocument } from '../../../../shared/contracts/homepage';

jest.mock('../../services/homepage', () => ({
  useGetRecentDocumentsQuery: jest.fn(),
}));

const documentWithDate: RecentDocument = {
  documentId: '1',
  title: 'Dated entry',
  kind: 'collectionType',
  contentTypeUid: 'api::article.article',
  contentTypeDisplayName: 'Article',
  locale: null,
  status: 'published',
  updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  publishedAt: null,
};

describe('LastEditedWidget', () => {
  it('renders a relative time for a real updatedAt', () => {
    jest.mocked(useGetRecentDocumentsQuery).mockReturnValue({
      data: [documentWithDate],
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    } as ReturnType<typeof useGetRecentDocumentsQuery>);

    render(<LastEditedWidget />);

    expect(screen.getByText('Dated entry')).toBeInTheDocument();
    expect(screen.getByRole('time')).toHaveTextContent(/hour ago/i);
  });

  it('renders a dash when updatedAt is missing', () => {
    jest.mocked(useGetRecentDocumentsQuery).mockReturnValue({
      data: [{ ...documentWithDate, title: 'Undated entry', updatedAt: null }],
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    } as ReturnType<typeof useGetRecentDocumentsQuery>);

    render(<LastEditedWidget />);

    expect(screen.getByText('Undated entry')).toBeInTheDocument();
    expect(screen.getByText('-')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('time')).not.toBeInTheDocument();
    expect(screen.queryByText(/years ago/i)).not.toBeInTheDocument();
  });
});
