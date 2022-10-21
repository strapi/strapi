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

describe('Marketplace page', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the plugin tab snapshot', async () => {
    // Check snapshot
    const { container, getByTestId, getByRole } = render(App);
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());

    expect(container.firstChild).toMatchSnapshot();

    // Make sure it defaults to the plugins tab
    const button = screen.getByRole('tab', { selected: true });
    const pluginsTabActive = getByText(button, /plugins/i);

    const tabPanel = screen.getByRole('tabpanel');
    const pluginCardText = getByText(tabPanel, 'Comments');
    const providerCardText = queryByText(tabPanel, 'Cloudinary');
    const submitPluginText = queryByText(container, 'Submit plugin');

    expect(pluginsTabActive).not.toBe(null);
    expect(pluginCardText).toBeVisible();
    expect(submitPluginText).toBeVisible();
    expect(providerCardText).toEqual(null);
  });

  it('renders and matches the provider tab snapshot', () => {
    // Make sure it switches to the providers tab
    const { container, getByRole } = render(App);
    const providersTab = getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);
    const button = getByRole('tab', { selected: true });
    const providersTabActive = getByText(button, /Providers/i);

    const tabPanel = getByRole('tabpanel');
    const providerCardText = getByText(tabPanel, 'Cloudinary');
    const pluginCardText = queryByText(tabPanel, 'Comments');
    const submitProviderText = queryByText(container, 'Submit provider');

    expect(providersTabActive).not.toBe(null);
    expect(providerCardText).toBeVisible();
    expect(submitProviderText).toBeVisible();
    expect(pluginCardText).toEqual(null);

    // Check snapshot
    expect(container.firstChild).toMatchSnapshot();
  });

  it('sends a single tracking event when the user enters the marketplace', () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementation(() => ({ trackUsage }));
    render(App);

    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);
  });

  it('should return plugin search results matching the query', () => {
    const { container } = render(App);
    const pluginsTab = screen.getByRole('tab', { name: /plugins/i });
    fireEvent.click(pluginsTab);

    const input = getByPlaceholderText(container, 'Search');
    fireEvent.change(input, { target: { value: 'comment' } });
    const match = screen.getByText('Comments');
    const notMatch = screen.queryByText('Sentry');
    const provider = screen.queryByText('Cloudinary');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(provider).toEqual(null);
  });

  it('should return provider search results matching the query', () => {
    const { container } = render(App);
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);

    const input = getByPlaceholderText(container, 'Search');
    fireEvent.change(input, { target: { value: 'cloudina' } });
    const match = screen.getByText('Cloudinary');
    const notMatch = screen.queryByText('Mailgun');
    const plugin = screen.queryByText('Comments');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(plugin).toEqual(null);
  });

  it('should return empty plugin search results given a bad query', () => {
    const { container } = render(App);
    const input = getByPlaceholderText(container, 'Search');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('should return empty provider search results given a bad query', () => {
    const { container } = render(App);
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);
    const input = getByPlaceholderText(container, 'Search');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('shows filters popover on plugins and providers', () => {
    render(App);

    // Show collections and categories filters on plugins
    const pluginsTab = screen.getByRole('tab', { name: /plugins/i });
    fireEvent.click(pluginsTab);
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);
    screen.getByLabelText(/no collections selected/i);
    screen.getByLabelText(/no categories selected/i);
    fireEvent.click(filtersButton);

    // Only show collections filters on providers
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);
    fireEvent.click(filtersButton);
    screen.getByLabelText(/no collections selected/i);
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

  it('shows the sort by menu', () => {
    render(App);
    const sortButton = screen.getByRole('button', { name: /Sort by/i });
    expect(sortButton).toBeVisible();
  });

  it('shows the correct options on sort select', () => {
    render(App);
    const sortButton = screen.getByRole('button', { name: /Sort by/i });
    fireEvent.mouseDown(sortButton);

    const alphabeticalOption = screen.getByRole('option', { name: 'Alphabetical order' });
    const newestOption = screen.getByRole('option', { name: 'Newest' });

    expect(alphabeticalOption).toBeVisible();
    expect(newestOption).toBeVisible();
  });

  it('changes the url on sort option select', () => {
    render(App);
    const sortButton = screen.getByRole('button', { name: /Sort by/i });
    fireEvent.mouseDown(sortButton);

    const newestOption = screen.getByRole('option', { name: 'Newest' });
    fireEvent.click(newestOption);
    expect(history.location.search).toEqual('?sort=submissionDate:desc');
  });
});
