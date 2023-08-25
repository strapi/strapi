import { server } from '@tests/utils';
import { AxiosError } from 'axios';
import { rest } from 'msw';

import { auth } from '../auth';
import { getFetchClient } from '../getFetchClient';

const token = 'coolToken';
auth.getToken = jest.fn().mockReturnValue(token);

describe('HELPER-PLUGIN | utils | getFetchClient', () => {
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
