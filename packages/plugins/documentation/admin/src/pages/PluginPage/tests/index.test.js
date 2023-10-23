import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider, RBACContext } from '@strapi/helper-plugin';
import { render as renderRTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import PluginPage from '../index';

const render = ({ permissions } = { permissions: fixtures.permissions.allPermissions }) => ({
  ...renderRTL(<PluginPage />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const rbacContextValue = React.useMemo(
        () => ({
          allPermissions: permissions,
        }),
        []
      );

      return (
        <MemoryRouter>
          <ThemeProvider theme={lightTheme}>
            <QueryClientProvider client={client}>
              <IntlProvider locale="en" messages={{}} textComponent="span">
                <NotificationsProvider>
                  <RBACContext.Provider value={rbacContextValue}>{children}</RBACContext.Provider>
                </NotificationsProvider>
              </IntlProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </MemoryRouter>
      );
    },
  }),
  user: userEvent.setup(),
});

const versions = ['2.0.0', '1.2.0', '1.0.0'];

describe('PluginPage', () => {
  it('render the plugin page correctly', async () => {
    const { getByRole, queryByText, getByText } = render();

    expect(getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(getByText('Configure the documentation plugin')).toBeInTheDocument();
    expect(queryByText('Plugin is loading')).toBeInTheDocument();
    expect(getByRole('link', { name: 'Open Documentation' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );

    await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(getByText('Configure the documentation plugin')).toBeInTheDocument();
    expect(getByRole('link', { name: 'Open Documentation' })).toBeInTheDocument();

    expect(getByRole('grid')).toBeInTheDocument();
    expect(getByRole('gridcell', { name: 'Version' })).toBeInTheDocument();
    expect(getByRole('gridcell', { name: 'Last Generated' })).toBeInTheDocument();

    versions.forEach((version) => {
      expect(getByRole('gridcell', { name: version })).toBeInTheDocument();
      expect(getByRole('link', { name: `Open ${version}` })).toBeInTheDocument();
      expect(getByRole('button', { name: `Regenerate ${version}` })).toBeInTheDocument();

      /**
       * You can't delete the original version
       */
      if (version !== '1.0.0') {
        expect(getByRole('button', { name: `Delete ${version}` })).toBeInTheDocument();
      }
    });
  });

  describe('actions', () => {
    it('should open the documentation', async () => {
      const { getByRole, queryByText, user } = render();

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      expect(getByRole('link', { name: 'Open Documentation' })).toHaveAttribute(
        'href',
        'http://localhost:1337/documentation/v1.0.0'
      );

      await user.click(getByRole('link', { name: 'Open Documentation' }));

      versions.forEach((version) => {
        expect(getByRole('link', { name: `Open ${version}` })).toHaveAttribute(
          'href',
          `http://localhost:1337/documentation/v${version}`
        );
      });
    });

    it('should regenerate the documentation', async () => {
      const { getByRole, queryByText, user, getByText } = render();

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      expect(getByRole('button', { name: 'Regenerate 2.0.0' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: 'Regenerate 2.0.0' }));

      expect(getByText('Successfully generated documentation')).toBeInTheDocument();
    });

    it('should delete the documentation', async () => {
      const { getByRole, queryByText, user, getByText } = render();

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      expect(getByRole('button', { name: 'Delete 2.0.0' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: 'Delete 2.0.0' }));

      expect(getByRole('dialog', { name: 'Confirmation' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: 'Confirm' }));

      expect(getByText('Successfully deleted documentation')).toBeInTheDocument();
    });
  });

  describe('permissions', () => {
    it("should always disable the 'Open Documentation' link if the user cannot open", async () => {
      const { getByRole, queryByText } = render({
        permissions: [],
      });

      expect(queryByText('Plugin is loading')).toBeInTheDocument();
      expect(getByRole('link', { name: 'Open Documentation' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      expect(getByRole('link', { name: 'Open Documentation' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('should disabled the open documentation version link in the table if the user cannot open', async () => {
      const { getByRole, queryByText } = render({
        permissions: [],
      });

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      versions.forEach((version) => {
        expect(getByRole('gridcell', { name: version })).toBeInTheDocument();

        expect(getByRole('link', { name: `Open ${version}` })).toHaveAttribute(
          'aria-disabled',
          'true'
        );
      });
    });

    it('should not render the regenerate buttons if the user cannot regenerate', async () => {
      const { queryByRole, getByRole, queryByText } = render({
        permissions: [],
      });

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      versions.forEach((version) => {
        expect(getByRole('gridcell', { name: version })).toBeInTheDocument();

        expect(queryByRole('button', { name: `Regenerate ${version}` })).not.toBeInTheDocument();
      });
    });

    it('should not render the delete buttons if the user cannot delete', async () => {
      const { queryByRole, getByRole, queryByText } = render({
        permissions: [],
      });

      await waitFor(() => expect(queryByText('Plugin is loading')).not.toBeInTheDocument());

      versions.forEach((version) => {
        expect(getByRole('gridcell', { name: version })).toBeInTheDocument();

        expect(queryByRole('button', { name: `Delete ${version}` })).not.toBeInTheDocument();
      });
    });
  });
});
