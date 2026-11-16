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
import { http, HttpResponse } from 'msw';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { server } from '../../../../../tests/server';
import { EditPage } from '../EditPage';

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
                <MemoryRouter
                  initialEntries={[`/settings/users-permissions/roles/1`]}
                  future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                >
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
  beforeEach(() => vi.clearAllMocks());

  it('renders the role details and settings sections', async () => {
    const { queryByText, getByRole } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    expect(getByRole('heading', { name: 'Authenticated' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Role details' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Permissions' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Advanced settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
  });

  it('expands the available permission actions', async () => {
    const { queryByText, getByRole, user } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

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
    const { getByRole, user, queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    await user.clear(getByRole('textbox', { name: 'Name' }));

    await user.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('will show an error if the user does not fill out the description field', async () => {
    const { getByRole, user, queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

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
    const { getByRole, user, queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    await user.click(
      getByRole('button', {
        name: 'Address Define all allowed actions for the api::address plugin.',
      })
    );

    await user.hover(getByRole('checkbox', { name: 'create' }));

    await user.click(getByRole('button', { name: /Show bound route/i }));

    expect(getByRole('heading', { name: 'Bound route to address .create' })).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('/addresses')).toBeInTheDocument();
  });
});

it('saves a toggled action as enabled in the role permissions', async () => {
  const save = vi.fn();
  server.use(
    http.put('*/users-permissions/roles/:roleId', async ({ request }) => {
      save(await request.json());

      return HttpResponse.json({ ok: true });
    })
  );
  const { getByRole, queryByText, findByText, user } = render();
  await waitForElementToBeRemoved(() => queryByText('Loading content.'));
  await user.click(
    getByRole('button', {
      name: 'Address Define all allowed actions for the api::address plugin.',
    })
  );
  await user.click(getByRole('checkbox', { name: 'create' }));
  fireEvent.click(getByRole('button', { name: 'Save' }));
  await findByText('Role edited');
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      permissions: {
        'api::address': { controllers: { address: { create: { enabled: true, policy: '' } } } },
      },
    })
  );
});

it('saves every action of a controller as enabled after "Select all"', async () => {
  const save = vi.fn();
  server.use(
    http.get('*/users-permissions/roles/:roleId', () =>
      HttpResponse.json({
        role: {
          id: 1,
          name: 'Authenticated',
          description: 'Default role given to authenticated user.',
          type: 'authenticated',
          permissions: {
            'api::address': {
              controllers: {
                address: {
                  create: { enabled: true, policy: '' },
                  delete: { enabled: false, policy: '' },
                  find: { enabled: false, policy: '' },
                },
              },
            },
          },
        },
      })
    ),
    http.put('*/users-permissions/roles/:roleId', async ({ request }) => {
      save(await request.json());

      return HttpResponse.json({ ok: true });
    })
  );
  const { getByRole, queryByText, findByText, user } = render();
  await waitForElementToBeRemoved(() => queryByText('Loading content.'));
  await user.click(
    getByRole('button', {
      name: 'Address Define all allowed actions for the api::address plugin.',
    })
  );
  const selectAll = getByRole('checkbox', { name: 'Select all' });
  expect(selectAll).toBePartiallyChecked();
  await user.click(selectAll);
  fireEvent.click(getByRole('button', { name: 'Save' }));
  await findByText('Role edited');
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      permissions: {
        'api::address': {
          controllers: {
            address: {
              create: { enabled: true, policy: '' },
              delete: { enabled: true, policy: '' },
              find: { enabled: true, policy: '' },
            },
          },
        },
      },
    })
  );
});

it('shows the error page when the role cannot be loaded', async () => {
  server.use(
    http.get('*/users-permissions/roles/:roleId', () =>
      HttpResponse.json(
        { error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} } },
        { status: 404 }
      )
    )
  );
  const { findByText, queryByRole } = render();
  expect(await findByText('Whoops! Something went wrong. Please, try again.')).toBeInTheDocument();
  expect(queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
});
