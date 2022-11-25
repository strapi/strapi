import { auth } from '@strapi/helper-plugin';
import { getFetchClient } from '../getFetchClient';

const token = 'coolToken';
auth.getToken = jest.fn().mockReturnValue(token);
auth.clearAppStorage = jest.fn().mockReturnValue(token);
process.env.STRAPI_ADMIN_BACKEND_URL = 'http://localhost:1337';

describe('ADMIN | utils | getFetchClient', () => {
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
      expect(headers.Accept).toBe('application/json');
    }
  });
  it('should contain the headers config values and the data when we try to reach an API without authorization and run the interceptor', async () => {
    const response = getFetchClient();
    try {
      await response.get('/admin/information');
    } catch (err) {
      expect(err.response.status).toBe(401);
      expect(auth.clearAppStorage).toHaveBeenCalledTimes(1);
    }
  });
  it('should respond with status 200 to a known API and create the instance with the correct base URL', async () => {
    const response = getFetchClient();
    const getData = await response.get('/admin/project-type');
    expect(getData.status).toBe(200);

    expect(getData.request.responseURL).toContain(process.env.STRAPI_ADMIN_BACKEND_URL);
  });
});
