import React from 'react';

import { NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render as renderRTL, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { EditPage } from '../EditPage';

const render = () => ({
  ...renderRTL(<Route path="/settings/users-permissions/roles/:id" element={<EditPage />} />, {
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
                <MemoryRouter initialEntries={[`/settings/users-permissions/roles/1`]}>
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

describe('Roles – EditPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders correctly', async () => {
    const { getByText, getByRole, user } = render();

    await waitForElementToBeRemoved(() => getByText('Loading content.'));

    expect(getByRole('link', { name: 'Back' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Authenticated' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Role details' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Permissions' })).toBeInTheDocument();
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

  it('will show an error if the user does not fill the name field', async () => {
    const { getByRole, user, getByText } = render();

    await waitForElementToBeRemoved(() => getByText('Loading content.'));

    await user.clear(getByRole('textbox', { name: 'Name' }));

    await user.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('will show an error if the user does not fill out the description field', async () => {
    const { getByRole, user, getByText } = render();

    await waitForElementToBeRemoved(() => getByText('Loading content.'));

    await user.clear(getByRole('textbox', { name: 'Description' }));

    await user.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('textbox', { name: 'Description' })).toHaveAttribute('aria-invalid', 'true');
  });

  it("can update a role's name, description and permissions", async () => {
    const { getByRole, user, getByText, findByRole, findByText } = render();

    await waitForElementToBeRemoved(() => getByText('Loading content.'));

    await user.type(getByRole('textbox', { name: 'Name' }), 'test');
    await user.type(getByRole('textbox', { name: 'Description' }), 'testing');
    await user.click(
      getByRole('button', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    );
    await user.click(getByRole('checkbox', { name: 'create' }));

    const button = await findByRole('button', { name: 'Save' });
    /**
     * @note user.click will not trigger the form.
     */
    fireEvent.click(button);
    await findByText('Role edited');
    await findByText('Authenticated');
  });

  it('will update the Advanced Settings panel when you click on the cog icon of a specific permission', async () => {
    const { getByRole, user, getByText } = render();

    await waitForElementToBeRemoved(() => getByText('Loading content.'));

    await user.click(
      getByRole('button', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    );

    await user.hover(getByRole('checkbox', { name: 'create' }));

    await user.click(getByRole('button', { name: /Show bound route/i }));

    expect(getByRole('heading', { name: 'Bound route to address .create' })).toBeInTheDocument();
    expect(getByText('POST')).toBeInTheDocument();
    expect(getByText('/addresses')).toBeInTheDocument();
  });
});
