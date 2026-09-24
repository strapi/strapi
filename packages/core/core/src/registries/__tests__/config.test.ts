import { createConfigProvider } from '../../services/config';

const logLevel = 'warn';

describe('config', () => {
  test('returns objects for partial paths', () => {
    const config = createConfigProvider({ default: { child: 'val' } });
    expect(config.get('default')).toEqual({ child: 'val' });
  });

  test('supports full string paths', () => {
    const config = createConfigProvider({ default: { child: 'val' } });
    expect(config.get('default.child')).toEqual('val');
  });

  test('supports array paths', () => {
    const config = createConfigProvider({ default: { child: 'val' } });
    expect(config.get(['default', 'child'])).toEqual('val');
  });

  test('defaults replace undefined, including missing paths and array elements', () => {
    const config = createConfigProvider({ options: { port: undefined }, items: [] });

    expect(config.get('options.port', 1337)).toBe(1337);
    expect(config.get('missing.port', 1337)).toBe(1337);
    expect(config.get('items.0.port', 1337)).toBe(1337);
    expect(config.get('options.port', undefined)).toBeUndefined();
    expect(config.get('options.port')).toBeUndefined();
  });

  test('defaults preserve null and other defined values', () => {
    const config = createConfigProvider({ port: null, enabled: false, count: 0, name: '' });

    expect(config.get('port', 1337)).toBeNull();
    expect(config.get('enabled', true)).toBe(false);
    expect(config.get('count', 42)).toBe(0);
    expect(config.get('name', 'fallback')).toBe('');
  });

  test('accepts initial values', () => {
    const config = createConfigProvider({ default: 'val', foo: 'bar' });
    expect(config.get('default')).toEqual('val');
    expect(config.get('foo')).toEqual('bar');
  });

  test('accepts uid in paths', () => {
    const config = createConfigProvider({
      'api::myapi': { foo: 'val' },
      'plugin::myplugin': { foo: 'bar' },
    });

    expect(config.get('api::myapi.foo')).toEqual('val');
    expect(config.get('api::myapi')).toEqual({ foo: 'val' });
    expect(config.get('plugin::myplugin.foo')).toEqual('bar');
    expect(config.get('plugin::myplugin')).toEqual({ foo: 'bar' });
  });

  test('`get` supports `plugin::` prefix', () => {
    const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

    const config = createConfigProvider({
      'plugin::myplugin': { foo: 'bar' },
    });

    expect(config.get('plugin.myplugin.foo')).toEqual('bar');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    consoleSpy.mockRestore();
  });

  test('`get` supports `plugin::model` in array path', () => {
    const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

    const config = createConfigProvider({
      'plugin::myplugin': { foo: 'bar' },
    });

    expect(config.get(['plugin::myplugin', 'foo'])).toEqual('bar');
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    consoleSpy.mockRestore();
  });

  describe('dot notation deprecations', () => {
    test('`get` supports `plugin.` prefix in string path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });

      expect(config.get('plugin.myplugin.foo')).toEqual('bar');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      consoleSpy.mockRestore();
    });

    test('`get` supports `plugin.model` prefix in array path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });

      expect(config.get(['plugin.myplugin', 'foo'])).toEqual('bar');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      consoleSpy.mockRestore();
    });

    test('`get` supports `plugin` + `model` in array path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });

      expect(config.get(['plugin', 'myplugin', 'foo'])).toEqual('bar');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      consoleSpy.mockRestore();
    });
    test('`set` supports `plugin.` prefix in string path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });
      config.set('plugin.myplugin.thing', 'val');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));

      expect(config.get('plugin::myplugin.thing')).toEqual('val');
      consoleSpy.mockRestore();
    });

    test('`set` supports `plugin.` prefix in array path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });
      config.set(['plugin.myplugin', 'thing'], 'val');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));

      expect(config.get('plugin::myplugin.thing')).toEqual('val');
      consoleSpy.mockRestore();
    });

    test('`has` supports `plugin.` prefix in string path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });

      expect(config.has('plugin.myplugin.foo')).toEqual(true);
      expect(config.has('plugin.myplugin.foose')).toEqual(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      consoleSpy.mockRestore();
    });

    test('`has` supports `plugin.` prefix in array path', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const config = createConfigProvider({
        'plugin::myplugin': { foo: 'bar' },
      });

      expect(config.has(['plugin.myplugin', 'foo'])).toEqual(true);
      expect(config.has(['plugin.myplugin', 'foose'])).toEqual(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      consoleSpy.mockRestore();
    });

    test('logs deprecation warning with Strapi logger if available', () => {
      const consoleSpy = jest.spyOn(console, logLevel).mockImplementation(() => {});

      const logSpy = jest.fn();
      const config = createConfigProvider(
        {
          'plugin::myplugin': { foo: 'bar' },
        },
        { log: { [logLevel]: logSpy } } as any
      );

      expect(config.get('plugin.myplugin.foo')).toEqual('bar');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('get does NOT support deprecation for other prefixes', () => {
      const config = createConfigProvider({
        'api::myapi': { foo: 'bar' },
      });

      expect(config.get('api.myapi')).toEqual(undefined);
    });

    test('set does NOT support deprecation for other prefixes', () => {
      const config = createConfigProvider({
        'api::myapi': { foo: 'bar' },
      });

      config.set('api.myapi.foo', 'nope');
      expect(config.get('api.myapi.foo')).toEqual('nope');
      expect(config.get('api::myapi.foo')).toEqual('bar');
    });
  });
});
