import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider, useAppInfo, useTracking } from '@strapi/helper-plugin';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createStore } from 'redux';

import useNavigatorOnLine from '../../../hooks/useNavigatorOnLine';
import MarketPlacePage from '../index';

import server from './server';

const toggleNotification = jest.fn();

jest.mock('../../../hooks/useNavigatorOnLine', () => jest.fn(() => true));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
  CheckPagePermissions: ({ children }) => children,
  useAppInfo: jest.fn(() => ({
    autoReload: true,
    dependencies: {
      '@strapi/plugin-documentation': '4.2.0',
      '@strapi/provider-upload-cloudinary': '4.2.0',
    },
    strapiVersion: '4.1.0',
    useYarn: true,
  })),
}));

const setup = (props) => ({
  ...render(<MarketPlacePage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory();
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
              <IntlProvider locale="en" messages={{}} textComponent="span">
                <ThemeProvider theme={lightTheme}>
                  <Router history={history}>{children}</Router>
                </ThemeProvider>
              </IntlProvider>
            </TrackingProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  }),

  user: userEvent.setup(),
});

const waitForReload = async () => {
  await screen.findByTestId('marketplace-results');
};

describe('Marketplace page - layout', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  it('renders the online layout', async () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementationOnce(() => ({ trackUsage }));

    const { container } = setup();
    await waitForReload();
    // Check snapshot
    expect(container.firstChild).toMatchSnapshot();
    // Calls the tracking event
    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);
    const offlineText = screen.queryByText('You are offline');
    expect(offlineText).toEqual(null);
    // Shows the sort button
    const sortButton = screen.getByRole('combobox', { name: /Sort by/i });
    expect(sortButton).toBeVisible();
    // Shows the filters button
    const filtersButton = screen.getByText(/Filters/i).closest('button');
    expect(filtersButton).toBeVisible();
  });

  it('renders the offline layout', async () => {
    useNavigatorOnLine.mockReturnValueOnce(false);
    const { getByText } = setup();

    const offlineText = getByText('You are offline');

    expect(offlineText).toBeVisible();
  });

  it('disables the button and shows compatibility tooltip message when version provided', async () => {
    const { findByTestId, findAllByTestId } = setup();

    const alreadyInstalledCard = (await findAllByTestId('npm-package-card')).find((div) =>
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
    const { findByTestId, findAllByTestId, user } = setup();

    const alreadyInstalledCard = (await findAllByTestId('npm-package-card')).find((div) =>
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
    useAppInfo.mockImplementation(() => ({
      autoReload: false,
      dependencies: {},
      useYarn: true,
    }));

    const { queryByText } = setup();
    await waitForReload();

    // Should display notification
    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'info',
      message: {
        id: 'admin.pages.MarketPlacePage.production',
        defaultMessage: 'Manage plugins from the development environment',
      },
    });
    expect(toggleNotification).toHaveBeenCalledTimes(1);
    // Should not show install buttons
    expect(queryByText(/copy install command/i)).toEqual(null);
  });

  it('shows only downloads count and not github stars if there are no or 0 stars and no downloads available for any package', async () => {
    const { findByText, findAllByTestId, user } = setup();

    const providersTab = (await findByText(/providers/i)).closest('button');
    await user.click(providersTab);

    const nodeMailerCard = (await findAllByTestId('npm-package-card')).find((div) =>
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
