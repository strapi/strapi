/* eslint-disable react/jsx-no-constructed-context-values */

import * as React from 'react';

import { waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { server } from '../../../../../../tests/server';
import { render as renderAdmin } from '../../../../../../tests/utils';
import { RolesListPage } from '../ListPage';

vi.mock('@strapi/strapi/admin', async (importOriginal) => ({
  ...(await importOriginal()),
  useRBAC: vi.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canRead: true, canUpdate: true, canDelete: true, canCreate: true },
  })),
}));

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testid="location-display">{location.pathname}</span>;
};

const render = () =>
  renderAdmin(<RolesListPage />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <>
            {children}
            <LocationDisplay />
          </>
        );
      },
    },
  });

describe('Roles – ListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders as expected with headers, actions and a table', async () => {
    const { getByRole, queryByRole, queryByText, getByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    expect(getByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    expect(getByText('List of roles')).toBeInTheDocument();
    expect(getByRole('link', { name: 'Add new role' })).toBeInTheDocument();
    // Desktop: SearchInput renders an IconButton. Mobile: SearchInput renders the searchbox directly.
    const searchButton = queryByRole('button', { name: 'Search' });

    if (searchButton) {
      expect(searchButton).toBeInTheDocument();
    } else {
      expect(getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    }

    expect(getByRole('grid')).toBeInTheDocument();
    expect(getByRole('gridcell', { name: 'Authenticated' })).toBeInTheDocument();
    expect(getByRole('gridcell', { name: 'Public' })).toBeInTheDocument();
  });

  it('should direct me to the new user page when I press the add a new role button', async () => {
    const { getByRole, getByTestId, queryByText, user } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    await user.click(getByRole('link', { name: 'Add new role' }));

    expect(getByTestId('location-display')).toHaveTextContent('/new');
  });

  it('should direct me to the edit view of a selected role if I click the edit role button', async () => {
    const { getByRole, queryByText, getByTestId, user } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    await user.click(getByRole('gridcell', { name: 'Edit Authenticated' }));

    expect(getByTestId('location-display')).toHaveTextContent('/1');
  });
});

it('requires confirmation before deleting a custom role', async () => {
  const remove = vi.fn();
  server.use(
    http.get('*/users-permissions/roles', () =>
      HttpResponse.json({
        roles: [
          { id: 3, name: 'Editor', description: 'Can edit articles', type: 'editor', nb_users: 0 },
        ],
      })
    ),
    http.delete('*/users-permissions/roles/3', () => {
      remove();
      return HttpResponse.json({ ok: true });
    })
  );
  const { findByRole, getByRole, queryByRole, user } = render();
  await user.click(await findByRole('button', { name: 'Delete Editor' }));
  expect(getByRole('alertdialog')).toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();
  await user.click(getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(remove).toHaveBeenCalledOnce());
  await waitFor(() => expect(queryByRole('alertdialog')).not.toBeInTheDocument());
});

it('does not offer deletion for the built-in roles', async () => {
  const { findByRole, queryByRole } = render();
  expect(await findByRole('gridcell', { name: 'Authenticated' })).toBeInTheDocument();
  expect(queryByRole('button', { name: 'Delete Authenticated' })).not.toBeInTheDocument();
  expect(queryByRole('button', { name: 'Delete Public' })).not.toBeInTheDocument();
});
