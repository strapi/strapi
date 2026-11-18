import { chainByHopIndex, groupRenameChains } from '../groupRenameChains';

const uid = 'api::article.article';

describe('CTB | DataManager | groupRenameChains', () => {
  it('returns one chain with the raw pair for a single hop', () => {
    expect(groupRenameChains(uid, [{ oldName: 'a', newName: 'b' }])).toEqual([
      {
        id: `${uid}:chain:0`,
        hopIndexes: [0],
        pairs: [{ oldName: 'a', newName: 'b' }],
        via: [],
      },
    ]);
  });

  it('collapses a -> b -> c into a -> c via b', () => {
    expect(
      groupRenameChains(uid, [
        { oldName: 'a', newName: 'b' },
        { oldName: 'b', newName: 'c' },
      ])
    ).toEqual([
      {
        id: `${uid}:chain:0`,
        hopIndexes: [0, 1],
        pairs: [{ oldName: 'a', newName: 'c' }],
        via: ['b'],
      },
    ]);
  });

  it('describes a swap through a temporary name as two pairs via tmp', () => {
    expect(
      groupRenameChains(uid, [
        { oldName: 'a', newName: 'tmp' },
        { oldName: 'b', newName: 'a' },
        { oldName: 'tmp', newName: 'b' },
      ])
    ).toEqual([
      {
        id: `${uid}:chain:0`,
        hopIndexes: [0, 1, 2],
        pairs: [
          { oldName: 'a', newName: 'b' },
          { oldName: 'b', newName: 'a' },
        ],
        via: ['tmp'],
      },
    ]);
  });

  it('yields no pairs for a rename-back but keeps every hop index', () => {
    expect(
      groupRenameChains(uid, [
        { oldName: 'a', newName: 'b' },
        { oldName: 'b', newName: 'a' },
      ])
    ).toEqual([{ id: `${uid}:chain:0`, hopIndexes: [0, 1], pairs: [], via: ['b'] }]);
  });

  it('separates interleaved independent chains and keeps index order', () => {
    const chains = groupRenameChains(uid, [
      { oldName: 'a', newName: 'b' },
      { oldName: 'x', newName: 'y' },
      { oldName: 'b', newName: 'c' },
    ]);

    expect(chains).toEqual([
      {
        id: `${uid}:chain:0`,
        hopIndexes: [0, 2],
        pairs: [{ oldName: 'a', newName: 'c' }],
        via: ['b'],
      },
      {
        id: `${uid}:chain:1`,
        hopIndexes: [1],
        pairs: [{ oldName: 'x', newName: 'y' }],
        via: [],
      },
    ]);
  });

  it('uses the first hop index in the id', () => {
    const [, second] = groupRenameChains(uid, [
      { oldName: 'a', newName: 'b' },
      { oldName: 'x', newName: 'y' },
    ]);

    expect(second.id).toBe(`${uid}:chain:1`);
  });

  it('returns an empty list for no renames', () => {
    expect(groupRenameChains(uid, [])).toEqual([]);
  });

  it('maps every hop index back to its chain', () => {
    const chains = groupRenameChains(uid, [
      { oldName: 'a', newName: 'b' },
      { oldName: 'x', newName: 'y' },
      { oldName: 'b', newName: 'c' },
    ]);
    const byIndex = chainByHopIndex(chains);

    expect(byIndex.get(0)).toBe(chains[0]);
    expect(byIndex.get(2)).toBe(chains[0]);
    expect(byIndex.get(1)).toBe(chains[1]);
  });
});
