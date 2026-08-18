import path from 'node:path';
import process from 'node:process';
import { outputFile, outputJSON, readFile, readJSON, remove, pathExists } from 'fs-extra';
import * as strapiGenerators from '../../index';

describe('Content Type Generator — folder assignment', () => {
  const outputDirectory = path.join(__dirname, 'output-folders');
  const groupsPath = path.join(outputDirectory, 'src/content-structure/groups.json');

  const baseAnswers = {
    displayName: 'article',
    singularName: 'article',
    pluralName: 'articles',
    kind: 'collectionType',
    id: 'article',
    destination: 'new',
    bootstrapApi: false,
    attributes: [],
  };

  const generate = (answers: Record<string, any>) => {
    return strapiGenerators.generate(
      'content-type',
      { ...baseAnswers, ...answers },
      { dir: outputDirectory, plopFile: 'plopfile.ts' }
    );
  };

  const seededFile = (): any => ({
    version: 1,
    sections: {
      collectionTypes: {
        groups: [
          {
            parent: null,
            name: 'Shop',
            id: 'grp_shop1',
            children: [{ type: 'group', id: 'grp_products1' }],
          },
          {
            parent: 'grp_shop1',
            name: 'Products',
            id: 'grp_products1',
            children: [{ type: 'contentType', uid: 'api::product.product' }],
          },
        ],
      },
      singleTypes: {
        groups: [
          {
            parent: null,
            name: 'Site pages',
            id: 'grp_pages1',
            children: [{ type: 'contentType', uid: 'api::homepage.homepage' }],
          },
        ],
      },
    },
  });

  beforeAll(() => {
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue(outputDirectory);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await remove(outputDirectory);
  });

  test('creates groups.json with a new root folder', async () => {
    await generate({ folder: { newFolderName: 'Blog' } });

    expect(await readJSON(groupsPath)).toEqual({
      version: 1,
      sections: {
        collectionTypes: {
          groups: [
            {
              parent: null,
              name: 'Blog',
              id: expect.stringMatching(/^grp_[a-z0-9]{24}$/),
              children: [{ type: 'contentType', uid: 'api::article.article' }],
            },
          ],
        },
        singleTypes: { groups: [] },
      },
    });
  });

  test('adds the content type to an existing folder and preserves the rest of the file', async () => {
    await outputJSON(groupsPath, { ...seededFile(), future: { unknownKey: true } }, { spaces: 2 });

    await generate({ folder: { targetGroupId: 'grp_products1' } });

    const written = await readJSON(groupsPath);
    const expected = seededFile();
    expected.sections.collectionTypes.groups[1].children.push({
      type: 'contentType',
      uid: 'api::article.article',
    });

    expect(written).toEqual({ ...expected, future: { unknownKey: true } });
  });

  test('reuses an existing root folder when the new name matches case-insensitively', async () => {
    await outputJSON(groupsPath, seededFile(), { spaces: 2 });

    await generate({ folder: { newFolderName: '  shop ' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.collectionTypes.groups).toHaveLength(2);
    expect(written.sections.collectionTypes.groups[0].children).toEqual([
      { type: 'group', id: 'grp_products1' },
      { type: 'contentType', uid: 'api::article.article' },
    ]);
  });

  test('detaches the content type from its previous folder in the section', async () => {
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups[1].children.push({
      type: 'contentType',
      uid: 'api::article.article',
    });
    await outputJSON(groupsPath, seeded, { spaces: 2 });

    await generate({ folder: { newFolderName: 'Blog' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.collectionTypes.groups[1].children).toEqual([
      { type: 'contentType', uid: 'api::product.product' },
    ]);
    expect(written.sections.collectionTypes.groups[2]).toEqual({
      parent: null,
      name: 'Blog',
      id: expect.stringMatching(/^grp_[a-z0-9]{24}$/),
      children: [{ type: 'contentType', uid: 'api::article.article' }],
    });
  });

  test('a single type lands in the singleTypes section', async () => {
    await outputJSON(groupsPath, seededFile(), { spaces: 2 });

    await generate({ kind: 'singleType', folder: { targetGroupId: 'grp_pages1' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.singleTypes.groups[0].children).toEqual([
      { type: 'contentType', uid: 'api::homepage.homepage' },
      { type: 'contentType', uid: 'api::article.article' },
    ]);
    expect(written.sections.collectionTypes).toEqual(seededFile().sections.collectionTypes);
  });

  test('leaves groups.json untouched when no folder is provided', async () => {
    await outputJSON(groupsPath, seededFile(), { spaces: 2 });
    const before = await readFile(groupsPath, 'utf-8');

    await generate({});

    expect(await readFile(groupsPath, 'utf-8')).toBe(before);
  });

  test('does not create groups.json when no folder is provided', async () => {
    await generate({});

    expect(await pathExists(groupsPath)).toBe(false);
  });

  test('refuses to touch an unparseable groups.json', async () => {
    await outputFile(groupsPath, '{ not json');

    await expect(generate({ folder: { newFolderName: 'Blog' } })).rejects.toThrow(
      'is not a valid content-structure file'
    );

    expect(await readFile(groupsPath, 'utf-8')).toBe('{ not json');
  });

  test.each([
    ['an unknown version', { ...seededFile(), version: 2 }],
    ['a missing sections object', { version: 1 }],
    ['an array-valued sections', { version: 1, sections: [] }],
  ])('refuses to touch a file with %s', async (_label, file) => {
    await outputJSON(groupsPath, file, { spaces: 2 });
    const before = await readFile(groupsPath, 'utf-8');

    await expect(generate({ folder: { newFolderName: 'Blog' } })).rejects.toThrow(
      'is not a valid content-structure file'
    );

    expect(await readFile(groupsPath, 'utf-8')).toBe(before);
  });

  test('refuses to touch a file whose target section is malformed', async () => {
    await outputJSON(
      groupsPath,
      {
        version: 1,
        sections: { collectionTypes: { groups: 'nope' }, singleTypes: { groups: [] } },
      },
      { spaces: 2 }
    );
    const before = await readFile(groupsPath, 'utf-8');

    await expect(generate({ folder: { newFolderName: 'Blog' } })).rejects.toThrow(
      'the "collectionTypes" section'
    );

    expect(await readFile(groupsPath, 'utf-8')).toBe(before);
  });

  test('rejects an empty new folder name without creating the file', async () => {
    await expect(generate({ folder: { newFolderName: '   ' } })).rejects.toThrow(
      'must be a non-empty string'
    );

    expect(await pathExists(groupsPath)).toBe(false);
  });

  test('throws when a folder is requested but no uid can be derived', async () => {
    await expect(
      generate({ destination: 'api', folder: { newFolderName: 'Blog' } })
    ).rejects.toThrow('could not determine the content type uid');

    expect(await pathExists(groupsPath)).toBe(false);
  });

  test('synthesizes a missing section instead of failing', async () => {
    await outputJSON(
      groupsPath,
      { version: 1, sections: { collectionTypes: seededFile().sections.collectionTypes } },
      { spaces: 2 }
    );

    await generate({ kind: 'singleType', folder: { newFolderName: 'Pages' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.singleTypes.groups).toEqual([
      {
        parent: null,
        name: 'Pages',
        id: expect.stringMatching(/^grp_[a-z0-9]{24}$/),
        children: [{ type: 'contentType', uid: 'api::article.article' }],
      },
    ]);
    expect(written.sections.collectionTypes).toEqual(seededFile().sections.collectionTypes);
  });

  test('does not reuse a nested folder whose name matches the new folder name', async () => {
    await outputJSON(groupsPath, seededFile(), { spaces: 2 });

    await generate({ folder: { newFolderName: 'products' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.collectionTypes.groups).toHaveLength(3);
    expect(written.sections.collectionTypes.groups[1].children).toEqual([
      { type: 'contentType', uid: 'api::product.product' },
    ]);
    expect(written.sections.collectionTypes.groups[2]).toEqual({
      parent: null,
      name: 'products',
      id: expect.stringMatching(/^grp_[a-z0-9]{24}$/),
      children: [{ type: 'contentType', uid: 'api::article.article' }],
    });
  });

  test('reuses a dangling-parent folder the core reader would reparent to root', async () => {
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups.push({
      parent: 'grp_deleted1',
      name: 'Blog',
      id: 'grp_dangling1',
      children: [],
    });
    await outputJSON(groupsPath, seeded, { spaces: 2 });

    await generate({ folder: { newFolderName: 'blog' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.collectionTypes.groups).toHaveLength(3);
    expect(written.sections.collectionTypes.groups[2].children).toEqual([
      { type: 'contentType', uid: 'api::article.article' },
    ]);
  });

  test('tolerates malformed group entries and preserves them verbatim', async () => {
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups.push(null, { id: 'grp_broken1', name: 'Broken' });
    await outputJSON(groupsPath, seeded, { spaces: 2 });

    await generate({ folder: { targetGroupId: 'grp_products1' } });

    const written = await readJSON(groupsPath);

    expect(written.sections.collectionTypes.groups[1].children).toContainEqual({
      type: 'contentType',
      uid: 'api::article.article',
    });
    expect(written.sections.collectionTypes.groups[2]).toBeNull();
    expect(written.sections.collectionTypes.groups[3]).toEqual({
      id: 'grp_broken1',
      name: 'Broken',
    });
  });

  test('rejects a target folder whose group entry is malformed', async () => {
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups.push({ id: 'grp_broken1', name: 'Broken' });
    await outputJSON(groupsPath, seeded, { spaces: 2 });
    const before = await readFile(groupsPath, 'utf-8');

    await expect(generate({ folder: { targetGroupId: 'grp_broken1' } })).rejects.toThrow(
      'No usable folder with id "grp_broken1"'
    );

    expect(await readFile(groupsPath, 'utf-8')).toBe(before);
  });

  test('rejects an unknown target folder id without writing', async () => {
    await outputJSON(groupsPath, seededFile(), { spaces: 2 });
    const before = await readFile(groupsPath, 'utf-8');

    await expect(generate({ folder: { targetGroupId: 'grp_missing1' } })).rejects.toThrow(
      'No usable folder with id "grp_missing1"'
    );

    expect(await readFile(groupsPath, 'utf-8')).toBe(before);
  });
});
