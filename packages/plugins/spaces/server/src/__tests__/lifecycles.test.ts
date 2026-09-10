import { refuseSharedRowWrite, stampSpaceOnCreate } from '../lifecycles';
import { runScoped, runUnscoped } from '../utils/space-scope';

const ARTICLE = { uid: 'api::article.article', pluginOptions: {} };
const GLOSSARY = {
  uid: 'api::glossary.glossary',
  pluginOptions: { spaces: { sharedEntries: true } },
};

interface Options {
  space?: { id: number; slug: string };
  rowSpaceId?: number | null;
  rowExists?: boolean;
}

const makeStrapi = ({ space, rowSpaceId = null, rowExists = true }: Options = {}) => {
  const findOne = jest.fn(async () =>
    rowExists ? { id: 1, space: rowSpaceId === null ? null : { id: rowSpaceId } } : null
  );
  const strapi = {
    requestContext: {
      get: () => (space ? { state: { spaceId: space.id, spaceSlug: space.slug } } : undefined),
    },
    contentTypes: { [ARTICLE.uid]: ARTICLE, [GLOSSARY.uid]: GLOSSARY },
    db: { query: jest.fn(() => ({ findOne })) },
  } as any;
  return { strapi, findOne };
};

const ACME = { id: 2, slug: 'acme' };
const DEFAULT = { id: 1, slug: 'default' };

describe('stampSpaceOnCreate', () => {
  it('sets data.space from the request workspace when missing', () => {
    const { strapi } = makeStrapi({ space: ACME });
    const event = { model: ARTICLE, params: { data: { title: 'Hello' } } };

    stampSpaceOnCreate(strapi, event);

    expect(event.params.data).toEqual({ title: 'Hello', space: 2 });
  });

  it('does not overwrite an explicit value, null included', () => {
    const { strapi } = makeStrapi({ space: ACME });
    const explicit = { model: ARTICLE, params: { data: { space: 99 } } };
    const shared = { model: ARTICLE, params: { data: { space: null as any } } };

    stampSpaceOnCreate(strapi, explicit);
    stampSpaceOnCreate(strapi, shared);

    expect(explicit.params.data.space).toBe(99);
    expect(shared.params.data.space).toBeNull();
  });

  it('prefers the scope override over the request workspace', async () => {
    const { strapi } = makeStrapi({ space: ACME });
    const event = { model: ARTICLE, params: { data: {} as any } };

    await runScoped(3, () => stampSpaceOnCreate(strapi, event));

    expect(event.params.data.space).toBe(3);
  });

  it('stamps NULL for shared content types', () => {
    const { strapi } = makeStrapi({ space: ACME });
    const event = { model: GLOSSARY, params: { data: {} as any } };

    stampSpaceOnCreate(strapi, event);

    expect(event.params.data.space).toBeNull();
  });

  it('is a no-op without a request workspace, or without data', () => {
    const { strapi } = makeStrapi();
    const event = { model: ARTICLE, params: { data: { title: 'x' } as any } };

    stampSpaceOnCreate(strapi, event);
    expect(() => stampSpaceOnCreate(strapi, { params: {} })).not.toThrow();

    expect(event.params.data.space).toBeUndefined();
  });
});

describe('refuseSharedRowWrite', () => {
  it('lets a sub-workspace write its own rows', async () => {
    const { strapi } = makeStrapi({ space: ACME, rowSpaceId: 2 });

    await expect(
      refuseSharedRowWrite(strapi, { model: ARTICLE, params: { where: { id: 1 } } })
    ).resolves.toBeUndefined();
  });

  it('refuses a shared row from a sub-workspace', async () => {
    const { strapi } = makeStrapi({ space: ACME, rowSpaceId: null });

    await expect(
      refuseSharedRowWrite(strapi, { model: ARTICLE, params: { where: { id: 1 } } })
    ).rejects.toMatchObject({ name: 'WorkspaceAccessError' });
  });

  it("hides another workspace's row", async () => {
    const { strapi } = makeStrapi({ space: ACME, rowSpaceId: 3 });

    await expect(
      refuseSharedRowWrite(strapi, { model: ARTICLE, params: { where: { id: 1 } } })
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('skips default, headerless, scoped and unscoped contexts without reading', async () => {
    const event = { model: ARTICLE, params: { where: { id: 1 } } };
    const asDefault = makeStrapi({ space: DEFAULT, rowSpaceId: null });
    const headerless = makeStrapi({ rowSpaceId: null });
    const acme = makeStrapi({ space: ACME, rowSpaceId: null });

    await refuseSharedRowWrite(asDefault.strapi, event);
    await refuseSharedRowWrite(headerless.strapi, event);
    await runScoped(2, () => refuseSharedRowWrite(acme.strapi, event));
    await runUnscoped(() => refuseSharedRowWrite(acme.strapi, event));

    expect(asDefault.findOne).not.toHaveBeenCalled();
    expect(headerless.findOne).not.toHaveBeenCalled();
    expect(acme.findOne).not.toHaveBeenCalled();
  });

  it('ignores bulk writes and unknown rows', async () => {
    const { strapi, findOne } = makeStrapi({ space: ACME, rowExists: false });

    await refuseSharedRowWrite(strapi, {
      model: ARTICLE,
      params: { where: { id: { $in: [1, 2] } } },
    });
    expect(findOne).not.toHaveBeenCalled();

    await expect(
      refuseSharedRowWrite(strapi, { model: ARTICLE, params: { where: { id: 1 } } })
    ).resolves.toBeUndefined();
  });
});
