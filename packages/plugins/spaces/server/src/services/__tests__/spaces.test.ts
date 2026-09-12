import type { SpaceStatus } from '../../../../shared/constants';
import createSpacesService from '../spaces';

interface Row {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  status: SpaceStatus;
  isDefault: boolean;
  contentTypes?: string[] | null;
}

const makeStrapi = (rows: Row[] = [], { maxSpaces = null }: { maxSpaces?: number | null } = {}) => {
  // Copied: the stub mutates rows in place, and the fixtures are shared.
  const table = rows.map((row) => ({ ...row }));
  let nextId = table.length + 1;

  const query = {
    findMany: async () => table,
    async create({ data }: { data: Record<string, unknown> }) {
      const row = { id: nextId, ...data } as Row;
      nextId += 1;
      table.push(row);

      return row;
    },
    async update({ where, data }: { where: { id: number }; data: Record<string, unknown> }) {
      const row = table.find((entry) => entry.id === where.id)!;
      Object.assign(row, data);

      return row;
    },
    async updateMany({ data }: { data: Record<string, unknown> }) {
      table.forEach((row) => Object.assign(row, data));

      return { count: table.length };
    },
    async delete({ where }: { where: { id: number } }) {
      const index = table.findIndex((entry) => entry.id === where.id);
      const [removed] = table.splice(index, 1);

      return removed;
    },
    deleteMany: async () => ({ count: 0 }),
  };

  return {
    table,
    strapi: {
      requestContext: { get: () => undefined },
      eventHub: { emit: jest.fn() },
      db: {
        query: () => query,
        transaction: async (fn: () => Promise<unknown>) => fn(),
        metadata: { has: () => false },
      },
      service: (uid: string) =>
        ({
          'plugin::spaces.limits': {
            async assertCanCreate() {
              if (maxSpaces !== null && table.length >= maxSpaces) {
                throw new Error(`This project is limited to ${maxSpaces} spaces.`);
              }
            },
          },
          'plugin::spaces.content-types': { listScopedUids: () => [] },
          'plugin::spaces.membership': { removeAllForSpace: jest.fn() },
        })[uid],
    } as never,
  };
};

const FRANCE: Row = {
  id: 1,
  documentId: 'space-1',
  name: 'France',
  slug: 'france',
  status: 'active',
  isDefault: true,
  contentTypes: null,
};

describe('the space registry', () => {
  describe('creating', () => {
    it('derives a slug from the name', async () => {
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });

      const created = await spaces.create({ name: 'Le Café Français' });

      expect(created.slug).toBe('le-cafe-francais');
    });

    it('makes the first space the default one', async () => {
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });

      const first = await spaces.create({ name: 'First' });
      const second = await spaces.create({ name: 'Second' });

      expect(first.isDefault).toBe(true);
      expect(second.isDefault).toBe(false);
    });

    it('refuses a slug that is already taken', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.create({ name: 'France again', slug: 'france' })).rejects.toThrow(
        /already exists/i
      );
    });

    it.each(['all', 'none', 'new', 'admin', 'api'])(
      'refuses the reserved slug %s',
      async (slug) => {
        // These would collide with route segments.
        const { strapi } = makeStrapi();
        const spaces = createSpacesService({ strapi });

        await expect(spaces.create({ name: 'X', slug })).rejects.toThrow(/reserved/i);
      }
    );

    it('refuses the slug that means "every space"', async () => {
      // Caught by the slug pattern before the reserved list, but refused either
      // way — a space named `*` would be unreachable through the header.
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });

      await expect(spaces.create({ name: 'X', slug: '*' })).rejects.toThrow();
    });

    it('refuses a name that cannot become a slug', async () => {
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });

      await expect(spaces.create({ name: '???' })).rejects.toThrow(/cannot be used/i);
    });

    it('stops at the number of spaces the project allows', async () => {
      const { strapi } = makeStrapi([FRANCE], { maxSpaces: 1 });
      const spaces = createSpacesService({ strapi });

      await expect(spaces.create({ name: 'Second' })).rejects.toThrow(/limited to 1/i);
    });
  });

  describe('updating', () => {
    it('refuses to rename a slug, because tokens and links point at it', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.update(1, { slug: 'deutschland' })).rejects.toThrow(/cannot be changed/i);
    });

    it('accepts a slug that is the one it already has', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.update(1, { slug: 'france', name: 'La France' })).resolves.toMatchObject({
        name: 'La France',
      });
    });

    it('refuses to archive the space everyone falls back to', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.update(1, { status: 'archived' })).rejects.toThrow(/default space/i);
    });

    it('limits a space to some content types', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      const updated = await spaces.update(1, { contentTypes: ['api::article.article'] });

      expect(updated.contentTypes).toEqual(['api::article.article']);
    });

    it('reports a space that does not exist', async () => {
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });

      await expect(spaces.update(99, { name: 'X' })).rejects.toThrow(/does not exist/i);
    });
  });

  describe('the default space', () => {
    it('moves, leaving exactly one', async () => {
      const { strapi, table } = makeStrapi([
        FRANCE,
        {
          id: 2,
          documentId: 'space-2',
          name: 'Germany',
          slug: 'germany',
          status: 'active',
          isDefault: false,
        },
      ]);
      const spaces = createSpacesService({ strapi });

      await spaces.setDefault(2);

      expect(table.filter((row) => row.isDefault).map((row) => row.slug)).toEqual(['germany']);
    });

    it('cannot be an archived space', async () => {
      const { strapi } = makeStrapi([
        FRANCE,
        {
          id: 2,
          documentId: 'space-2',
          name: 'Old',
          slug: 'old',
          status: 'archived',
          isDefault: false,
        },
      ]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.setDefault(2)).rejects.toThrow(/archived/i);
    });
  });

  describe('deleting', () => {
    it('refuses the default space', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.delete(1)).rejects.toThrow(/default space/i);
    });

    it('removes a space and its memberships', async () => {
      const { strapi, table } = makeStrapi([
        FRANCE,
        {
          id: 2,
          documentId: 'space-2',
          name: 'Germany',
          slug: 'germany',
          status: 'active',
          isDefault: false,
        },
      ]);
      const spaces = createSpacesService({ strapi });

      await spaces.delete(2);

      expect(table.map((row) => row.slug)).toEqual(['france']);
    });
  });

  describe('resolving a header', () => {
    it('finds an active space by slug', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.resolveHeaderValue(' france ')).resolves.toMatchObject({ id: 1 });
    });

    it('does not resolve an archived one', async () => {
      const { strapi } = makeStrapi([{ ...FRANCE, status: 'archived', isDefault: false }]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.resolveHeaderValue('france')).resolves.toBeUndefined();
    });

    it('does not resolve an empty value', async () => {
      const { strapi } = makeStrapi([FRANCE]);
      const spaces = createSpacesService({ strapi });

      await expect(spaces.resolveHeaderValue('  ')).resolves.toBeUndefined();
    });
  });

  describe('content type availability', () => {
    it('allows everything when the space names nothing', () => {
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });

      expect(spaces.isContentTypeAvailable(FRANCE, 'api::article.article')).toBe(true);
    });

    it('allows only what the space names', () => {
      const { strapi } = makeStrapi();
      const spaces = createSpacesService({ strapi });
      const limited = { ...FRANCE, contentTypes: ['api::page.page'] };

      expect(spaces.isContentTypeAvailable(limited, 'api::page.page')).toBe(true);
      expect(spaces.isContentTypeAvailable(limited, 'api::article.article')).toBe(false);
    });
  });
});
