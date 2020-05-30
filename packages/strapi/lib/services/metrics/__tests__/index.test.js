jest.mock('node-fetch');

const metrics = require('../index');
const fetch = require('node-fetch');

describe('metrics', () => {
  test('Initializes a middleware', () => {
    const use = jest.fn();

    metrics({
      config: {
        uuid: 'test',
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      app: {
        use,
      },
    });

    expect(use).toHaveBeenCalled();
  });

  test('Does not init middleware if disabled', () => {
    const use = jest.fn();

    metrics({
      config: {
        uuid: false,
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      app: {
        use,
      },
    });

    expect(use).not.toHaveBeenCalled();
  });

  test('Send payload with meta', () => {
    const { send } = metrics({
      config: {
        uuid: 'test',
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      app: {
        use() {},
      },
    });

    send('someEvent');

    expect(fetch).toHaveBeenCalled();
    fetch.mockClear();
  });

  test('Does not send payload when disabled', () => {
    const { send } = metrics({
      config: {
        uuid: false,
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      app: {
        use() {},
      },
    });

    send('someEvent');

    expect(fetch).not.toHaveBeenCalled();
  });
});
