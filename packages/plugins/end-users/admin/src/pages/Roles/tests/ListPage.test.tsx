import { within } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { ListPage } from '../ListPage';

import type { RoleFile } from '../../../../../shared/contracts/roles';

const LocationDisplay = () => <p data-testid="location">{useLocation().pathname}</p>;

/**
 * The page is mounted where the settings link mounts it, so the relative links it navigates by
 * (`new`, `duplicate/<id>`, `<id>`) land under the Roles route.
 */
const renderListPage = () =>
  render(
    <>
      <Routes>
        <Route path="/settings/end-users/roles/*" element={<ListPage />} />
      </Routes>
      <LocationDisplay />
    </>,
    { initialEntries: ['/settings/end-users/roles'] }
  );

describe('ListPage', () => {
  it('lists roles with their users', async () => {
    renderListPage();

    expect(await screen.findByRole('heading', { name: 'Roles' })).toBeInTheDocument();

    // Public first, then Authenticated, then the custom roles by name
    const rows = screen.getAllByRole('row').slice(1);

    expect(rows.map((row) => within(row).getAllByRole('gridcell')[0].textContent)).toEqual([
      'Public',
      'Authenticated',
      'Premium member',
    ]);

    expect(within(rows[0]).getByText('Not signed in')).toBeInTheDocument();
    expect(within(rows[1]).getByText('1,240 users')).toBeInTheDocument();
    expect(within(rows[2]).getByText('212 users')).toBeInTheDocument();

    // Public and Authenticated stay: there is nothing to delete, so they have no Delete
    expect(screen.queryByRole('button', { name: 'Delete Public' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Authenticated' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Premium member' })).toBeEnabled();

    expect(screen.getByRole('button', { name: 'Duplicate Premium member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Premium member' })).toBeInTheDocument();
  });

  it('says what happens to the users, deletes without a replacement and reports the move', async () => {
    let deleted: URL | undefined;

    server.use(
      http.delete('/end-users/roles/:documentId', ({ request }) => {
        deleted = new URL(request.url);

        return HttpResponse.json({ data: { documentId: 'p1', movedToDefault: 37 } });
      })
    );

    const { user } = renderListPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Premium member' }));

    const dialog = await screen.findByRole('alertdialog');

    expect(dialog).toHaveTextContent('Delete Premium member?');
    expect(
      within(dialog).getByText(
        '212 users have this role. They keep their other roles; anyone left with none gets Authenticated and its permissions.'
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('They no longer need two-factor authentication.')
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    expect(
      await screen.findByText('Premium member deleted. 37 users now have Authenticated.')
    ).toBeInTheDocument();

    // No replacement is asked for, so none is sent
    expect(deleted?.pathname).toBe('/end-users/roles/p1');
    expect(deleted?.search).toBe('');
  });

  it('warns in the delete dialog from the role itself, per kind of check', async () => {
    server.use(
      // An admin without conditions.read: the warning must not depend on the list
      http.get('/end-users/conditions', () =>
        HttpResponse.json(
          { error: { status: 403, name: 'ForbiddenError', message: 'Forbidden', details: {} } },
          { status: 403 }
        )
      ),
      http.get('/end-users/roles/:documentId', ({ params }) =>
        HttpResponse.json({
          data: {
            documentId: params.documentId,
            name: 'Premium member',
            description: null,
            type: 'custom',
            requireTwoFactor: true,
            usersCount: 212,
            createdAt: '2026-11-02T09:00:00.000Z',
            updatedAt: '2026-11-02T09:00:00.000Z',
            revision: 4,
            permissions: [],
            problems: [],
            namedBy: [
              { name: 'plugin::end-users.members-only', displayName: 'Members only', match: 'any' },
              { name: 'plugin::end-users.not-premium', displayName: 'Not premium', match: 'none' },
            ],
          },
        })
      )
    );

    const { user } = renderListPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Premium member' }));

    const dialog = await screen.findByRole('alertdialog');

    expect(await within(dialog).findByText('Members only')).toBeVisible();
    expect(
      within(dialog).getByText('Once it is deleted, its users stop matching this condition:')
    ).toBeVisible();
    expect(within(dialog).getByText('Not premium')).toBeVisible();
    expect(
      within(dialog).getByText(
        'Once it is deleted, its users are no longer excluded by this condition, so they may gain access:'
      )
    ).toBeVisible();
  });

  it('shows the message of a delete the server refuses', async () => {
    server.use(
      http.delete('/end-users/roles/:documentId', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Premium member has more than 5,000 users: move some of them first',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = renderListPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Premium member' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
    );

    expect(
      await screen.findByText('Premium member has more than 5,000 users: move some of them first')
    ).toBeInTheDocument();
    expect(screen.queryByText(/users now have/)).not.toBeInTheDocument();
  });

  it('imports a role file and opens it', async () => {
    const roleFile = {
      version: 1,
      role: { name: 'Editor', description: null, type: 'custom', requireTwoFactor: false },
      permissions: [
        {
          action: 'plugin::end-users.profile.find',
          subject: null,
          properties: {},
          conditions: [],
        },
      ],
    } satisfies RoleFile;

    let body: unknown;

    server.use(
      http.post('/end-users/roles/import', async ({ request }) => {
        body = await request.json();

        return HttpResponse.json({ data: { documentId: 'e1', name: 'Editor' } }, { status: 201 });
      })
    );

    const { user } = renderListPage();

    await screen.findByRole('heading', { name: 'Roles' });

    await user.upload(
      screen.getByLabelText('Role file'),
      new File([JSON.stringify(roleFile)], 'editor.json', { type: 'application/json' })
    );

    expect(await screen.findByText('/settings/end-users/roles/e1')).toBeInTheDocument();
    expect(body).toEqual(roleFile);
  });

  it('filters roles by the search', async () => {
    const { user } = renderListPage();

    await screen.findByRole('heading', { name: 'Roles' });

    await user.type(screen.getByRole('searchbox', { name: 'Search roles' }), 'prem{Enter}');

    expect(await screen.findByRole('button', { name: 'Edit Premium member' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Public' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Authenticated' })).not.toBeInTheDocument();
  });
});
