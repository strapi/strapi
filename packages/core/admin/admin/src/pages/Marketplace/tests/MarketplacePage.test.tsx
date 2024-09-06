/* eslint-disable testing-library/no-node-access */

import { screen, within, fireEvent } from '@testing-library/react';
import { render as renderRTL, waitFor } from '@tests/utils';

import { useAppInfo } from '../../../features/AppInfo';
import { useTracking } from '../../../features/Tracking';
import { MarketplacePage } from '../MarketplacePage';

jest.mock('../hooks/useNavigatorOnline');

jest.mock('../../../features/Tracking', () => ({
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../../features/AppInfo', () => ({
  ...jest.requireActual('../../../features/AppInfo'),
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

const render = () => renderRTL(<MarketplacePage />);

const waitForReload = async () => {
  await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
};

describe('Marketplace page - layout', () => {
  it('renders the online layout', async () => {
    const trackUsage = jest.fn();
    // @ts-expect-error - mock
    useTracking.mockImplementationOnce(() => ({ trackUsage }));

    const { queryByText, getByRole } = render();
    await waitForReload();
    // Calls the tracking event
    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);

    expect(queryByText('You are offline')).not.toBeInTheDocument();
    // Shows the sort button
    expect(getByRole('combobox', { name: /Sort by/i })).toBeVisible();
    // Shows the filters button
    expect(getByRole('button', { name: 'Filters' })).toBeVisible();
  });
  it('does not display the button when incompatible version provided', async () => {
    const { findAllByTestId } = render();

    const alreadyInstalledCard = (await findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Transformer')
    )!;

    const button = within(alreadyInstalledCard).queryByText(/copy install command/i);

    expect(button).not.toBeInTheDocument();
  });

  it('shows compatibility tooltip message when no version provided', async () => {
    const { findByTestId, findAllByTestId, user } = render();

    const alreadyInstalledCard = (await findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Config Sync')
    )!;

    const button = within(alreadyInstalledCard)
      .getByText(/copy install command/i)
      .closest('button')!;

    await user.hover(button);
    const tooltip = await findByTestId(`tooltip-Config Sync`);

    expect(button).toBeEnabled();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(
      'Unable to verify compatibility with your Strapi version: "4.1.0"'
    );
  });

  it('handles production environment', async () => {
    // Simulate production environment
    // @ts-expect-error - mock
    useAppInfo.mockImplementation(() => ({
      autoReload: false,
      dependencies: {},
      useYarn: true,
    }));

    const { queryByText, getByText } = render();
    await waitForReload();

    expect(getByText('Manage plugins from the development environment')).toBeVisible();
    // Should not show install buttons
    expect(queryByText(/copy install command/i)).not.toBeInTheDocument();
  });

  it('shows only downloads count and not github stars if there are no or 0 stars and no downloads available for any package', async () => {
    const { findByText, findAllByTestId, user } = render();

    const providersTab = (await findByText(/providers/i)).closest('button')!;
    await user.click(providersTab);

    const nodeMailerCard = (await findAllByTestId('npm-package-card')).find((div) =>
      div.innerHTML.includes('Nodemailer')
    )!;

    const githubStarsLabel = within(nodeMailerCard).queryByLabelText(
      /this provider was starred \d+ on GitHub/i
    );

    expect(githubStarsLabel).not.toBeInTheDocument();

    const downloadsLabel = within(nodeMailerCard).getByLabelText(
      /this provider has \d+ weekly downloads/i
    );
    expect(downloadsLabel).toBeVisible();
  });
});
