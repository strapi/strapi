'use strict';

// Coverage for https://github.com/strapi/strapi/issues/26606
//
// `PUT /api/users/:id` (and `POST /api/users`) go through the
// users-permissions user service (`add` / `edit`). This suite has two parts:
//
//  1. "existing behavior" — a regression safety net locking in everything the
//     endpoint already does (scalars, password hashing, relations by numeric
//     id, uniqueness checks, 404, unknown-key handling). These must stay green
//     before and after the fix.
//
//  2. "documentId relation support" — the v5 behavior the issue asks for:
//     updating relation fields using the standard `documentId` connect syntax.
//     These are RED before the fix and GREEN after.

const bcrypt = require('bcryptjs');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;
let builder;

let authenticatedRole;
let publicRole;

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
    // creates a oneToMany `favoriteArticles` on the user
    owner: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.user',
      targetAttribute: 'favoriteArticles',
    },
    // creates a manyToOne `favoriteArticle` on the user
    fans: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'plugin::users-permissions.user',
      targetAttribute: 'favoriteArticle',
    },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const optInModel = {
  attributes: {
    caption: {
      type: 'string',
    },
    user: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.user',
      targetAttribute: 'optIns',
    },
  },
  draftAndPublish: true,
  displayName: 'OptIn',
  singularName: 'opt-in',
  pluralName: 'opt-ins',
  description: '',
  collectionName: '',
};

let userSeq = 0;
const createUser = async (overrides = {}) => {
  userSeq += 1;
  return strapi.db.query('plugin::users-permissions.user').create({
    data: {
      username: `reluser${userSeq}`,
      email: `reluser${userSeq}@strapi.io`,
      password: 'password123',
      provider: 'local',
      role: authenticatedRole.id,
      ...overrides,
    },
  });
};

const createArticle = (title = 'Article') =>
  strapi.db.query('api::article.article').create({ data: { title } });

const createPublishedOptIn = async () => {
  const optIn = await strapi.documents('api::opt-in.opt-in').create({
    data: { caption: 'Drafted Opt-In' },
  });

  await strapi.documents('api::opt-in.opt-in').publish({ documentId: optIn.documentId });

  await strapi.documents('api::opt-in.opt-in').update({
    documentId: optIn.documentId,
    data: { caption: 'Drafted Opt-In Modified' },
  });

  const [publishedOptIn] = await strapi.documents('api::opt-in.opt-in').findMany({
    status: 'published',
    filters: { documentId: optIn.documentId },
  });

  return publishedOptIn;
};

const readUser = (id) =>
  strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id },
    populate: ['favoriteArticles', 'favoriteArticle', 'role', 'optIns'],
  });

const putUser = (id, body) => rq({ method: 'PUT', url: `/users/${id}`, body });

