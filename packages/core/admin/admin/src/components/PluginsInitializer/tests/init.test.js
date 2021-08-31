import init from '../init';

describe('ADMIN | COMPONENT | PluginsInitializer | init', () => {
  it('should return the initialState', () => {
    const plugins = {
      pluginA: {
        isReady: false,
      },
      pluginB: {
        isReady: false,
      },
    };

    expect(init(plugins)).toEqual({ plugins });
  });
});
