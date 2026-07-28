/**
 * This service handles context-dependent validation against the content-type registry + persistFromUpdate's
 * prune and persist functions. General validation rules are handled by the CTB's contentStructure controller.
 */
import { errors } from '@strapi/utils';

import { createContentStructureService } from '../content-structure';

type Kind = 'collectionType' | 'singleType';

const coreServiceMock = {
  getCleanedFile: jest.fn(),
  write: jest.fn().mockResolvedValue(undefined),
};

const buildStrapi = (contentTypes: Record<string, { kind?: Kind }> = {}) =>
  ({
    contentTypes,
    log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    reload: jest.fn(),
    get: jest.fn((name: string) => {
      if (name === 'content-structure') {
        return coreServiceMock;
      }
      return {};
    }),
  }) as any;

const validExample = (): any => ({
  version: 1,
  sections: {
    collectionTypes: {
      groups: [
        {
          id: 'grp_marketing',
          name: 'Marketing',
          parent: null,
          children: [
            { type: 'contentType', uid: 'api::article.article' },
            { type: 'group', id: 'grp_blog' },
            { type: 'contentType', uid: 'api::category.category' },
          ],
        },
        {
          id: 'grp_blog',
          name: 'Blog',
          parent: 'grp_marketing',
          children: [{ type: 'contentType', uid: 'api::author.author' }],
        },
      ],
    },
    singleTypes: { groups: [] },
  },
});

const exampleEffectiveSet = (): Map<string, Kind> =>
  new Map<string, Kind>([
    ['api::article.article', 'collectionType'],
    ['api::category.category', 'collectionType'],
    ['api::author.author', 'collectionType'],
  ]);

