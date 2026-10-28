import {
  applyRenameDecisions,
  collectPendingRenames,
  filterRenamesByAcceptedChains,
  getAttributeRenameDecision,
  shouldPromptForRenamesBeforeSave,
  type AttributeRenameMigrationMode,
} from '../RenameMigrationModal';
import { groupRenameChains } from '../utils/groupRenameChains';

import type { RenameHop } from '../../../types';

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
    it('returns one item per chain across content types and components, preserving order', () => {
      const items = collectPendingRenames(buildRequestData());

      expect(items).toEqual([
        {
          key: 'api::article.article:chain:0',
          uid: 'api::article.article',
          typeName: 'Article',
          pairs: [{ oldName: 'title', newName: 'heading' }],
          via: [],
        },
        {
          key: 'api::article.article:chain:1',
          uid: 'api::article.article',
          typeName: 'Article',
          pairs: [{ oldName: 'body', newName: 'content' }],
          via: [],
        },
        {
          key: 'default.box:chain:0',
          uid: 'default.box',
          typeName: 'Box',
          pairs: [{ oldName: 'label', newName: 'title' }],
          via: [],
        },
      ]);
    });

    it('collapses a chain into its net effect with the intermediate names', () => {
      const items = collectPendingRenames({
        contentTypes: [
          {
            action: 'update',
            uid: 'api::article.article',
            renames: [
              { oldName: 'a', newName: 'tmp' },
              { oldName: 'b', newName: 'a' },
              { oldName: 'tmp', newName: 'b' },
            ],
          },
        ],
        components: [],
      });

      expect(items).toEqual([
        {
          key: 'api::article.article:chain:0',
          uid: 'api::article.article',
          typeName: 'api::article.article',
          pairs: [
            { oldName: 'a', newName: 'b' },
            { oldName: 'b', newName: 'a' },
          ],
          via: ['tmp'],
        },
      ]);
    });

    it('shows the raw hops of a swap-back chain and flags it', () => {
      const items = collectPendingRenames({
        contentTypes: [
          {
            action: 'update',
            uid: 'api::article.article',
            renames: [
              { oldName: 'a', newName: 'b' },
              { oldName: 'b', newName: 'a' },
            ],
          },
        ],
        components: [],
      });

      expect(items).toEqual([
        {
          key: 'api::article.article:chain:0',
          uid: 'api::article.article',
          typeName: 'api::article.article',
          pairs: [
            { oldName: 'a', newName: 'b' },
            { oldName: 'b', newName: 'a' },
          ],
          via: ['b'],
          isSwapBack: true,
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
    it('keeps only accepted chains and drops the array when none are accepted', () => {
      const requestData = buildRequestData();

      // Accept only the second article chain; refuse the first and the component chain.
      applyRenameDecisions(requestData, new Set(['api::article.article:chain:1']));

      expect(requestData.contentTypes[0].renames).toEqual([
        { oldName: 'body', newName: 'content' },
      ]);
      // Component had its only chain refused -> renames removed entirely.
      expect('renames' in requestData.components[0]).toBe(false);
    });

    it('keeps all hops when every chain is accepted', () => {
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

    it('keeps or drops a multi-hop chain as a whole', () => {
      const swap: RenameHop[] = [
        { oldName: 'a', newName: 'tmp' },
        { oldName: 'b', newName: 'a' },
        { oldName: 'tmp', newName: 'b' },
      ];
      const build = (): RequestData => ({
        contentTypes: [{ action: 'update', uid: 'api::article.article', renames: [...swap] }],
        components: [],
      });

      const accepted = build();
      applyRenameDecisions(accepted, new Set(['api::article.article:chain:0']));
      expect(accepted.contentTypes[0].renames).toEqual(swap);

      const declined = build();
      applyRenameDecisions(declined, new Set());
      expect('renames' in declined.contentTypes[0]).toBe(false);
    });

    it('keeps index order when interleaved chains are decided differently', () => {
      const requestData: RequestData = {
        contentTypes: [
          {
            action: 'update',
            uid: 'api::article.article',
            renames: [
              { oldName: 'a', newName: 'b' },
              { oldName: 'x', newName: 'y' },
              { oldName: 'b', newName: 'c' },
              { oldName: 'y', newName: 'z' },
            ],
          },
        ],
        components: [],
      };

      // Keep the `a` chain (hops 0 and 2), drop the `x` chain (hops 1 and 3).
      applyRenameDecisions(requestData, new Set(['api::article.article:chain:0']));

      expect(requestData.contentTypes[0].renames).toEqual([
        { oldName: 'a', newName: 'b' },
        { oldName: 'b', newName: 'c' },
      ]);
    });
  });

  describe('filterRenamesByAcceptedChains', () => {
    const uid = 'api::article.article';

    const fixtures: Array<{ label: string; renames: RenameHop[] }> = [
      {
        label: 'swap',
        renames: [
          { oldName: 'a', newName: 'tmp' },
          { oldName: 'b', newName: 'a' },
          { oldName: 'tmp', newName: 'b' },
        ],
      },
      {
        label: 'interleaved chains',
        renames: [
          { oldName: 'a', newName: 'b' },
          { oldName: 'x', newName: 'y' },
          { oldName: 'b', newName: 'c' },
          { oldName: 'y', newName: 'z' },
          { oldName: 'c', newName: 'd' },
        ],
      },
      {
        label: 'rename-back plus independent hop',
        renames: [
          { oldName: 'a', newName: 'b' },
          { oldName: 'b', newName: 'a' },
          { oldName: 'x', newName: 'y' },
        ],
      },
    ];

    // A kept subset is replayable when every hop starts from a name that is
    // currently occupied (an original attribute or the `newName` of an earlier
    // kept hop) and targets a name that is currently free — the same rule the
    // server's `target-occupied` guard enforces.
    const isReplayable = (renames: RenameHop[], kept: RenameHop[]): boolean => {
      // A name is original when its first appearance in the path is as `oldName`.
      const seen = new Set<string>();
      const occupied = new Set<string>();
      renames.forEach((hop) => {
        if (!seen.has(hop.oldName)) {
          occupied.add(hop.oldName);
        }
        seen.add(hop.oldName);
        seen.add(hop.newName);
      });

      return kept.every((hop) => {
        const ok = occupied.has(hop.oldName) && !occupied.has(hop.newName);
        occupied.delete(hop.oldName);
        occupied.add(hop.newName);
        return ok;
      });
    };

    const allSubsets = <T>(items: T[]): T[][] =>
      Array.from({ length: 2 ** items.length }, (_, bits) =>
        items.filter((__, position) => (bits >> position) & 1)
      );

    it.each(fixtures)('never produces a truncated chain ($label)', ({ renames }) => {
      const chainIds = groupRenameChains(uid, renames).map((chain) => chain.id);

      allSubsets(chainIds).forEach((subset) => {
        const kept = filterRenamesByAcceptedChains(uid, renames, new Set(subset));
        expect(isReplayable(renames, kept)).toBe(true);
      });
    });
  });

  describe.each([
    {
      mode: 'always',
      editDecision: true,
      promptBeforeSave: false,
    },
    {
      mode: 'never',
      editDecision: false,
      promptBeforeSave: false,
    },
    {
      mode: 'prompt-after-edit',
      editDecision: 'prompt',
      promptBeforeSave: false,
    },
    {
      mode: 'prompt-before-save',
      editDecision: true,
      promptBeforeSave: true,
    },
  ] satisfies Array<{
    mode: AttributeRenameMigrationMode;
    editDecision: boolean | 'prompt';
    promptBeforeSave: boolean;
  }>)('$mode mode', ({ mode, editDecision, promptBeforeSave }) => {
    it('selects the correct per-edit and pre-save behavior', () => {
      expect(getAttributeRenameDecision(mode)).toBe(editDecision);
      expect(shouldPromptForRenamesBeforeSave(mode)).toBe(promptBeforeSave);
    });
  });
});
