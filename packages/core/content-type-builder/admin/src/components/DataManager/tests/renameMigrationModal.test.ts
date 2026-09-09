import { applyRenameDecisions, collectPendingRenames } from '../RenameMigrationModal';

type RequestData = Parameters<typeof collectPendingRenames>[0];

describe('RenameMigrationModal helpers', () => {
  const buildRequestData = (): RequestData => ({
    contentTypes: [
      {
        action: 'update',
        uid: 'api::article.article',
        displayName: 'Article',
        renames: [
          { oldName: 'title', newName: 'heading' },
          { oldName: 'body', newName: 'content' },
        ],
      },
      // create actions never carry renames and must be ignored
      { action: 'create', uid: 'api::tag.tag', displayName: 'Tag' },
    ],
    components: [
      {
        action: 'update',
        uid: 'default.box',
        displayName: 'Box',
        renames: [{ oldName: 'label', newName: 'title' }],
      },
    ],
  });

  describe('collectPendingRenames', () => {
    it('flattens ordered renames across content types and components, preserving order', () => {
      const items = collectPendingRenames(buildRequestData());

      expect(items).toEqual([
        {
          key: 'api::article.article:0',
          uid: 'api::article.article',
          typeName: 'Article',
          oldName: 'title',
          newName: 'heading',
        },
        {
          key: 'api::article.article:1',
          uid: 'api::article.article',
          typeName: 'Article',
          oldName: 'body',
          newName: 'content',
        },
        {
          key: 'default.box:0',
          uid: 'default.box',
          typeName: 'Box',
          oldName: 'label',
          newName: 'title',
        },
      ]);
    });

    it('falls back to the uid when no display name is present', () => {
      const items = collectPendingRenames({
        contentTypes: [
          {
            action: 'update',
            uid: 'api::article.article',
            renames: [{ oldName: 'a', newName: 'b' }],
          },
        ],
        components: [],
      });

      expect(items[0].typeName).toBe('api::article.article');
    });

    it('returns an empty list when there are no renames', () => {
      expect(
        collectPendingRenames({
          contentTypes: [{ action: 'create', uid: 'api::x.x' }],
          components: [],
        })
      ).toEqual([]);
    });
  });

  describe('applyRenameDecisions', () => {
    it('keeps only accepted hops and drops the array when none are accepted', () => {
      const requestData = buildRequestData();

      // Accept only the second article hop; refuse the first and the component hop.
      applyRenameDecisions(requestData, new Set(['api::article.article:1']));

      expect(requestData.contentTypes[0].renames).toEqual([
        { oldName: 'body', newName: 'content' },
      ]);
      // Component had its only hop refused -> renames removed entirely.
      expect('renames' in requestData.components[0]).toBe(false);
    });

    it('keeps all hops when every key is accepted', () => {
      const requestData = buildRequestData();
      const allKeys = new Set(collectPendingRenames(requestData).map((item) => item.key));

      applyRenameDecisions(requestData, allKeys);

      expect(requestData.contentTypes[0].renames).toHaveLength(2);
      expect(requestData.components[0].renames).toHaveLength(1);
    });

    it('removes all renames when nothing is accepted', () => {
      const requestData = buildRequestData();

      applyRenameDecisions(requestData, new Set());

      expect('renames' in requestData.contentTypes[0]).toBe(false);
      expect('renames' in requestData.components[0]).toBe(false);
    });
  });
});
