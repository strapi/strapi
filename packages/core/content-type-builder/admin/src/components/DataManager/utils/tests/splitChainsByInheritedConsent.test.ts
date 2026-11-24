import { groupRenameChains } from '../groupRenameChains';
import { namesOfChains, splitChainsByInheritedConsent } from '../splitChainsByInheritedConsent';

import type { RenameHop } from '../../../../types';

const uid = 'api::article.article';

const split = (
  renames: RenameHop[],
  { recorded = [], declined = [] }: { recorded?: RenameHop[]; declined?: string[] } = {}
) => {
  const chains = groupRenameChains(uid, renames);
  const result = splitChainsByInheritedConsent({
    recorded,
    declinedRenameNames: declined,
    chains,
    renames,
  });
  return {
    keep: result.keep.map((chain) => chain.id),
    decline: result.decline.map((chain) => chain.id),
    prompt: result.prompt.map((chain) => chain.id),
  };
};

describe('CTB | DataManager | splitChainsByInheritedConsent', () => {
  it('prompts for every chain when nothing was decided before', () => {
    expect(
      split([
        { oldName: 'a', newName: 'b' },
        { oldName: 'x', newName: 'y' },
      ])
    ).toEqual({ keep: [], decline: [], prompt: [`${uid}:chain:0`, `${uid}:chain:1`] });
  });

  it('keeps a chain that continues a recorded hop', () => {
    expect(
      split([{ oldName: 'headline', newName: 'heading' }], {
        recorded: [{ oldName: 'title', newName: 'headline' }],
      })
    ).toEqual({ keep: [`${uid}:chain:0`], decline: [], prompt: [] });
  });

  it('keeps a chain that swaps into a name a recorded hop vacated', () => {
    expect(
      split([{ oldName: 'body', newName: 'title' }], {
        recorded: [{ oldName: 'title', newName: 'tmp' }],
      })
    ).toEqual({ keep: [`${uid}:chain:0`], decline: [], prompt: [] });
  });

  it('declines a chain touching a declined name', () => {
    expect(split([{ oldName: 'tmp', newName: 'heading' }], { declined: ['title', 'tmp'] })).toEqual(
      { keep: [], decline: [`${uid}:chain:0`], prompt: [] }
    );
  });

  it('buckets independent chains separately', () => {
    expect(
      split(
        [
          { oldName: 'headline', newName: 'heading' },
          { oldName: 'tmp', newName: 'summary' },
          { oldName: 'x', newName: 'y' },
        ],
        {
          recorded: [{ oldName: 'title', newName: 'headline' }],
          declined: ['body', 'tmp'],
        }
      )
    ).toEqual({
      keep: [`${uid}:chain:0`],
      decline: [`${uid}:chain:1`],
      prompt: [`${uid}:chain:2`],
    });
  });

  it('prefers an accepted chain over a declined name inside the same chain', () => {
    expect(
      split(
        [
          { oldName: 'headline', newName: 'tmp' },
          { oldName: 'x', newName: 'headline' },
        ],
        { recorded: [{ oldName: 'title', newName: 'headline' }], declined: ['x'] }
      )
    ).toEqual({ keep: [`${uid}:chain:0`], decline: [], prompt: [] });
  });

  it('lists every name a set of chains touches once, in hop order', () => {
    const renames: RenameHop[] = [
      { oldName: 'a', newName: 'tmp' },
      { oldName: 'b', newName: 'a' },
      { oldName: 'tmp', newName: 'b' },
    ];

    expect(namesOfChains(groupRenameChains(uid, renames), renames)).toEqual(['a', 'tmp', 'b']);
  });
});
