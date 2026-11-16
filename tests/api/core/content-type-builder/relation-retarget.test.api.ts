/**
 * Integration test: retargeting a relation in the Content-Type Builder while keeping its field
 * name and its counterpart name writes a valid owner and inverse pair, the app boots on it, and
 * attributes of the old target type that are not the other side keep their schema and links.
 */
import path from 'path';
import fse from 'fs-extra';
import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const SHELF_UID = 'api::rt-shelf.rt-shelf';
const BOOKCASE_UID = 'api::rt-bookcase.rt-bookcase';
const BOOK_UID = 'api::rt-book.rt-book';
const TYPE_FOLDERS = ['rt-book', 'rt-bookcase', 'rt-shelf'];

type Request = (options: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}) => Promise<{ statusCode: number; body: Record<string, any> }>;

let strapi: Core.Strapi;
let rq: Request;
let contentAPI: Request;
let apiDir: string;

const builder = createTestBuilder();

const boot = async () => {
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
  contentAPI = createContentAPIRequest({ strapi });
  apiDir = strapi.dirs.app.api;
};

const restart = async () => {
  await strapi.destroy();
  await boot();
};

const updateSchema = (data: Record<string, unknown>) =>
  rq({ method: 'POST', url: '/content-type-builder/update-schema', body: { data } });

const relation = (relationKind: string, target: string, targetAttribute?: string) => ({
  type: 'relation',
  relation: relationKind,
  target,
  ...(targetAttribute === undefined ? {} : { targetAttribute }),
});

const contentType = (
  action: string,
  singularName: string,
  attributes: Array<Record<string, unknown>>
) => ({
  action,
  uid: `api::${singularName}.${singularName}`,
  displayName: singularName,
  singularName,
  pluralName: `${singularName}s`,
  kind: 'collectionType',
  draftAndPublish: false,
  attributes,
});

const attribute = (action: string, name: string, properties: Record<string, unknown>) => ({
  action,
  name,
  properties,
});

const nameAttribute = (action: string, name: string) => attribute(action, name, { type: 'string' });

const attributesOf = (uid: string) =>
  strapi.contentTypes[uid as keyof typeof strapi.contentTypes].attributes as Record<
    string,
    Record<string, unknown>
  >;

/** Creates Book (`shelf` owns Shelf.books), Bookcase and Shelf, then restarts. */
const createTypes = async (shelfBooksOptions: Record<string, unknown> = {}) => {
  const created = await updateSchema({
    contentTypes: [
      contentType('create', 'rt-book', [
        nameAttribute('create', 'title'),
        attribute('create', 'shelf', relation('manyToOne', SHELF_UID, 'books')),
      ]),
      contentType('create', 'rt-bookcase', [nameAttribute('create', 'name')]),
      contentType('create', 'rt-shelf', [
        nameAttribute('create', 'name'),
        attribute('create', 'books', {
          ...relation('oneToMany', BOOK_UID, 'shelf'),
          ...shelfBooksOptions,
        }),
      ]),
    ],
    components: [],
  });
  expect(created.statusCode).toBe(200);

  await restart();
};

/**
 * Deletes the types of this file and boots a new instance. The type folders are also removed
 * from the disk, so that a schema that failed to boot cannot break the suites that run after.
 */
const resetTypes = async () => {
  try {
    await updateSchema({
      contentTypes: [BOOK_UID, BOOKCASE_UID, SHELF_UID].map((uid) => ({ action: 'delete', uid })),
      components: [],
    });
  } catch {
    // The instance did not boot: the folders are removed below
  }

  try {
    await strapi.destroy();
  } catch {
    // Already destroyed by a restart that failed
  }

  await Promise.all(TYPE_FOLDERS.map((folder) => fse.remove(path.join(apiDir, folder))));
  await boot();
};

/** The save of the retarget of Book.shelf from Shelf to Bookcase, with only Book in it. */
const bookOnlyRetarget = (extraAttributes: Array<Record<string, unknown>> = []) =>
  contentType('update', 'rt-book', [
    nameAttribute('update', 'title'),
    attribute('update', 'shelf', relation('manyToOne', BOOKCASE_UID, 'books')),
    ...extraAttributes,
  ]);

