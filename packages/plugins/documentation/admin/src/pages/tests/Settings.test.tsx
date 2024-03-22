import * as React from 'react';

import { fireEvent, render, waitFor, defaultTestStoreConfig } from '@strapi/strapi/admin/test';
import { rest } from 'msw';

// @ts-expect-error - js file
import { server } from '../../../../tests/server';
import { api } from '../../services/api';
import { SettingsPage } from '../Settings';

const renderSettingsPage = () =>
  render(<SettingsPage />, {
    providerOptions: {
      storeConfig: {
        ...defaultTestStoreConfig,
        reducer: {
          ...defaultTestStoreConfig.reducer,
          [api.reducerPath]: api.reducer,
        },
        middleware: (getDefaultMiddleware) =>
          defaultTestStoreConfig.middleware(getDefaultMiddleware).concat(api.middleware),
      },
    },
  });

describe('SettingsPage', () => {
  it('renders the setting page correctly', async () => {
    const { getByRole, queryByText, getByText } = renderSettingsPage();

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(getByText('Configure the documentation plugin')).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');

    expect(getByRole('checkbox', { name: 'Restricted Access' })).toBeInTheDocument();
  });

  it('should automatically render the password field if the server restricted access property is true', async () => {
    server.use(
      rest.get('*/getInfos', (req, res, ctx) => {
        return res(
          ctx.json({
            documentationAccess: { restrictedAccess: true },
          })
        );
      })
    );

    const { getByLabelText, queryByText } = renderSettingsPage();

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByLabelText('Password')).toBeInTheDocument();

    server.restoreHandlers();
  });

  it('should render the password field when the Restricted Access checkbox is checked', async () => {
    const { getByRole, getByLabelText, queryByText } = renderSettingsPage();

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    fireEvent.click(getByRole('checkbox', { name: 'Restricted Access' }));

    expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'false');

    expect(getByLabelText('Password')).toBeInTheDocument();
  });

  it('should allow me to type a password and save that settings change successfully', async () => {
    const { getByRole, getByLabelText, queryByText, user, findByText } = renderSettingsPage();

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    fireEvent.click(getByRole('checkbox', { name: 'Restricted Access' }));

    expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'false');

    await user.type(getByLabelText('Password'), 'password');

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await findByText('Successfully updated settings');
  });
});
