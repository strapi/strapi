import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useIsMobile: jest.fn().mockReturnValue(false),
}));

jest.mock('../hooks/useContentManagerInitData', () => ({
  useContentManagerInitData: jest.fn(),
}));

import { useContentManagerInitData } from '../hooks/useContentManagerInitData';
import { Layout } from '../layout';

import type { ContentType } from '../../../shared/contracts/content-types';
import type { ContentManagerLink } from '../hooks/useContentManagerInitData';
import type { AppState } from '../modules/app';

const mockUseContentManagerInitData = useContentManagerInitData as jest.MockedFunction<
  typeof useContentManagerInitData
>;

const ARTICLE_MODEL = {
  uid: 'api::article.article',
  isDisplayed: true,
  apiID: 'article',
  kind: 'collectionType',
  info: { displayName: 'Article' },
} as unknown as ContentType;

const ARTICLE_LINK: ContentManagerLink = {
  permissions: [],
  search: null,
  kind: 'collectionType',
  title: 'Article',
  to: '/content-manager/collection-types/api::article.article',
  uid: 'api::article.article',
  name: 'api::article.article',
  isDisplayed: true,
};

const mockAppState = (overrides: Partial<AppState>): AppState => ({
  isLoading: false,
  models: [],
  collectionTypeLinks: [],
  singleTypeLinks: [],
  components: [],
  fieldSizes: {},
  ...overrides,
});

const render = (initialEntry: string) =>
  renderRTL(
    <Routes>
      <Route path="content-manager/*" element={<Layout />}>
        <Route path="403" element={<div>NoPermissions page</div>} />
        <Route path="no-content-types" element={<div>NoContentType page</div>} />
        <Route path="collection-types/:slug/:id" element={<div>EditView page</div>} />
      </Route>
    </Routes>,
    { initialEntries: [initialEntry] }
  );

describe('Layout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the content-manager 403 page when the user has no authorised models for the active locale', () => {
    mockUseContentManagerInitData.mockReturnValue(mockAppState({ models: [ARTICLE_MODEL] }));

    render('/content-manager/collection-types/api::article.article/1');

    expect(screen.getByText('NoPermissions page')).toBeInTheDocument();
  });

  it('redirects to the content-manager no-content-types page when there are no supported models at all', () => {
    mockUseContentManagerInitData.mockReturnValue(mockAppState({ models: [] }));

    render('/content-manager/collection-types/api::article.article/1');

    expect(screen.getByText('NoContentType page')).toBeInTheDocument();
  });

  it('renders the authorised route without redirecting when the user has access', () => {
    mockUseContentManagerInitData.mockReturnValue(
      mockAppState({ models: [ARTICLE_MODEL], collectionTypeLinks: [ARTICLE_LINK] })
    );

    render('/content-manager/collection-types/api::article.article/1');

    expect(screen.getByText('EditView page')).toBeInTheDocument();
  });
});
