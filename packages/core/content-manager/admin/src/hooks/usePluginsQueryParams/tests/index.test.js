import usePluginsQueryParams from '..';

jest.mock('react-router-dom', () => {
  return {
    useLocation: jest.fn(() => ({
      search: '?page=1&pageSize=10&plugins[i18n][locale]=fr',
    })),
  };
});

describe('CONTENT MANAGER | hooks | usePluginsQueryParams', () => {
  it('should return and format the plugins query params', () => {
    expect(usePluginsQueryParams()).toEqual('plugins[i18n][locale]=fr');
  });
});