describe('U&P users REST relation handling (issue 26606)', () => {
  beforeAll(async () => {
    builder = createTestBuilder();
    await builder.addContentTypes([articleModel, optInModel]).build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    authenticatedRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });
    publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('existing behavior (regression safety net)', () => {
    test('POST /users creates a user (201) with role populated and hashed password', async () => {
      const payload = {
        username: 'created_user',
        email: 'created_user@strapi.io',
        password: 'password123',
        role: authenticatedRole.id,
      };

      const res = await rq({ method: 'POST', url: '/users', body: payload });

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        username: payload.username,
        email: payload.email,
        role: { id: authenticatedRole.id },
      });

      const dbUser = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: payload.email } });
      expect(bcrypt.compareSync(payload.password, dbUser.password)).toBe(true);
    });

    test('PUT updates a scalar field without touching the password', async () => {
      const user = await createUser();
      const before = await readUser(user.id);

      const res = await putUser(user.id, { username: 'renamed_user' });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.username).toBe('renamed_user');
      expect(after.password).toBe(before.password);
    });

    test('PUT re-hashes the password when it is changed', async () => {
      const user = await createUser();
      const before = await readUser(user.id);

      const res = await putUser(user.id, { password: 'newpassword123' });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.password).not.toBe(before.password);
      expect(bcrypt.compareSync('newpassword123', after.password)).toBe(true);
    });

    test('PUT changes the role by numeric id', async () => {
      const user = await createUser();

      const res = await putUser(user.id, { role: publicRole.id });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.role.id).toBe(publicRole.id);
    });

    test('PUT connects a oneToMany relation by numeric id', async () => {
      const user = await createUser();
      const article = await createArticle('numeric connect');

      const res = await putUser(user.id, { favoriteArticles: { connect: [article.id] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticles).toHaveLength(1);
      expect(after.favoriteArticles[0].id).toBe(article.id);
    });

    test('PUT disconnects a oneToMany relation by numeric id', async () => {
      const article = await createArticle('numeric disconnect');
      const user = await createUser({ favoriteArticles: { connect: [article.id] } });

      const res = await putUser(user.id, { favoriteArticles: { disconnect: [article.id] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticles).toHaveLength(0);
    });

    test('PUT sets a oneToMany relation by numeric id', async () => {
      const articleA = await createArticle('numeric set A');
      const articleB = await createArticle('numeric set B');
      const user = await createUser({ favoriteArticles: { connect: [articleA.id] } });

      const res = await putUser(user.id, { favoriteArticles: { set: [articleB.id] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticles).toHaveLength(1);
      expect(after.favoriteArticles[0].id).toBe(articleB.id);
    });

    test('PUT connects a manyToOne relation by numeric id', async () => {
      const user = await createUser();
      const article = await createArticle('numeric manyToOne');

      const res = await putUser(user.id, { favoriteArticle: { connect: [article.id] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticle).not.toBeNull();
      expect(after.favoriteArticle.id).toBe(article.id);
    });

    test('PUT on an unknown user returns 404', async () => {
      const res = await putUser(99999999, { username: 'whatever' });
      expect(res.statusCode).toBe(404);
    });

    test('PUT rejects a duplicate email', async () => {
      const userA = await createUser();
      const userB = await createUser();

      const res = await putUser(userB.id, { email: userA.email });

      expect(res.statusCode).toBe(400);
    });

    test('PUT rejects a duplicate username', async () => {
      const userA = await createUser();
      const userB = await createUser();

      const res = await putUser(userB.id, { username: userA.username });

      expect(res.statusCode).toBe(400);
    });

    test('PUT silently ignores an unrecognized field (200, no-op)', async () => {
      const user = await createUser();
      const before = await readUser(user.id);

      const res = await putUser(user.id, { thisFieldDoesNotExist: 'value' });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.username).toBe(before.username);
      expect(after.email).toBe(before.email);
      expect(after).not.toHaveProperty('thisFieldDoesNotExist');
    });

    // Regression guard for https://github.com/strapi/strapi/pull/26101
    //
    // Before #26101 an unrecognized attribute carrying a relation-style
    // `documentId` connect payload was silently dropped (200, no-op). #26101
    // tightened numeric validation, which turned this same payload into a 500
    // because the bogus value reached the DB layer. Routing the user service
    // through the Document Service restores the original 200/no-op: unknown
    // attributes are never traversed as relations, so nothing is written and a
    // valid relation is left untouched.
    test('PUT silently ignores an unknown relation-looking attribute (200, no-op)', async () => {
      const article = await createArticle('unknown relation noop');
      const user = await createUser({ favoriteArticles: { connect: [article.id] } });

      const res = await putUser(user.id, {
        notARealRelation: { connect: [article.documentId] },
      });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      // the unknown key is ignored and the real relation is left as-is
      expect(after).not.toHaveProperty('notARealRelation');
      expect(after.favoriteArticles).toHaveLength(1);
      expect(after.favoriteArticles[0].id).toBe(article.id);
    });
  });

  describe('documentId relation support (expected after fix)', () => {
    test('PUT connects a oneToMany relation by documentId', async () => {
      const user = await createUser();
      const article = await createArticle('docId connect');

      const res = await putUser(user.id, { favoriteArticles: { connect: [article.documentId] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticles).toHaveLength(1);
      expect(after.favoriteArticles[0].documentId).toBe(article.documentId);
    });

    test('PUT sets a oneToMany relation by documentId', async () => {
      const articleA = await createArticle('docId set A');
      const articleB = await createArticle('docId set B');
      const user = await createUser({ favoriteArticles: { connect: [articleA.id] } });

      const res = await putUser(user.id, { favoriteArticles: { set: [articleB.documentId] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticles).toHaveLength(1);
      expect(after.favoriteArticles[0].documentId).toBe(articleB.documentId);
    });

    test('PUT disconnects a oneToMany relation by documentId', async () => {
      const article = await createArticle('docId disconnect');
      const user = await createUser({ favoriteArticles: { connect: [article.id] } });

      const res = await putUser(user.id, {
        favoriteArticles: { disconnect: [article.documentId] },
      });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticles).toHaveLength(0);
    });

    test('PUT connects a manyToOne relation by documentId', async () => {
      const user = await createUser();
      const article = await createArticle('docId manyToOne');

      const res = await putUser(user.id, { favoriteArticle: { connect: [article.documentId] } });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticle).not.toBeNull();
      expect(after.favoriteArticle.documentId).toBe(article.documentId);
    });

    test('PUT connects a manyToOne relation by documentId shorthand', async () => {
      const user = await createUser();
      const article = await createArticle('docId manyToOne shorthand');

      const res = await putUser(user.id, { favoriteArticle: article.documentId });

      expect(res.statusCode).toBe(200);
      const after = await readUser(user.id);
      expect(after.favoriteArticle).not.toBeNull();
      expect(after.favoriteArticle.documentId).toBe(article.documentId);
    });

    test('Document Service connects a users-permissions user to a published DP target', async () => {
      const user = await createUser();
      const optIn = await createPublishedOptIn();

      const updatedUser = await strapi.documents('plugin::users-permissions.user').update({
        documentId: user.documentId,
        data: {
          optIns: {
            connect: {
              documentId: optIn.documentId,
              status: 'published',
            },
          },
        },
        populate: 'optIns',
      });

      expect(updatedUser.optIns).toHaveLength(1);
      expect(updatedUser.optIns[0]).toMatchObject({
        documentId: optIn.documentId,
        caption: 'Drafted Opt-In',
        publishedAt: expect.any(String),
      });
    });
  });
});
