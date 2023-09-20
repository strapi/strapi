import { server } from '@tests/utils';
import { rest } from 'msw';

import { auth } from '../auth';
import { instance } from '../fetchClient';

const token = 'coolToken';
const mockClearAppStorage = jest.fn().mockImplementation();

auth.getToken = jest.fn().mockReturnValue(token);
auth.clearAppStorage = mockClearAppStorage;

describe('HELPER-PLUGIN | utils | fetchClient', () => {
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
