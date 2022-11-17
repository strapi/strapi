import { getFetchClient } from '../getFetchClient';

jest.mock('../getFetchClient', () => {
  return {
    getFetchClient: jest.fn(() => {
      return {
        get: jest.fn(() => ({
          config: {
            headers: {
              Authorization: 'Bearer test',
              Accept: 'application/json',
            },
          },
          data: 'returning data',
        })),
        put: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
      };
    }),
    instance: {
      create: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((config) => {
            config.headers = {
              Authorization: `Bearer`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            };

            return config;
          }),
          eject: jest.fn(),
        },
        response: {
          use: jest.fn(),
          eject: jest.fn(),
        },
      },
    },
  };
});

describe('ADMIN | utils | getFetchClient', () => {
  it('should return the 4 HTTP methods to call GET, POST, PUT and DELETE apis', () => {
    const response = getFetchClient();
    expect(response).toHaveProperty('get');
    expect(response).toHaveProperty('post');
    expect(response).toHaveProperty('put');
    expect(response).toHaveProperty('delete');
  });
  it('should contains the headers config values and the data', async () => {
    const response = getFetchClient();
    const getData = await response.get('/test');
    expect(getData.config.headers.Authorization).toContain('Bearer');
    expect(getData.config.headers.Accept).toBe('application/json');
    expect(getData).toHaveProperty('data');
  });
});
