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

  test('keeps a one-way relation of the old target when the save has only Book', async () => {
    await createTypes();

    // Shelf.books is a one-way relation to Book: not the other side of Book.shelf
    const shelfSchemaPath = path.join(
      apiDir,
      'rt-shelf',
      'content-types',
      'rt-shelf',
      'schema.json'
    );
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
});
