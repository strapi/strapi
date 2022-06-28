import React from 'react';
import {
  render,
  waitFor,
  waitForElementToBeRemoved,
  getByPlaceholderText,
  fireEvent,
  screen,
  getByText,
  queryByText,
} from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useTracking, useAppInfos } from '@strapi/helper-plugin';
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

const App = (
  <QueryClientProvider client={client}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <MarketPlacePage />
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('Marketplace page', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it.only('renders and matches the plugin tab snapshot', async () => {
    const { container, getByTestId, getByRole } = render(App);
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());

    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders and matches the provider tab snapshot', async () => {
    const { container, getByRole } = render(App);
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());
    const providersTab = screen.getByRole('tab', { selected: false });
    fireEvent.click(providersTab);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('sends a single tracking event when the user enters the marketplace', () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementation(() => ({ trackUsage }));
    render(App);

    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);
  });

  it('should return plugin search results matching the query', async () => {
    const { container } = render(App);
    const input = await getByPlaceholderText(container, 'Search');
    fireEvent.change(input, { target: { value: 'comment' } });
    const match = screen.getByText('Comments');
    const notMatch = screen.queryByText('Sentry');
    const provider = screen.queryByText('Cloudinary');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(provider).toEqual(null);
  });

  it('should return provider search results matching the query', async () => {
    const { container } = render(App);
    const providersTab = screen.getByRole('tab', { selected: false });
    fireEvent.click(providersTab);

    const input = await getByPlaceholderText(container, 'Search');
    fireEvent.change(input, { target: { value: 'cloudina' } });
    const match = screen.getByText('Cloudinary');
    const notMatch = screen.queryByText('Mailgun');
    const plugin = screen.queryByText('Comments');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(plugin).toEqual(null);
  });

  it('should return empty plugin search results given a bad query', async () => {
    const { container } = render(App);
    const input = await getByPlaceholderText(container, 'Search');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('should return empty provider search results given a bad query', async () => {
    const { container } = render(App);
    const providersTab = screen.getByRole('tab', { selected: false });
    fireEvent.click(providersTab);
    const input = await getByPlaceholderText(container, 'Search');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('handles production environment', () => {
    // Simulate production environment
    useAppInfos.mockImplementation(() => ({ autoReload: false, dependencies: {}, useYarn: true }));
    const { queryByText } = render(App);

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
    expect(queryByText(/copy install command/i)).not.toBeInTheDocument();
  });

  it('shows an online layout', () => {
    render(App);
    const offlineText = screen.queryByText('You are offline');

    expect(offlineText).toEqual(null);
  });

  it('shows the offline layout', () => {
    useNavigatorOnLine.mockReturnValueOnce(false);
    render(App);
    const offlineText = screen.getByText('You are offline');

    expect(offlineText).toBeVisible();
  });

  it('defaults to plugins tab', async () => {
    const { container } = render(App);
    const button = screen.getByRole('tab', { selected: true });
    const pluginsTabActive = await getByText(button, /Plugins/i);

    const tabPanel = screen.getByRole('tabpanel');
    const pluginCardText = await getByText(tabPanel, 'Comments');
    const providerCardText = await queryByText(tabPanel, 'Cloudinary');
    const submitPluginText = await queryByText(container, 'Submit plugin');

    expect(pluginsTabActive).not.toBe(null);
    expect(pluginCardText).toBeVisible();
    expect(submitPluginText).toBeVisible();
    expect(providerCardText).toEqual(null);
  });

  it('switches to providers tab', async () => {
    const { container } = render(App);
    const providersTab = screen.getByRole('tab', { selected: false });
    fireEvent.click(providersTab);
    const button = screen.getByRole('tab', { selected: true });
    const providersTabActive = await getByText(button, /Providers/i);

    const tabPanel = screen.getByRole('tabpanel');
    const providerCardText = await getByText(tabPanel, 'Cloudinary');
    const pluginCardText = await queryByText(tabPanel, 'Comments');
    const submitProviderText = await queryByText(container, 'Submit provider');

    expect(providersTabActive).not.toBe(null);
    expect(providerCardText).toBeVisible();
    expect(submitProviderText).toBeVisible();
    expect(pluginCardText).toEqual(null);
  });

  it.only('does not show install button when plugin already installed', async () => {
    render(App);

    const npmPackageCard = await screen.getAllByTestId('npm-package-card');
    npmPackageCard.forEach(npmPackageCard => {
      const installedPluginName = queryByText(npmPackageCard, /^documentation$/i);
      const installedText = queryByText(npmPackageCard, /installed/i);

      if (installedPluginName) {
        // Plugin should already be installed
        expect(installedText).toBeVisible();
      } else {
        expect(installedText).toBeNull();
      }
    });
  });
});
