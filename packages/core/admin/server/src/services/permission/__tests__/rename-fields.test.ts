import { createPermissionFieldRenamer } from '../rename-fields';

const ARTICLE = 'api::article.article';
const PAGE = 'api::page.page';
const HERO = 'default.hero';

const trx = 'trx' as any;

interface Row {
  id: number;
  subject: string;
  role?: number | null;
  apiToken?: number | null;
  properties: { fields?: unknown } | null;
}

/**
 * The new schema (`strapi.contentTypes` / `strapi.components` at migration
 * time) and a permission table.
 */
const setup = ({
  articleAttributes = {
    heading: { type: 'string' },
    body: { type: 'text' },
    hero: { type: 'component', component: HERO },
  } as Record<string, unknown>,
  rows = [] as Row[],
  hasTable = true,
} = {}) => {
  const findMany = jest.fn(async ({ where }: any) =>
    rows.filter((row) => where.subject.$in.includes(row.subject))
  );
  const update = jest.fn(async () => ({}));
  const hasTableMock = jest.fn(async () => hasTable);

  const strapi = {
    contentTypes: {
      [ARTICLE]: { uid: ARTICLE, attributes: articleAttributes },
      [PAGE]: {
        uid: PAGE,
        attributes: {
          title: { type: 'string' },
          banner: { type: 'component', component: HERO },
        },
      },
    },
    components: {
      [HERO]: { uid: HERO, attributes: { label: { type: 'string' }, image: { type: 'media' } } },
    },
    db: {
      metadata: { get: jest.fn(() => ({ tableName: 'admin_permissions' })) },
      getSchemaConnection: jest.fn(() => ({ hasTable: hasTableMock })),
      query: jest.fn(() => ({ findMany, update })),
    },
  } as any;

  return { handler: createPermissionFieldRenamer({ strapi }), findMany, update, hasTableMock };
};

const row = (id: number, subject: string, fields: unknown, extra: Partial<Row> = {}): Row => ({
  id,
  subject,
  role: 1,
  properties: { fields },
  ...extra,
});

const updatedFields = (update: jest.Mock) =>
  update.mock.calls.map(([{ where, data }]: any) => [where.id, data.properties.fields]);

describe('createPermissionFieldRenamer', () => {
  it('renames a field of a content type', async () => {
    const { handler, update } = setup({ rows: [row(1, ARTICLE, ['title', 'body'])] });

    await handler(trx, { [ARTICLE]: { title: 'heading' } });

    expect(updatedFields(update)).toEqual([[1, ['heading', 'body']]]);
  });

  it('renames a component field in every content type that embeds it', async () => {
    const { handler, update } = setup({
      rows: [row(1, ARTICLE, ['hero.caption', 'body']), row(2, PAGE, ['title', 'banner.caption'])],
    });

    await handler(trx, { [HERO]: { caption: 'label' } });

    expect(updatedFields(update)).toEqual([
      [1, ['hero.label', 'body']],
      [2, ['title', 'banner.label']],
    ]);
  });

  it('composes a parent rename with a component field rename in the same save', async () => {
    const { handler, update } = setup({
      rows: [row(1, ARTICLE, ['cover', 'cover.caption', 'cover.image'])],
    });

    await handler(trx, { [ARTICLE]: { cover: 'hero' }, [HERO]: { caption: 'label' } });

    expect(updatedFields(update)).toEqual([[1, ['hero', 'hero.label', 'hero.image']]]);
  });

  it('applies a swap once, without substituting twice', async () => {
    const { handler, update } = setup({
      articleAttributes: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
      rows: [row(1, ARTICLE, ['a', 'c']), row(2, ARTICLE, ['a', 'b'])],
    });

    await handler(trx, { [ARTICLE]: { a: 'b', b: 'a' } });

    // Row 2 still grants both fields: nothing to write.
    expect(updatedFields(update)).toEqual([[1, ['b', 'c']]]);
  });

  it('leaves rows without a fields array untouched', async () => {
    const { handler, update } = setup({
      rows: [
        row(1, ARTICLE, null),
        { id: 2, subject: ARTICLE, role: 1, properties: null },
        { id: 3, subject: ARTICLE, role: 1, properties: {} },
      ],
    });

    await handler(trx, { [ARTICLE]: { title: 'heading' } });

    expect(update).not.toHaveBeenCalled();
  });

  it('rewrites admin API token permissions too', async () => {
    const { handler, update } = setup({
      rows: [row(1, ARTICLE, ['title'], { role: null, apiToken: 7 })],
    });

    await handler(trx, { [ARTICLE]: { title: 'heading' } });

    expect(updatedFields(update)).toEqual([[1, ['heading']]]);
  });

  it('leaves paths that no longer exist to the boot cleanup', async () => {
    const { handler, update } = setup({
      rows: [row(1, ARTICLE, ['gone']), row(2, ARTICLE, ['title', 'gone'])],
    });

    await handler(trx, { [ARTICLE]: { title: 'heading' } });

    expect(updatedFields(update)).toEqual([[2, ['heading', 'gone']]]);
  });

  it('only loads the subjects with a renamed path', async () => {
    const { handler, findMany } = setup();

    await handler(trx, { [ARTICLE]: { title: 'heading' } });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subject: { $in: [ARTICLE] } } })
    );
  });

  it('does nothing on a fresh database', async () => {
    const { handler, findMany, hasTableMock } = setup({ hasTable: false });

    await handler(trx, { [ARTICLE]: { title: 'heading' } });

    expect(hasTableMock).toHaveBeenCalledWith('admin_permissions');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('does not query when no path of the new schema was renamed', async () => {
    const { handler, findMany } = setup();

    await handler(trx, { [ARTICLE]: { removed: 'gone' } });

    expect(findMany).not.toHaveBeenCalled();
  });
});
