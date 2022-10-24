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
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
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

describe('Providers tab', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the providers tab snapshot', async () => {
    const { container, getByTestId, getByRole } = render(App);
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());

    const providersTab = getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);

    // Check snapshot
    expect(container.firstChild).toMatchSnapshot();

    const button = getByRole('tab', { selected: true });
    const providersTabActive = getByText(button, /providers/i);

    const tabPanel = getByRole('tabpanel');
    const providerCardText = getByText(tabPanel, 'Cloudinary');
    const pluginCardText = queryByText(tabPanel, 'Comments');
    const submitProviderText = queryByText(container, 'Submit provider');

    expect(providersTabActive).not.toBe(null);
    expect(providerCardText).toBeVisible();
    expect(submitProviderText).toBeVisible();
    expect(pluginCardText).toEqual(null);
  });

  it('should return providers search results matching the query', async () => {
    const { container, getByTestId, getByRole } = render(App);
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());

    const input = getByPlaceholderText(container, 'Search');
    fireEvent.change(input, { target: { value: 'cloudina' } });
    const match = screen.getByText('Cloudinary');
    const notMatch = screen.queryByText('Mailgun');
    const plugin = screen.queryByText('Comments');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(plugin).toEqual(null);
  });

  it('should return empty providers search results given a bad query', () => {
    const { container } = render(App);
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);
    const input = getByPlaceholderText(container, 'Search');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
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

  it('shows providers filters popover', () => {
    render(App);

    const filtersButton = screen.getByRole('button', { name: /filters/i });

    // Only show collections filters on providers
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    fireEvent.click(providersTab);
    fireEvent.click(filtersButton);
    screen.getByLabelText(/no collections selected/i);
  });
});
