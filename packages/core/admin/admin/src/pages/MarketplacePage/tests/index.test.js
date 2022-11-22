import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useTracking, useAppInfos, TrackingProvider } from '@strapi/helper-plugin';
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

const user = userEvent.setup();

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
    <TrackingProvider>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <MarketPlacePage />
          </Router>
        </ThemeProvider>
      </IntlProvider>
    </TrackingProvider>
  </QueryClientProvider>
);

const waitForReload = async () => {
  await screen.findByText('Marketplace', { selector: 'h1' });
};

describe('Marketplace page - layout', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    // Clear the cache to isolate each test
    client.clear();
  });

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
    const filtersButton = screen.getByText(/Filters/i).closest('button');
    expect(filtersButton).toBeVisible();
  });

  it('renders the offline layout', async () => {
    useNavigatorOnLine.mockReturnValueOnce(false);
    render(App);

    const offlineText = screen.getByText('You are offline');

    expect(offlineText).toBeVisible();
  });

  it('disables the button and shows compatibility tooltip message when version provided', async () => {
    const { findByTestId } = render(App);

    const alreadyInstalledCard = (await screen.findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Transformer')
    );

    const button = within(alreadyInstalledCard)
      .getByText(/copy install command/i)
      .closest('button');

    // User event throws an error that there are no pointer events
    fireEvent.mouseOver(button);
    const tooltip = await findByTestId('tooltip-Transformer');
    expect(button).toBeDisabled();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Update your Strapi version: "4.1.0" to: "4.0.7"');
  });

  it('shows compatibility tooltip message when no version provided', async () => {
    const { findByTestId } = render(App);

    const alreadyInstalledCard = (await screen.findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Config Sync')
    );

    const button = within(alreadyInstalledCard)
      .getByText(/copy install command/i)
      .closest('button');

    user.hover(button);
    const tooltip = await findByTestId(`tooltip-Config Sync`);

    expect(button).not.toBeDisabled();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(
      'Unable to verify compatibility with your Strapi version: "4.1.0"'
    );
  });

  it('handles production environment', async () => {
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

  it('shows only downloads count and not github stars if there are no or 0 stars and no downloads available for any package', async () => {
    render(App);

    const providersTab = (await screen.findByText(/providers/i)).closest('button');
    await user.click(providersTab);

    const nodeMailerCard = (await screen.findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Nodemailer')
    );

    const githubStarsLabel = within(nodeMailerCard).queryByLabelText(
      /this provider was starred \d+ on GitHub/i
    );

    expect(githubStarsLabel).toBe(null);

    const downloadsLabel = within(nodeMailerCard).getByLabelText(
      /this provider has \d+ weekly downloads/i
    );
    expect(downloadsLabel).toBeVisible();
  });
});
