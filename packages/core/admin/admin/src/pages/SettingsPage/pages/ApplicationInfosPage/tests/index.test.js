import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useAppInfos, useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import ApplicationInfosPage from '../index';
import { axiosInstance } from '../../../../../core/utils';
import server from './server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useAppInfos: jest.fn(() => ({ shouldUpdateStrapi: false, latestStrapiReleaseTag: 'v3.6.8' })),
  useNotification: jest.fn(),
  useRBAC: jest.fn(() => ({ allowedActions: { canRead: true, canUpdate: true } })),
}));
jest.mock('../../../../../hooks', () => ({
  useConfigurations: jest.fn(() => ({
    logos: {
      menu: { custom: 'customMenuLogo.png', default: 'defaultMenuLogo.png' },
      auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
    },
  })),
}));

jest.spyOn(axiosInstance, 'get').mockResolvedValue({
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
});

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
  });

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchSnapshot();
  });

  it('should not display link upgrade version if not necessary', () => {
    const { queryByText } = render(App);

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });

  it('should display upgrade version warning if the version is behind the latest one', () => {
    useAppInfos.mockImplementationOnce(() => {
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
});