const schemaFile = (folder: string) =>
  path.join(apiDir, folder, 'content-types', folder, 'schema.json');

/** Sends the GET response of the single-type route back, after `change` edits its schema. */
const putBookFromGet = async (change: (schema: Record<string, any>) => void) => {
  const url = `/content-type-builder/content-types/${BOOK_UID}`;
  const { body } = await rq({ method: 'GET', url });
  change(body.data.schema);

  return rq({ method: 'PUT', url, body: { contentType: body.data.schema } });
};

/** Sends the GET response of the single-type route of `uid` back, after `change` edits it. */
const putFromGet = async (uid: string, change: (schema: Record<string, any>) => void) => {
  const url = `/content-type-builder/content-types/${uid}`;
  const { body } = await rq({ method: 'GET', url });
  change(body.data.schema);

  return rq({ method: 'PUT', url, body: { contentType: body.data.schema } });
};

/**
 * Checks the result of a retarget of Shelf.books from Book to Bookcase: the old owner Book.shelf
 * is deleted with its link table, Bookcase.shelf owns Shelf.books, and the relation works.
 */
const expectInverseSideRetargeted = async (oldLinkTable: string, shelfId: string) => {
  expect(attributesOf(BOOK_UID)).not.toHaveProperty('shelf');
  expect(attributesOf(BOOKCASE_UID).shelf).toMatchObject({
    type: 'relation',
    relation: 'manyToOne',
    target: SHELF_UID,
    inversedBy: 'books',
  });
  expect(attributesOf(SHELF_UID).books).toMatchObject({
    type: 'relation',
    relation: 'oneToMany',
    target: BOOKCASE_UID,
    mappedBy: 'shelf',
  });
  expect(await strapi.db.connection.schema.hasTable(oldLinkTable)).toBe(false);

  const bookcase = await strapi.documents(BOOKCASE_UID).create({
    data: { name: 'Bookcase 1', shelf: shelfId },
  });
  const shelfWithBooks = await strapi.documents(SHELF_UID).findOne({
    documentId: shelfId,
    populate: ['books'],
  });
  expect(shelfWithBooks?.books).toMatchObject([{ documentId: bookcase.documentId }]);
};

/** Creates a shelf with one book, and returns the link table of Book.shelf. */
const seedLinkedBook = async () => {
  const shelf = await strapi.documents(SHELF_UID).create({ data: { name: 'Shelf 1' } });
  await strapi.documents(BOOK_UID).create({ data: { title: 'Book 1', shelf: shelf.documentId } });

  const { joinTable } = strapi.db.metadata.get(BOOK_UID).attributes.shelf as {
    joinTable: { name: string };
  };
  const [{ count }] = await strapi.db.connection(joinTable.name).count({ count: '*' });
  expect(Number(count)).toBe(1);

  return { shelfId: shelf.documentId, oldLinkTable: joinTable.name };
};

