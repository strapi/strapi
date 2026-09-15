import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../../shared/constants';
import { runGlobal, runInSpace, runUnscoped } from '../context';
import { registerWriteStamping } from '../stamp';

const scopedMeta = {
  uid: 'api::article.article',
  attributes: {
    title: { type: 'string' },
    [SPACE_ATTRIBUTE]: { type: 'relation', target: SPACE_UID },
  },
};

const platformMeta = {
  uid: 'admin::user',
  attributes: { email: { type: 'string' } },
};

const makeStrapi = () => {
  const models: Record<string, unknown> = {
    'api::article.article': scopedMeta,
    'admin::user': platformMeta,
  };

  let subscriber: Record<string, (event: unknown) => void> = {};

  // Kept out of the `as never` cast below, so a test can put a request with no
  // space in force.
  const requestContext = {
    get: (): { state: Record<string, unknown> } | undefined => undefined,
  };

  return {
    requestContext,
    strapi: {
      requestContext,
      db: {
        metadata: {
          has: (uid: string) => uid in models,
          get: (uid: string) => models[uid],
        },
        lifecycles: {
          subscribe(next: Record<string, (event: unknown) => void>) {
            subscriber = next;
          },
        },
      },
    } as never,
    fire: (hook: string, uid: string, params: Record<string, unknown>) =>
      subscriber[hook]?.({ model: { uid }, params } as never),
  };
};

describe('stamping a new row with its space', () => {
  describe('inside a space', () => {
    it('records the space the row is created in', () => {
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { title: 'Bonjour' } as Record<string, unknown> };
      runInSpace({ id: 7, slug: 'fr' }, () => fire('beforeCreate', 'api::article.article', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBe(7);
    });

    it('records it on every row of a batch', () => {
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: [{ title: 'a' }, { title: 'b' }] as Record<string, unknown>[] };
      runInSpace({ id: 7, slug: 'fr' }, () =>
        fire('beforeCreateMany', 'api::article.article', params)
      );

      expect(params.data.map((row) => row[SPACE_ATTRIBUTE])).toEqual([7, 7]);
    });

    it('leaves a space the caller already decided on', () => {
      // The migration assigns rows to a space, and the all-spaces view names
      // the space it is creating into. Neither should be second-guessed.
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { title: 'x', [SPACE_ATTRIBUTE]: 2 } };
      runInSpace({ id: 7, slug: 'fr' }, () => fire('beforeCreate', 'api::article.article', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBe(2);
    });

    it('leaves models that have no space alone', () => {
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { email: 'a@b.c' } as Record<string, unknown> };
      runInSpace({ id: 7, slug: 'fr' }, () => fire('beforeCreate', 'admin::user', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });
  });

  describe('outside a space', () => {
    it('leaves a row unassigned for trusted code', () => {
      // The migration and the CLI are responsible for the whole dataset.
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { title: 'x' } as Record<string, unknown> };
      runUnscoped(() => fire('beforeCreate', 'api::article.article', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });

    it('leaves a row unassigned in the all-spaces view', () => {
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { title: 'x' } as Record<string, unknown> };
      runGlobal(() => fire('beforeCreate', 'api::article.article', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });
  });

  describe('a request with no space', () => {
    it('is refused rather than writing a row every tenant can see', () => {
      // An INSERT has no rows to narrow, so the query scope lets it through.
      // This is the one way such a request could still affect a space.
      const { strapi, requestContext, fire } = makeStrapi();
      requestContext.get = () => ({ state: {} });
      registerWriteStamping(strapi);

      expect(() => fire('beforeCreate', 'api::article.article', { data: { title: 'x' } })).toThrow(
        /no space/i
      );
    });

    it('still lets platform models through', () => {
      const { strapi, requestContext, fire } = makeStrapi();
      requestContext.get = () => ({ state: {} });
      registerWriteStamping(strapi);

      expect(() => fire('beforeCreate', 'admin::user', { data: { email: 'a@b.c' } })).not.toThrow();
    });
  });

  describe('updates', () => {
    it('drops a space smuggled into update data', () => {
      // Moving content between spaces has its own action, which checks both
      // ends. Anything arriving through ordinary entry data is not a move.
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { title: 'x', [SPACE_ATTRIBUTE]: 2 } as Record<string, unknown> };
      runInSpace({ id: 7, slug: 'fr' }, () => fire('beforeUpdate', 'api::article.article', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });

    it('drops it on a bulk update too', () => {
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { [SPACE_ATTRIBUTE]: 2 } as Record<string, unknown> };
      runInSpace({ id: 7, slug: 'fr' }, () =>
        fire('beforeUpdateMany', 'api::article.article', params)
      );

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });

    it('keeps it for the deliberate reassignment the migration makes', () => {
      const { strapi, fire } = makeStrapi();
      registerWriteStamping(strapi);

      const params = { data: { [SPACE_ATTRIBUTE]: 2 } as Record<string, unknown> };
      runUnscoped(() => fire('beforeUpdate', 'api::article.article', params));

      expect(params.data[SPACE_ATTRIBUTE]).toBe(2);
    });
  });
});