describe('CTB content-structure service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    coreServiceMock.write.mockResolvedValue(undefined);
    coreServiceMock.getCleanedFile.mockReset();
  });

  describe('validateContentTypeUidReferences()', () => {
    const service = () => createContentStructureService(buildStrapi());

    it('accepts a structure whose references all exist with matching kinds', () => {
      expect(() =>
        service().validateContentTypeUidReferences(validExample(), exampleEffectiveSet())
      ).not.toThrow();
    });

    it('ignores group children (only content-type references are checked)', () => {
      const file = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              { id: 'grp_a', name: 'A', parent: null, children: [{ type: 'group', id: 'grp_b' }] },
              { id: 'grp_b', name: 'B', parent: 'grp_a', children: [] },
            ],
          },
          singleTypes: { groups: [] },
        },
      };
      expect(() => service().validateContentTypeUidReferences(file, new Map())).not.toThrow();
    });

    it('rejects a uid absent from the effective content-type set', () => {
      const file = validExample();
      file.sections.collectionTypes.groups[1].children.push({
        type: 'contentType',
        uid: 'api::ghost.ghost',
      });

      expect(() => service().validateContentTypeUidReferences(file, exampleEffectiveSet())).toThrow(
        /api::ghost.ghost.*does not exist/
      );
    });

    it('accepts a uid created in the same batch', () => {
      const file = validExample();
      file.sections.collectionTypes.groups[1].children.push({
        type: 'contentType',
        uid: 'api::fresh.fresh',
      });

      const effective = exampleEffectiveSet();
      effective.set('api::fresh.fresh', 'collectionType');

      expect(() => service().validateContentTypeUidReferences(file, effective)).not.toThrow();
    });

    it('rejects a collectionType uid under singleTypes', () => {
      const file = {
        version: 1,
        sections: {
          collectionTypes: { groups: [] },
          singleTypes: {
            groups: [
              {
                id: 'grp_s',
                name: 'S',
                parent: null,
                children: [{ type: 'contentType', uid: 'api::article.article' }],
              },
            ],
          },
        },
      };

      const effective = new Map<string, Kind>([['api::article.article', 'collectionType']]);

      expect(() => service().validateContentTypeUidReferences(file, effective)).toThrow(
        /cannot be placed in section "singleTypes"/
      );
    });

    it('aggregates violations into one ApplicationError which names offending uids', () => {
      const file = validExample();
      file.sections.collectionTypes.groups[0].children.push({
        type: 'contentType',
        uid: 'api::ghost.ghost',
      });
      file.sections.collectionTypes.groups[1].children.push({
        type: 'contentType',
        uid: 'api::phantom.phantom',
      });

      let caught: unknown;
      try {
        service().validateContentTypeUidReferences(file, exampleEffectiveSet());
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(errors.ApplicationError);
      const err = caught as InstanceType<typeof errors.ApplicationError> & {
        details: { errors: unknown[] };
      };
      expect(err.message).toMatch(/api::ghost.ghost/);
      expect(err.message).toMatch(/api::phantom.phantom/);
      expect(err.details.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('persistFromUpdate()', () => {
    it('persists a valid structure unchanged when there are no deletions', async () => {
      const strapi = buildStrapi({
        'api::article.article': { kind: 'collectionType' },
        'api::category.category': { kind: 'collectionType' },
        'api::author.author': { kind: 'collectionType' },
      });

      const result = await createContentStructureService(strapi).persistFromUpdate({
        incomingStructure: validExample(),
        createdUids: new Map(),
        deletedUids: new Set(),
      });

      expect(result).toBe(true);
      expect(coreServiceMock.write).toHaveBeenCalledTimes(1);

      const written = coreServiceMock.write.mock.calls[0][0];
      expect(written.sections.collectionTypes.groups[0].children).toEqual([
        { type: 'contentType', uid: 'api::article.article' },
        { type: 'group', id: 'grp_blog' },
        { type: 'contentType', uid: 'api::category.category' },
      ]);
      expect(written.sections.collectionTypes.groups[1].children).toEqual([
        { type: 'contentType', uid: 'api::author.author' },
      ]);
    });

    it('writes the incoming structure after pruning uids deleted in the same batch', async () => {
      const strapi = buildStrapi({
        'api::article.article': { kind: 'collectionType' },
        'api::category.category': { kind: 'collectionType' },
        'api::author.author': { kind: 'collectionType' },
      });

      const result = await createContentStructureService(strapi).persistFromUpdate({
        incomingStructure: validExample(),
        createdUids: new Map(),
        deletedUids: new Set(['api::category.category']),
      });

      expect(result).toBe(true);
      expect(coreServiceMock.write).toHaveBeenCalledTimes(1);

      const written = coreServiceMock.write.mock.calls[0][0];
      const marketingChildren = written.sections.collectionTypes.groups[0].children;
      expect(marketingChildren).not.toContainEqual({
        type: 'contentType',
        uid: 'api::category.category',
      });
      expect(marketingChildren).toContainEqual({
        type: 'contentType',
        uid: 'api::article.article',
      });
    });

    it('throws when the incoming structure references a nonexistent content type', async () => {
      const strapi = buildStrapi({ 'api::article.article': { kind: 'collectionType' } });

      const incoming = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              {
                id: 'grp_a',
                name: 'A',
                parent: null,
                children: [{ type: 'contentType', uid: 'api::ghost.ghost' }],
              },
            ],
          },
          singleTypes: { groups: [] },
        },
      };

      await expect(
        createContentStructureService(strapi).persistFromUpdate({
          incomingStructure: incoming,
          createdUids: new Map(),
          deletedUids: new Set(),
        })
      ).rejects.toThrow(/api::ghost.ghost.*does not exist/);

      expect(coreServiceMock.write).not.toHaveBeenCalled();
    });

    it('with no incoming structure but batch deletions: prunes the current file and writes', async () => {
      coreServiceMock.getCleanedFile.mockResolvedValue(validExample());

      const strapi = buildStrapi({
        'api::article.article': { kind: 'collectionType' },
        'api::category.category': { kind: 'collectionType' },
        'api::author.author': { kind: 'collectionType' },
      });

      const result = await createContentStructureService(strapi).persistFromUpdate({
        createdUids: new Map(),
        deletedUids: new Set(['api::category.category']),
      });

      expect(result).toBe(true);
      expect(coreServiceMock.getCleanedFile).toHaveBeenCalledTimes(1);
      expect(coreServiceMock.write).toHaveBeenCalledTimes(1);

      const written = coreServiceMock.write.mock.calls[0][0];
      expect(written.sections.collectionTypes.groups[0].children).not.toContainEqual({
        type: 'contentType',
        uid: 'api::category.category',
      });
    });

    it('with no incoming structure and no deletions returns false', async () => {
      const strapi = buildStrapi();

      const result = await createContentStructureService(strapi).persistFromUpdate({
        createdUids: new Map(),
        deletedUids: new Set(),
      });

      expect(result).toBe(false);
      expect(coreServiceMock.getCleanedFile).not.toHaveBeenCalled();
      expect(coreServiceMock.write).not.toHaveBeenCalled();
    });

    it('rejects a kind-mismatched reference instead of silently pruning it', async () => {
      const strapi = buildStrapi({ 'api::article.article': { kind: 'singleType' } });

      const incoming = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              {
                id: 'grp_marketing',
                name: 'Marketing',
                parent: null,
                children: [{ type: 'contentType', uid: 'api::article.article' }],
              },
            ],
          },
          singleTypes: { groups: [] },
        },
      };

      await expect(
        createContentStructureService(strapi).persistFromUpdate({
          incomingStructure: incoming,
          createdUids: new Map(),
          deletedUids: new Set(),
        })
      ).rejects.toThrow(/cannot be placed in section "collectionTypes"/);

      expect(coreServiceMock.write).not.toHaveBeenCalled();
    });

    it('never calls strapi.reload (restart policy belongs to the controller)', async () => {
      coreServiceMock.getCleanedFile.mockResolvedValue(validExample());

      const strapi = buildStrapi({
        'api::article.article': { kind: 'collectionType' },
        'api::category.category': { kind: 'collectionType' },
        'api::author.author': { kind: 'collectionType' },
      });

      await createContentStructureService(strapi).persistFromUpdate({
        incomingStructure: validExample(),
        createdUids: new Map(),
        deletedUids: new Set(['api::category.category']),
      });

      expect(strapi.reload).not.toHaveBeenCalled();
    });
  });
});
