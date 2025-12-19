import * as React from 'react';

import { NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import {
  fireEvent,
  render as renderRTL,
  waitForElementToBeRemoved,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { EditPage } from '../EditPage';

/**
 * Mock the cropper import to avoid having an error
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

const render = () => ({
  ...renderRTL(<Route path="/settings/users-permissions/roles/:id" element={<EditPage />} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
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
    const { user } = render();

    const textboxName = await screen.findByRole('textbox', { name: 'Name' });
    const textboxDescription = await screen.findByRole('textbox', { name: 'Description' });

    await user.type(textboxName, 'test');
    await user.type(textboxDescription, 'testing');
    await user.click(
      screen.getByRole('button', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    );

    const checkboxCreate = await screen.findByRole('checkbox', { name: 'create' });
    await user.click(checkboxCreate);

    const button = await screen.findByRole('button', { name: 'Save' });
    /**
     * @note user.click will not trigger the form.
     */
    fireEvent.click(button);
    await screen.findByText('Role edited');
    await screen.findByText('Authenticated');
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
