import React from 'react';
import { render } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease } from '../utils/api';
import packageJSON from '../../../../../package.json';
import AuthenticatedApp from '..';

const strapiVersion = packageJSON.version;

jest.mock('../utils/api', () => ({
  fetchStrapiLatestRelease: jest.fn(),
  fetchAppInfo: jest.fn(),
  fetchCurrentUserPermissions: jest.fn(),
}));

jest.mock('../../PluginsInitializer', () => () => <div>PluginsInitializer</div>);
// eslint-disable-next-line react/prop-types
jest.mock('../../RBACProvider', () => ({ children }) => <div>{children}</div>);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const app = (
  <QueryClientProvider client={queryClient}>
    <AuthenticatedApp />
  </QueryClientProvider>
);

describe('Admin | components | AuthenticatedApp', () => {
  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should not crash', () => {
    fetchStrapiLatestRelease.mockImplementation(() => Promise.resolve({ tag_name: strapiVersion }));
    fetchAppInfo.mockImplementation(() =>
      Promise.resolve({
        autoReload: true,
        communityEdition: false,
        currentEnvironment: 'development',
        nodeVersion: 'v14.13.1',
        strapiVersion: '3.6.0',
      })
    );
    fetchCurrentUserPermissions.mockImplementation(() => Promise.resolve([]));

    const { container } = render(app);

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: space-around;
        -webkit-justify-content: space-around;
        -ms-flex-pack: space-around;
        justify-content: space-around;
        width: 100%;
        height: 100vh;
      }

      .c0 > div {
        margin: auto;
        width: 50px;
        height: 50px;
        border: 6px solid #f3f3f3;
        border-top: 6px solid #1c91e7;
        border-radius: 50%;
        -webkit-animation: fEWCgj 2s linear infinite;
        animation: fEWCgj 2s linear infinite;
      }

      <div
        class="c0"
      >
        <div />
      </div>
    `);
  });

  it('should not fetch the latest release', () => {
    render(app);

    expect(fetchStrapiLatestRelease).not.toHaveBeenCalled();
  });
});
