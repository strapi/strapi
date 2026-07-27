'use strict';

/**
 * Regression tests for Strapi's published sanitization advisories.
 *
 * Five separate advisories are the same vulnerability class rediscovered through five
 * different query surfaces: a filter that reaches a private column on a joined table
 * turns the response into a one-bit oracle, which is enough to extract an admin
 * `resetPasswordToken` character by character and take over the instance.
 *
 *   GHSA-jjqf-j4w7-92w8  4.8.0    CVE-2023-22894  filters on private fields
 *   GHSA-9xg4-3qfm-9w8f  4.10.8                   same, bypassed with a `t1.` prefix
 *   GHSA-v8gg-4mq2-88q4  4.11.7                   content-manager relations route
 *   GHSA-495j-h493-42q2  5.5.2                    the `lookup` param
 *   GHSA-rjg2-95x7-8qmx  5.37.0   CVE-2026-27886  the `where` param, critical (9.3)
 *
 * Plus two of a different shape:
 *
 *   GHSA-gc7p-j5xm-xxh2  4.13.1   sanitizeInput let a client write private fields
 *   GHSA-6j89-frxc-q26m  4.19.1   relation listings leaked entries outside read scope
 *
 * WHY THESE ASSERT WHAT THEY ASSERT
 *
 * The leak in the oracle class was never in the response body — the private field was
 * not returned. It was in *which rows came back*. So asserting that a private field is
 * absent from the payload does not test the vulnerability at all.
 *
 * What these tests assert instead is that a query referencing a private field is
 * indistinguishable from one that does not reference it: either the request is
 * rejected outright, or it returns exactly the result set the same query without the
 * private filter returns. Both are valid defences; leaking is not. That framing also
 * survives a change in which defence Strapi picks, so the tests do not have to be
 * rewritten when error handling is tuned.
 */

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;

const article = {
  displayName: 'Advisory Article',
  singularName: 'advisory-article',
  pluralName: 'advisory-articles',
  kind: 'collectionType',
  // Exposes createdBy / updatedBy as relations to admin_users, which is the join the
  // oracle advisories abused.
  options: { populateCreatorFields: true },
  attributes: {
    title: { type: 'string' },
    // A field the client must never be able to read or write.
    internalNote: { type: 'string', private: true },
    secret: { type: 'password' },
  },
};

const fixtures = {
  'advisory-article': [
    { title: 'first', internalNote: 'do not leak me', secret: 'hunter2' },
    { title: 'second', internalNote: 'nor me', secret: 'hunter3' },
    { title: 'third', internalNote: 'nor me either', secret: 'hunter4' },
  ],
};

/** Sorted ids of the returned documents, or null when the request was rejected. */
const shapeOf = (res) => {
  if (res.statusCode !== 200) return null;
  const items = res.body?.data ?? [];
  return items.map((item) => item.documentId ?? item.id).sort();
};

