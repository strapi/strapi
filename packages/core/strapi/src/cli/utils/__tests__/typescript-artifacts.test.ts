import {
  generateTypesSilently,
  getTypeArtifacts,
  isStrictTypesEnabled,
} from '../typescript-artifacts';

const strapiWithConfig = (strictTypes: unknown) =>
  ({ config: { get: jest.fn(() => strictTypes) } }) as any;

describe('typescript.strictTypes', () => {
  test('is off when unset', () => {
    expect(isStrictTypesEnabled(strapiWithConfig(undefined))).toBe(false);
  });

  test.each([true, false])('accepts %s', (value) => {
    expect(isStrictTypesEnabled(strapiWithConfig(value))).toBe(value);
  });

  test.each(['true', 1, null, {}])('rejects %p', (value) => {
    expect(() => isStrictTypesEnabled(strapiWithConfig(value))).toThrow(
      /Invalid config\.typescript\.strictTypes value/
    );
  });

  test('generates only content-types and components when disabled', () => {
    expect(getTypeArtifacts(strapiWithConfig(undefined))).toEqual({
      contentTypes: true,
      components: true,
      plugins: false,
      services: false,
      controllers: false,
      policies: false,
      middlewares: false,
      strict: false,
    });
  });

  test('adds the strict artifacts when enabled', () => {
    expect(getTypeArtifacts(strapiWithConfig(true))).toEqual({
      contentTypes: true,
      components: true,
      plugins: true,
      services: true,
      controllers: true,
      policies: true,
      middlewares: true,
      strict: true,
    });
  });
});

describe('generateTypesSilently', () => {
  const createTsUtils = (warning: string | undefined) => ({
    generators: {
      generate: jest.fn(async () => ({})),
      getStrictProgramWarning: jest.fn(() => warning),
    },
  });

  test('generates silently and returns the strict program warning for the caller to log', async () => {
    const strapi = strapiWithConfig(true);
    const tsUtils = createTsUtils('typescript.strictTypes is on, but tsconfig.json leaves out ...');

    const warning = await generateTypesSilently({ strapi, cwd: '/app', tsUtils });

    expect(tsUtils.generators.generate).toHaveBeenCalledWith({
      strapi,
      pwd: '/app',
      rootDir: undefined,
      logger: { silent: true, debug: false },
      artifacts: getTypeArtifacts(strapi),
    });
    expect(tsUtils.generators.getStrictProgramWarning).toHaveBeenCalledWith({
      pwd: '/app',
      rootDir: undefined,
      artifacts: getTypeArtifacts(strapi),
    });
    expect(warning).toBe('typescript.strictTypes is on, but tsconfig.json leaves out ...');
  });

  test('returns undefined when there is nothing to warn about', async () => {
    const warning = await generateTypesSilently({
      strapi: strapiWithConfig(undefined),
      cwd: '/app',
      tsUtils: createTsUtils(undefined),
    });

    expect(warning).toBeUndefined();
  });

  test('checks the program only after the generation', async () => {
    const calls: string[] = [];
    const tsUtils = {
      generators: {
        generate: jest.fn(async () => {
          calls.push('generate');
          return {};
        }),
        getStrictProgramWarning: jest.fn(() => {
          calls.push('getStrictProgramWarning');
          return undefined;
        }),
      },
    };

    await generateTypesSilently({ strapi: strapiWithConfig(true), cwd: '/app', tsUtils });

    expect(calls).toEqual(['generate', 'getStrictProgramWarning']);
  });
});
