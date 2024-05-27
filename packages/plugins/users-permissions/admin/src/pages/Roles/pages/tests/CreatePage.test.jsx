import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/strapi/admin';
import { fireEvent, render as renderRTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { CreatePage } from '../CreatePage';

const render = () => ({
  ...renderRTL(<Route path="/settings/users-permissions/roles/new" element={<CreatePage />} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <IntlProvider locale="en" messages={{}} textComponent="span">
          <DesignSystemProvider>
            <QueryClientProvider client={client}>
              <NotificationsProvider>
                <MemoryRouter initialEntries={[`/settings/users-permissions/roles/new`]}>
                  <Routes>{children}</Routes>
                </MemoryRouter>
              </NotificationsProvider>
            </QueryClientProvider>
          </DesignSystemProvider>
        </IntlProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('Roles – CreatePage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders correctly', async () => {
    const { getByRole, user } = render();

    expect(getByRole('heading', { name: 'Create a role' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Role details' })).toBeInTheDocument();

    /**
     * This means the `usePlugins` hook has finished fetching
     */
    await waitFor(() => expect(getByRole('heading', { name: 'Permissions' })).toBeInTheDocument());

    expect(getByRole('heading', { name: 'Advanced settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Description' })).toBeInTheDocument();

    await user.click(
      getByRole('button', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    );

    expect(
      getByRole('region', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    ).toBeInTheDocument();

    expect(getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'create' })).toBeInTheDocument();
  });

  it('will show an error if the user does not fill the name or description field', async () => {
    const { getByRole } = render();

    await waitFor(() => expect(getByRole('heading', { name: 'Permissions' })).toBeInTheDocument());

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true')
    );

    expect(getByRole('textbox', { name: 'Description' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('can create a new role and show a notification', async () => {
    const { getByRole, getByText, user } = render();

    await waitFor(() => expect(getByRole('heading', { name: 'Permissions' })).toBeInTheDocument());

    await user.type(getByRole('textbox', { name: 'Name' }), 'Test role');
    await user.type(getByRole('textbox', { name: 'Description' }), 'This is a test role');

    await user.click(
      getByRole('button', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    );
    await user.click(getByRole('checkbox', { name: 'create' }));

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getByText('Role created')).toBeInTheDocument());
  });
});
