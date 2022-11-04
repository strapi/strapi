import React from 'react';
import { render, waitFor, waitForElementToBeRemoved, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useTracking, useAppInfos } from '@strapi/helper-plugin';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import useNavigatorOnLine from '../../../hooks/useNavigatorOnLine';
import MarketPlacePage from '../index';
import server from './server';

const toggleNotification = jest.fn();

jest.mock('../../../hooks/useNavigatorOnLine', () => jest.fn(() => true));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
  pxToRem: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useAppInfos: jest.fn(() => ({
    autoReload: true,
    dependencies: {
      '@strapi/plugin-documentation': '4.2.0',
      '@strapi/provider-upload-cloudinary': '4.2.0',
    },
    strapiVersion: '4.1.0',
    useYarn: true,
  })),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const history = createMemoryHistory();

const App = (
  <QueryClientProvider client={client}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <MarketPlacePage />
        </Router>
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

const waitForReload = async () => {
  await waitForElementToBeRemoved(() => screen.getByTestId('loader'));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: /marketplace/i })).toBeInTheDocument()
  );
};

describe('Marketplace page - layout', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders the online layout', async () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementationOnce(() => ({ trackUsage }));

    const { container } = render(App);
    await waitForReload();
    // Check snapshot
    expect(container.firstChild).toMatchSnapshot();
    // Calls the tracking event
    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);
    const offlineText = screen.queryByText('You are offline');
    expect(offlineText).toEqual(null);
    // Shows the sort button
    const sortButton = screen.getByRole('button', { name: /Sort by/i });
    expect(sortButton).toBeVisible();
    // Shows the filters button
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    expect(filtersButton).toBeVisible();
  });

  it('renders the offline layout', async () => {
    useNavigatorOnLine.mockReturnValueOnce(false);
    render(App);

    const offlineText = screen.getByText('You are offline');

    expect(offlineText).toBeVisible();
  });

  it('handles production environment', async () => {
    client.clear();
    // Simulate production environment
    useAppInfos.mockImplementation(() => ({
      autoReload: false,
      dependencies: {},
      useYarn: true,
    }));

    render(App);

    await waitForReload();
    // Should display notification
    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'info',
      message: {
        id: 'admin.pages.MarketPlacePage.production',
        defaultMessage: 'Manage plugins from the development environment',
      },
      blockTransition: true,
    });
    expect(toggleNotification).toHaveBeenCalledTimes(1);
    // Should not show install buttons
    expect(screen.queryByText(/copy install command/i)).toEqual(null);
  });
});
