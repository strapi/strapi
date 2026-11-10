import { ACTIVE, serveMigration } from '@tests/migrationFixtures';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useGetMigrationStatusQuery } from '../../services/migration';
import { MigrationBanner } from '../MigrationBanner';

/**
 * Renders once the status has been read, from the same query as the component under test, so the
 * two see the answer in the same update: a test that asserts something is NOT shown waits for this
 * first, or it passes before the request is answered.
 */
const StatusRead = () => {
  const { isLoading } = useGetMigrationStatusQuery();

  return isLoading ? null : <p>Status read</p>;
};

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
      // The status is read before the banner decides: what it shows is checked once it is answered
      const { container, unmount } = render(
        <>
          <MigrationBanner />
          <StatusRead />
        </>
      );

      await screen.findByText('Status read');
      expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container).toHaveTextContent('Status read');
      unmount();
    }
  });
});
