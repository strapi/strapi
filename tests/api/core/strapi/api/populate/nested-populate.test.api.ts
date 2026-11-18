/**
 * Deeply nested `populate` over HTTP.
 *
 * The populate traversal walks each nested level once and copies the populate once per request
 * (strapi/strapi#28157). The `@strapi/utils` unit suites cover this in process. These tests cover
 * what a client sees:
 * - private attributes, passwords, private relations and relations the token cannot read stay
 *   out of the response 4 to 6 levels deep, in object, dot-notation and string-array form
 * - a nested populate under a relation to a content type with an attribute named `populate` is
 *   checked against that content type
 * - a populate a route middleware takes from a module-level constant stays the same across
 *   requests
 * - nested filters that sanitization empties match the same entries on the real database
 */
import { cloneDeep, get } from 'lodash';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';

const NODE_UID = 'api::pnode.pnode';
const HOLDER_UID = 'api::pholder.pholder';
const LOCK_UID = 'api::plock.plock';

const blockComponent = {
  displayName: 'pblock',
  attributes: { label: { type: 'string' } },
};

const lockModel = {
  singularName: 'plock',
  pluralName: 'plocks',
  displayName: 'Plock',
  draftAndPublish: false,
  attributes: { name: { type: 'string' } },
};

const nodeModel = {
  singularName: 'pnode',
  pluralName: 'pnodes',
  displayName: 'Pnode',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    secret: { type: 'string', private: true },
    pass: { type: 'password' },
    next: { type: 'relation', relation: 'manyToOne', target: NODE_UID },
    hidden: { type: 'relation', relation: 'manyToOne', target: NODE_UID, private: true },
    lock: { type: 'relation', relation: 'manyToOne', target: LOCK_UID },
    holder: { type: 'relation', relation: 'manyToOne', target: HOLDER_UID },
  },
};

// `populate` is not a reserved attribute name, so the content-type builder accepts it. The
// relations point back at the holder: the builder needs a relation target to exist first.
const holderModel = {
  singularName: 'pholder',
  pluralName: 'pholders',
  displayName: 'Pholder',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    secret: { type: 'string', private: true },
    populate: { type: 'component', repeatable: false, component: 'default.pblock' },
    other: { type: 'relation', relation: 'manyToOne', target: HOLDER_UID },
    hidden: { type: 'relation', relation: 'manyToOne', target: HOLDER_UID, private: true },
    lock: { type: 'relation', relation: 'manyToOne', target: LOCK_UID },
  },
};

/** Nodes n0 -> n1 -> ... -> n7 through `next`, so `*` 6 levels down still has a `next`. */
const CHAIN_LENGTH = 8;

/** A populate that follows `next` `depth` times and populates `leaf` on the last node. */
const chainPopulate = (depth: number, leaf: unknown): Record<string, unknown> => {
  let populate: unknown = leaf;

  for (let level = 0; level < depth; level += 1) {
    populate = { next: { populate } };
  }

  return populate as Record<string, unknown>;
};

/** `next.next.....key`, `depth` times `next`. */
const chainPath = (depth: number, key: string) => [...Array(depth).fill('next'), key].join('.');

/** The response entry and every node below it through `next`. */
const chainLevels = (entry: Record<string, any>) => {
  const levels = [];

  for (let node = entry; node; node = node.next) {
    levels.push(node);
  }

  return levels;
};

// Taken by the route middleware below, as apps such as LaunchPad do.
const SHARED_POPULATE = {
  next: {
    fields: ['name'],
    sort: ['name:asc'],
    filters: { name: { $startsWith: 'n' } },
    populate: {
      next: {
        populate: {
          next: { populate: { next: { populate: '*' } } },
          holder: { fields: ['name'] },
        },
      },
    },
  },
};
const SHARED_POPULATE_BEFORE = cloneDeep(SHARED_POPULATE);

