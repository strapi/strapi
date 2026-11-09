/**
 * Publishing an entry drops its relations to entries that have no published version yet.
 * Publishing the target later must add the link to the published version of the source, without
 * publishing the source again. These cases cover the schema of the original report and the
 * relation kinds that `droppedRelations.restore` skips because other code restores them:
 * relations of a content type to itself and bidirectional relations.
 */
import type { Core } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const modelsUtils = require('api-tests/models');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const MENU_UID = 'api::menu.menu';
const SUBMENU_COMPONENT_UID = 'default.submenu';
const NODE_UID = 'api::node.node';
const AUTHOR_UID = 'api::author.author';
const BOOK_UID = 'api::book.book';
const FOLDER_UID = 'api::folder.folder';

const submenuComponentModel = (withRelation: boolean) => ({
  collectionName: 'components_default_submenus',
  attributes: {
    label: { type: 'string' },
    ...(withRelation
      ? { submenu: { type: 'relation', relation: 'oneToOne', target: MENU_UID } }
      : {}),
  },
  displayName: 'submenu',
  category: 'default',
});

// Same shape as the schema of the report. The component is completed once `menu` exists.
const menuModel = {
  attributes: {
    title: { type: 'string' },
    parent: { type: 'relation', relation: 'oneToOne', target: MENU_UID },
    items: { type: 'dynamiczone', components: [SUBMENU_COMPONENT_UID] },
  },
  draftAndPublish: true,
  displayName: 'Menu',
  singularName: 'menu',
  pluralName: 'menus',
  description: '',
  collectionName: '',
};

const nodeModel = {
  attributes: {
    name: { type: 'string' },
    related: { type: 'relation', relation: 'manyToMany', target: NODE_UID },
    followers: { type: 'relation', relation: 'oneToMany', target: NODE_UID },
  },
  draftAndPublish: true,
  displayName: 'Node',
  singularName: 'node',
  pluralName: 'nodes',
  description: '',
  collectionName: '',
};

const authorModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: true,
  displayName: 'Author',
  singularName: 'author',
  pluralName: 'authors',
  description: '',
  collectionName: '',
};

const bookModel = {
  attributes: {
    name: { type: 'string' },
    // The inverse side `author.books` (oneToMany, mappedBy) is created by the content-type builder
    author: {
      type: 'relation',
      relation: 'manyToOne',
      target: AUTHOR_UID,
      targetAttribute: 'books',
    },
  },
  draftAndPublish: true,
  displayName: 'Book',
  singularName: 'book',
  pluralName: 'books',
  description: '',
  collectionName: '',
};

const folderModel = {
  attributes: {
    name: { type: 'string' },
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: FOLDER_UID,
      targetAttribute: 'children',
    },
  },
  draftAndPublish: true,
  displayName: 'Folder',
  singularName: 'folder',
  pluralName: 'folders',
  description: '',
  collectionName: '',
};

const create = async (uid: string, data: Record<string, unknown>) => {
  const entry = await (strapi.documents as any)(uid).create({ data });
  return entry.documentId as string;
};

const publish = (uid: string, documentId: string) =>
  (strapi.documents as any)(uid).publish({ documentId });

const find = (uid: string, documentId: string, status: 'draft' | 'published', populate: any) =>
  (strapi.documents as any)(uid).findOne({ documentId, status, populate }) as Promise<any>;

const ids = (entries: any[] | undefined) => (entries ?? []).map((entry) => entry.documentId);
const sortedIds = (entries: any[] | undefined) => ids(entries).sort();

