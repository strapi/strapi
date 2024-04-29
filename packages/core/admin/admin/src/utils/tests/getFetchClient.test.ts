import { getFetchClient } from '../getFetchClient';

describe('getFetchClient', () => {
  beforeEach(() => {
    window.fetch = jest.fn(); // Reset the mock before each test
  });

  it('should return the 4 HTTP methods to call GET, POST, PUT and DELETE apis', () => {
    const response = getFetchClient();
    expect(response).toHaveProperty('get');
    expect(response).toHaveProperty('post');
    expect(response).toHaveProperty('put');
    expect(response).toHaveProperty('del');
  });

  it('should call correct url', async () => {
    (window.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ data: 'success response' }),
      })
    );
    const fetchClient = getFetchClient();
    const { data } = await fetchClient.get('test-fetch-client');
    expect(data).toEqual({ data: 'success response' });
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/test-fetch-client',
      expect.anything()
    );
  });

  it('should serialize a params object to a string', async () => {
    (window.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ data: 'success response' }),
      })
    );
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
    const fetchClient = getFetchClient();
    const { data } = await fetchClient.get('test-fetch-client', {
      params: mockParams,
    });
    expect(data).toEqual({ data: 'success response' });
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/test-fetch-client?page=1&pageSize=10&sort=short_text:ASC&filters[$and][0][biginteger][$eq]=3&filters[$and][1][short_text][$eq]=test&locale=en',
      expect.anything()
    );
  });
});
