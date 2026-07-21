import { ADMIN_VITE_SINGLETON_MODULES } from '../admin-vite-alias-modules';

jest.mock('../resolve-module', () => ({
  getModulePath: jest.fn((mod: string) => `/resolved/admin/${mod}`),
  getModulePathFrom: jest.fn((_host: string, mod: string) => `/resolved/design-system/${mod}`),
}));

// eslint-disable-next-line import/first
import {
  buildSingletonAliasEntries,
  buildAdminViteResolveAliases,
  getResolvableSingletonModules,
} from '../admin-vite-aliases';
// eslint-disable-next-line import/first
import { getModulePathFrom } from '../resolve-module';

const getModulePathFromMock = getModulePathFrom as jest.Mock;

const UNRESOLVABLE_SINGLETON = '@codemirror/lint';

describe('buildSingletonAliasEntries (tolerant CodeMirror resolution)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getModulePathFromMock.mockImplementation((_host: string, mod: string) => {
      if (mod === UNRESOLVABLE_SINGLETON) {
        throw new Error(`Cannot find module '${mod}'`);
      }
      return `/resolved/design-system/${mod}`;
    });
  });

  it('skips an unresolvable singleton instead of throwing', () => {
    expect(() => buildSingletonAliasEntries()).not.toThrow();

    const entries = buildSingletonAliasEntries();
    const aliased = entries.map(([mod]) => mod);

    expect(aliased).not.toContain(UNRESOLVABLE_SINGLETON);

    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      if (mod !== UNRESOLVABLE_SINGLETON) {
        expect(aliased).toContain(mod);
      }
    }
  });

  it('never lets an unresolvable singleton crash buildAdminViteResolveAliases', () => {
    expect(() => buildAdminViteResolveAliases()).not.toThrow();

    const alias = buildAdminViteResolveAliases();
    expect(alias).not.toHaveProperty(UNRESOLVABLE_SINGLETON);
    expect(alias['@codemirror/state']).toBe('/resolved/design-system/@codemirror/state');
  });

  it('keeps optimizeDeps.include in lockstep with the aliased singletons', () => {
    const resolvable = getResolvableSingletonModules();

    // An unresolvable singleton must be dropped from include, not forced into pre-bundling.
    expect(resolvable).not.toContain(UNRESOLVABLE_SINGLETON);

    // include mirrors exactly what resolve.alias aliased.
    expect(resolvable).toEqual(buildSingletonAliasEntries().map(([mod]) => mod));
  });
});
