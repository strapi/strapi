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

    expect(render(app)).toMatchInlineSnapshot(`
      Object {
        "asFragment": [Function],
        "baseElement": .c0 {
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

      <body>
          <div>
            <div
              class="c0"
            >
              <div />
            </div>
          </div>
        </body>,
        "container": <div>
          <div
            class="Loader-sc-1xt0x01-0 JXMaR"
          >
            <div />
          </div>
        </div>,
        "debug": [Function],
        "findAllByAltText": [Function],
        "findAllByDisplayValue": [Function],
        "findAllByLabelText": [Function],
        "findAllByPlaceholderText": [Function],
        "findAllByRole": [Function],
        "findAllByTestId": [Function],
        "findAllByText": [Function],
        "findAllByTitle": [Function],
        "findByAltText": [Function],
        "findByDisplayValue": [Function],
        "findByLabelText": [Function],
        "findByPlaceholderText": [Function],
        "findByRole": [Function],
        "findByTestId": [Function],
        "findByText": [Function],
        "findByTitle": [Function],
        "getAllByAltText": [Function],
        "getAllByDisplayValue": [Function],
        "getAllByLabelText": [Function],
        "getAllByPlaceholderText": [Function],
        "getAllByRole": [Function],
        "getAllByTestId": [Function],
        "getAllByText": [Function],
        "getAllByTitle": [Function],
        "getByAltText": [Function],
        "getByDisplayValue": [Function],
        "getByLabelText": [Function],
        "getByPlaceholderText": [Function],
        "getByRole": [Function],
        "getByTestId": [Function],
        "getByText": [Function],
        "getByTitle": [Function],
        "queryAllByAltText": [Function],
        "queryAllByDisplayValue": [Function],
        "queryAllByLabelText": [Function],
        "queryAllByPlaceholderText": [Function],
        "queryAllByRole": [Function],
        "queryAllByTestId": [Function],
        "queryAllByText": [Function],
        "queryAllByTitle": [Function],
        "queryByAltText": [Function],
        "queryByDisplayValue": [Function],
        "queryByLabelText": [Function],
        "queryByPlaceholderText": [Function],
        "queryByRole": [Function],
        "queryByTestId": [Function],
        "queryByText": [Function],
        "queryByTitle": [Function],
        "rerender": [Function],
        "unmount": [Function],
      }
    `);
  });

  it('should not fetch the latest release', () => {
    render(app);

    expect(fetchStrapiLatestRelease).not.toHaveBeenCalled();
  });
});
