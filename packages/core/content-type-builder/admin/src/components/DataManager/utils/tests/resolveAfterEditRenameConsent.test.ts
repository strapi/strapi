import { resolveAfterEditRenameConsent } from '../resolveAfterEditRenameConsent';

describe('CTB | DataManager | resolveAfterEditRenameConsent', () => {
  const base = { renames: [], declinedRenameNames: [], mode: 'prompt-after-edit' as const };

  it('prompts for the first hop of a chain in prompt-after-edit mode', () => {
    expect(resolveAfterEditRenameConsent({ ...base, oldName: 'a', newName: 'tmp' })).toBe('prompt');
  });

  it('accepts a continuation of an accepted chain without prompting', () => {
    expect(
      resolveAfterEditRenameConsent({
        ...base,
        renames: [{ oldName: 'a', newName: 'tmp' }],
        oldName: 'tmp',
        newName: 'b',
      })
    ).toBe('accept');
  });

  it('accepts a hop that swaps into a name vacated by an accepted chain', () => {
    expect(
      resolveAfterEditRenameConsent({
        ...base,
        renames: [{ oldName: 'a', newName: 'tmp' }],
        oldName: 'b',
        newName: 'a',
      })
    ).toBe('accept');
  });

  it('declines a hop that continues a declined chain without prompting', () => {
    expect(
      resolveAfterEditRenameConsent({
        ...base,
        declinedRenameNames: ['a', 'tmp'],
        oldName: 'tmp',
        newName: 'b',
      })
    ).toBe('decline');
  });

  it('declines a hop that swaps into a declined name without prompting', () => {
    expect(
      resolveAfterEditRenameConsent({
        ...base,
        declinedRenameNames: ['a', 'tmp'],
        oldName: 'b',
        newName: 'a',
      })
    ).toBe('decline');
  });

  it('prefers the accepted chain when both an accepted and a declined name are involved', () => {
    // `a -> tmp` accepted, `x -> y` declined; `tmp -> x` joins the accepted chain.
    expect(
      resolveAfterEditRenameConsent({
        ...base,
        renames: [{ oldName: 'a', newName: 'tmp' }],
        declinedRenameNames: ['x', 'y'],
        oldName: 'tmp',
        newName: 'x',
      })
    ).toBe('accept');
  });

  it('prompts for an independent hop when another chain was declined', () => {
    expect(
      resolveAfterEditRenameConsent({
        ...base,
        declinedRenameNames: ['a', 'tmp'],
        oldName: 'x',
        newName: 'y',
      })
    ).toBe('prompt');
  });

  it.each([
    { mode: 'always' as const, expected: 'accept' },
    { mode: 'prompt-before-save' as const, expected: 'accept' },
    { mode: 'never' as const, expected: 'decline' },
  ])('follows the $mode mode for a fresh hop', ({ mode, expected }) => {
    expect(resolveAfterEditRenameConsent({ ...base, mode, oldName: 'a', newName: 'b' })).toBe(
      expected
    );
  });
});
