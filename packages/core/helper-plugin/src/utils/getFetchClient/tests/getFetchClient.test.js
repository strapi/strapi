import auth from '../../auth';
import getFetchClient from '../index';
import { checkUrl } from '../index';
import isAbsoluteUrl from '../../isAbsoluteUrl';

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
  it('should contain the headers config values and the data when we try to reach an unknown API', async () => {
    const response = getFetchClient();
    try {
      await response.get('/test');
    } catch (err) {
      const { headers } = err.config;
      expect(headers.Authorization).toContain(`Bearer ${token}`);
    }
  });
});

describe('HELPER-PLUGIN | utils | getFetchClient | checkUrl', () => {
  it('should return an absolute url if it is passed', () => {
    const cleanedUrl = checkUrl('http://example.com');
    expect(isAbsoluteUrl(cleanedUrl)).toBeTruthy();
  });

  it('should return a relative url with prepending slash if it is passed', () => {
    const cleanedUrl = checkUrl('/relative');
    expect(cleanedUrl).toBe('/relative');
  });

  it('should return a relative url adding a prepending slash if it is missing', () => {
    const cleanedUrl = checkUrl('relative');
    expect(cleanedUrl).toBe('/relative');
  });
});