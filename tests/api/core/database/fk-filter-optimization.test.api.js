'use strict';

/**
 * Tests for bug #25395: findMany() with select + relation filter returning wrong row count.
 *
 * Two root causes are tested:
 *
 * 1. FK optimization path (useJoinTable: false):
 *    When a relation stores its FK directly on the source table, the optimization
 *    converts `{ advertiser: { id: X } }` to a WHERE on the FK column, eliminating
 *    the JOIN and therefore the DISTINCT that collapses duplicate-valued rows.
 *
 * 2. JOIN + PK-in-DISTINCT path (default joinTable / complex filters):
 *    When a JOIN is still required, DISTINCT now always includes the PK so that
 *    each row is uniquely identified — `SELECT DISTINCT id, price` instead of
 *    `SELECT DISTINCT price`.
 */

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;

// --------------------------------------------------------------------------
// Content type definitions
// --------------------------------------------------------------------------

const advertiserCT = {
  displayName: 'advertiser',
  singularName: 'advertiser',
  pluralName: 'advertisers',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

/**
 * `useJoinTable: false` forces Strapi to store the FK column directly on the
 * transactions table (advertiser_id) instead of in a pivot join table.
 * This is required for the FK optimization in `processWhere()` to trigger.
 */
const transactionCT = {
  displayName: 'transaction',
  singularName: 'transaction',
  pluralName: 'transactions',
  kind: 'collectionType',
  attributes: {
    price: { type: 'decimal' },
    status: { type: 'string' },
    advertiser: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::advertiser.advertiser',
      useJoinTable: false,
    },
  },
};

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const fixtures = {
  advertiser: [{ name: 'Alpha Corp' }, { name: 'Beta Inc' }],

  transaction: ({ advertiser }) => {
    const rows = [];

    // 8 rows for advertiser[0], all with the SAME price.
    // This is the exact scenario from issue #25395:
    // `SELECT DISTINCT price` would collapse them to 1 row without the fix.
    for (let i = 0; i < 8; i++) {
      rows.push({
        price: 10.0,
        status: 'SUCCESSFUL',
        advertiser: advertiser[0].id,
      });
    }

    // 3 rows for advertiser[1], different price.
    for (let i = 0; i < 3; i++) {
      rows.push({
        price: 20.0,
        status: 'PENDING',
        advertiser: advertiser[1].id,
      });
    }

    return rows;
  },
};

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('findMany with select + relation filter (bug #25395)', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([advertiserCT, transactionCT])
      .addFixtures(advertiserCT.singularName, fixtures.advertiser)
      .addFixtures(transactionCT.singularName, fixtures.transaction)
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // -------------------------------------------------------------------------
  // FK optimization path (useJoinTable: false)
  // -------------------------------------------------------------------------

  describe('FK optimization path (useJoinTable: false)', () => {
    test('returns all rows when selected field has duplicate values — the core bug', async () => {
      const [alpha] = await strapi.db
        .query('api::advertiser.advertiser')
        .findMany({ where: { name: 'Alpha Corp' } });

      // 8 rows all share price = 10.0. Without the fix, DISTINCT collapses them to 1.
      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { id: alpha.id } },
        select: ['price'],
      });

      expect(results).toHaveLength(8);
    });

    test('select with $in operator returns correct count', async () => {
      const [alpha] = await strapi.db
        .query('api::advertiser.advertiser')
        .findMany({ where: { name: 'Alpha Corp' } });

      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { id: { $in: [alpha.id] } } },
        select: ['price'],
      });

      expect(results).toHaveLength(8);
    });

    test('select with $ne operator excludes the right advertiser', async () => {
      const [, beta] = await strapi.db
        .query('api::advertiser.advertiser')
        .findMany({ orderBy: { name: 'asc' } });

      // Exclude Beta Inc → should return 8 Alpha rows
      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { id: { $ne: beta.id } } },
        select: ['price'],
      });

      expect(results).toHaveLength(8);
    });

    test('select with multiple fields still returns all rows', async () => {
      const [alpha] = await strapi.db
        .query('api::advertiser.advertiser')
        .findMany({ where: { name: 'Alpha Corp' } });

      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { id: alpha.id }, status: 'SUCCESSFUL' },
        select: ['price', 'status'],
      });

      expect(results).toHaveLength(8);
      expect(results[0]).toHaveProperty('price');
      expect(results[0]).toHaveProperty('status');
      expect(results[0]).not.toHaveProperty('id'); // not in select — note: id is added internally for DISTINCT but stripped from output
    });

    test('without select also returns correct count (regression guard)', async () => {
      const [alpha] = await strapi.db
        .query('api::advertiser.advertiser')
        .findMany({ where: { name: 'Alpha Corp' } });

      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { id: alpha.id } },
      });

      expect(results).toHaveLength(8);
    });

    test('select without relation filter returns correct count (regression guard)', async () => {
      const results = await strapi.db.query('api::transaction.transaction').findMany({
        select: ['price'],
      });

      expect(results).toHaveLength(11); // 8 + 3
    });
  });

  // -------------------------------------------------------------------------
  // JOIN path (complex filter / PK-in-DISTINCT fix)
  // -------------------------------------------------------------------------

  describe('JOIN path — complex filter with duplicate selected values', () => {
    test('complex relation filter with duplicate selected field returns all rows', async () => {
      // { advertiser: { name: '...' } } cannot be reduced to a FK column filter,
      // so a JOIN is created and DISTINCT is applied. Without the PK-in-DISTINCT fix,
      // this would return 1 row instead of 8 (all prices = 10.0).
      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { name: 'Alpha Corp' } },
        select: ['price'],
      });

      expect(results).toHaveLength(8);
    });

    test('complex filter for the other advertiser returns correct count', async () => {
      const results = await strapi.db.query('api::transaction.transaction').findMany({
        where: { advertiser: { name: 'Beta Inc' } },
        select: ['price'],
      });

      expect(results).toHaveLength(3);
    });
  });
});
