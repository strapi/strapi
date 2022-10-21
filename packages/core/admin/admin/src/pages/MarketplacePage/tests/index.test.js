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
  getByRole,
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

  it('renders and matches the plugin tab snapshot', async () => {
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
    useAppInfos.mockImplementationOnce(() => ({
      autoReload: false,
      dependencies: {},
      useYarn: true,
    }));
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

  it('shows the installed text for installed plugins', () => {
    render(App);
    const pluginsTab = screen.getByRole('tab', { name: /plugins/i });
    fireEvent.click(pluginsTab);

    // Plugin that's already installed
    const alreadyInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Documentation'));
    const alreadyInstalledText = queryByText(alreadyInstalledCard, /installed/i);
    expect(alreadyInstalledText).toBeVisible();

    // Plugin that's not installed
    const notInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Comments'));
    const notInstalledText = queryByText(notInstalledCard, /copy install command/i);
    expect(notInstalledText).toBeVisible();
  });

  it('shows the installed text for installed providers', () => {
    // Open providers tab
    render(App);
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);

    // Provider that's already installed
    const alreadyInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Cloudinary'));
    const alreadyInstalledText = queryByText(alreadyInstalledCard, /installed/i);
    expect(alreadyInstalledText).toBeVisible();

    // Provider that's not installed
    const notInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Rackspace'));
    const notInstalledText = queryByText(notInstalledCard, /copy install command/i);
    expect(notInstalledText).toBeVisible();
  });

  it('disables the button and shows compatibility tooltip message when version provided', async () => {
    const { getByTestId } = render(App);
    const alreadyInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Transformer'));
    const button = getByRole(alreadyInstalledCard, 'button', { name: /copy install command/i });
    const tooltip = getByTestId(`tooltip-Transformer`);
    fireEvent.mouseOver(button);
    await waitFor(() => {
      expect(tooltip).toBeVisible();
    });
    expect(button).toBeDisabled();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Update your Strapi version: "4.1.0" to: "4.0.7"');
  });

  it('shows compatibility tooltip message when no version provided', async () => {
    const { getByTestId } = render(App);
    const alreadyInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Config Sync'));
    const button = getByRole(alreadyInstalledCard, 'button', { name: /copy install command/i });
    const tooltip = getByTestId(`tooltip-Config Sync`);
    fireEvent.mouseOver(button);
    await waitFor(() => {
      expect(tooltip).toBeVisible();
    });
    expect(button).not.toBeDisabled();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(
      'Unable to verify compatibility with your Strapi version: "4.1.0"'
    );
  });

  it('shows github stars and weekly downloads count for each plugin', () => {
    render(App);
    const pluginsTab = screen.getByRole('tab', { name: /plugins/i });
    fireEvent.click(pluginsTab);

    const documentationCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Documentation'));
    const githubStars = queryByText(documentationCard, 12);
    expect(githubStars).toBeVisible();
    const weeklyDownloads = queryByText(documentationCard, 135);
    expect(weeklyDownloads).toBeVisible();
  });

  it('shows github stars and weekly downloads count for each provider', () => {
    render(App);
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);

    const cloudinaryCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Cloudinary'));
    const githubStars = queryByText(cloudinaryCard, 12);
    expect(githubStars).toBeVisible();
    const weeklyDownloads = queryByText(cloudinaryCard, 135);
    expect(weeklyDownloads).toBeVisible();
  });
});
