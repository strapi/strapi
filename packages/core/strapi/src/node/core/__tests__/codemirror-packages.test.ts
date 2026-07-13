import { CODEMIRROR_SINGLETON_PACKAGES, getCodemirrorAliases } from '../codemirror-packages';

describe('codemirror-packages', () => {
  it('lists the CodeMirror packages required for JSONInput', () => {
    expect(CODEMIRROR_SINGLETON_PACKAGES).toEqual(
      expect.arrayContaining(['@codemirror/state', '@codemirror/view', '@uiw/react-codemirror'])
    );
  });

  it('builds aliases for resolvable CodeMirror packages', () => {
    const aliases = getCodemirrorAliases();

    for (const pkg of Object.keys(aliases)) {
      expect(CODEMIRROR_SINGLETON_PACKAGES).toContain(pkg);
      expect(aliases[pkg]).toEqual(expect.any(String));
    }
  });
});