describe('Document Service relations to entries published later, reported and skipped cases', () => {
  beforeAll(async () => {
    await builder
      .addComponent(submenuComponentModel(false))
      .addContentTypes([menuModel, nodeModel, authorModel])
      .addContentTypes([bookModel, folderModel])
      .build();

    await modelsUtils.modifyComponent(submenuComponentModel(true));

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('schema of the original report (menu with parent and dynamic zone component)', () => {
    const menuPopulate = {
      parent: true,
      items: { on: { [SUBMENU_COMPONENT_UID]: { populate: { submenu: true } } } },
    };

    it('adds parent and the dynamic zone link once both targets are published', async () => {
      const b = await create(MENU_UID, { title: 'B' });
      const c = await create(MENU_UID, { title: 'C' });
      const a = await create(MENU_UID, {
        title: 'A',
        parent: { documentId: b },
        items: [{ __component: SUBMENU_COMPONENT_UID, label: 'sub', submenu: { documentId: c } }],
      });

      await publish(MENU_UID, a);

      const before = await find(MENU_UID, a, 'published', menuPopulate);
      expect(before.parent).toBeNull();
      expect(before.items).toHaveLength(1);
      expect(before.items[0].submenu).toBeNull();

      await publish(MENU_UID, b);
      const afterB = await find(MENU_UID, a, 'published', menuPopulate);
      expect(afterB.parent).toMatchObject({ documentId: b, publishedAt: expect.any(String) });
      expect(afterB.items[0].submenu).toBeNull();

      await publish(MENU_UID, c);
      const published = await find(MENU_UID, a, 'published', menuPopulate);
      expect(published.parent).toMatchObject({ documentId: b, publishedAt: expect.any(String) });
      expect(published.items).toHaveLength(1);
      expect(published.items[0]).toMatchObject({ label: 'sub' });
      expect(published.items[0].submenu).toMatchObject({
        documentId: c,
        publishedAt: expect.any(String),
      });

      const draft = await find(MENU_UID, a, 'draft', menuPopulate);
      expect(draft.parent).toMatchObject({ documentId: b, publishedAt: null });
      expect(draft.items[0].submenu).toMatchObject({ documentId: c, publishedAt: null });

      // Publishing the targets again does not duplicate or break the links
      await publish(MENU_UID, b);
      await publish(MENU_UID, c);
      const again = await find(MENU_UID, a, 'published', menuPopulate);
      expect(again.parent).toMatchObject({ documentId: b });
      expect(again.items).toHaveLength(1);
      expect(again.items[0].submenu).toMatchObject({ documentId: c });
    });
  });

  describe('unidirectional relation of a content type to itself', () => {
    const nodePopulate = { related: true, followers: true };

    it('restores manyToMany links in draft order, without duplicates', async () => {
      const x = await create(NODE_UID, { name: 'x' });
      const y = await create(NODE_UID, { name: 'y' });
      const z = await create(NODE_UID, { name: 'z' });
      const a = await create(NODE_UID, {
        name: 'a',
        related: [{ documentId: z }, { documentId: x }, { documentId: y }],
      });

      await publish(NODE_UID, a);
      expect((await find(NODE_UID, a, 'published', nodePopulate)).related).toEqual([]);

      await publish(NODE_UID, x);
      expect(ids((await find(NODE_UID, a, 'published', nodePopulate)).related)).toEqual([x]);

      await publish(NODE_UID, z);
      expect(ids((await find(NODE_UID, a, 'published', nodePopulate)).related)).toEqual([z, x]);

      await publish(NODE_UID, y);
      const published = await find(NODE_UID, a, 'published', nodePopulate);
      expect(ids(published.related)).toEqual([z, x, y]);

      await publish(NODE_UID, y);
      expect(ids((await find(NODE_UID, a, 'published', nodePopulate)).related)).toEqual([z, x, y]);

      const draft = await find(NODE_UID, a, 'draft', nodePopulate);
      expect(ids(draft.related)).toEqual([z, x, y]);
    });

    it('restores oneToMany links in draft order', async () => {
      const x = await create(NODE_UID, { name: 'ox' });
      const y = await create(NODE_UID, { name: 'oy' });
      const a = await create(NODE_UID, {
        name: 'oa',
        followers: [{ documentId: y }, { documentId: x }],
      });

      await publish(NODE_UID, a);
      expect((await find(NODE_UID, a, 'published', nodePopulate)).followers).toEqual([]);

      await publish(NODE_UID, x);
      await publish(NODE_UID, y);

      const published = await find(NODE_UID, a, 'published', nodePopulate);
      expect(ids(published.followers)).toEqual([y, x]);

      const draft = await find(NODE_UID, a, 'draft', nodePopulate);
      expect(ids(draft.followers)).toEqual([y, x]);
    });

    it('restores the link of a node that targets itself', async () => {
      const a = await create(NODE_UID, { name: 'loop' });
      await (strapi.documents as any)(NODE_UID).update({
        documentId: a,
        data: { related: [{ documentId: a }] },
      });

      // The only published version is created by this publish, so the link to itself is kept
      await publish(NODE_UID, a);
      const published = await find(NODE_UID, a, 'published', nodePopulate);
      expect(ids(published.related)).toEqual([a]);
    });
  });

  describe('bidirectional relation between two content types', () => {
    const bookPopulate = { author: true };
    const authorPopulate = { books: true };

    it('restores the link from the owning side (book.author)', async () => {
      const author = await create(AUTHOR_UID, { name: 'author' });
      const book = await create(BOOK_UID, { name: 'book', author: { documentId: author } });

      await publish(BOOK_UID, book);
      expect((await find(BOOK_UID, book, 'published', bookPopulate)).author).toBeNull();

      await publish(AUTHOR_UID, author);

      const published = await find(BOOK_UID, book, 'published', bookPopulate);
      expect(published.author).toMatchObject({
        documentId: author,
        publishedAt: expect.any(String),
      });

      const draft = await find(BOOK_UID, book, 'draft', bookPopulate);
      expect(draft.author).toMatchObject({ documentId: author, publishedAt: null });

      // The inverse side of the published pair is visible as well
      const publishedAuthor = await find(AUTHOR_UID, author, 'published', authorPopulate);
      expect(ids(publishedAuthor.books)).toEqual([book]);

      await publish(AUTHOR_UID, author);
      const again = await find(BOOK_UID, book, 'published', bookPopulate);
      expect(again.author).toMatchObject({ documentId: author });
      expect(ids((await find(AUTHOR_UID, author, 'published', authorPopulate)).books)).toEqual([
        book,
      ]);
    });

    it('restores the links when the published entry is on the inverse side (author.books)', async () => {
      const first = await create(BOOK_UID, { name: 'first' });
      const second = await create(BOOK_UID, { name: 'second' });
      const author = await create(AUTHOR_UID, {
        name: 'inverse author',
        books: [{ documentId: first }, { documentId: second }],
      });

      await publish(AUTHOR_UID, author);
      expect((await find(AUTHOR_UID, author, 'published', authorPopulate)).books).toEqual([]);

      await publish(BOOK_UID, first);
      expect(ids((await find(AUTHOR_UID, author, 'published', authorPopulate)).books)).toEqual([
        first,
      ]);

      await publish(BOOK_UID, second);
      const published = await find(AUTHOR_UID, author, 'published', authorPopulate);
      expect(sortedIds(published.books)).toEqual([first, second].sort());
      expect(published.books.every((book: any) => book.publishedAt)).toBe(true);

      // The published books point back to the published author
      const publishedBook = await find(BOOK_UID, first, 'published', bookPopulate);
      expect(publishedBook.author).toMatchObject({ documentId: author });

      const draft = await find(AUTHOR_UID, author, 'draft', authorPopulate);
      expect(sortedIds(draft.books)).toEqual([first, second].sort());

      await publish(BOOK_UID, first);
      expect(
        sortedIds((await find(AUTHOR_UID, author, 'published', authorPopulate)).books)
      ).toEqual([first, second].sort());
    });
  });

  describe('bidirectional relation of a content type to itself', () => {
    const folderPopulate = { parent: true, children: true };

    it('restores parent when the parent is published later', async () => {
      const parent = await create(FOLDER_UID, { name: 'parent' });
      const child = await create(FOLDER_UID, { name: 'child', parent: { documentId: parent } });

      await publish(FOLDER_UID, child);
      expect((await find(FOLDER_UID, child, 'published', folderPopulate)).parent).toBeNull();

      await publish(FOLDER_UID, parent);

      const published = await find(FOLDER_UID, child, 'published', folderPopulate);
      expect(published.parent).toMatchObject({
        documentId: parent,
        publishedAt: expect.any(String),
      });

      const publishedParent = await find(FOLDER_UID, parent, 'published', folderPopulate);
      expect(ids(publishedParent.children)).toEqual([child]);

      const draft = await find(FOLDER_UID, child, 'draft', folderPopulate);
      expect(draft.parent).toMatchObject({ documentId: parent, publishedAt: null });

      await publish(FOLDER_UID, parent);
      expect(ids((await find(FOLDER_UID, parent, 'published', folderPopulate)).children)).toEqual([
        child,
      ]);
    });

    it('restores children when the children are published later', async () => {
      const first = await create(FOLDER_UID, { name: 'first child' });
      const second = await create(FOLDER_UID, { name: 'second child' });
      const parent = await create(FOLDER_UID, {
        name: 'parent of many',
        children: [{ documentId: first }, { documentId: second }],
      });

      await publish(FOLDER_UID, parent);
      expect((await find(FOLDER_UID, parent, 'published', folderPopulate)).children).toEqual([]);

      await publish(FOLDER_UID, first);
      await publish(FOLDER_UID, second);

      const published = await find(FOLDER_UID, parent, 'published', folderPopulate);
      expect(sortedIds(published.children)).toEqual([first, second].sort());

      const publishedChild = await find(FOLDER_UID, first, 'published', folderPopulate);
      expect(publishedChild.parent).toMatchObject({ documentId: parent });

      const draft = await find(FOLDER_UID, parent, 'draft', folderPopulate);
      expect(sortedIds(draft.children)).toEqual([first, second].sort());
    });
  });
});
