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

describe('Plugins tab', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the plugin tab snapshot', async () => {
    const { container, getByTestId, getByRole } = render(App);
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());

    // Check snapshot
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

  it('should return empty plugin search results given a bad query', () => {
    const { container } = render(App);
    const input = getByPlaceholderText(container, 'Search');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
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

  it('shows plugins filters popover', () => {
    render(App);

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);
    screen.getByLabelText(/no collections selected/i);
    screen.getByLabelText(/no categories selected/i);
    fireEvent.click(filtersButton);
  });
});
