/* eslint-disable check-file/filename-naming-convention */
import { render, screen } from '@tests/utils';
import { Route, Routes, useLocation } from 'react-router-dom';

import { useContentManagerInitData } from '../hooks/useContentManagerInitData';
import { Layout } from '../layout';

import type { ContentManagerLink } from '../hooks/useContentManagerInitData';
import type { AppState } from '../modules/app';
import type { Permission } from '@strapi/admin/strapi-admin';

jest.mock('../hooks/useContentManagerInitData');

const ARTICLE_MODEL = {
  uid: 'api::article.article',
  isDisplayed: true,
  apiID: 'article',
  kind: 'collectionType',
  info: {
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
  },
  attributes: {},
} as unknown as AppState['models'][number];

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

const EN_ONLY_READ_PERMISSION = {
  id: 1000,
  action: 'plugin::content-manager.explorer.read',
  subject: 'api::article.article',
  properties: { locales: ['en'] },
  conditions: [],
  actionParameters: {},
} as Permission;

const mockInitData = (overrides: Partial<AppState>) => {
  jest.mocked(useContentManagerInitData).mockReturnValue({
    isLoading: false,
    collectionTypeLinks: [],
    singleTypeLinks: [],
    components: [],
    fieldSizes: {},
    models: [],
    ...overrides,
  });
};

const EditPageProbe = () => {
  const { search } = useLocation();

  return (
    <>
      <div>Edit page</div>
      <div data-testid="search">{decodeURIComponent(search)}</div>
    </>
  );
};

const renderLayout = (initialEntry: string, permissions: Permission[] = []) =>
  render(
    <Routes>
      <Route path="/content-manager" element={<Layout />}>
        <Route path="403" element={<div>No permissions page</div>} />
        <Route path="no-content-types" element={<div>No content types page</div>} />
        <Route path=":collectionType/:slug" element={<div>List page</div>} />
        <Route path=":collectionType/:slug/:id" element={<EditPageProbe />} />
      </Route>
      <Route path="*" element={<div>Not found page</div>} />
    </Routes>,
    { initialEntries: [initialEntry], providerOptions: { permissions } }
  );

describe('Content Manager | Layout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the content-manager 403 page when no model is authorised for the user', async () => {
    mockInitData({ models: [ARTICLE_MODEL] });

    renderLayout('/content-manager/collection-types/api::article.article/1');

    expect(await screen.findByText('No permissions page')).toBeInTheDocument();
    expect(screen.queryByText('Not found page')).not.toBeInTheDocument();
  });

  it('redirects to the content-manager no-content-types page when there is no content type to display', async () => {
    mockInitData({ models: [] });

    renderLayout('/content-manager/collection-types/api::article.article/1');

    expect(await screen.findByText('No content types page')).toBeInTheDocument();
    expect(screen.queryByText('Not found page')).not.toBeInTheDocument();
  });

  it('does not redirect when the user has access to at least one content type', async () => {
    mockInitData({ models: [ARTICLE_MODEL], collectionTypeLinks: [ARTICLE_LINK] });

    renderLayout('/content-manager/collection-types/api::article.article/1');

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
    expect(screen.queryByText('Not found page')).not.toBeInTheDocument();
  });

  it('redirects to an accessible locale and warns the user when the permissions are denied for the requested locale', async () => {
    // Simulate the i18n RBAC middleware: the links are only authorized while
    // the URL carries a locale the user has access to.
    jest.mocked(useContentManagerInitData).mockImplementation(() => {
      const { search } = useLocation();
      const isBlockedLocale = search.includes('fr');

      return {
        isLoading: false,
        collectionTypeLinks: isBlockedLocale ? [] : [ARTICLE_LINK],
        singleTypeLinks: [],
        components: [],
        fieldSizes: {},
        models: [ARTICLE_MODEL],
      };
    });

    renderLayout(
      '/content-manager/collection-types/api::article.article/1?plugins[i18n][locale]=fr',
      [EN_ONLY_READ_PERMISSION]
    );

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('plugins[i18n][locale]=en');
    expect(
      screen.getByText(
        "You don't have the permissions to access this content for the requested locale"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No permissions page')).not.toBeInTheDocument();
  });

  it('redirects to a locale accessible for the visited content type rather than another one', async () => {
    jest.mocked(useContentManagerInitData).mockImplementation(() => {
      const { search } = useLocation();
      const isBlockedLocale = search.includes('fr');

      return {
        isLoading: false,
        collectionTypeLinks: isBlockedLocale ? [] : [ARTICLE_LINK],
        singleTypeLinks: [],
        components: [],
        fieldSizes: {},
        models: [ARTICLE_MODEL],
      };
    });

    renderLayout(
      '/content-manager/collection-types/api::article.article/1?plugins[i18n][locale]=fr',
      [
        // A locale scoped to another content type must not win over the
        // one scoped to the content type being visited.
        {
          ...EN_ONLY_READ_PERMISSION,
          id: 1001,
          subject: 'api::page.page',
          properties: { locales: ['de'] },
        },
        EN_ONLY_READ_PERMISSION,
      ]
    );

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('plugins[i18n][locale]=en');
    expect(screen.queryByText('No permissions page')).not.toBeInTheDocument();
  });

  it('does not redirect to a locale the user can only update, since it cannot be displayed', async () => {
    jest.mocked(useContentManagerInitData).mockImplementation(() => {
      const { search } = useLocation();
      const isBlockedLocale = search.includes('fr');

      return {
        isLoading: false,
        collectionTypeLinks: isBlockedLocale ? [] : [ARTICLE_LINK],
        singleTypeLinks: [],
        components: [],
        fieldSizes: {},
        models: [ARTICLE_MODEL],
      };
    });

    renderLayout(
      '/content-manager/collection-types/api::article.article/1?plugins[i18n][locale]=fr',
      [
        EN_ONLY_READ_PERMISSION,
        // An update-only locale is not displayable: requesting it must redirect
        // to a readable locale instead of rendering an error page.
        {
          ...EN_ONLY_READ_PERMISSION,
          id: 1002,
          action: 'plugin::content-manager.explorer.update',
          properties: { locales: ['fr'] },
        },
      ]
    );

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('plugins[i18n][locale]=en');
    expect(
      screen.getByText(
        "You don't have the permissions to access this content for the requested locale"
      )
    ).toBeInTheDocument();
  });

  it('renders the route instead of redirecting when the requested locale is accessible but the links are stale', async () => {
    // The links are authorized asynchronously against the previous URL: an
    // accessible locale with no authorised links means they are out of date.
    mockInitData({ models: [ARTICLE_MODEL] });

    renderLayout(
      '/content-manager/collection-types/api::article.article/1?plugins[i18n][locale]=en',
      [EN_ONLY_READ_PERMISSION]
    );

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
    expect(screen.queryByText('No permissions page')).not.toBeInTheDocument();
  });

  /**
   * The i18n RBAC middleware can grant permissions on the 403 page (no locale in
   * the URL) that it denies on a content-type page (unauthorised locale in the
   * URL). Redirecting away from the 403 page in that situation causes an infinite
   * redirect loop between the two pages.
   */
  it('stays on the 403 page even when the user has authorised models', async () => {
    mockInitData({ models: [ARTICLE_MODEL], collectionTypeLinks: [ARTICLE_LINK] });

    renderLayout('/content-manager/403');

    expect(await screen.findByText('No permissions page')).toBeInTheDocument();
    expect(screen.queryByText('List page')).not.toBeInTheDocument();
  });
});
