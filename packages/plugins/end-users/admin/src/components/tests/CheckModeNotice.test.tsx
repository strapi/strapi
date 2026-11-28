import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { ACTIVE, CHECK, serveMigration } from '@tests/migrationFixtures';
import { render, screen } from '@tests/utils';

import { RolesPage } from '../../pages/Roles/RolesPage';
import { CheckModeNotice } from '../CheckModeNotice';

describe('CheckModeNotice', () => {
  it('shows the page header and a link to the migration check in place of the page', async () => {
    serveMigration(CHECK);
    render(
      <CheckModeNotice page="providers">
        <p>Page content</p>
      </CheckModeNotice>
    );

    expect(
      await screen.findByText('End users turns on when the migration runs')
    ).toBeInTheDocument();
    // The page keeps its own title and subtitle, so it is clear which page this is
    expect(screen.getByRole('heading', { name: 'Providers' })).toBeInTheDocument();
    expect(
      screen.getByText('The identity providers end users can sign in with')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the migration check' })).toHaveAttribute(
      'href',
      '/settings/end-users/advanced#migration'
    );
    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  });

  it('is the whole content of the page, so it has no Close', async () => {
    serveMigration(CHECK);
    render(<CheckModeNotice page="sign-in" />);

    await screen.findByText('End users turns on when the migration runs');

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('shows the page itself outside check mode', async () => {
    serveMigration(ACTIVE);
    render(
      <CheckModeNotice page="roles">
        <p>Page content</p>
      </CheckModeNotice>
    );

    expect(await screen.findByText('Page content')).toBeInTheDocument();
    expect(screen.queryByText(/turns on when/)).not.toBeInTheDocument();
  });

  it('answers a page opened by its address before it asks about permissions', async () => {
    serveMigration(CHECK);
    // An admin who holds none of the page's permissions: in check mode the actions are not registered
    renderAdmin(<RolesPage />, {
      initialEntries: ['/settings/end-users/roles'],
      providerOptions: { permissions: [] },
    });

    expect(
      await screen.findByText('End users turns on when the migration runs')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.queryByText(/don't have the permissions/)).not.toBeInTheDocument();
  });
});
