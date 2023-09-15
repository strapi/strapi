import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider, useAppInfo, useTracking } from '@strapi/helper-plugin';
import { fireEvent, render as renderRTL, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { MarketPlacePage } from '../index';

import server from './server';

jest.mock('../../../hooks/useNavigatorOnLine', () => jest.fn(() => true));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
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

const render = (props) => ({
  ...renderRTL(<MarketPlacePage {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={client}>
          <IntlProvider locale="en" messages={{}} textComponent="span">
            <ThemeProvider theme={lightTheme}>
              <NotificationsProvider>
                <MemoryRouter>{children}</MemoryRouter>
              </NotificationsProvider>
            </ThemeProvider>
          </IntlProvider>
        </QueryClientProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

const waitForReload = async () => {
  await waitFor(() => expect(screen.queryByText('Loading content...')).not.toBeInTheDocument());
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

    const { queryByText, getByRole } = render();
    await waitForReload();
    // Calls the tracking event
    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);

    expect(queryByText('You are offline')).toEqual(null);
    // Shows the sort button
    expect(getByRole('combobox', { name: /Sort by/i })).toBeVisible();
    // Shows the filters button
    expect(getByRole('button', { name: 'Filters' })).toBeVisible();
  });

  it('disables the button and shows compatibility tooltip message when version provided', async () => {
    const { findByTestId, findAllByTestId } = render();

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
    const { findByTestId, findAllByTestId, user } = render();

    const alreadyInstalledCard = (await findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Config Sync')
    );

    const button = within(alreadyInstalledCard)
      .getByText(/copy install command/i)
      .closest('button');

    await user.hover(button);
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

    const { queryByText, getByText } = render();
    await waitForReload();

    expect(getByText('Manage plugins from the development environment')).toBeVisible();
    // Should not show install buttons
    expect(queryByText(/copy install command/i)).toEqual(null);
  });

  it('shows only downloads count and not github stars if there are no or 0 stars and no downloads available for any package', async () => {
    const { findByText, findAllByTestId, user } = render();

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
