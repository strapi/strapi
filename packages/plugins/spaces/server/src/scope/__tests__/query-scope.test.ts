import { SPACE_STATE_KEY, SPACE_UID } from '../../../../shared/constants';
import { runGlobal, runInSpace, runUnscoped } from '../context';
import { createSpacesQueryScope } from '../query-scope';

const scopedMeta = {
  uid: 'api::article.article',
  attributes: {
    id: { type: 'increments' },
    title: { type: 'string' },
    space: {
      type: 'relation',
      relation: 'manyToOne',
      target: SPACE_UID,
      joinColumn: { name: 'space_id', referencedColumn: 'id' },
    },
  },
} as any;

const platformMeta = {
  uid: 'admin::user',
  attributes: { id: { type: 'increments' }, email: { type: 'string' } },
} as any;

const makeStrapi = (requestState?: Record<string, unknown>) => ({
  requestContext: {
    get: () => (requestState ? { state: requestState } : undefined),
  },
});

const ask = (strapi: any, meta: any = scopedMeta, operation: any = 'select') =>
  createSpacesQueryScope(strapi as any)({
    uid: meta.uid,
    meta,
    db: {} as any,
    operation,
  });

describe('spaces query scope', () => {
  describe('models it applies to', () => {
    it('leaves models without a space relation alone', () => {
      const strapi = makeStrapi();

      expect(runInSpace({ id: 7, slug: 'fr' }, () => ask(strapi, platformMeta))).toBeNull();
    });

    it('ignores an attribute called space that points elsewhere', () => {
      const decoy = {
        uid: 'api::launch.launch',
        attributes: {
          space: { type: 'relation', relation: 'manyToOne', target: 'api::galaxy.galaxy' },
        },
      } as any;

      const strapi = makeStrapi();

      expect(runInSpace({ id: 7, slug: 'fr' }, () => ask(strapi, decoy))).toBeNull();
    });
  });

  describe('inside a space', () => {
    it('narrows to that space, and to rows shared with every space', () => {
      const strapi = makeStrapi();

      const clause = runInSpace({ id: 7, slug: 'fr' }, () => ask(strapi));

      expect(clause).toEqual({
        $or: [{ space_id: 7 }, { space_id: { $null: true } }],
      });
    });

    it('uses the column the metadata names, not a guessed one', () => {
      const renamed = {
        uid: 'api::article.article',
        attributes: {
          space: {
            type: 'relation',
            relation: 'manyToOne',
            target: SPACE_UID,
            joinColumn: { name: 'sp_id_shortened', referencedColumn: 'id' },
          },
        },
      } as any;

      const clause = runInSpace({ id: 3, slug: 'de' }, () => ask(makeStrapi(), renamed)) as any;

      expect(clause.$or[0]).toEqual({ sp_id_shortened: 3 });
    });

    it.each(['select', 'count', 'update', 'delete'] as const)(
      'applies to %s, so writes cannot reach another space either',
      (operation) => {
        const clause = runInSpace({ id: 7, slug: 'fr' }, () =>
          ask(makeStrapi(), scopedMeta, operation)
        );

        expect(clause).not.toBeNull();
      }
    );
  });

  describe('without a space', () => {
    it('does not filter for trusted code outside any request', () => {
      expect(runUnscoped(() => ask(makeStrapi()))).toBeNull();
    });

    it('does not filter in the cross-space view', () => {
      expect(runGlobal(() => ask(makeStrapi()))).toBeNull();
    });

    it('does not filter when there is no request and no declared scope', () => {
      expect(ask(makeStrapi())).toBeNull();
    });
  });

  describe('a request whose space was never settled', () => {
    it('refuses rather than returning every space', () => {
      const strapi = makeStrapi({});

      expect(() => ask(strapi)).toThrow(/no space/i);
    });

    it('repeats the reason it was given', () => {
      const strapi = makeStrapi({
        [SPACE_STATE_KEY]: { mode: 'unresolved', reason: 'You do not belong to any space.' },
      });

      expect(() => ask(strapi)).toThrow('You do not belong to any space.');
    });

    it('still leaves platform models readable, so the admin can explain itself', () => {
      const strapi = makeStrapi({});

      expect(ask(strapi, platformMeta)).toBeNull();
    });
  });

  describe('rows that belong to no space', () => {
    it('are shared: every space reads them', () => {
      const clause = runInSpace({ id: 7, slug: 'fr' }, () => ask(makeStrapi())) as any;

      expect(clause.$or).toContainEqual({ space_id: { $null: true } });
    });

    it.each(['update', 'delete'] as const)(
      'cannot be changed from inside one space (%s)',
      (operation) => {
        // Reading what everyone shares is fine; rewriting it from inside one
        // tenant is one tenant changing what every other tenant reads.
        const clause = runInSpace({ id: 7, slug: 'fr' }, () =>
          ask(makeStrapi(), scopedMeta, operation)
        );

        expect(clause).toEqual({ space_id: 7 });
      }
    );

    it('are platform-only for records about the platform itself', () => {
      const auditMeta = {
        uid: 'admin::audit-log',
        attributes: {
          space: {
            type: 'relation',
            relation: 'manyToOne',
            target: SPACE_UID,
            joinColumn: { name: 'space_id', referencedColumn: 'id' },
          },
        },
      } as any;

      // A tenant must not be shown who signed in or who changed a role.
      const clause = runInSpace({ id: 7, slug: 'fr' }, () => ask(makeStrapi(), auditMeta));

      expect(clause).toEqual({ space_id: 7 });
    });
  });

  describe('where the scope comes from', () => {
    it('reads the space the request settled on', () => {
      const strapi = makeStrapi({
        [SPACE_STATE_KEY]: { mode: 'space', id: 4, slug: 'de' },
      });

      expect(ask(strapi)).toEqual({ $or: [{ space_id: 4 }, { space_id: { $null: true } }] });
    });

    it('lets declared scope override the request, so a job can act for another space', () => {
      const strapi = makeStrapi({
        [SPACE_STATE_KEY]: { mode: 'space', id: 4, slug: 'de' },
      });

      const clause = runInSpace({ id: 9, slug: 'es' }, () => ask(strapi)) as any;

      expect(clause.$or[0]).toEqual({ space_id: 9 });
    });

    it('keeps concurrent scopes apart', async () => {
      const strapi = makeStrapi();

      const inFrance = runInSpace({ id: 1, slug: 'fr' }, async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });

        return ask(strapi);
      });

      const inGermany = runInSpace({ id: 2, slug: 'de' }, async () => ask(strapi));

      expect((await inFrance) as any).toEqual({
        $or: [{ space_id: 1 }, { space_id: { $null: true } }],
      });
      expect((await inGermany) as any).toEqual({
        $or: [{ space_id: 2 }, { space_id: { $null: true } }],
      });
    });
  });
});
