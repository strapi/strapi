import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/helper-plugin';
import {
  fireEvent,
  render as renderRTL,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Switch, Route } from 'react-router-dom';

import { EditPage } from '../EditPage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
}));

const render = () => ({
  ...renderRTL(<Route path="/settings/users-permissions/roles/:id" component={EditPage} />, {
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
          <ThemeProvider theme={lightTheme}>
            <QueryClientProvider client={client}>
              <NotificationsProvider>
                <MemoryRouter initialEntries={[`/settings/users-permissions/roles/1`]}>
                  <Switch>{children}</Switch>
                </MemoryRouter>
              </NotificationsProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </IntlProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('Roles – EditPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders correctly', async () => {
    const { getByTestId, getByRole, user } = render();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    expect(getByRole('link', { name: 'Back' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Authenticated' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Role details' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Permissions' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Advanced settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('textbox', { name: 'Name *' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Description *' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Address' }));

    expect(getByRole('region', { name: 'Address' })).toBeInTheDocument();

    expect(getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'create' })).toBeInTheDocument();
  });

  it('will show an error if the user does not fill the name field', async () => {
    const { getByRole, user, getByTestId } = render();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await user.clear(getByRole('textbox', { name: 'Name *' }));

    await user.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('textbox', { name: 'Name *' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('will show an error if the user does not fill out the description field', async () => {
    const { getByRole, user, getByTestId } = render();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await user.clear(getByRole('textbox', { name: 'Description *' }));

    await user.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('textbox', { name: 'Description *' })).toHaveAttribute('aria-invalid', 'true');
  });

  it("can update a role's name and description", async () => {
    const { getByRole, user, getByTestId, getByText } = render();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await user.type(getByRole('textbox', { name: 'Name *' }), 'test');
    await user.type(getByRole('textbox', { name: 'Description *' }), 'testing');

    /**
     * @note user.click will not trigger the form.
     */
    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getByText('Role edited')).toBeInTheDocument());
  });

  it("can update a role's permissions", async () => {
    const { getByRole, user, getByText, getByTestId } = render();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await user.click(getByRole('button', { name: 'Address' }));

    await user.click(getByRole('checkbox', { name: 'create' }));

    /**
     * @note user.click will not trigger the form.
     */
    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getByText('Role edited')).toBeInTheDocument());
  });

  it('will update the Advanced Settings panel when you click on the cog icon of a specific permission', async () => {
    const { getByRole, user, getByText, getByTestId } = render();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await user.click(getByRole('button', { name: 'Address' }));

    await user.hover(getByRole('checkbox', { name: 'create' }));

    await user.click(getByRole('button', { name: /Show bound route/i }));

    expect(getByRole('heading', { name: 'Bound route to address .create' })).toBeInTheDocument();
    expect(getByText('POST')).toBeInTheDocument();
    expect(getByText('/addresses')).toBeInTheDocument();
  });
});
