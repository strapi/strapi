import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useAppInfo, useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import ApplicationInfosPage from '../index';
import server from './server';

const updateProjectSettingsSpy = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useAppInfo: jest.fn(() => ({ shouldUpdateStrapi: false, latestStrapiReleaseTag: 'v3.6.8' })),
  useNotification: jest.fn(() => jest.fn()),
  useRBAC: jest.fn(() => ({ allowedActions: { canRead: true, canUpdate: true } })),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        menuLogo: {
          ext: 'png',
          height: 256,
          name: 'image.png',
          size: 27.4,
          url: 'uploads/image_fe95c5abb9.png',
          width: 246,
        },
      },
    }),
  }),
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
jest.mock(
  'ee_else_ce/pages/SettingsPage/pages/ApplicationInfosPage/components/AdminSeatInfo',
  () => () => {
    return <></>;
  }
);

const client = new QueryClient();

const App = (
  <QueryClientProvider client={client}>
    <TrackingProvider>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} textComponent="span">
          <ApplicationInfosPage />
        </IntlProvider>
      </ThemeProvider>
    </TrackingProvider>
  </QueryClientProvider>
);

describe('Application page', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.restoreAllMocks();
  });

  afterAll(() => server.close());

  it('should not display link upgrade version if not necessary', () => {
    const { queryByText } = render(App);

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });

  it('should display upgrade version warning if the version is behind the latest one', () => {
    useAppInfo.mockImplementationOnce(() => {
      return {
        shouldUpdateStrapi: true,
        latestStrapiReleaseTag: 'v3.6.8',
        strapiVersion: '4.0.0',
      };
    });

    render(App);

    expect(screen.getByText('v4.0.0')).toBeInTheDocument();
    expect(screen.getByText('Upgrade your admin panel')).toBeInTheDocument();
  });

  it('should render logo input if read permissions', async () => {
    const { queryByText } = render(App);

    await waitFor(() => {
      expect(queryByText('Menu logo')).toBeInTheDocument();
    });
  });

  it('should not render logo input if no read permissions', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canRead: false, canUpdate: false },
    }));
    const { queryByText } = render(App);

    await waitFor(() => {
      expect(queryByText('Menu logo')).not.toBeInTheDocument();
    });
  });

  it('should render save button if update permissions', async () => {
    const { queryByText } = render(App);

    await waitFor(() => {
      expect(queryByText('Save')).toBeInTheDocument();
    });
  });

  it('should not render save button if no update permissions', async () => {
    useRBAC.mockImplementationOnce(() => ({ allowedActions: { canRead: true, canUpdate: false } }));
    const { queryByText } = render(App);

    await waitFor(() => {
      expect(queryByText('Save')).not.toBeInTheDocument();
    });
  });

  it('should update project settings on save', async () => {
    const { getByRole } = render(App);

    fireEvent.click(getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProjectSettingsSpy).toHaveBeenCalledTimes(1));
  });
});
