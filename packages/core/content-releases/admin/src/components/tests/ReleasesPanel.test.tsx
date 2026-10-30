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

const renderPanel = (action: { type: 'publish' | 'unpublish'; isEntryValid?: boolean }) => {
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

  it('says an invalid entry is not ready to be published in the release', () => {
    renderPanel({ type: 'publish', isEntryValid: false });

    expect(screen.getByText('Not ready to be published in')).toBeInTheDocument();
    expect(screen.queryByText('Will be published in')).not.toBeInTheDocument();
  });

  it.each([true, undefined])('says a publish entry with validity %s will be published', (v) => {
    renderPanel({ type: 'publish', isEntryValid: v });

    expect(screen.getByText('Will be published in')).toBeInTheDocument();
  });

  it('keeps the unpublish copy', () => {
    renderPanel({ type: 'unpublish', isEntryValid: false });

    expect(screen.getByText('Will be unpublished in')).toBeInTheDocument();
  });
});
