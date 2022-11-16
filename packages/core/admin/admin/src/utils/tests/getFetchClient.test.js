import getFetchClient from '../getFetchClient';

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
    const getData = await response.get('/admin/project-type');
    expect(getData.config.headers.Authorization).toContain('Bearer');
    expect(getData.config.headers.Accept).toBe('application/json');
    expect(getData).toHaveProperty('data');
  });
});
