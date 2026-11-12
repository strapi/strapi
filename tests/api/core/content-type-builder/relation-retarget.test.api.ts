/**
 * Integration test: retargeting a relation in the Content-Type Builder while keeping its field
 * name and its counterpart name writes a valid owner and inverse pair, and the app boots on it.
 */
import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const SHELF_UID = 'api::rt-shelf.rt-shelf';
const BOOKCASE_UID = 'api::rt-bookcase.rt-bookcase';
const BOOK_UID = 'api::rt-book.rt-book';

type Request = (options: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}) => Promise<{ statusCode: number; body: Record<string, unknown> }>;

let strapi: Core.Strapi;
let rq: Request;

const builder = createTestBuilder();

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const updateSchema = (data: Record<string, unknown>) =>
  rq({ method: 'POST', url: '/content-type-builder/update-schema', body: { data } });

const relation = (relationKind: string, target: string, targetAttribute: string) => ({
  type: 'relation',
  relation: relationKind,
  target,
  targetAttribute,
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

const nameAttribute = (action: string, name: string) => ({
  action,
  name,
  properties: { type: 'string' },
});

const attributesOf = (uid: string) =>
  strapi.contentTypes[uid as keyof typeof strapi.contentTypes].attributes as Record<
    string,
    Record<string, unknown>
  >;

describe('Content Type Builder - retarget a relation under its own name', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Book.shelf owns Shelf.books
    const created = await updateSchema({
      contentTypes: [
        contentType('create', 'rt-book', [
          nameAttribute('create', 'title'),
          {
            action: 'create',
            name: 'shelf',
            properties: relation('manyToOne', SHELF_UID, 'books'),
          },
        ]),
        contentType('create', 'rt-bookcase', [nameAttribute('create', 'name')]),
        contentType('create', 'rt-shelf', [
          nameAttribute('create', 'name'),
          {
            action: 'create',
            name: 'books',
            properties: relation('oneToMany', BOOK_UID, 'shelf'),
          },
        ]),
      ],
      components: [],
    });
    expect(created.statusCode).toBe(200);

    await restart();
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [
        { action: 'delete', uid: BOOK_UID },
        { action: 'delete', uid: BOOKCASE_UID },
        { action: 'delete', uid: SHELF_UID },
      ],
      components: [],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('moves Book.shelf to Bookcase and keeps a valid pair after the restart', async () => {
    // The save the admin sends, with the types in the order that deleted Book.shelf
    const res = await updateSchema({
      contentTypes: [
        contentType('update', 'rt-book', [
          nameAttribute('update', 'title'),
          {
            action: 'update',
            name: 'shelf',
            properties: relation('manyToOne', BOOKCASE_UID, 'books'),
          },
        ]),
        contentType('update', 'rt-bookcase', [
          nameAttribute('update', 'name'),
          {
            action: 'create',
            name: 'books',
            properties: relation('oneToMany', BOOK_UID, 'shelf'),
          },
        ]),
        contentType('update', 'rt-shelf', [
          nameAttribute('update', 'name'),
          {
            action: 'delete',
            name: 'books',
            properties: relation('oneToMany', BOOK_UID, 'shelf'),
          },
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

    // The relation stores and reads back from both sides
    const bookcase = await strapi.documents(BOOKCASE_UID).create({ data: { name: 'Bookcase 1' } });
    const book = await strapi.documents(BOOK_UID).create({
      data: { title: 'Book 1', shelf: bookcase.documentId },
    });

    const bookcaseWithBooks = await strapi.documents(BOOKCASE_UID).findOne({
      documentId: bookcase.documentId,
      populate: ['books'],
    });
    const bookWithShelf = await strapi.documents(BOOK_UID).findOne({
      documentId: book.documentId,
      populate: ['shelf'],
    });

    expect(bookcaseWithBooks?.books).toMatchObject([{ documentId: book.documentId }]);
    expect(bookWithShelf?.shelf).toMatchObject({ documentId: bookcase.documentId });
  });
});
