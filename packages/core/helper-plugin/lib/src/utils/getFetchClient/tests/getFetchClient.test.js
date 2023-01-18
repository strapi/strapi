import auth from '../../auth';
import getFetchClient from '../index';

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
