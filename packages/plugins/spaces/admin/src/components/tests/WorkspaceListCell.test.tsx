import { render, screen } from '@tests/utils';

import { getCurrentSpaceSlug } from '../../utils/currentSpace';
import { addWorkspaceColumnHook, WorkspaceListCell } from '../WorkspaceListCell';

import type { ListLayout } from '@strapi/content-manager/strapi-admin';

jest.mock('../../utils/currentSpace', () => ({
  DEFAULT_SPACE_SLUG: 'default',
  getCurrentSpaceSlug: jest.fn(() => 'default'),
}));

const layout = (options: Record<string, unknown> = {}) =>
  ({ layout: [], metadatas: {}, options, settings: {} }) as unknown as ListLayout;

const ARTICLE_LIST = '/content-manager/collection-types/api::article.article';

describe('WorkspaceListCell', () => {
  it('renders the workspace name, or "Shared" for a shared entry', () => {
    const { rerender } = render(
      <WorkspaceListCell space={{ slug: 'acme', name: 'Acme', color: '#EE5E52' }} />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();

    rerender(<WorkspaceListCell space={null} />);
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });
});

describe('addWorkspaceColumnHook', () => {
  beforeEach(() => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('default');
  });

  it('appends a "Workspace" column in the default workspace', () => {
    const { displayedHeaders } = addWorkspaceColumnHook(
      { displayedHeaders: [], layout: layout() },
      ARTICLE_LIST
    );

    expect(displayedHeaders).toHaveLength(1);
    expect(displayedHeaders[0]).toMatchObject({ name: 'space', sortable: false });
  });

  it('adds nothing in a sub-workspace', () => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('acme');

    const { displayedHeaders } = addWorkspaceColumnHook(
      { displayedHeaders: [], layout: layout() },
      ARTICLE_LIST
    );

    expect(displayedHeaders).toHaveLength(0);
  });

  it('adds nothing for opted-out, shared or non-user content types', () => {
    const cases = [
      { options: { spaces: { enabled: false } }, pathname: ARTICLE_LIST },
      { options: { spaces: { scope: 'none' } }, pathname: ARTICLE_LIST },
      { options: { spaces: { sharedEntries: true } }, pathname: ARTICLE_LIST },
      { options: {}, pathname: '/content-manager/collection-types/plugin::users-permissions.user' },
    ];

    for (const { options, pathname } of cases) {
      const { displayedHeaders } = addWorkspaceColumnHook(
        { displayedHeaders: [], layout: layout(options) },
        pathname
      );
      expect(displayedHeaders).toHaveLength(0);
    }
  });

  it('ignores the Redux store the waterfall passes as second argument', () => {
    const store = { getState: () => ({}), dispatch: () => undefined };
    Object.defineProperty(window, 'location', {
      value: { pathname: ARTICLE_LIST },
      writable: true,
    });

    const { displayedHeaders } = addWorkspaceColumnHook(
      { displayedHeaders: [], layout: layout() },
      store
    );

    expect(displayedHeaders).toHaveLength(1);
  });

  /**
   * The admin is served under a basename (`/admin` by default), so the pathname
   * the hook reads at runtime is `/admin/content-manager/…`. Matching a pattern
   * anchored at `/content-manager` misses it and the column never appears.
   */
  it('recognises the list route under the admin basename', () => {
    const { displayedHeaders } = addWorkspaceColumnHook(
      { displayedHeaders: [], layout: layout() },
      `/admin${ARTICLE_LIST}`
    );

    expect(displayedHeaders).toHaveLength(1);
  });

  it('honours an explicit opt-in on a plugin content type', () => {
    const { displayedHeaders } = addWorkspaceColumnHook(
      { displayedHeaders: [], layout: layout({ spaces: { scope: 'space' } }) },
      '/content-manager/collection-types/plugin::upload.file'
    );

    expect(displayedHeaders).toHaveLength(1);
  });
});
