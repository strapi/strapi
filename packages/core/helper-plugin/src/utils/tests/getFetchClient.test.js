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

  it('should contain the headers config values and the data when we try to reach an unknown API and the passed URL', async () => {
    const response = getFetchClient();
    try {
      await response.get('/test');
    } catch (err) {
      const { headers, url } = err.config;
      expect(headers.Authorization).toContain(`Bearer ${token}`);
      expect(url).toBe('/test');
    }
  });

  it('should contain the normalized URL when we try to reach an unknown API with an URL without prepending slash', async () => {
    const response = getFetchClient();
    try {
      await response.get('test');
    } catch (err) {
      const { url } = err.config;
      expect(url).toBe('/test');
    }
  });

  it('should contain the URL passed when we try to reach an unknown API with a full URL', async () => {
    const response = getFetchClient();
    try {
      await response.get('https://example.com');
    } catch (err) {
      const { url } = err.config;
      expect(url).toBe('https://example.com');
    }
  });
});
