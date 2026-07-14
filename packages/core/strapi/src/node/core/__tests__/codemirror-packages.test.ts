/* eslint-disable @typescript-eslint/no-var-requires, node/no-missing-require */
import {
  CODEMIRROR_SINGLETON_PACKAGES,
  getCodemirrorAliases,
  getResolvableCodemirrorPackages,
} from '../codemirror-packages';
import { getModulePath } from '../resolve-module';

const REQUIRED_CODEMIRROR_SINGLETONS = ['@codemirror/state', '@codemirror/view'] as const;

describe('codemirror-packages', () => {
  it('lists the CodeMirror packages required for JSONInput', () => {
    expect(CODEMIRROR_SINGLETON_PACKAGES).toEqual(
      expect.arrayContaining([...REQUIRED_CODEMIRROR_SINGLETONS, '@uiw/react-codemirror'])
    );
  });

  it.each(REQUIRED_CODEMIRROR_SINGLETONS)(
    'aliases %s from the @strapi/admin dependency closure',
    (pkg) => {
      const aliases = getCodemirrorAliases();

      expect(aliases[pkg]).toBe(getModulePath(pkg));
    }
  );

  it('aliases @uiw/react-codemirror when it is resolvable from admin closure', () => {
    const aliases = getCodemirrorAliases();

    if ('@uiw/react-codemirror' in aliases) {
      expect(aliases['@uiw/react-codemirror']).toBe(getModulePath('@uiw/react-codemirror'));
    }
  });

  it('builds aliases for every resolvable CodeMirror package via getModulePath', () => {
    const aliases = getCodemirrorAliases();

    for (const pkg of Object.keys(aliases)) {
      expect(CODEMIRROR_SINGLETON_PACKAGES).toContain(pkg);
      expect(aliases[pkg]).toBe(getModulePath(pkg));
    }
  });

  it('uses the same package list for aliases and vite optimizeDeps/dedupe', () => {
    expect(getResolvableCodemirrorPackages()).toEqual(Object.keys(getCodemirrorAliases()));
  });

  it('resolves CodeMirror packages from the @strapi/admin closure when bare require.resolve fails', () => {
    const actualResolveModule =
      jest.requireActual<typeof import('../resolve-module')>('../resolve-module');
    const getModulePathMock = jest
      .fn(actualResolveModule.getModulePath)
      .mockImplementation(actualResolveModule.getModulePath);

    jest.resetModules();
    jest.doMock('../resolve-module', () => ({
      getModulePath: getModulePathMock,
    }));

    const codemirrorPackages =
      require('../codemirror-packages') as typeof import('../codemirror-packages');

    const aliases = codemirrorPackages.getCodemirrorAliases();
    const resolvable = codemirrorPackages.getResolvableCodemirrorPackages();

    expect(resolvable).toEqual(Object.keys(aliases));
    expect(resolvable).toContain('@codemirror/state');
    expect(getModulePathMock).toHaveBeenCalled();
  });
});