describe('Nested populate', () => {
  const builder = createTestBuilder();

  let strapi;
  let fullRequest;
  let restrictedRequest;
  const nodes: Array<{ documentId: string }> = [];

  const getRoot = (request, populate: unknown) =>
    request.get(`/pnodes/${nodes[0].documentId}`, { qs: { populate } });

  beforeAll(async () => {
    await builder
      .addComponent(blockComponent)
      .addContentTypes([lockModel, holderModel, nodeModel])
      .build();

    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: instance }) {
        instance.server.routes({
          type: 'content-api',
          routes: [
            {
              method: 'GET',
              path: '/shared-populate-pnodes',
              handler: `${NODE_UID}.find`,
              config: {
                middlewares: [
                  async (ctx, next) => {
                    ctx.query.populate = SHARED_POPULATE;
                    await next();
                  },
                ],
              },
            },
          ],
        });
      },
    });

    const lock = await strapi.documents(LOCK_UID).create({ data: { name: 'lock' } });

    // Built from the end of the chain, so each node can point at the next one.
    for (let index = CHAIN_LENGTH - 1; index >= 0; index -= 1) {
      const node = await strapi.documents(NODE_UID).create({
        data: {
          name: `n${index}`,
          secret: `secret-${index}`,
          pass: `Password${index}`,
          next: nodes[0]?.documentId ?? null,
          lock: lock.documentId,
        },
      });

      nodes.unshift(node);
    }

    const otherHolder = await strapi.documents(HOLDER_UID).create({
      data: { name: 'other holder', secret: 'secret' },
    });
    const holder = await strapi.documents(HOLDER_UID).create({
      data: {
        name: 'holder',
        secret: 'secret',
        populate: { label: 'block' },
        other: otherHolder.documentId,
        hidden: otherHolder.documentId,
        lock: lock.documentId,
      },
    });

    // n5 and below keep no holder, so a filter on `holder` can tell them apart.
    for (const node of nodes.slice(0, 5)) {
      await strapi.documents(NODE_UID).update({
        documentId: node.documentId,
        data: { holder: holder.documentId, hidden: nodes[CHAIN_LENGTH - 1].documentId },
      });
    }

    const adminRequest = await createAuthRequest({ strapi });
    const suffix = Date.now();

    const createToken = async (body: Record<string, unknown>) => {
      const res = await adminRequest({
        method: 'POST',
        url: '/admin/api-tokens',
        body: { name: `nested-populate-${body.type}-${suffix}`, ...body },
      });

      if (res.status !== 201) {
        throw new Error(`Failed to create an API token: ${JSON.stringify(res.body)}`);
      }

      return res.body.data.accessKey;
    };

    fullRequest = createContentAPIRequest({
      strapi,
      auth: { token: await createToken({ type: 'full-access' }) },
    });

    // Cannot read locks.
    restrictedRequest = createContentAPIRequest({
      strapi,
      auth: {
        token: await createToken({
          type: 'custom',
          permissions: [`${NODE_UID}.find`, `${NODE_UID}.findOne`, `${HOLDER_UID}.find`],
        }),
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('private and restricted data at depth', () => {
    test.each([4, 5, 6])(
      'leaves out private attributes, passwords and private relations %i levels deep',
      async (depth) => {
        const { status, body } = await getRoot(fullRequest, chainPopulate(depth, '*'));

        expect(status).toBe(200);

        const levels = chainLevels(body.data);
        expect(levels).toHaveLength(depth + 2);

        for (const level of levels) {
          expect(level).not.toHaveProperty('secret');
          expect(level).not.toHaveProperty('pass');
          expect(level).not.toHaveProperty('hidden');
        }

        // `*` on the last populated node expands its relations, except the private one.
        expect(levels[depth]).toHaveProperty('lock.name', 'lock');
      }
    );

    // `reached` is how many levels still come back. A dot-notation string is one path, so it
    // loses everything when its last segment is removed.
    test.each([
      ['an object', chainPopulate(5, { lock: true, holder: true }), 6],
      ['a dot-notation string', chainPath(5, 'lock'), 1],
      ['a string array', [chainPath(5, 'lock'), chainPath(5, 'holder')], 6],
      ['a nested *', chainPopulate(5, '*'), 7],
    ])(
      'removes a relation the token cannot read 6 levels deep, given %s',
      async (_form, populate, reached) => {
        const { status, body } = await getRoot(restrictedRequest, populate);

        expect(status).toBe(200);

        const levels = chainLevels(body.data);
        expect(levels).toHaveLength(reached);

        for (const level of levels) {
          expect(level).not.toHaveProperty('lock');
        }
      }
    );

    test.each([
      ['an object', chainPopulate(4, { hidden: true })],
      ['a dot-notation string', chainPath(4, 'hidden')],
      ['a string array', [chainPath(4, 'lock'), chainPath(4, 'hidden')]],
    ])('rejects a private relation 5 levels deep, given %s', async (_form, populate) => {
      const { status } = await getRoot(fullRequest, populate);

      expect(status).toBe(400);
    });
  });

  describe('a relation to a content type with an attribute named populate', () => {
    test('populates relations of the target in the nested populate', async () => {
      const { status, body } = await getRoot(fullRequest, {
        holder: { populate: { other: { fields: ['name'] } } },
      });

      expect(status).toBe(200);
      expect(body.data.holder.other).toMatchObject({ name: 'other holder' });
    });

    test('rejects a private relation of the target in the nested populate', async () => {
      const { status } = await getRoot(fullRequest, { holder: { populate: { hidden: true } } });

      expect(status).toBe(400);
    });

    test('rejects a private field of the target in the nested populate', async () => {
      const { status } = await getRoot(fullRequest, {
        holder: { populate: { other: { fields: ['secret'] } } },
      });

      expect(status).toBe(400);
    });

    test('removes a relation the token cannot read from the nested populate', async () => {
      const { status, body } = await getRoot(restrictedRequest, {
        holder: { populate: { lock: true, other: true } },
      });

      expect(status).toBe(200);
      expect(body.data.holder).not.toHaveProperty('lock');
      expect(body.data.holder.other).toMatchObject({ name: 'other holder' });
    });

    test('still populates the attribute itself', async () => {
      const { status, body } = await getRoot(fullRequest, {
        holder: { populate: { populate: true } },
      });

      expect(status).toBe(200);
      expect(body.data.holder.populate).toMatchObject({ label: 'block' });
    });
  });

  describe('a populate shared across requests', () => {
    const getShared = () =>
      fullRequest.get('/shared-populate-pnodes', { qs: { sort: ['name:asc'] } });

    test('gives every request the same response and leaves the constant unchanged', async () => {
      const first = await getShared();

      expect(first.status).toBe(200);
      expect(first.body.data.length).toBeGreaterThan(0);

      const sequential = [];
      for (let index = 0; index < 10; index += 1) {
        sequential.push(await getShared());
      }

      const concurrent = await Promise.all(Array.from({ length: 10 }, () => getShared()));

      for (const res of [...sequential, ...concurrent]) {
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(first.body.data);
      }

      expect(SHARED_POPULATE).toEqual(SHARED_POPULATE_BEFORE);
    });
  });

  describe('nested filters that sanitization empties', () => {
    // The default controllers reject invalid filter keys before sanitization, so this runs the
    // sanitizer directly: it keeps the empty relation object the invalid key leaves behind.
    test('match the same entries as no filter at all', async () => {
      const auth = { strategy: { name: 'api-token' }, credentials: { type: 'full-access' } };
      const schema = strapi.getModel(NODE_UID);

      const sanitized = await strapi.contentAPI.sanitize.query(
        {
          populate: chainPopulate(4, {
            next: { filters: { holder: { name: { $notAnOperator: 'x' } } } },
          }),
        },
        schema,
        { auth }
      );

      const nestedFilters = get(sanitized.populate, [
        ...Array(4).fill(['next', 'populate']).flat(),
        'next',
        'filters',
      ]);
      expect(nestedFilters).toEqual({ holder: {} });

      const filtered = await strapi.documents(NODE_UID).findOne({
        documentId: nodes[0].documentId,
        populate: sanitized.populate,
      });
      const unfiltered = await strapi.documents(NODE_UID).findOne({
        documentId: nodes[0].documentId,
        populate: chainPopulate(4, { next: {} }),
      });

      // n5 has no holder, so a filter that turned into a join on `holder` would drop it.
      expect(chainLevels(filtered).map((node) => node.name)).toEqual(
        chainLevels(unfiltered).map((node) => node.name)
      );
      expect(chainLevels(filtered)[5].name).toBe('n5');
    });
  });
});
