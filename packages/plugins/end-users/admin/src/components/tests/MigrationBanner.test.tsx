import { ACTIVE, serveMigration } from '@tests/migrationFixtures';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { MigrationBanner } from '../MigrationBanner';

describe('MigrationBanner', () => {
  it('shows the count of unresolved items and links to the migration section', async () => {
    serveMigration();
    render(<MigrationBanner />);

    expect(await screen.findByText('2 migration items need attention')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the migration report' })).toHaveAttribute(
      'href',
      '/settings/end-users/advanced#migration'
    );
  });

  it('hides when Close is pressed', async () => {
    serveMigration();
    const { user } = render(<MigrationBanner />);

    await screen.findByText('2 migration items need attention');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('2 migration items need attention')).not.toBeInTheDocument();
  });

  it('renders nothing with no record, no unresolved item, or a refused query', async () => {
    const cases = [
      () => serveMigration({ ...ACTIVE, record: null }),
      () => serveMigration({ ...ACTIVE, unresolved: 0 }),
      () =>
        server.use(http.get('/end-users/migration', () => new HttpResponse(null, { status: 403 }))),
    ];

    for (const arrange of cases) {
      arrange();
      const { container, unmount } = render(<MigrationBanner />);

      // The status is read before the banner decides: give the request time to settle
      await waitFor(() => expect(screen.queryByText(/need attention/)).not.toBeInTheDocument());
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container).toHaveTextContent('');
      unmount();
    }
  });
});
