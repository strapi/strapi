import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider, useAppInfo, useRBAC } from '@strapi/helper-plugin';
import { fireEvent, render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import ApplicationInfosPage from '../index';

const handlers = [
  rest.get('*/project-settings', (req, res, ctx) => {
    return res(
      ctx.json({
        menuLogo: {
          ext: '.svg',
          height: 256,
          name: 'michka.svg',
          size: 1.3,
          url: '/uploads/michka.svg',
          width: 256,
        },
      })
    );
  }),
  rest.post('*/project-settings', (req, res, ctx) => {
    return res(
      ctx.json({
        menuLogo: {
          ext: '.svg',
          height: 256,
          name: 'michka.svg',
          size: 1.3,
          url: '/uploads/michka.svg',
          width: 256,
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

const updateProjectSettingsSpy = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useAppInfo: jest.fn(() => ({ shouldUpdateStrapi: false, latestStrapiReleaseTag: 'v3.6.8' })),
  useNotification: jest.fn(() => jest.fn()),
  useRBAC: jest.fn(() => ({ allowedActions: { canRead: true, canUpdate: true } })),
}));

jest.mock('../../../../../hooks', () => ({
  useConfigurations: jest.fn(() => ({
    logos: {
      menu: { custom: 'customMenuLogo.png', default: 'defaultMenuLogo.png' },
      auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
    },
    updateProjectSettings: updateProjectSettingsSpy,
  })),
}));

const setup = (props) => ({
  ...render(<ApplicationInfosPage {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: { permissions: fixtures.permissions.app },
          })}
        >
          <QueryClientProvider client={client}>
            <TrackingProvider>
              <ThemeProvider theme={lightTheme}>
                <IntlProvider locale="en" messages={{}} textComponent="span">
                  {children}
                </IntlProvider>
              </ThemeProvider>
            </TrackingProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  }),

  user: userEvent.setup(),
});

describe('Application page', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => server.close());

  it('should not display link upgrade version if not necessary', async () => {
    const { queryByText, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });

  it('should display upgrade version warning if the version is behind the latest one', async () => {
    useAppInfo.mockReturnValue({
      shouldUpdateStrapi: true,
      latestStrapiReleaseTag: 'v3.6.8',
      strapiVersion: '4.0.0',
    });

    const { getByText, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    expect(getByText('v4.0.0')).toBeInTheDocument();
    expect(getByText('Upgrade your admin panel')).toBeInTheDocument();
  });

  it('should render logo input if read permissions', async () => {
    const { queryByText, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    expect(queryByText('Menu logo')).toBeInTheDocument();
  });

  it('should not render logo input if no read permissions', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canRead: false, canUpdate: false },
    }));
    const { queryByText } = setup();

    expect(queryByText('Menu logo')).not.toBeInTheDocument();
  });

  it('should render save button if update permissions', async () => {
    const { queryByText, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    expect(queryByText('Save')).toBeInTheDocument();
  });

  it('should not render save button if no update permissions', async () => {
    useRBAC.mockReturnValue({ allowedActions: { canRead: true, canUpdate: false } });

    const { queryByText, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    expect(queryByText('Save')).not.toBeInTheDocument();
  });

  it('should update project settings on save', async () => {
    useRBAC.mockReturnValue({ allowedActions: { canRead: true, canUpdate: true } });

    const { getByRole, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateProjectSettingsSpy).toHaveBeenCalledTimes(1));
  });
});
