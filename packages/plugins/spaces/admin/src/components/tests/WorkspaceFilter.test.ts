import { getCurrentSpaceSlug } from '../../utils/currentSpace';
import { setKnownSpaces } from '../../utils/knownSpaces';
import { addWorkspaceFilterHook } from '../WorkspaceFilter';

import type { ListLayout } from '@strapi/content-manager/strapi-admin';

jest.mock('../../utils/currentSpace', () => ({
  DEFAULT_SPACE_SLUG: 'default',
  getCurrentSpaceSlug: jest.fn(() => 'default'),
}));

const layout = { layout: [], metadatas: {}, options: {}, settings: {} } as unknown as ListLayout;
const ARTICLE_LIST = '/content-manager/collection-types/api::article.article';

describe('addWorkspaceFilterHook', () => {
  beforeEach(() => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('default');
    setKnownSpaces([
      { id: 1, slug: 'default', name: 'Default', color: null },
      { id: 2, slug: 'acme', name: 'Acme', color: '#EE5E52' },
    ]);
  });

  it('appends a relation filter on the workspace slug with a "shared" operator', () => {
    const { displayedFilters } = addWorkspaceFilterHook(
      { displayedFilters: [], layout },
      ARTICLE_LIST
    );

    expect(displayedFilters).toHaveLength(1);
    expect(displayedFilters[0]).toMatchObject({
      name: 'space',
      type: 'relation',
      mainField: { name: 'slug', type: 'string' },
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Acme', value: 'acme' },
      ],
    });
    expect(displayedFilters[0].operators?.map((op) => op.value)).toEqual([
      '$eq',
      '$ne',
      '$null',
      '$notNull',
    ]);
  });

  it('adds nothing in a sub-workspace', () => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('acme');

    const { displayedFilters } = addWorkspaceFilterHook(
      { displayedFilters: [], layout },
      ARTICLE_LIST
    );

    expect(displayedFilters).toHaveLength(0);
  });
});
