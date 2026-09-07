import {
  contentStructureFileSchema,
  contentStructureGroupSchema,
  contentStructureChildSchema,
} from '../content-structure';

const validFile = (): any => ({
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

const ok = (file: unknown) => contentStructureFileSchema.safeParse(file).success;

describe('content-structure shape validation (zod)', () => {
  describe('structural shape', () => {
    it('accepts the example file', () => {
      expect(ok(validFile())).toBe(true);
    });

    it('requires version to be the literal 1', () => {
      expect(ok({ ...validFile(), version: 2 })).toBe(false);
    });

    it('requires both collectionTypes and singleTypes sections', () => {
      const file = validFile();
      delete file.sections.singleTypes;
      expect(ok(file)).toBe(false);
    });

    it('accepts a full tree whose ids were hand-authored (regression: QA-CTBS-001)', () => {
      const file = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              {
                id: 'g1',
                name: 'Marketing',
                parent: null,
                children: [{ type: 'group', id: 'g2' }],
              },
              { id: 'g2', name: 'Blog', parent: 'g1', children: [] },
            ],
          },
          singleTypes: { groups: [] },
        },
      };

      expect(ok(file)).toBe(true);
    });
  });

  describe('group id', () => {
    const withId = (id: string) => ({ id, name: 'X', parent: null, children: [] });

    it.each(['grp_blog', 'grp_1a2b3c4d5e', 'grp_marketing', 'g1', 'blog', 'GRP_Blog', 'my-folder'])(
      'accepts %s',
      (id) => {
        expect(contentStructureGroupSchema.safeParse(withId(id)).success).toBe(true);
      }
    );

    it('rejects an empty id', () => {
      expect(contentStructureGroupSchema.safeParse(withId('')).success).toBe(false);
    });
  });

  describe('group name', () => {
    const withName = (name: string) => ({ id: 'grp_test', name, parent: null, children: [] });

    it('accepts a normal name', () => {
      expect(contentStructureGroupSchema.safeParse(withName('Marketing')).success).toBe(true);
    });

    it.each(['', '   ', ' Marketing', 'Marketing '])('rejects %p', (name) => {
      expect(contentStructureGroupSchema.safeParse(withName(name)).success).toBe(false);
    });
  });

  describe('child discriminated union', () => {
    it('accepts a contentType child with a valid uid', () => {
      expect(
        contentStructureChildSchema.safeParse({ type: 'contentType', uid: 'api::article.article' })
          .success
      ).toBe(true);
    });

    it('accepts a plugin content type uid', () => {
      expect(
        contentStructureChildSchema.safeParse({
          type: 'contentType',
          uid: 'plugin::users-permissions.user',
        }).success
      ).toBe(true);
    });

    it('rejects a malformed content type uid', () => {
      expect(
        contentStructureChildSchema.safeParse({ type: 'contentType', uid: 'not-a-uid' }).success
      ).toBe(false);
    });

    it('accepts a group child referencing a group id', () => {
      expect(contentStructureChildSchema.safeParse({ type: 'group', id: 'grp_blog' }).success).toBe(
        true
      );
    });

    it('rejects an unknown child type', () => {
      expect(
        contentStructureChildSchema.safeParse({ type: 'folder', id: 'grp_blog' }).success
      ).toBe(false);
    });
  });

  describe('graph rules (payload-checkable, no registry)', () => {
    it('rejects duplicate group ids across both sections', () => {
      const file = validFile();
      file.sections.singleTypes.groups.push({
        id: 'grp_blog',
        name: 'Blog',
        parent: null,
        children: [],
      });
      expect(ok(file)).toBe(false);
    });

    it('rejects duplicate sibling names under the same parent (case-insensitive)', () => {
      const file = validFile();
      file.sections.collectionTypes.groups.push({
        id: 'grp_other',
        name: 'marketing',
        parent: null,
        children: [],
      });
      expect(ok(file)).toBe(false);
    });

    it('accepts the same name under different parents (B2B/B2C France)', () => {
      const file = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              {
                id: 'grp_business',
                name: 'B2B',
                parent: null,
                children: [{ type: 'group', id: 'grp_franceb' }],
              },
              { id: 'grp_franceb', name: 'France', parent: 'grp_business', children: [] },
              {
                id: 'grp_consumer',
                name: 'B2C',
                parent: null,
                children: [{ type: 'group', id: 'grp_francec' }],
              },
              { id: 'grp_francec', name: 'France', parent: 'grp_consumer', children: [] },
            ],
          },
          singleTypes: { groups: [] },
        },
      };
      expect(ok(file)).toBe(true);
    });

    it('rejects a parent reference into the other section', () => {
      const file = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [{ id: 'grp_orphan', name: 'X', parent: 'grp_lonely', children: [] }],
          },
          singleTypes: { groups: [{ id: 'grp_lonely', name: 'S', parent: null, children: [] }] },
        },
      };
      expect(ok(file)).toBe(false);
    });

    it('rejects parent cycles', () => {
      const file = {
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              {
                id: 'grp_alpha',
                name: 'A',
                parent: 'grp_bravo',
                children: [{ type: 'group', id: 'grp_bravo' }],
              },
              {
                id: 'grp_bravo',
                name: 'B',
                parent: 'grp_alpha',
                children: [{ type: 'group', id: 'grp_alpha' }],
              },
            ],
          },
          singleTypes: { groups: [] },
        },
      };
      expect(ok(file)).toBe(false);
    });

    it('rejects depth > 3, accepts depth == 3', () => {
      const chain = (depth: number) => ({
        version: 1,
        sections: {
          collectionTypes: {
            groups: Array.from({ length: depth }, (_, index) => {
              const level = index + 1;
              return {
                id: `grp_level${level}`,
                name: `L${level}`,
                parent: level === 1 ? null : `grp_level${level - 1}`,
                children: level < depth ? [{ type: 'group', id: `grp_level${level + 1}` }] : [],
              };
            }),
          },
          singleTypes: { groups: [] },
        },
      });
      expect(ok(chain(3))).toBe(true);
      expect(ok(chain(4))).toBe(false);
    });

    it('rejects a group child referencing a nonexistent group', () => {
      const file = validFile();
      file.sections.collectionTypes.groups[0].children.push({ type: 'group', id: 'grp_ghost' });
      expect(ok(file)).toBe(false);
    });

    it("rejects a group child whose target's parent is not the containing group", () => {
      const file = validFile();
      file.sections.collectionTypes.groups[1].parent = null; // grp_blog no longer points back
      expect(ok(file)).toBe(false);
    });

    it('rejects a non-root group absent from its parent children', () => {
      const file = validFile();
      file.sections.collectionTypes.groups[0].children =
        file.sections.collectionTypes.groups[0].children.filter(
          (child: any) => child.type !== 'group'
        );
      expect(ok(file)).toBe(false);
    });

    it('rejects a uid appearing in two groups of one section', () => {
      const file = validFile();
      file.sections.collectionTypes.groups[1].children.push({
        type: 'contentType',
        uid: 'api::article.article',
      });
      expect(ok(file)).toBe(false);
    });
  });
});
