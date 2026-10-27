import override from '../override';

const strapiMock = {
  log: {
    warn: jest.fn(),
  },
  config: {
    get: () => ({
      'x-strapi-config': {
        plugins: null,
      },
    }),
  },
} as any;

let strapi = strapiMock;
describe('Documentation plugin | Override service', () => {
  afterEach(() => {
    // Reset strapi after each test
    strapi = strapiMock;
    jest.clearAllMocks();
  });

  it('should register an override', () => {
    const mockOverride = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    };

    const overrideService = override({ strapi });
    overrideService.registerOverride(mockOverride);

    expect(overrideService.registeredOverrides).toEqual([mockOverride]);
  });

  it('should not register an override from a plugin that is not in the config', () => {
    const mockOverride = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    };

    const overrideService = override({ strapi });
    overrideService.registerOverride(mockOverride, { pluginOrigin: 'test' });

    expect(overrideService.registeredOverrides).toEqual([]);
  });

  it('should register an override from a plugin that is in the config and exclude it from generation', () => {
    const mockOverride = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    };

    strapi.config.get = () => ({
      'x-strapi-config': {
        plugins: ['test'],
      },
    });

    const overrideService = override({ strapi });
    overrideService.registerOverride(mockOverride, {
      pluginOrigin: 'test',
      excludeFromGeneration: ['test', 'some-other-api-to-exclude'],
    });

    expect(overrideService.registeredOverrides).toEqual([mockOverride]);
    expect(overrideService.excludedFromGeneration).toEqual(['test', 'some-other-api-to-exclude']);
  });

  it('should register an api or plugin to exclude from generation', () => {
    const overrideService = override({ strapi });
    overrideService.excludeFromGeneration('my-api');
    overrideService.excludeFromGeneration(['my-other-api', 'my-plugin', 'my-other-plugin']);

    expect(overrideService.excludedFromGeneration).toEqual([
      'my-api',
      'my-other-api',
      'my-plugin',
      'my-other-plugin',
    ]);
  });

  it('should register an override from a YAML string', () => {
    const overrideService = override({ strapi });
    overrideService.registerOverride('info:\n  title: My API\n');

    expect(overrideService.registeredOverrides).toEqual([{ info: { title: 'My API' } }]);
  });

  it.each([
    ['null', ''],
    ['a scalar', 'my-api'],
    ['an array', '- my-api'],
  ])('should warn and skip a YAML string that parses to %s', (_kind, yaml) => {
    const overrideService = override({ strapi });

    expect(() => overrideService.registerOverride(yaml)).not.toThrow();
    expect(overrideService.registeredOverrides).toEqual([]);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring override from "app"')
    );
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a scalar', 42],
    ['an array', [{ info: { title: 'My API' } }]],
  ])(
    'should warn and skip a plugin override that is %s without excluding its apis',
    (_kind, value) => {
      strapi.config.get = () => ({
        'x-strapi-config': {
          plugins: ['test'],
        },
      });

      const overrideService = override({ strapi });

      expect(() =>
        overrideService.registerOverride(value as any, {
          pluginOrigin: 'test',
          excludeFromGeneration: ['my-api'],
        })
      ).not.toThrow();
      expect(overrideService.registeredOverrides).toEqual([]);
      expect(overrideService.excludedFromGeneration).toEqual([]);
      expect(strapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring override from "test"')
      );
    }
  );

  it('should not exclude apis from generation when the YAML string is not valid', () => {
    strapi.config.get = () => ({
      'x-strapi-config': {
        plugins: ['test'],
      },
    });

    const overrideService = override({ strapi });

    expect(() =>
      overrideService.registerOverride('info: [', {
        pluginOrigin: 'test',
        excludeFromGeneration: ['my-api'],
      })
    ).toThrow();
    expect(overrideService.registeredOverrides).toEqual([]);
    expect(overrideService.excludedFromGeneration).toEqual([]);
  });
});
