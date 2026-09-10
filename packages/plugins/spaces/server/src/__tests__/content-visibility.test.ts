import { registerContentVisibilityGuards } from '../content-visibility';

const ARTICLE = {
  uid: 'api::article.article',
  info: { pluralName: 'articles', singularName: 'article' },
  pluginOptions: { spaces: { visibleIn: ['default'] } },
};
const PAGE = {
  uid: 'api::page.page',
  info: { pluralName: 'pages', singularName: 'page' },
  pluginOptions: {},
};

const makeStrapi = () => {
  let middleware: any;
  const strapi = {
    contentTypes: { [ARTICLE.uid]: ARTICLE, [PAGE.uid]: PAGE },
    config: { get: () => '/api' },
    plugins: {
      spaces: {
        services: {
          visibility: {
            isCTVisibleInSpace: (model: any, slug: string) => {
              const visibleIn = model.pluginOptions?.spaces?.visibleIn ?? [];
              return visibleIn.length === 0 || visibleIn.includes(slug);
            },
          },
        },
      },
    },
    server: { use: (fn: any) => (middleware = fn) },
  } as any;
  (global as any).strapi = strapi;
  registerContentVisibilityGuards(strapi);
  return { middleware };
};

const makeCtx = (path: string, spaceSlug?: string, body?: any) => ({
  path,
  method: 'GET',
  status: 200,
  state: spaceSlug ? { spaceSlug } : {},
  body,
  notFound: jest.fn(function notFound(this: any) {
    this.status = 404;
  }),
});

describe('content visibility guards', () => {
  it('lets the default workspace and headerless callers see everything', async () => {
    const { middleware } = makeStrapi();
    const next = jest.fn();
    const list = { data: [{ uid: ARTICLE.uid }, { uid: PAGE.uid }] };

    const asDefault = makeCtx('/content-manager/content-types', 'default', list);
    await middleware(asDefault, next);
    const headerless = makeCtx('/content-manager/collection-types/api::article.article', undefined);
    await middleware(headerless, next);

    expect(asDefault.body.data).toHaveLength(2);
    expect(headerless.notFound).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('404s CM document routes and content API routes of invisible types in a sub-workspace', async () => {
    const { middleware } = makeStrapi();
    const next = jest.fn();

    const cm = makeCtx('/content-manager/collection-types/api::article.article/abc', 'acme');
    await middleware(cm, next);
    const api = makeCtx('/api/articles', 'acme');
    await middleware(api, next);
    const visible = makeCtx('/api/pages', 'acme');
    await middleware(visible, next);

    expect(cm.notFound).toHaveBeenCalled();
    expect(api.notFound).toHaveBeenCalled();
    expect(visible.notFound).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('strips invisible types from the CM navigation sources in a sub-workspace', async () => {
    const { middleware } = makeStrapi();
    const next = jest.fn();

    const list = makeCtx('/content-manager/content-types', 'acme', {
      data: [{ uid: ARTICLE.uid }, { uid: PAGE.uid }],
    });
    await middleware(list, next);
    const init = makeCtx('/content-manager/init', 'acme', {
      data: { contentTypes: [{ uid: ARTICLE.uid }, { uid: PAGE.uid }] },
    });
    await middleware(init, next);

    expect(list.body.data).toEqual([{ uid: PAGE.uid }]);
    expect(init.body.data.contentTypes).toEqual([{ uid: PAGE.uid }]);
  });
});
