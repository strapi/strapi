import { TOKEN_BINDING_UID } from '../../../../shared/constants';
import { runGlobal, runInSpace, runUnscoped } from '../../scope/context';
import { registerApiTokenIntegration, resolveTokenSpace } from '../api-tokens';

const FRANCE = { id: 7, slug: 'fr', status: 'active' };

interface Options {
  /** token id -> the space it is bound to, as stored. */
  bindings?: Record<string, { id: number; slug: string; status: string }>;
}

const makeStrapi = ({ bindings = {} }: Options = {}) => {
  const created: unknown[] = [];
  const deleted: unknown[] = [];
  let subscriber: Record<string, (event: unknown) => Promise<void>> = {};

  const strapi = {
    requestContext: { get: () => undefined },
    db: {
      lifecycles: {
        subscribe({ ...hooks }: Record<string, (event: unknown) => Promise<void>>) {
          subscriber = hooks;
        },
      },
      query(uid: string) {
        expect(uid).toBe(TOKEN_BINDING_UID);

        return {
          async findOne({ where }: { where: { token: number } }) {
            const space = bindings[String(where.token)];

            return space ? { token: where.token, space } : null;
          },
          async create({ data }: { data: unknown }) {
            created.push(data);

            return data;
          },
          async deleteMany({ where }: { where: unknown }) {
            deleted.push(where);

            return { count: 1 };
          },
        };
      },
    },
  } as never;

  registerApiTokenIntegration(strapi);

  return { strapi, created, deleted, fire: () => subscriber };
};

const ctxFor = (strategy: string, tokenId?: number) =>
  ({ state: { auth: { strategy: { name: strategy }, credentials: { id: tokenId } } } }) as never;

describe('the space an API token works in', () => {
  describe('when the token is issued', () => {
    it('is the space it was issued from', async () => {
      // A token is a standing grant: the space is decided now, because a token
      // cannot be trusted to say per request which tenant it acts for.
      const { created, fire } = makeStrapi();

      await runInSpace({ id: 7, slug: 'fr' }, () => fire().afterCreate({ result: { id: 3 } }));

      expect(created).toEqual([{ token: 3, space: 7 }]);
    });

    it('is nothing, for a token issued from the all-spaces view', async () => {
      const { created, fire } = makeStrapi();

      await runGlobal(() => fire().afterCreate({ result: { id: 3 } }));

      expect(created).toEqual([]);
    });

    it('is nothing, for a token issued by the CLI', async () => {
      const { created, fire } = makeStrapi();

      await runUnscoped(() => fire().afterCreate({ result: { id: 3 } }));

      expect(created).toEqual([]);
    });
  });

  describe('when the token is deleted', () => {
    it('the binding goes with it, so a reused id inherits nothing', async () => {
      const { deleted, fire } = makeStrapi();

      await runUnscoped(() => fire().afterDelete({ result: { id: 3 } }));

      expect(deleted).toEqual([{ token: 3 }]);
    });

    it('nothing happens when the delete affected no token', async () => {
      const { deleted, fire } = makeStrapi();

      await runUnscoped(() => fire().afterDelete({ result: undefined }));

      expect(deleted).toEqual([]);
    });
  });

  describe('when the token is used', () => {
    it('the request runs in the space the token is bound to', async () => {
      const { strapi } = makeStrapi({ bindings: { 3: FRANCE } });

      await expect(resolveTokenSpace(strapi, ctxFor('api-token', 3))).resolves.toEqual({
        id: 7,
        slug: 'fr',
      });
    });

    it('an admin token is bound the same way', async () => {
      const { strapi } = makeStrapi({ bindings: { 3: FRANCE } });

      await expect(resolveTokenSpace(strapi, ctxFor('admin-token', 3))).resolves.toEqual({
        id: 7,
        slug: 'fr',
      });
    });

    it('a binding to an archived space resolves to nothing', async () => {
      // The space was turned off; the standing grant does not survive it.
      const { strapi } = makeStrapi({ bindings: { 3: { ...FRANCE, status: 'archived' } } });

      await expect(resolveTokenSpace(strapi, ctxFor('api-token', 3))).resolves.toBeUndefined();
    });

    it('an unbound token resolves to nothing', async () => {
      const { strapi } = makeStrapi();

      await expect(resolveTokenSpace(strapi, ctxFor('api-token', 3))).resolves.toBeUndefined();
    });
  });

  describe('a request that is not using a token', () => {
    it.each(['admin', 'users-permissions', 'content-api'])(
      'is left alone (%s)',
      async (strategy) => {
        // A logged-in admin picks their space; only tokens are bound.
        const { strapi } = makeStrapi({ bindings: { 3: FRANCE } });

        await expect(resolveTokenSpace(strapi, ctxFor(strategy, 3))).resolves.toBeUndefined();
      }
    );

    it('is left alone when it has no authentication at all', async () => {
      const { strapi } = makeStrapi();

      await expect(resolveTokenSpace(strapi, { state: {} } as never)).resolves.toBeUndefined();
    });

    it('is left alone when the token carries no id', async () => {
      const { strapi } = makeStrapi();

      await expect(resolveTokenSpace(strapi, ctxFor('api-token'))).resolves.toBeUndefined();
    });
  });
});