describe('Content Type Builder - retarget a relation under its own name', () => {
  beforeAll(async () => {
    await boot();
  });

  afterEach(async () => {
    await resetTypes();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('moves Book.shelf to Bookcase and keeps a valid pair after the restart', async () => {
    await createTypes();

    // A link that exists before the retarget
    const shelf = await strapi.documents(SHELF_UID).create({ data: { name: 'Shelf 1' } });
    const linkedBook = await strapi.documents(BOOK_UID).create({
      data: { title: 'Linked book', shelf: shelf.documentId },
    });

    // The save the admin sends, with the types in the order that deleted Book.shelf
    const res = await updateSchema({
      contentTypes: [
        bookOnlyRetarget(),
        contentType('update', 'rt-bookcase', [
          nameAttribute('update', 'name'),
          attribute('create', 'books', relation('oneToMany', BOOK_UID, 'shelf')),
        ]),
        contentType('update', 'rt-shelf', [
          nameAttribute('update', 'name'),
          attribute('delete', 'books', relation('oneToMany', BOOK_UID, 'shelf')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    // Boot runs the database check that every inverse side has an owner pointing back
    await restart();

    expect(attributesOf(BOOK_UID).shelf).toMatchObject({
      type: 'relation',
      relation: 'manyToOne',
      target: BOOKCASE_UID,
      inversedBy: 'books',
    });
    expect(attributesOf(BOOKCASE_UID).books).toMatchObject({
      type: 'relation',
      relation: 'oneToMany',
      target: BOOK_UID,
      mappedBy: 'shelf',
    });
    expect(attributesOf(SHELF_UID)).not.toHaveProperty('books');

    // The link to the old target does not point to a bookcase
    const bookcase = await strapi.documents(BOOKCASE_UID).create({ data: { name: 'Bookcase 1' } });
    const unlinked = await strapi.documents(BOOK_UID).findOne({
      documentId: linkedBook.documentId,
      populate: ['shelf'],
    });
    expect(unlinked?.shelf).toBeNull();

    // The relation stores and reads back from both sides, for a new and for the old book
    const newBook = await strapi.documents(BOOK_UID).create({
      data: { title: 'New book', shelf: bookcase.documentId },
    });
    await strapi.documents(BOOK_UID).update({
      documentId: linkedBook.documentId,
      data: { shelf: bookcase.documentId },
    });

    const bookcaseWithBooks = await strapi.documents(BOOKCASE_UID).findOne({
      documentId: bookcase.documentId,
      populate: ['books'],
    });
    const newBookWithShelf = await strapi.documents(BOOK_UID).findOne({
      documentId: newBook.documentId,
      populate: ['shelf'],
    });

    expect(
      (bookcaseWithBooks?.books as Array<{ documentId: string }>)
        .map((book) => book.documentId)
        .sort()
    ).toEqual([linkedBook.documentId, newBook.documentId].sort());
    expect(newBookWithShelf?.shelf).toMatchObject({ documentId: bookcase.documentId });
  });

  // A body in the stored format names the other side with inversedBy or mappedBy, without
  // targetAttribute: direct clients and the api-tests modifyContentType helper send it
  test.each(['oneToOne', 'manyToMany'])(
    'changes Book.shelf to %s through the single-type route with a body in the stored format',
    async (kind) => {
      await createTypes();

      const res = await putFromGet(BOOK_UID, (schema) => {
        expect(schema.attributes.shelf).toMatchObject({ inversedBy: 'books' });
        delete schema.attributes.shelf.targetAttribute;
        schema.attributes.shelf.relation = kind;
      });
      expect(res.statusCode).toBe(201);

      await restart();

      expect(attributesOf(BOOK_UID).shelf).toMatchObject({
        relation: kind,
        target: SHELF_UID,
        inversedBy: 'books',
      });
      expect(attributesOf(SHELF_UID).books).toMatchObject({
        relation: kind,
        target: BOOK_UID,
        mappedBy: 'shelf',
      });

      const shelf = await strapi.documents(SHELF_UID).create({ data: { name: 'Shelf 1' } });
      const book = await strapi.documents(BOOK_UID).create({
        data: {
          title: 'Book 1',
          shelf: kind === 'oneToOne' ? shelf.documentId : [shelf.documentId],
        },
      });
      const shelfWithBooks = await strapi.documents(SHELF_UID).findOne({
        documentId: shelf.documentId,
        populate: ['books'],
      });
      const books = shelfWithBooks?.books;
      expect(Array.isArray(books) ? books : [books]).toMatchObject([
        { documentId: book.documentId },
      ]);
    }
  );

  test('changes the kind of Book.shelf in a save with only Book', async () => {
    await createTypes();

    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          attribute('update', 'shelf', relation('manyToMany', SHELF_UID, 'books')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(BOOK_UID).shelf).toMatchObject({
      relation: 'manyToMany',
      inversedBy: 'books',
    });
    expect(attributesOf(SHELF_UID).books).toMatchObject({
      relation: 'manyToMany',
      mappedBy: 'shelf',
    });
  });

  test('keeps the owner of a hidden inverse side when Shelf is saved with a body in the stored format', async () => {
    await createTypes();

    // Shelf.books is not visible: the GET response of the route does not have it
    const shelfSchema = await fse.readJSON(schemaFile('rt-shelf'));
    shelfSchema.attributes.books.visible = false;
    await fse.writeJSON(schemaFile('rt-shelf'), shelfSchema, { spaces: 2 });
    await restart();

    const res = await putFromGet(SHELF_UID, (schema) => {
      expect(schema.attributes).not.toHaveProperty('books');
      // A client that sends the stored schema also sends Shelf.books, in the stored format
      schema.attributes.books = shelfSchema.attributes.books;
      schema.attributes.label = { type: 'string' };
    });
    expect(res.statusCode).toBe(201);

    await restart();

    expect(attributesOf(BOOK_UID).shelf).toMatchObject({ target: SHELF_UID, inversedBy: 'books' });
    expect(attributesOf(SHELF_UID).books).toMatchObject({
      target: BOOK_UID,
      mappedBy: 'shelf',
      visible: false,
    });
  });

  // Retargeting an inverse side deletes its old owner and the link rows of that owner
  test('retargets the inverse side as the admin form sends it, and deletes the old owner', async () => {
    await createTypes();
    const { shelfId, oldLinkTable } = await seedLinkedBook();

    // The admin form deletes the old owner, creates the new owner and retargets Shelf.books
    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          attribute('delete', 'shelf', relation('manyToOne', SHELF_UID, 'books')),
        ]),
        contentType('update', 'rt-bookcase', [
          nameAttribute('update', 'name'),
          attribute('create', 'shelf', relation('manyToOne', SHELF_UID, 'books')),
        ]),
        contentType('update', 'rt-shelf', [
          nameAttribute('update', 'name'),
          attribute('update', 'books', relation('oneToMany', BOOKCASE_UID, 'shelf')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    await expectInverseSideRetargeted(oldLinkTable, shelfId);
  });

  test('retargets the inverse side in a save with only Shelf, and deletes the old owner', async () => {
    await createTypes();
    const { shelfId, oldLinkTable } = await seedLinkedBook();

    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-shelf', [
          nameAttribute('update', 'name'),
          attribute('update', 'books', relation('oneToMany', BOOKCASE_UID, 'shelf')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    await expectInverseSideRetargeted(oldLinkTable, shelfId);
  });

  test('keeps a one-way relation of the old target when the save has only Book', async () => {
    await createTypes();

    // Shelf.books is a one-way relation to Book: not the other side of Book.shelf
    const shelfSchemaPath = schemaFile('rt-shelf');
    const shelfSchema = await fse.readJSON(shelfSchemaPath);
    shelfSchema.attributes.books = { type: 'relation', relation: 'oneToMany', target: BOOK_UID };
    await fse.writeJSON(shelfSchemaPath, shelfSchema, { spaces: 2 });
    await restart();

    const book = await strapi.documents(BOOK_UID).create({ data: { title: 'Book 1' } });
    const shelf = await strapi.documents(SHELF_UID).create({
      data: { name: 'Shelf 1', books: [book.documentId] },
    });

    const res = await updateSchema({ contentTypes: [bookOnlyRetarget()], components: [] });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(SHELF_UID).books).toEqual({
      type: 'relation',
      relation: 'oneToMany',
      target: BOOK_UID,
    });

    const shelfWithBooks = await strapi.documents(SHELF_UID).findOne({
      documentId: shelf.documentId,
      populate: ['books'],
    });
    expect(shelfWithBooks?.books).toMatchObject([{ documentId: book.documentId }]);
  });

  test('keeps the options of a counterpart that another attribute takes over', async () => {
    await createTypes({ private: true });

    // Book.mainShelf takes over Shelf.books, which is private, in a save with only Book
    const res = await updateSchema({
      contentTypes: [
        bookOnlyRetarget([
          attribute('create', 'mainShelf', relation('manyToOne', SHELF_UID, 'books')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(SHELF_UID).books).toMatchObject({
      type: 'relation',
      relation: 'oneToMany',
      target: BOOK_UID,
      mappedBy: 'mainShelf',
      private: true,
    });
    expect(attributesOf(BOOKCASE_UID).books).toMatchObject({ mappedBy: 'shelf' });

    const shelf = await strapi.documents(SHELF_UID).create({ data: { name: 'Shelf 1' } });
    await strapi.documents(BOOK_UID).create({
      data: { title: 'Book 1', mainShelf: shelf.documentId },
    });

    const shelves = await contentAPI({ method: 'GET', url: '/rt-shelfs?populate=*' });
    expect(shelves.statusCode).toBe(200);
    expect(shelves.body.data).toHaveLength(1);
    expect(shelves.body.data[0]).not.toHaveProperty('books');
  });
  test('renames the counterpart through the single-type route', async () => {
    await createTypes();

    // The GET response has the stored inversedBy next to targetAttribute
    const res = await putBookFromGet((schema) => {
      expect(schema.attributes.shelf).toMatchObject({
        targetAttribute: 'books',
        inversedBy: 'books',
      });
      schema.attributes.shelf.targetAttribute = 'tomes';
    });
    expect(res.statusCode).toBe(201);

    await restart();

    expect(attributesOf(SHELF_UID)).not.toHaveProperty('books');
    expect(attributesOf(SHELF_UID).tomes).toMatchObject({ mappedBy: 'shelf' });
    expect(attributesOf(BOOK_UID).shelf).toMatchObject({ inversedBy: 'tomes' });
  });

  test('retargets through the single-type route next to a non-configurable owner of the same inverse side', async () => {
    await createTypes();

    // Book.mainShelf, not configurable, is the owner of Shelf.books
    const bookSchema = await fse.readJSON(schemaFile('rt-book'));
    bookSchema.attributes.mainShelf = {
      type: 'relation',
      relation: 'manyToOne',
      target: SHELF_UID,
      inversedBy: 'books',
      configurable: false,
    };
    await fse.writeJSON(schemaFile('rt-book'), bookSchema, { spaces: 2 });
    const shelfSchema = await fse.readJSON(schemaFile('rt-shelf'));
    shelfSchema.attributes.books.mappedBy = 'mainShelf';
    await fse.writeJSON(schemaFile('rt-shelf'), shelfSchema, { spaces: 2 });
    await restart();

    const res = await putBookFromGet((schema) => {
      schema.attributes.shelf.target = BOOKCASE_UID;
    });
    expect(res.statusCode).toBe(201);

    await restart();

    expect(attributesOf(SHELF_UID).books).toMatchObject({ mappedBy: 'mainShelf' });
    expect(attributesOf(BOOK_UID).mainShelf).toMatchObject({
      target: SHELF_UID,
      inversedBy: 'books',
    });
    expect(attributesOf(BOOK_UID).shelf).toMatchObject({
      target: BOOKCASE_UID,
      inversedBy: 'books',
    });
    expect(attributesOf(BOOKCASE_UID).books).toMatchObject({ mappedBy: 'shelf' });
  });
  test('retargets in a save with only Book, and removes the inverse side on the old target', async () => {
    await createTypes();

    const res = await updateSchema({ contentTypes: [bookOnlyRetarget()], components: [] });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(SHELF_UID)).not.toHaveProperty('books');
    expect(attributesOf(BOOK_UID).shelf).toMatchObject({
      target: BOOKCASE_UID,
      inversedBy: 'books',
    });
    expect(attributesOf(BOOKCASE_UID).books).toMatchObject({ mappedBy: 'shelf' });
  });

  test('retargets with Bookcase before Book and no Shelf in the save', async () => {
    await createTypes();

    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-bookcase', [
          nameAttribute('update', 'name'),
          attribute('create', 'books', relation('oneToMany', BOOK_UID, 'shelf')),
        ]),
        bookOnlyRetarget(),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(SHELF_UID)).not.toHaveProperty('books');
    expect(attributesOf(BOOK_UID).shelf).toMatchObject({
      target: BOOKCASE_UID,
      inversedBy: 'books',
    });
    expect(attributesOf(BOOKCASE_UID).books).toMatchObject({ mappedBy: 'shelf' });
  });

  test('keeps a one-way relation that an owner names when a save of Book does not change it', async () => {
    await createTypes();

    // Book.shelf names Shelf.books, which is a one-way relation to Book
    const shelfSchema = await fse.readJSON(schemaFile('rt-shelf'));
    shelfSchema.attributes.books = { type: 'relation', relation: 'oneToMany', target: BOOK_UID };
    await fse.writeJSON(schemaFile('rt-shelf'), shelfSchema, { spaces: 2 });
    await restart();

    const book = await strapi.documents(BOOK_UID).create({ data: { title: 'Book 1' } });
    const shelf = await strapi.documents(SHELF_UID).create({
      data: { name: 'Shelf 1', books: [book.documentId] },
    });

    // Book gets a new text field, and shelf is sent as the schema route returns it
    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          attribute('update', 'shelf', relation('manyToOne', SHELF_UID, 'books')),
          nameAttribute('create', 'subtitle'),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(SHELF_UID).books).toEqual({
      type: 'relation',
      relation: 'oneToMany',
      target: BOOK_UID,
    });
    const shelfWithBooks = await strapi.documents(SHELF_UID).findOne({
      documentId: shelf.documentId,
      populate: ['books'],
    });
    expect(shelfWithBooks?.books).toMatchObject([{ documentId: book.documentId }]);
  });

  test('rejects a new relation whose counterpart name is a scalar attribute of the target', async () => {
    await createTypes();
    const bookcase = await strapi.documents(BOOKCASE_UID).create({ data: { name: 'Bookcase 1' } });

    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          attribute('update', 'shelf', relation('manyToOne', SHELF_UID, 'books')),
          attribute('create', 'bookcase', relation('manyToOne', BOOKCASE_UID, 'name')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(400);

    await restart();

    expect(attributesOf(BOOK_UID)).not.toHaveProperty('bookcase');
    expect(attributesOf(BOOKCASE_UID).name).toEqual({ type: 'string' });
    const stored = await strapi.documents(BOOKCASE_UID).findOne({
      documentId: bookcase.documentId,
    });
    expect(stored?.name).toBe('Bookcase 1');
  });

  test('rejects a new relation whose counterpart name is a one-way relation of the target', async () => {
    await createTypes();

    // Bookcase.items is a one-way relation to Book with one link
    const created = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-bookcase', [
          nameAttribute('update', 'name'),
          attribute('create', 'items', relation('oneToMany', BOOK_UID)),
        ]),
      ],
      components: [],
    });
    expect(created.statusCode).toBe(200);
    await restart();

    const book = await strapi.documents(BOOK_UID).create({ data: { title: 'Book 1' } });
    const bookcase = await strapi.documents(BOOKCASE_UID).create({
      data: { name: 'Bookcase 1', items: [book.documentId] },
    });

    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          attribute('update', 'shelf', relation('manyToOne', SHELF_UID, 'books')),
          attribute('create', 'bookcase', relation('manyToOne', BOOKCASE_UID, 'items')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(400);

    await restart();

    expect(attributesOf(BOOKCASE_UID).items).toEqual({
      type: 'relation',
      relation: 'oneToMany',
      target: BOOK_UID,
    });
    const bookcaseWithItems = await strapi.documents(BOOKCASE_UID).findOne({
      documentId: bookcase.documentId,
      populate: ['items'],
    });
    expect(bookcaseWithItems?.items).toMatchObject([{ documentId: book.documentId }]);
  });
  test('keeps the options of the counterpart when a save of Book renames it', async () => {
    await createTypes({ private: true, required: true });

    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          attribute('update', 'shelf', relation('manyToOne', SHELF_UID, 'tomes')),
        ]),
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(attributesOf(SHELF_UID)).not.toHaveProperty('books');
    expect(attributesOf(SHELF_UID).tomes).toMatchObject({
      type: 'relation',
      relation: 'oneToMany',
      target: BOOK_UID,
      mappedBy: 'shelf',
      private: true,
      required: true,
    });
    expect(attributesOf(BOOK_UID).shelf).toMatchObject({ inversedBy: 'tomes' });
  });
});