describe('Sanitization advisory regressions', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes([article])
      .addFixtures(article.singularName, fixtures['advisory-article'])
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  const list = (qs = {}) => rq({ method: 'GET', url: '/advisory-articles', qs });

  /**
   * The core assertion for the oracle class.
   *
   * Runs the same query with two probe values chosen so that a working filter would
   * discriminate between them — bcrypt hashes all begin with `$2`, so `$2` would match
   * every admin row and `$9` none — and requires that the caller learns nothing:
   *
   *   - both probes must be treated the same way, and
   *   - if they are accepted, they must return the unfiltered result set, proving the
   *     private filter had no effect on the query at all.
   */
  const expectNoOracle = async (buildQs, description) => {
    const baseline = await list();
    expect(baseline.statusCode).toBe(200);

    const matching = await list(buildQs('$2'));
    const nonMatching = await list(buildQs('$9'));

    expect({ probe: description, status: matching.statusCode }).toEqual({
      probe: description,
      status: nonMatching.statusCode,
    });

    const matchingShape = shapeOf(matching);
    const nonMatchingShape = shapeOf(nonMatching);

    // Identical between probes: no bit of information is leaked.
    expect(matchingShape).toEqual(nonMatchingShape);

    // And identical to no filter at all: the private clause never reached the database.
    if (matchingShape !== null) {
      expect(matchingShape).toEqual(shapeOf(baseline));
    }
  };

  describe('Private fields cannot be used as a filter oracle', () => {
    // GHSA-jjqf-j4w7-92w8 (CVE-2023-22894)
    test('filters on a joined admin password', async () => {
      await expectNoOracle(
        (probe) => ({ filters: { updatedBy: { password: { $startsWith: probe } } } }),
        'filters[updatedBy][password]'
      );
    });

    // GHSA-jjqf-j4w7-92w8 — the reset token is the payload that made this critical.
    test('filters on a joined admin resetPasswordToken', async () => {
      await expectNoOracle(
        (probe) => ({ filters: { updatedBy: { resetPasswordToken: { $startsWith: probe } } } }),
        'filters[updatedBy][resetPasswordToken]'
      );
    });

    // GHSA-9xg4-3qfm-9w8f — the 4.8.0 fix checked the key name, so the key was reshaped.
    test('filters on a joined admin password via a table-alias prefix', async () => {
      await expectNoOracle(
        (probe) => ({ filters: { updatedBy: { 't1.password': { $startsWith: probe } } } }),
        'filters[updatedBy][t1.password]'
      );
    });

    // GHSA-495j-h493-42q2 — a new query surface shipped without being wired in.
    test('lookup on a joined admin password', async () => {
      await expectNoOracle(
        (probe) => ({ lookup: { updatedBy: { password: { $startsWith: probe } } } }),
        'lookup[updatedBy][password]'
      );
    });

    // GHSA-rjg2-95x7-8qmx (CVE-2026-27886) — critical, 9.3.
    test('where on a joined admin password', async () => {
      await expectNoOracle(
        (probe) => ({ where: { updatedBy: { password: { $startsWith: probe } } } }),
        'where[updatedBy][password]'
      );
    });

    test("filters on the content type's own private field", async () => {
      await expectNoOracle(
        (probe) => ({ filters: { internalNote: { $startsWith: probe } } }),
        'filters[internalNote]'
      );
    });

    test("filters on the content type's own password field", async () => {
      await expectNoOracle(
        (probe) => ({ filters: { secret: { $startsWith: probe } } }),
        'filters[secret]'
      );
    });

    test('deeply nested inside $and / $or', async () => {
      await expectNoOracle(
        (probe) => ({
          filters: {
            $and: [
              { title: { $notNull: true } },
              { $or: [{ updatedBy: { password: { $startsWith: probe } } }] },
            ],
          },
        }),
        '$and/$or nesting'
      );
    });
  });

  describe('Private fields cannot be reached through other query surfaces', () => {
    test('sorting on a private field does not order by it', async () => {
      const ascending = await list({ sort: 'internalNote:asc' });
      const descending = await list({ sort: 'internalNote:desc' });

      expect(ascending.statusCode).toBe(descending.statusCode);

      // If sorting by a private field were honoured, the two orders would differ.
      if (ascending.statusCode === 200) {
        const asc = (ascending.body.data ?? []).map((d) => d.documentId ?? d.id);
        const desc = (descending.body.data ?? []).map((d) => d.documentId ?? d.id);
        expect(asc).toEqual(desc);
      }
    });

    test('requesting a private field explicitly does not return it', async () => {
      const res = await list({ fields: ['title', 'internalNote', 'secret'] });

      if (res.statusCode === 200) {
        for (const item of res.body.data) {
          expect(item).not.toHaveProperty('internalNote');
          expect(item).not.toHaveProperty('secret');
        }
      } else {
        expect(res.statusCode).toBe(400);
      }
    });

    test('populating the creator relation does not expose its private fields', async () => {
      const res = await list({ populate: ['updatedBy', 'createdBy'] });

      if (res.statusCode !== 200) {
        expect(res.statusCode).toBe(400);
        return;
      }

      for (const item of res.body.data) {
        for (const creator of [item.updatedBy, item.createdBy]) {
          if (!creator) continue;
          expect(creator).not.toHaveProperty('password');
          expect(creator).not.toHaveProperty('resetPasswordToken');
          expect(creator).not.toHaveProperty('registrationToken');
        }
      }
    });
  });

  describe('Private fields never appear in responses', () => {
    test('list responses omit private and password fields', async () => {
      const res = await list();

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const item of res.body.data) {
        expect(item).not.toHaveProperty('internalNote');
        expect(item).not.toHaveProperty('secret');
        expect(item).toHaveProperty('title');
      }
    });

    test('the serialized body contains no private value anywhere', async () => {
      const res = await list({ populate: '*' });
      const body = JSON.stringify(res.body);

      // Catches a private value surfacing at any depth, including inside a relation or
      // component, which a per-key assertion on the top level would miss.
      expect(body).not.toContain('do not leak me');
      expect(body).not.toContain('hunter2');
    });
  });

  /**
   * GHSA-gc7p-j5xm-xxh2 was reported as "I can write to private fields via the register
   * API". It is worth being precise about what was actually wrong, because the obvious
   * assertion here would be wrong.
   *
   * `private: true` in Strapi controls OUTPUT only. `sanitizeInput` applies
   * `removeRestrictedFields(getNonWritableAttributes(schema))`, and non-writable means
   * `writable: false` plus id and the timestamps — not `private`. Writing a private
   * field through the content API is therefore intended, and a project may rely on it.
   *
   * The advisory was fixed where the real problem was: `register` now rejects any key
   * outside an explicit allowlist, so a client cannot set `confirmed`, `blocked` or
   * `resetPasswordToken` on itself. The comment at
   * packages/plugins/users-permissions/server/controllers/auth.js states the intent
   * outright — allowedFields is deliberately not filtered by `private`.
   *
   * So the guarantee to pin here is the read side: a private field a client managed to
   * write must still never come back out.
   */
  describe('A private field written by a client is still never returned', () => {
    test('create response omits the private field it was given', async () => {
      const res = await rq({
        method: 'POST',
        url: '/advisory-articles',
        body: { data: { title: 'written', internalNote: 'injected by client' } },
      });

      if (res.statusCode >= 400) {
        // Rejecting the write outright is also a valid outcome.
        return;
      }

      expect(res.body.data).not.toHaveProperty('internalNote');
      expect(JSON.stringify(res.body)).not.toContain('injected by client');
    });

    test('a subsequent read never surfaces it', async () => {
      const res = await list({ populate: '*' });

      expect(res.statusCode).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('injected by client');

      for (const item of res.body.data) {
        expect(item).not.toHaveProperty('internalNote');
      }
    });

    test('it cannot be used as a filter oracle either', async () => {
      await expectNoOracle(
        (probe) => ({ filters: { internalNote: { $startsWith: probe } } }),
        'filters[internalNote] after a client write'
      );
    });
  });
});
