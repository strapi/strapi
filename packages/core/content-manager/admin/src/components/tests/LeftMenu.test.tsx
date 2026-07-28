/* eslint-disable check-file/filename-naming-convention */
import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import { defaultTestStoreConfig, render, screen, server } from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';

import { reducer } from '../../modules/reducers';
import { LeftMenu } from '../LeftMenu';

import type { Modules } from '@strapi/types';

interface TestContentType {
  uid: string;
  isDisplayed: boolean;
  apiID: string;
  kind: 'collectionType' | 'singleType';
  info: { displayName: string };
}

const contentType = (
  uid: string,
  displayName: string,
  kind: 'collectionType' | 'singleType' = 'collectionType'
): TestContentType => ({
  uid,
  isDisplayed: true,
  apiID: uid.slice(uid.indexOf('.') + 1),
  kind,
  info: { displayName },
});

const contentTypes: TestContentType[] = [
  contentType('api::article.article', 'Article'),
  contentType('api::category.category', 'Category'),
  contentType('api::tag.tag', 'Tag'),
  contentType('api::comment.comment', 'Comment'),
  contentType('api::homepage.homepage', 'Homepage', 'singleType'),
];

const contentStructure: Modules.ContentStructure.ResolvedContentStructure = {
  collectionTypes: [
    {
      type: 'group',
      id: 'group-blog',
      name: 'Blog',
      children: [
        { type: 'contentType', uid: 'api::article.article' },
        {
          type: 'group',
          id: 'group-taxonomy',
          name: 'Taxonomy',
          children: [
            { type: 'contentType', uid: 'api::category.category' },
            { type: 'contentType', uid: 'api::tag.tag' },
          ],
        },
      ],
    },
    {
      // If a group references a content type the user cannot see, the folder must be hidden.
      type: 'group',
      id: 'group-empty',
      name: 'Empty Folder',
      children: [{ type: 'contentType', uid: 'api::secret.secret' }],
    },
  ],
  singleTypes: [],
};

const grantedPermissions = contentTypes.map((ct, index) => ({
  id: index + 1,
  action: 'plugin::content-manager.explorer.read',
  actionParameters: {},
  subject: ct.uid,
  properties: {},
  conditions: [],
}));

const createStoreConfig = (): ConfigureStoreOptions => {
  const testStoreConfig = defaultTestStoreConfig();

  return {
    preloadedState: testStoreConfig.preloadedState,
    reducer: {
      ...testStoreConfig.reducer,
      'content-manager': reducer,
    },
    middleware: (getDefaultMiddleware) => [...testStoreConfig.middleware(getDefaultMiddleware)],
  };
};

const mockInit = (withStructure: boolean) =>
  server.use(
    http.get('/content-manager/init', () =>
      HttpResponse.json({
        data: {
          components: [],
          contentTypes,
          fieldSizes: {},
          ...(withStructure ? { contentStructure } : {}),
        },
      })
    ),
    http.get('/content-manager/content-types-settings', () => HttpResponse.json({ data: [] })),
    http.post<Record<string, never>, { permissions: unknown[] }>(
      '/admin/permissions/check',
      async ({ request }) => {
        const { permissions } = await request.json();
        return HttpResponse.json({ data: permissions.map(() => true) });
      }
    )
  );

const renderMenu = (initialEntries: string[] = ['/content-manager']) =>
  render(<LeftMenu />, {
    initialEntries,
    providerOptions: {
      storeConfig: createStoreConfig(),
      permissions: grantedPermissions,
    },
  });

describe('LeftMenu', () => {
  it('renders the resolved folder tree with nested groups', async () => {
    mockInit(true);
    renderMenu();

    expect(await screen.findByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Taxonomy')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Article' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tag' })).toBeInTheDocument();
  });

  it('hides folders that have no visible content types', async () => {
    mockInit(true);
    renderMenu();

    await screen.findByText('Blog');
    expect(screen.queryByText('Empty Folder')).not.toBeInTheDocument();
  });

  it('surfaces authorized links missing from the tree (ungrouped) and single types', async () => {
    mockInit(true);
    renderMenu();

    expect(await screen.findByRole('link', { name: 'Comment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Homepage' })).toBeInTheDocument();
  });

  it('falls back to a flat list when the init payload has no content structure', async () => {
    mockInit(false);
    renderMenu();

    expect(await screen.findByRole('link', { name: 'Article' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comment' })).toBeInTheDocument();
    expect(screen.queryByText('Blog')).not.toBeInTheDocument();
  });

  it('shows the folder path on tree-aware search matches', async () => {
    mockInit(true);
    const { user } = renderMenu();

    await screen.findByText('Blog');

    await user.type(screen.getByPlaceholderText('Search'), 'category');

    expect(await screen.findByText('Blog / Taxonomy')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Category/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Article' })).not.toBeInTheDocument();
  });

  it('forwards the active i18n locale to the links', async () => {
    mockInit(true);
    renderMenu(['/content-manager?plugins[i18n][locale]=fr']);

    const link = await screen.findByRole('link', { name: 'Article' });
    const href = link.getAttribute('href') ?? '';

    expect(href).toContain('i18n');
    expect(href).toContain('fr');
  });
});
