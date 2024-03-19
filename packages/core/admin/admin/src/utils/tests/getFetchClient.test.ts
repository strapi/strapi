import { auth } from '@strapi/helper-plugin';
import { server } from '@tests/utils';
import { AxiosError } from 'axios';
import { rest } from 'msw';

import { getFetchClient, instance } from '../getFetchClient';

const token = 'coolToken';
const mockClearAppStorage = jest.fn().mockImplementation();

auth.getToken = jest.fn().mockReturnValue(token);
auth.clearAppStorage = mockClearAppStorage;

describe('fetchClient', () => {
  it('should add the authorization token in each request', async () => {
    const response = await instance.get('/test-fetch-client');
    expect(response.config.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('should contain a paramsSerializer that can serialize a params object to a string', async () => {
    const mockParams = {
      page: '1',
      pageSize: '10',
      sort: 'short_text:ASC',
      filters: {
        $and: [
          {
            biginteger: {
              $eq: '3',
            },
          },
          {
            short_text: {
              $eq: 'test',
            },
          },
        ],
      },
      locale: 'en',
    };

    const response = await instance.get('/test-fetch-client', { params: mockParams });
    expect(response.request.url).toBe(
      `/test-fetch-client?page=1&pageSize=10&sort=short_text:ASC&filters[$and][0][biginteger][$eq]=3&filters[$and][1][short_text][$eq]=test&locale=en`
    );
  });

  it('should reload application if there is an error on the response', async () => {
    server.use(
      rest.get('*/test-fetch-client-error', (req, res, ctx) => {
        return res(ctx.status(401));
      })
    );

    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: mockReload },
    });

    try {
      await instance.get('http://realURL/test-fetch-client-error');
    } catch (error) {
      expect(mockClearAppStorage).toHaveBeenCalled();
      expect(mockReload).toHaveBeenCalled();
    }

    server.restoreHandlers();
  });
});

describe('getFetchClient', () => {
  it('should return the 4 HTTP methods to call GET, POST, PUT and DELETE apis', () => {
    const response = getFetchClient();
    expect(response).toHaveProperty('get');
    expect(response).toHaveProperty('post');
    expect(response).toHaveProperty('put');
    expect(response).toHaveProperty('del');
  });

  it('should contain the normalized URL when we try to reach an unknown API with an URL without prepending slash', async () => {
    const response = getFetchClient();
    try {
      await response.get('test-fetch-client');
    } catch (err) {
      const url = (err as AxiosError).config?.url;
      expect(url).toBe('/test-fetch-client');
    }
  });

  it('should contain the URL passed when we try to reach an unknown API with a full URL', async () => {
    server.use(
      rest.get('https://notinternalurl.com', (req, res, ctx) => {
        return res(ctx.status(200));
      })
    );

    const response = getFetchClient();
    try {
      await response.get('https://notinternalurl.com');
    } catch (err) {
      const url = (err as AxiosError).config?.url;
      expect(url).toBe('https://notinternalurl.com');
    }

    server.restoreHandlers();
  });
});
