import { lightTheme } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { useGetReleasesForEntryQuery } from '../../services/release';
import { Panel } from '../ReleasesPanel';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: jest.fn(() => [{ query: {} }]),
  useRBAC: jest.fn(() => ({ allowedActions: { canRead: true, canDeleteAction: false } })),
}));

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: jest.fn(() => ({ edit: { options: { draftAndPublish: true } } })),
}));

jest.mock('../../services/release', () => ({
  ...jest.requireActual('../../services/release'),
  useGetReleasesForEntryQuery: jest.fn(),
}));

const renderPanel = (action: { type: 'publish' | 'unpublish'; isEntryValid?: boolean | null }) => {
  (useGetReleasesForEntryQuery as jest.Mock).mockReturnValue({
    data: {
      data: [
        { id: 1, name: 'Matchday release', scheduledAt: null, timezone: null, actions: [action] },
      ],
    },
  });

  // Only the props the panel reads; the full edit-view props are irrelevant here.
  const props = {
    model: 'api::article.article',
    document: { documentId: 'abc' },
    documentId: 'abc',
    collectionType: 'collection-types',
  } as unknown as Parameters<typeof Panel>[0];
  const PanelContent = () => <>{Panel(props)?.content}</>;

  return render(<PanelContent />);
};

describe('ReleasesPanel', () => {
  beforeAll(() => {
    window.strapi.isEE = true;
  });

  // Like the details page and the server: an entry never validated isn't ready either
  it.each([false, null, undefined])('says a publish entry with validity %s is not ready', (v) => {
    renderPanel({ type: 'publish', isEntryValid: v });

    expect(screen.getByText('Not ready to be published in')).toBeInTheDocument();
    expect(screen.queryByText('Will be published in')).not.toBeInTheDocument();
  });

  it('says a valid publish entry will be published', () => {
    renderPanel({ type: 'publish', isEntryValid: true });

    expect(screen.getByText('Will be published in')).toBeInTheDocument();
  });

  // Green would read as "fine" while the copy says it will be skipped
  it('shows a not-ready entry in warning colours', () => {
    renderPanel({ type: 'publish', isEntryValid: false });

    const header = screen.getByText('Not ready to be published in').parentElement;
    expect(header).toHaveStyle({ background: lightTheme.colors.warning100 });
  });

  it('shows a ready entry in success colours', () => {
    renderPanel({ type: 'publish', isEntryValid: true });

    const header = screen.getByText('Will be published in').parentElement;
    expect(header).toHaveStyle({ background: lightTheme.colors.success100 });
  });

  it.each([false, null])('keeps the unpublish copy with validity %s', (v) => {
    renderPanel({ type: 'unpublish', isEntryValid: v });

    expect(screen.getByText('Will be unpublished in')).toBeInTheDocument();
  });
});
