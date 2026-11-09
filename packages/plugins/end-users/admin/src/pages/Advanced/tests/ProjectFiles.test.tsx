import { render, screen, server, waitFor } from '@tests/utils';
import { FILES, serveMigration, ACTIVE } from '@tests/migrationFixtures';
import { http, HttpResponse } from 'msw';

import { ProjectFiles } from '../ProjectFiles';

describe('ProjectFiles', () => {
  it('offers to write the files only when the server allows it, after a confirmation', async () => {
    const writes: string[] = [];

    serveMigration(ACTIVE, FILES);
    server.use(
      http.post('/end-users/migration/files', () => {
        writes.push('write');

        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<ProjectFiles />);

    await user.click(await screen.findByRole('button', { name: 'Write the files' }));

    // Nothing is written until the dialog is confirmed, and it says what happens
    expect(writes).toHaveLength(0);
    expect(
      screen.getByText(/Strapi restarts, and the restart migrates this development database/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(await screen.findByText(/Strapi is restarting/)).toBeInTheDocument();
  });

  it('shows no button, and the reason, when the server cannot write', async () => {
    serveMigration(ACTIVE, { ...FILES, writable: false, reason: 'not-development' });
    render(<ProjectFiles />);

    expect(await screen.findByText(/written only by a development server/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write the files' })).not.toBeInTheDocument();
  });

  it('shows the config block and the users-permissions line with copy buttons, and each change', async () => {
    serveMigration(ACTIVE, { ...FILES, writable: false, reason: 'config-not-editable' });
    const { user } = render(<ProjectFiles />);

    expect(
      await screen.findByText('src/api/article/content-types/article/schema.json')
    ).toBeInTheDocument();
    expect(screen.getByText('{ "owner": "plugin::users-permissions.user" }')).toBeInTheDocument();
    expect(screen.getByText('{ "owner": "plugin::end-users.user" }')).toBeInTheDocument();
    expect(screen.getByText(/src\/index.ts:12: Names the old plugin/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be edited automatically/)).toBeInTheDocument();

    // user-event stands in for the clipboard: what was copied is read back from it
    await user.click(screen.getByRole('button', { name: 'Copy the config block' }));
    expect(await navigator.clipboard.readText()).toBe(FILES.configBlock);

    await user.click(screen.getByRole('button', { name: 'Copy the Users & Permissions line' }));
    expect(await navigator.clipboard.readText()).toBe(FILES.usersPermissionsLine);
  });
});
